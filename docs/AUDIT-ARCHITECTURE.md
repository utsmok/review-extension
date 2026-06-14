# Architecture & Code Quality Audit

**Date:** 2026-06-09
**Auditor:** Architecture subagent
**Scope:** Repo structure, module boundaries, state management, type safety, error handling, React patterns, naming, configs

---

## Summary

The TRUST Review Extension follows a clean, layered architecture with clear separation between state (Zustand stores), business logic (`lib/`), UI hooks (`hooks/`), and presentation (`components/`). The codebase is well-typed with strict TypeScript, uses consistent patterns throughout, and demonstrates good engineering discipline. The most impactful findings are around component size, a few type-safety gaps in import validation, and potential performance concerns from Zustand selector patterns. Overall quality is **above average** for a project at this stage.

**Score: 7/10**

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        entrypoints/                              │
│  sidepanel/main.tsx ─── ErrorBoundary + React.StrictMode         │
│  background.ts ─── sidePanel.setPanelBehavior                    │
└──────────┬───────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                        components/                               │
│  App.tsx ─── Routing (session manager vs active session)         │
│  ├── AppShell.tsx ─── Layout, setup banner, toasts              │
│  ├── SessionManager.tsx ─── Session list, create/import          │
│  ├── ActiveSession.tsx ─── Tab navigation, capture actions       │
│  │   ├── Evaluation.tsx ─── Question list, evidence modal       │
│  │   ├── Metadata.tsx ─── Tool metadata form                    │
│  │   ├── Captures.tsx ─── Screenshot gallery, annotations       │
│  │   └── FinalizationScreen.tsx ─── Grade, conclusion, export   │
│  └── (shared: Toast, ConfirmDialog, ProgressCircle, ...)        │
└──────────┬───────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                          hooks/                                  │
│  useActiveSession.ts ─── Lifecycle orchestration + composite     │
│  useSessionData.ts ─── Read-only session state selectors         │
│  useSessionActions.ts ─── Mutation action selectors              │
│  useCaptureAction.ts ─── Capture error handling wrapper          │
│  useCaptureQueue.ts ─── Serial capture queue                     │
│  useKeyboardShortcuts.ts ─── Global shortcut registration        │
│  useSidepanelZoom.ts ─── Zoom persistence (localStorage)         │
│  useFocus.ts ─── Focus trap, roving tab index, auto-focus        │
│  useScreenshotUrl.ts ─── Single screenshot IDB loader            │
│  useScreenshots.ts ─── Batch screenshot IDB loader               │
└──────────┬───────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                         stores/                                  │
│  session.ts ─── Zustand (in-memory only, no persist)             │
│  registry.ts ─── Zustand + persist middleware (localStorage)        │
│  toast.ts ─── Zustand (ephemeral, timer-managed)                 │
└──────────┬───────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                          lib/                                    │
│  session-lifecycle.ts ─── CRUD operations, auto-save singleton   │
│  session-repository.ts ─── IDB abstraction (DI pattern)          │
│  screenshot-store.ts ─── Separate IDB for heavy blob data        │
│  export.ts ─── Public API: exportSession, importSessionFromZip   │
│  export-pipeline.ts ─── Data prep + ZIP assembly                 │
│  report-model.ts ─── Intermediate report representation          │
│  html-report.ts ─── Standalone HTML report generator             │
│  rubric.ts ─── Scoring, completion, distribution helpers         │
│  capture/ ─── Browser capture, HTML sanitization, logo extract   │
│  types.ts ─── All shared TypeScript types                        │
│  contexts.tsx ─── React contexts (RubricContext, TabNavigation)  │
│  migrations.ts ─── Schema version migrations                     │
│  evaluation-state.ts ─── Progress state helper                   │
│  metadata-utils.ts ─── Array coercion utility                    │
│  principles.ts ─── TRUST principle definitions                   │
│  logos.ts ─── Inline logo data URLs                              │
│  tokens.css / base.css / components.css ─── Design tokens + CSS  │
└──────────┬───────────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                         data/                                    │
│  rubrics/index.ts ─── deepFreeze + type assertion                │
│  rubrics/trust-full.json ─── Static rubric data (36KB)           │
└──────────────────────────────────────────────────────────────────┘
```

### Key Data Flow

```
User Action → Component → Hook (useActiveSession) → Store mutation
                                                       ↓
                                              auto-save subscription
                                                       ↓
                                          session-lifecycle.saveCurrentSession()
                                                       ↓
                                          session-repository (IDB)
                                          screenshot-store (IDB, separate DB)
```

```
Export: useActiveSession.doExportAndClose()
  → lib/export.ts::exportSession()
    → lib/export-pipeline.ts::prepareExportArtifacts() (data transforms)
    → lib/export-pipeline.ts::assembleZip() (JSZip)
  → lib/export.ts::downloadBlob() (trigger download)
