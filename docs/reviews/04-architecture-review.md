# Architecture & Codebase Review
Date: 2026-05-28

## Executive Summary

The TRUST Review Extension has a solid foundation: clear separation between Zustand stores, lifecycle orchestration in a dedicated module, and good use of individual selectors to prevent over-rendering. The recent refactoring (ScoreOption extraction, minify module split, batch export) has improved code organization.

However, several architectural concerns remain. The most significant is the **dual import system** — `lib/export.ts` and `lib/session-lifecycle.ts` both contain ZIP import logic with different validation paths, creating a maintenance hazard. The `useActiveSession` hook serves as both a data accessor and lifecycle orchestrator, violating single-responsibility. The HTML report builder (`lib/html-report.ts`) is a 734-line monolith mixing string templates, computation, and security-sensitive escaping. The `capture.ts` module has 200 lines of DOM sanitization with zero dedicated unit tests.

## Findings

### P1 — High Priority

**1. Duplicate import logic across export.ts and session-lifecycle.ts**
- `lib/export.ts:305-405` — `importSessionFromZip()` with full ZIP bomb protection, budget tracking, and file path resolution
- `lib/session-lifecycle.ts:113-129` — `importSessionFromZipFile()` delegates to export but with different error handling
- **Impact**: Divergent validation paths; bug fixes must be applied in two places
- **Fix**: Consolidate into a single `importSessionFromZip()` in export.ts; session-lifecycle.ts should only orchestrate (save to IDB + register)

**2. useActiveSession hook has mixed responsibilities**
- `hooks/useActiveSession.ts` — 124 lines combining data access (17 selectors), lifecycle orchestration (load/save effects), and composite actions (export, close, switch)
- **Impact**: Any component importing this hook gets all effects re-evaluated; hard to test in isolation
- **Fix**: Split into `useSessionData()` (read-only selectors) and `useSessionActions()` (lifecycle/composite). Effects stay in a single root-level `useSessionLifecycle()` hook

**3. html-report.ts is an untestable 734-line monolith**
- `lib/html-report.ts` — string-concatenation-based HTML generation with no component model
- Functions like `buildCategorySections()` (150 lines) and `buildNutritionLabelHtml()` (150 lines) are impossible to unit test without full integration setup
- **Impact**: HTML template bugs (missing closing tags, XSS in attribute contexts) are caught only by visual inspection
- **Fix**: Extract pure data→data transformers (score computation, evidence grouping) into testable modules. Keep HTML string generation minimal and template-driven

**4. capture.ts DOM sanitization has zero dedicated unit tests**
- `lib/capture.ts:8-166` — `archivePageHtml()` performs script stripping, event handler removal, dangerous URL sanitization, iframe/object removal
- No unit tests for the sanitization pipeline — the only test (`tests/capture-archive.test.ts`) tests the export path, not the sanitization edge cases
- **Impact**: A sanitization bypass could introduce stored XSS in exported HTML reports
- **Fix**: Create `tests/capture-sanitize.test.ts` with jsdom-based tests for each sanitization step

**5. export.ts still has mixed concerns despite minify extraction**
- `lib/export.ts` — 405 lines mixing ZIP assembly, CSV generation, session validation, import logic, logo extraction, and filename sanitization
- **Fix**: Extract CSV generation into `lib/report/csv-export.ts`, session validation into `lib/session-validation.ts`, import logic stays but gets simplified after P1-1

### P2 — Medium Priority

**6. Component CSS class inconsistency — some components use Tailwind, some use BEM-like classes**
- `components/QuestionSection.tsx` — uses CSS classes like `score-row`, `judgment-label`
- `components/FinalizationScreen.tsx` — uses Tailwind utilities exclusively
- `components/ScoreOverviewBar.tsx` — uses BEM-like `score-overview-bar__badge`
- **Impact**: Developers must look up which styling system each component uses
- **Fix**: Standardize — use CSS classes in `lib/components.css` for reusable patterns, Tailwind for one-off layout

