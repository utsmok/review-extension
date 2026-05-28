# Architecture & Testing Review

**Date:** 2026-05-28
**Scope:** Full codebase — architecture, state management, session lifecycle, test coverage, build pipeline, extension-specific concerns.
**Stack:** WXT 0.20 / React 19 / TypeScript 5.7 / Zustand 5 / IndexedDB / Vitest 4 / Biome 2.4

---

## 1. Architecture Overview

### Layering

```
entrypoints/         Chrome MV3 wiring (background.ts, sidepanel/)
  ↓
components/          React UI (20 components)
  ↓
hooks/               useActiveSession, useCaptureQueue, useSidepanelZoom
  ↓
lib/                 Pure logic + infrastructure (session-lifecycle, auto-save, export, capture, rubric, report)
  ↓
stores/              Zustand stores (session, registry, toast)
  ↓
lib/session-repository.ts   IDB persistence (DI'd interface + InMemory test double)
```

**Verdict:** Clean separation. The `lib/` layer owns all business logic; components are thin renderers. The `hooks/` layer is a single orchestrator (`useActiveSession`) that bridges UI to lifecycle — this is the load-bearing joint.

### Routing

`App.tsx` uses a simple state machine (`status: empty | loading | active`, `showSettings: boolean`). No router needed for a sidepanel — correct call. Four-way conditional render is flat and readable.

### Dependency Flow

Unidirectional top-down. No circular imports. Zustand stores import nothing from `lib/` or `components/` — they are pure state containers. `lib/session-lifecycle.ts` imports stores and repository, which is appropriate for an orchestration layer.

---

## 2. State Management

### Store Design

| Store | Persistence | Purpose |
|-------|-------------|---------|
| `session` | None (in-memory, auto-saved to IDB) | Active session data: metadata, captures, evaluations, finalization |
| `registry` | `zustand/persist` → localStorage | Session index + active session ID + settings |
| `toast` | None | Transient notifications |

**Strengths:**
- Session store is deliberately unpersisted — all writes go through auto-save debounce to IDB. This avoids the classic `persist` middleware + IDB dual-write conflict.
- Registry uses localStorage through Zustand's `persist` — fine for small metadata (~1KB per session). Would not scale to thousands of sessions, but appropriate for the use case.
- Individual selector subscriptions in `useActiveSession` prevent over-rendering. Good.

**Concerns:**

1. **Registry metadata can drift from IDB truth.** `updateSessionMetadata()` in the registry store updates localStorage but does not trigger a save to IDB. The auto-save only subscribes to the session store. If the app crashes between a registry update and the next session-store mutation, the registry has newer metadata than IDB. In practice this is low-risk (metadata changes trigger store updates), but it's an implicit coupling.

2. **`snapshot()` in session-lifecycle reads store state imperatively** (`useSessionStore.getState()`). This is correct for non-React contexts but means lifecycle functions are tightly coupled to store shape. Any store refactoring must update `snapshot()` and all callers. Acceptable for now.

3. **`removeCapture` has a side-effect** — it also cleans up evaluations' `explicitEvidenceIds` and metadata fields (`toolLogoUrl`, `termsConditionsUrl`). This is correct behavior but non-obvious from the function name. A comment exists, which is adequate.

### Persistence

IDB schema versioning is handled via `SCHEMA_VERSION` constant + `migrateSessionData()`. Current version is 3. Migration runs at load time, which is correct — data is always up-to-date before reaching the store.

**Module-level DI** (`getRepository()` / `setRepository()`) is clean. Tests swap in `InMemorySessionRepository` without touching globals. `resetRepository()` restores the default. No test pollution risk if each test file calls `setRepository()` in `beforeEach`.

---

## 3. Session Lifecycle Correctness

### Load Path

```
App renders → useActiveSession effect fires → loadSessionById(id) →
  setStatus("loading") → IDB read → loadSession(data) → status = "active"
```

**Race condition guard:** The effect in `useActiveSession` only fires when `status === "empty"` and `activeSessionId` is truthy. This prevents double-loads on re-renders. Correct.

**Error path:** On load failure, both `activeSessionId` and `status` are reset. The user lands on the session manager. Correct.

### Save Path

```
Any store mutation → auto-save subscribe fires → 300ms debounce → flush() → IDB write
Tab hide → visibilitychange → flush immediately (cancel debounce)
```

**Stale-save guard:** `flush()` compares `scheduledSessionId` against current `activeSessionId`. If the session switched between schedule and flush, the save is skipped. Critical for correctness — prevents overwriting a new session with stale data. Correct.

### Switch Path

```
switchToSession(id) → saveCurrentSessionAsync() (awaited) → clear store → setActiveSessionId(id)
```

The `await` on save before clear is correct. The old session is fully persisted before the store is wiped. The new session loads via the `useActiveSession` effect when `activeSessionId` changes to a non-null value while `status === "empty"` (after `clear()`).

### Delete Path

```
deleteSession(id) → clear store if active → IDB delete → registry delete
```

IDB delete before registry delete is correct — if IDB fails, the registry entry remains valid and the user can retry.

### Mark Done & Close