```

---

## Findings

### Structure (P2)

#### F-ARCH-01: Large monolithic components with mixed concerns
**Severity:** P2
**Files:**
- `components/ActiveSession.tsx` (529 lines, 18.9KB)
- `components/QuestionSection.tsx` (657 lines, 23.2KB)
- `components/Metadata.tsx` (27.3KB)
- `components/Captures.tsx` (27.4KB)
- `components/FinalizationScreen.tsx` (20.5KB)

Several components exceed 500 lines and combine layout, event handling, inline SVGs, and business logic in a single file. `ActiveSession.tsx` contains ~120 lines of inline SVG icons for toolbar buttons. `QuestionSection.tsx` mixes rendering logic for both scoring and pass-fail questions with evidence linking and capture management.

**Recommendation:** Extract inline SVGs into a shared `icons/` directory. Split `QuestionSection` into `ScoringQuestionSection` and `PassFailQuestionSection` sub-components (the `QualityGateSection` exists but is small at 1.7KB). Extract toolbar button definitions from `ActiveSession` into a `TopBarActions` component.

#### F-ARCH-02: `lib/components.css` is 67.7KB — stylesheet growing unbounded
**Severity:** P2
**File:** `lib/components.css` (67.7KB)

A single CSS file containing all component styles. This is a maintenance concern as the project grows — changes to one component's styles risk unintended side effects on others, and the file is approaching a size where code review becomes difficult.

**Recommendation:** Adopt CSS Modules, co-located component styles (e.g., `QuestionSection.css`), or Tailwind-only styling with custom CSS limited to complex animations/layouts. At minimum, split by component with clear section headers.

#### F-ARCH-03: `lib/contexts.tsx` lives in `lib/` alongside non-React modules
**Severity:** P3
**File:** `lib/contexts.tsx`

The `lib/` directory contains both pure TypeScript modules (rubric, types, export) and a React context file. React-specific files mixed with non-React code creates an unclear boundary.

**Recommendation:** Move `contexts.tsx` to `components/` or a dedicated `context/` directory. Alternatively, rename `lib/` to clarify it includes React primitives. Low priority given the file is only 23 lines.

### Patterns (P1–P2)

#### F-ARCH-04: `useActiveSession` is a "god hook" with broad responsibilities
**Severity:** P1
**File:** `hooks/useActiveSession.ts`

This hook serves as both the lifecycle orchestrator (loading/saving sessions) and the API surface for all session operations. Every component that needs session state goes through it. This creates tight coupling — any change to session loading, saving, or export logic affects every consumer.

**Recommendation:** Consider splitting into:
- `useSessionLifecycle` — handles load/save/auto-save initialization
- Keep `useActiveSession` as the composite API surface but without lifecycle effects

The current approach works but will become fragile as features grow.

#### F-ARCH-05: Auto-save implemented as module-level singleton with mutable state
**Severity:** P2
**File:** `lib/session-lifecycle.ts:10-17`

Auto-save uses module-level `let` variables (`autoSaveTimerRef`, `autoSaveScheduledSessionId`, `lastSaveSignature`, etc.) managed by `initAutoSave()`/`teardownAutoSave()`. This pattern is functional but fragile — it relies on calling `initAutoSave` exactly once, and `teardownAutoSave` on unmount. The `auto-save.ts` file is a 1-line re-export from `session-lifecycle.ts`, adding an unnecessary indirection layer.

**Recommendation:** Remove `lib/auto-save.ts` (re-export from `session-lifecycle.ts` directly). The singleton pattern is acceptable for this use case but document the lifecycle contract more prominently.

#### F-ARCH-06: `useSessionData` subscribes to all session store slices individually
**Severity:** P2
**File:** `hooks/useSessionData.ts:4-9`

```ts
const status = useSessionStore((s) => s.status);
const session = useSessionStore((s) => s.session);
const captures = useSessionStore((s) => s.captures);
const evaluations = useSessionStore((s) => s.evaluations);
const finalization = useSessionStore((s) => s.finalization);
```

Each selector is a separate Zustand subscription. This is actually the correct pattern for Zustand (individual selectors prevent unnecessary re-renders compared to `useSessionStore()`). However, `useSessionData` re-renders on *any* session state change. Components importing `useSessionData` via `useActiveSession` all re-render when any slice changes.

**Recommendation:** This is the correct approach for the current component count. As the app grows, consumers should select only the slices they need (e.g., `useSessionStore(s => s.captures)`) instead of going through `useSessionData`.

### Type Safety (P1–P2)

#### F-ARCH-07: Import validation uses unsafe type assertions
**Severity:** P1
**File:** `lib/export.ts:40-76`

```ts
function validateSessionData(data: unknown): import("./types").SessionData {
  // ... validation checks ...
  return data as import("./types").SessionData;  // Line 75
}
```

The validation function checks a few top-level fields but casts the entire object to `SessionData`. Nested structures like `Capture[]` and `Evaluation[]` are only checked for "is an array of objects with string id/rubricId". Fields like `Capture.screenshotBase64`, `Capture.htmlContent`, `Evaluation.score`, etc. are not validated. A malformed import ZIP could produce runtime errors in components.

**Recommendation:** Either use a schema validation library (zod) for import validation, or validate the critical nested fields (score types, required strings) before asserting. The current approach is a reasonable pragmatic choice given import is a less-trusted boundary, but the gap should be acknowledged.

#### F-ARCH-08: Rubric data loaded with double assertion
**Severity:** P2
**File:** `data/rubrics/index.ts:15`

```ts
export const RUBRIC_DATA: RubricData = deepFreeze(trustFull) as unknown as RubricData;
```

The `as unknown as RubricData` double assertion bypasses TypeScript's structural checking between the JSON type and `RubricData`. `deepFreeze` changes the type to `Readonly<T>`, requiring the intermediate `unknown` cast. If the JSON schema drifts from the expected type, this will silently produce runtime errors.

**Recommendation:** Add a build-time validation step or a runtime assertion that checks a few representative keys from the JSON. The `deepFreeze` approach is good — it just needs a type bridge.

#### F-ARCH-09: `Capture` type carries heavy data in-memory
**Severity:** P2
**File:** `lib/types.ts:49-60`

The `Capture` interface includes `screenshotBase64: string` and `htmlContent: string` — potentially hundreds of KB per capture. These are stored in the Zustand session store (in-memory) even though screenshots are also persisted separately in `screenshot-store.ts`. The session store's `captures` array retains full base64 data.

**Recommendation:** Consider making the in-memory `Capture` type exclude heavy fields (use `Omit<Capture, 'screenshotBase64' | 'htmlContent'>` for the store), loading them on-demand via `useScreenshotUrl`/`useScreenshots`. This would significantly reduce memory pressure with many captures.

### Error Handling (P2)

#### F-ARCH-10: Screenshot persistence failures are silently swallowed
**Severity:** P2
**Files:**
- `stores/session.ts:73-75` (saveScreenshot)
- `stores/session.ts:83-85` (saveAnnotatedScreenshot)
- `stores/session.ts:95-97` (deleteScreenshot)

```ts
saveScreenshot(capture).catch((err) => {
  console.error("Failed to persist screenshot:", err);
});
```

Screenshot IDB operations are fire-and-forget with `console.error` only. If IDB is full or unavailable, the user continues working unaware that their screenshots aren't persisted. On next load, screenshots will be missing.

**Recommendation:** Surface IDB persistence failures to the user via the toast system. Add a `toastError("Failed to save screenshot — storage may be full")` call in addition to `console.error`.

#### F-ARCH-11: Error boundary only catches render errors, not async errors
**Severity:** P2
**File:** `components/ErrorBoundary.tsx`

The `ErrorBoundary` class component only catches render-phase errors. Async errors (IDB failures, capture errors, export failures) are caught individually at call sites via try/catch, but unhandled promise rejections are not caught globally.

**Recommendation:** Add a `window.addEventListener("unhandledrejection", ...)` handler in `App.tsx` or `main.tsx` as a safety net. Individual try/catch blocks remain the primary strategy.

### Consistency (P2–P3)

#### F-ARCH-12: Mixed default vs named exports in components
**Severity:** P3
**Files:** `components/` directory

Most components use `export default function Name()` but some helpers use named exports (e.g., `getProgressState`, `ProgressCircle` in `ProgressCircle.tsx`, `useRubric` in `contexts.tsx`). The mix is consistent within categories (stores and hooks use named exports, components use default exports), so this is a convention rather than a problem.

**Recommendation:** Document the convention: components = default export, hooks/lib = named export.

#### F-ARCH-13: Tailwind content paths exclude `lib/` CSS-only files
**Severity:** P3
**File:** `tailwind.config.ts:4`

```ts
content: ["./entrypoints/**/*.{html,tsx,ts}", "./components/**/*.{tsx,ts}"],
```

The content paths don't include `lib/` files. Since `lib/` contains CSS files (`tokens.css`, `base.css`, `components.css`, `report.css`) but no TSX/TS files that use Tailwind classes, this is correct. However, if utility classes are added to `lib/` TypeScript files in the future, they won't be detected.

**Recommendation:** Add `./lib/**/*.{tsx,ts}` to the content array proactively, or add a comment explaining the omission.

#### F-ARCH-14: Inconsistent TypeScript `as const` usage
**Severity:** P3
**Files:** Various

`PRINCIPLES` uses `as const` for full inference. `tabs` in `ActiveSession.tsx` uses `as const` on the array. But `tabDescs` and `tabIds` use `Record<(typeof tabs)[number], string>` — a derived type that depends on the `as const`. The approach is correct and consistent enough.

### Build & Config (P3)

#### F-ARCH-15: Vitest coverage thresholds are modest
**Severity:** P3
**File:** `vitest.config.ts:14-18`

thresholds: {
  statements: 73,
  branches: 66,
  functions: 66,
  lines: 75,
},
```