**7. ScoreOverviewBar navigation uses `document.getElementById` — not React-idiomatic**
- `components/ScoreOverviewBar.tsx:145-151` — `navigateTo()` does imperative DOM scrolling
- **Impact**: Breaks if question IDs change; no React state driving the scroll
- **Fix**: Use a scroll context or URL hash-based navigation instead

**8. Zustand store mutations via `useSessionStore.getState()` outside effects**
- `hooks/useActiveSession.ts:92-96` — `closeSession()` reads store state imperatively
- `hooks/useActiveSession.ts:106-113` — `doExportAndClose()` reads store state imperatively
- **Impact**: Not wrong per se, but these should be documented as intentional patterns
- **Fix**: Add comments explaining why direct store access is used (avoiding stale closures in callbacks)

**9. FinalizationScreen local state synchronization complexity**
- `components/FinalizationScreen.tsx:77-111` — Complex bidirectional sync between local state and Zustand store using `isLocalChange` ref guard
- **Impact**: Fragile — adding new fields requires updating 3+ places (local state, sync effect, autosave effect)
- **Fix**: Consider uncontrolled form with explicit submit, or use a single `useReducer` + sync-on-mount pattern

**10. Rubric iteration uses `Object.entries()` + `Object.keys().indexOf()` pattern**
- `components/ScoreOverviewBar.tsx` — iterates rubric questions with `Object.entries()` then computes index with `Object.keys(questions).indexOf(qId)`
- **Impact**: O(n²) per category for index computation
- **Fix**: Use indexed iteration or precompute codes in the rubric module

### P3 — Low Priority

**11. `as` type casts in export.ts**
- `lib/export.ts:260` — `lightweightCaptures as import("./types").Capture[]`
- `lib/export.ts:297` — `data as import("./types").SessionData`
- **Impact**: These bypass type safety at the export/import boundary
- **Fix**: Create proper NarrowCapture type or use branded types for the lightweight variant

**12. `session-lifecycle.ts` has inconsistent save patterns**
- `saveCurrentSession()` is fire-and-forget (line 38)
- `saveCurrentSessionAsync()` returns a promise (line 47)
- `markDoneAndClose()` awaits the async version
- **Impact**: Two functions for the same operation increases API surface
- **Fix**: Make `saveCurrentSession()` always return the promise; callers can ignore if desired

**13. `useKeyboardShortcuts` creates new handler on every render**
- `hooks/useKeyboardShortcuts.ts` — depends on `shortcuts` object in useEffect deps
- If the parent passes an inline object, the effect re-subscribes every render
- **Impact**: Unnecessary event listener teardown/setup
- **Fix**: Use `useRef` for the shortcuts map and only subscribe once

## Architecture Scores

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Module boundaries | 7 | Good separation between lib/stores/hooks/components; export.ts still overloaded |
| State management | 8 | Zustand with individual selectors is clean; store shape is well-designed |
| Type safety | 7 | Good overall; some `as` casts at serialization boundaries |
| Error handling | 7 | try/catch in lifecycle; missing error boundary around sidepanel root |
| Performance | 7 | Batch export, memoized selectors; ScoreOverviewBar O(n²) index lookup |
| Testing | 6 | 489 tests is solid; critical gaps in capture sanitization and report HTML |
| Security | 7 | Good sanitization in capture.ts; HTML report uses manual escaping |

## Top 10 Recommendations

1. **Create capture sanitization unit tests** (P1-4) — security-critical, zero coverage
2. **Consolidate import logic** (P1-1) — single source of truth for ZIP import
3. **Split useActiveSession** (P1-2) — separate data access from lifecycle
4. **Break up html-report.ts** (P1-3) — extract pure data transformers
5. **Extract CSV/validation from export.ts** (P1-5) — reduce module size
6. **Simplify FinalizationScreen state sync** (P2-9) — reduce fragile bidirectional sync
7. **Fix ScoreOverviewBar index lookup** (P2-10) — O(n²) → O(n)
8. **Fix useKeyboardShortcuts re-subscription** (P3-13) — useRef for shortcuts map
9. **Standardize component styling approach** (P2-6) — pick Tailwind OR CSS classes per component
10. **Remove saveCurrentSession fire-and-forget variant** (P3-12) — single save API