```
markDoneAndClose(id) → registry.markDone(id) → saveCurrentSession() (fire-and-forget) → clear → setActiveSessionId(null)
```

**Risk:** `saveCurrentSession()` is fire-and-forget. If the IDB write fails, the session is marked "done" in the registry but the final data was never persisted. The user sees the session as finalized with no indication of save failure. Should use `saveCurrentSessionAsync()` with error handling here, or at minimum toast on failure.

---

## 4. Test Coverage Assessment

### Inventory (38 test files, ~484 tests)

| Category | Files | Coverage |
|----------|-------|----------|
| Store logic | `store.test.ts`, `registry.test.ts`, `toast.test.ts` | Good |
| Session lifecycle | `session-lifecycle.test.ts`, `auto-save.test.ts`, `session-repository.test.ts` | Good |
| Import/export | `export.test.ts`, `import-session-zip.test.ts`, `import-session-zip-file.test.ts`, `annotated-export.test.ts`, `annotated-import.test.ts`, `export-size.test.ts` | Good |
| Scoring | `compute-scores.test.ts`, `rubric.test.ts`, `scoring-report.test.ts`, `nutrition-label.test.ts` | Good |
| Component rendering | `question-section.test.tsx`, `metadata.test.tsx`, `active-session.test.tsx`, `captures.test.tsx`, `session-manager.test.tsx`, `evidence-modal.test.tsx`, `sidepanel-zoom.test.tsx`, `finalization-autosave.test.tsx`, `active-session-hook.test.tsx`, `active-session-hook-coverage.test.tsx`, `hooks.test.tsx` | Good |
| Migration | `migration.test.ts` | Good |
| Report generation | `html-report-utils.test.ts` | Adequate |
| E2E | `e2e/extension.spec.ts` (1 file) | Minimal |
| Benchmark | `bench/*.bench.ts` (6 files) | Good for perf regression |

### Coverage Thresholds

```json
{ "statements": 65, "branches": 60, "functions": 70, "lines": 65 }
```

These are intentionally moderate. For a research/review tool, this is reasonable. The low branch threshold (60%) acknowledges that many UI error paths are hard to unit-test.

### Test Infrastructure

- **Fixtures:** `tests/fixtures/index.ts` provides factory functions (`makeMetadata`, `makeCapture`, `makeEvaluation`, `makeFinalization`). Good — avoids test-data duplication.
- **Test helpers:** `tests/helpers/render-utils.tsx` provides `AllProviders`, `renderWithProviders`, `seedActiveSession`. Clean.
- **IDB mocking:** Uses `fake-indexeddb` package. Tests create real `IdbSessionRepository` instances backed by fake IDB. This is the right approach — tests actual IDB code paths without browser dependency.

### Gaps

1. **`markDoneAndClose` fire-and-forget save is not tested for failure.** The `saveCurrentSession()` call is fire-and-forget — no test verifies behavior when this fails.

2. **`App.tsx` has no direct test.** The routing logic (loading → active → empty → settings) is implicitly covered through component tests, but the root component's conditional rendering paths are untested.

3. **`capture.ts` has minimal test coverage.** `capture.test.ts` (3.7KB) — the core `captureActiveTab()` function requires browser APIs (`browser.tabs`, `browser.scripting`) that are hard to unit-test. The HTML sanitization logic (XSS prevention, script stripping, URL resolution) is tested only indirectly through export tests.

4. **`lib/html-report.ts` (26KB) is undertested.** Only `html-report-utils.test.ts` covers it. The main `buildHtmlReport` function generates the most user-visible output but lacks targeted tests for edge cases (empty captures, missing metadata fields, special characters in tool names).

5. **`FinalizationScreen.tsx` (15KB) has no dedicated test.** The finalization flow (grade selection, conclusion text, strengths/weaknesses arrays, export trigger) is one of the most complex UI interactions. `finalization-autosave.test.tsx` tests the autosave integration but not the screen's own logic.

6. **E2E coverage is minimal.** One smoke test file. The extension's core workflow — capture page → evaluate → finalize → export — has no end-to-end test. Playwright is configured but underused.

7. **`lib/export.ts` caching behavior is untested.** Dynamic imports and CSS minification are cached at module level. Tests don't verify that the cache works correctly or that `resetRepository()` doesn't affect export caching.

---

## 5. Build & Pipeline Review

### Build Toolchain

- **WXT** handles extension bundling, manifest generation, and HMR.
- **Vite** under the hood — fast, well-supported.
- **TypeScript strict mode** enabled (`strict: true`). Good.
- **Biome** for linting + formatting (replaces ESLint + Prettier). Configuration is sensible.

### Scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Production build via WXT |
| `pnpm test` | Vitest run |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Biome lint |
| `pnpm check` | Biome check (lint + format) |
| `pnpm test:e2e` | Playwright |
| `pnpm bench` | Vitest bench |

**Quality gate:** No single command runs all checks. A `pnpm check:all` or CI script that runs `typecheck && lint && test && build` would prevent merges that pass lint but fail typecheck.

### Coverage