Coverage thresholds are ratcheted to current measured levels (73/66/66/75) and enforced in CI via `pnpm test:coverage`; the earlier aspirational 75/75/80/80 were never met. The coverage includes `lib/`, `stores/`, `hooks/`, and `components/`. Raise the ratchet as coverage improves.

**Recommendation:** Plan to incrementally raise thresholds as the project stabilizes. Consider adding component coverage.

#### F-ARCH-16: `lib/logos.ts` is 17.8KB of inline data URLs
**Severity:** P3
**File:** `lib/logos.ts`

This file contains hardcoded base64-encoded logo images. While functional (avoids network requests for the extension), it bloats the JS bundle.

**Recommendation:** For a browser extension this is acceptable since all assets must be local. If bundle size becomes a concern, these could be loaded from `public/` via `browser.runtime.getURL()`.

---

## Positive Observations

1. **Clean Zustand patterns:** Stores use proper selectors, `emptyState` object for reset, and the session store correctly separates IDB persistence from state management.
2. **Good separation of capture subsystem:** `lib/capture/` directory cleanly separates browser capture (`browser.ts`), HTML sanitization (`sanitize.ts`), and logo extraction (`extract.ts`) with a barrel `index.ts`.
3. **Export pipeline decomposition:** `export.ts` (public API) → `export-pipeline.ts` (data prep + ZIP assembly) → `html-report.ts` (HTML generation) → `report-model.ts` (data model) is a clean layered architecture.
4. **Session repository DI pattern:** `IdbSessionRepository` with `InMemorySessionRepository` for testing, accessed via `getRepository()`/`setRepository()` module-level DI. Clean and testable.
5. **Schema migrations:** `migrations.ts` follows a simple, extensible pattern with a `Map<number, Migration>` and sequential application.
6. **Security posture:** CSP in `wxt.config.ts` is strict (`connect-src 'self'`), zero eval/Function, and the manifest comment block documents the security rationale.
7. **No `as any` casts:** Zero instances of `as any` across the entire codebase. Type assertions use specific types.
8. **No stray console.log:** Only `console.error` in error paths (2 instances in `session-lifecycle.ts`). No debug logging left in.
9. **Hook composition:** `useActiveSession` composes `useSessionData` + `useSessionActions` + lifecycle effects — avoids prop drilling while keeping store access clean.
10. **Biome configuration:** Sensible rules with a11y warnings, no unused variables, and explicit `any` warnings. Good balance of strictness.
11. **TypeScript strict mode:** `tsconfig.json` has `"strict": true` with bundler module resolution. Path aliases via `@/*` work cleanly.