- `vitest.config.ts` includes `lib/**/*.ts`, `stores/**/*.ts`, `hooks/**/*.ts`.
- **Not included:** `components/**/*.tsx`. This means component test coverage doesn't affect the threshold. Intentional — component tests are for correctness, not coverage metrics.

### Dependencies

- `tldraw` (5.x) is a heavy dependency for annotation support. It's imported only in the annotation modal — tree-shaking should handle it, but worth verifying bundle size.
- `jszip`, `papaparse` — used only at export time, dynamically imported. Good.

### Extension Manifest

```json
{
  "permissions": ["sidePanel", "activeTab", "tabs", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

`<all_urls>` host permission is necessary for `scripting.executeScript` (page captures) but will trigger Chrome's "enhanced safe browsing" warning. This is unavoidable for the capture feature.

---

## 6. Extension-Specific Concerns

### Sidepanel Architecture

- **Single HTML entry** (`entrypoints/sidepanel.html`) mounts React. Clean.
- **Background script** is minimal — just opens sidepanel on action click.
- **No content scripts.** Captures use `scripting.executeScript` injected ad-hoc. This is correct — no need for persistent content scripts.

### Storage Limits

`IdbSessionRepository.save()` includes a quota guard using `navigator.storage.estimate()`. Warns at 80% headroom. This is good defensive coding.

Captures include a 25MB per-capture limit with HTML truncation. Appropriate.

### MV3 Service Worker Lifecycle

The background script is a single call (`setPanelBehavior`). No state in the service worker. This is MV3-compatible — the service worker can be killed and restarted without data loss.

### Auto-Save Robustness

- `visibilitychange` listener flushes on tab hide — critical for sidepanel (Chrome may suspend the panel).
- `initAutoSave()` calls `teardownAutoSave()` first, preventing duplicate subscriptions on HMR. Correct.

### Capture Sanitization

`archivePageHtml()` strips scripts, iframes, event handlers, dangerous URL schemes, and meta refresh redirects. This is thorough XSS prevention for archived HTML. The multi-layered approach (remove elements → strip attributes → sanitize URLs) is defense-in-depth.

---

## 7. Architectural Improvements

### P0 — Should Fix

1. **`markDoneAndClose` uses fire-and-forget save.** This is the final save before session close. If it fails, the session is marked "done" but the last state is lost. Change to `saveCurrentSessionAsync()` with error handling.

2. **`lib/export.ts` is 456 lines.** It mixes minification logic, ZIP assembly, CSV generation, and logo extraction. Extract minification to `lib/minify.ts` and ZIP assembly to `lib/export-zip.ts`.

### P1 — Recommended

3. **`components/Metadata.tsx` (26KB) is the largest component.** It handles 20+ form fields with inline validation logic. Extract form fields to sub-components or use a form abstraction.

4. **`components/QuestionSection.tsx` (26KB) is equally large.** The scoring chip selection, evidence linking, and notes editing are tightly coupled. Extract evidence linking into a dedicated component.

5. **`useActiveSession` re-exports all store actions.** Every component that imports `useActiveSession` gets the full API surface, including store primitives like `clear` and `loadSession`. Consider splitting into `useSessionActions` (safe composite actions) and `useSessionState` (read-only selectors). Components should not call `clear` directly.

6. **No integration test for the full capture→evaluate→finalize→export flow.** This is the primary user journey. Add a Playwright test or a Vitest integration test that exercises the pipeline with `InMemorySessionRepository`.

7. **`lib/capture.ts` runs `archivePageHtml` in the content script context** via `browser.scripting.executeScript`. The function is 150 lines of DOM manipulation with no unit tests. Extract the sanitization logic into testable pure functions that take a `Document` and return a sanitized clone.

### P2 — Nice to Have

8. **CSS is split across 4 files** (`tokens.css`, `components.css`, `report.css`, `base.css`) totaling ~57KB. `components.css` (30KB) contains all component styles in a single file. Consider splitting per-component as the project grows.

9. **`lib/logos.ts` (17.8KB) embeds base64 logo data.** This is unavoidable for extension packaging, but it inflates the JS bundle. Consider loading logos on demand at export time rather than at import time.

10. **`data/rubrics/trust-full.json` (30.8KB) is imported synchronously** via `data/rubrics/index.ts`. For a single rubric this is fine, but if multiple rubric variants are added, consider lazy loading.

11. **No error boundary around individual components.** `ErrorBoundary.tsx` wraps the entire app in `main.tsx`. A capture failure or export error crashes the whole UI. Consider per-section error boundaries.

---

## 8. Summary

The architecture is well-structured for a Chrome extension of this scope. The separation between Zustand stores (state), `lib/` (logic), and components (rendering) is clean. The session lifecycle is correct with proper guards against stale saves and race conditions. The auto-save singleton is a good design — it centralizes debounce and visibility flush in one place.

**Primary risks:** (1) fire-and-forget save in `markDoneAndClose`, (2) undertested capture sanitization and HTML report generation, (3) very large files in `export.ts`, `Metadata.tsx`, and `QuestionSection.tsx` that will be harder to maintain as features grow.

**Test coverage is adequate** for the current scope but has blind spots in finalization UI, capture logic, and the full user journey. The E2E suite needs expansion.