---

## Recommendations Summary

| ID | Severity | Recommendation | Effort |
|----|----------|---------------|--------|
| F-ARCH-04 | P1 | Split `useActiveSession` lifecycle vs API surface | Medium |
| F-ARCH-07 | P1 | Strengthen import validation (zod or manual nested checks) | Medium |
| F-ARCH-01 | P2 | Extract large components (icons, sub-sections) | Medium |
| F-ARCH-02 | P2 | Split `components.css` by component | Large |
| F-ARCH-05 | P2 | Remove `auto-save.ts` re-export indirection | Small |
| F-ARCH-06 | P2 | Encourage direct store selectors over `useSessionData` | Small |
| F-ARCH-08 | P2 | Add runtime/build-time rubric JSON validation | Small |
| F-ARCH-09 | P2 | Strip heavy fields from in-memory Capture type | Large |
| F-ARCH-10 | P2 | Surface IDB failures to user via toasts | Small |
| F-ARCH-11 | P2 | Add global unhandled rejection handler | Small |
| F-ARCH-03 | P3 | Move `contexts.tsx` out of `lib/` | Small |
| F-ARCH-12 | P3 | Document export conventions | Small |
| F-ARCH-13 | P3 | Add `lib/` to Tailwind content paths | Small |
| F-ARCH-15 | P3 | Plan coverage threshold increases | Ongoing |
| F-ARCH-16 | P3 | Consider runtime-loaded logos | Small |
