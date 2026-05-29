# Codebase Improvement Sweep — Consolidated Report

**Date**: 2026-05-29
**Scope**: Full codebase — architecture, testing, performance, accessibility, security, type safety
**Method**: 6 parallel subagent investigations + manual verification

---

## Summary Statistics

| Category | Findings | P0 | P1 | P2 | P3 |
|----------|----------|----|----|----|----|
| Architecture & Code Quality | 28 | 2 | 8 | 12 | 6 |
| Test Coverage & Quality | 18 | 2 | 7 | 6 | 3 |
| Performance & Bundle | 12 | 1 | 4 | 5 | 2 |
| Accessibility & UX | 42 | 3 | 12 | 18 | 9 |
| Security & Data Integrity | 17 | 1 | 5 | 8 | 3 |
| Type Safety & Patterns | 8 | 0 | 3 | 3 | 2 |
| **Total** | **125** | **9** | **39** | **52** | **25** |

---

## P0 — Must Fix (9 findings)

### PERF-1: tldraw adds ~1.6MB to sidepanel bundle (lazy-load it)
- **Files**: `components/EvidenceModal.tsx:12`
- **Impact**: Sidepanel chunk is 2.02MB. tldraw is ~80% of that. Only used when annotation modal opens.
- **Fix**: `const Tldraw = lazy(() => import("tldraw"))` with `<Suspense>` fallback. Expected reduction: ~1.6MB off initial load.

### ARCH-1: `html-report.ts` (625 lines) is unmaintainable string-template renderer
- **Files**: `lib/html-report.ts`
- **Impact**: Every change to report HTML requires editing string concatenations. Error-prone, hard to review.
- **Fix**: Use tagged template literals with a minimal html-escape helper, or extract sections into separate template files. Consider a lightweight template engine (not JSX — this runs in background/content scripts without React).

### ARCH-2: `capture.ts` (366 lines) is a god object
- **Files**: `lib/capture.ts`
- **Impact**: Mixes browser API calls (`chrome.tabs.captureVisibleTab`, `chrome.scripting.executeScript`), HTML sanitization (`archivePageHtml`), and data extraction (`extractLogoFromPage`, `extractTermsUrl`). Three distinct responsibilities.
- **Fix**: Split into `lib/capture/browser.ts` (Chrome API calls), `lib/capture/sanitize.ts` (DOM sanitization), `lib/capture/extract.ts` (logo/URL extraction).

### TEST-1: 4 source modules have zero tests
- **Files**: `lib/principles.ts`, `lib/evaluation-state.ts`, `lib/contexts.tsx`, `components/RubricChipGroup.tsx`
- **Impact**: Untested logic paths. `principles.ts` contains color mappings critical to visual correctness.
- **Fix**: Add targeted unit tests. `principles.ts` and `evaluation-state.ts` are pure functions — trivial to test.

### TEST-2: `AllProviders` test helper hardcodes `usesAi: true`
- **Files**: `tests/helpers/render-utils.tsx`
- **Impact**: Tests never exercise the `usesAi=false` code path. This hides bugs in AI-only question filtering.
- **Fix**: Accept `usesAi` as a prop with default `true`. Add `renderWithProviders(ui, { usesAi: false })` helper.

### A11Y-1: No skip-link mechanism for keyboard users
- **Files**: `components/ActiveSession.tsx`, `components/AppShell.tsx`
- **Impact**: Keyboard users must tab through all toolbar buttons, tab bar, and header before reaching content. Violates WCAG 2.1 SC 2.4.1.
- **Fix**: Add a visually-hidden skip link at the top of the sidepanel that jumps to `[id="main-content"]`.

### A11Y-2: No `aria-label` on session list in SessionManager
- **Files**: `components/SessionManager.tsx`
- **Impact**: Screen readers cannot distinguish the session list from other content. Landmark region missing.
- **Fix**: Wrap session list in `<section aria-label="Review sessions">`.

### A11Y-3: Design system violations — `border-radius: 3px` and `box-shadow`
- **Files**: `lib/components.css:874` (box-shadow on quick-note overlay), `lib/components.css:993,1009` (border-radius: 3px)
- **Impact**: DESIGN.md mandates 0-2px radius and zero box-shadow.
- **Fix**: Replace `3px` with `var(--radius-md)` (2px). Replace `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` with `border: 1px solid var(--ut-border)` for flat elevation.

### SEC-1: `JSON.stringify` for IDB quota check is a DoS vector
- **Files**: `lib/session-repository.ts:77`
- **Impact**: Serializes entire `SessionData` (including multi-MB base64 screenshots) on every save. Blocks main thread.
- **Fix**: Estimate size from capture count × avg screenshot size instead of full serialization. Or debounce the quota check separately from the save.

---

## P1 — Should Fix (39 findings, top items)

### Architecture

| ID | Finding | File | Fix |
|----|---------|------|-----|
| ARCH-3 | `QuestionSection.tsx` still 678 lines despite extractions | `components/QuestionSection.tsx` | Extract `<DoneToggle>`, `<QuestionNotes>`, `<QualityGateSection>` sub-components |
| ARCH-4 | `FinalizationScreen.tsx` (466 lines) mixes grades, export, summary | `components/FinalizationScreen.tsx` | Split into `<GradeSelector>`, `<ExportActions>`, `<FinalizationSummary>` |
| ARCH-5 | Inline styles in 3 components (8 instances total) | `Metadata.tsx`, `ActiveSession.tsx`, `Captures.tsx` | Extract `.btn-icon-remove`, `.capture-thumb` CSS classes |
| ARCH-6 | `components.css` (1394 lines) is a single monolith | `lib/components.css` | Split into `components/sidebar.css`, `components/evaluation.css`, `components/captures.css`, `components/metadata.css`, `components/modal.css` |
| ARCH-7 | `lib/hooks.ts` (focus/accessibility hooks) coexists with `hooks/` directory | `lib/hooks.ts`, `hooks/` | Move `useFocusTrap`, `useAutoFocus`, `useRovingTabIndex` to `hooks/` |
| ARCH-8 | Repeated pattern: toast + capturing state + error handling | Multiple components | Extracted `useCaptureAction` but similar patterns exist in finalization/export flows |

### Testing

| ID | Finding | File | Fix |
|----|---------|------|-----|
| TEST-3 | Fixture duplication — `makeCapture`, `makeEvaluation` params copy-pasted across 7 test files | `tests/*.test.ts(x)` | Centralize all factory variations in `tests/fixtures/` with builder pattern |
| TEST-4 | No integration test for full review lifecycle (create → score → capture → finalize → export) | Missing | Add `tests/review-lifecycle.test.ts` using `InMemorySessionRepository` |
| TEST-5 | `export-pipeline.ts` (310 lines) has limited test coverage | `tests/export.test.ts` | Add tests for edge cases: empty captures, missing metadata, special chars in filenames |
| TEST-6 | `session-repository.ts` quota check untested | `tests/session-repository.test.ts` | Mock `navigator.storage.estimate` and test quota-warn path |
| TEST-7 | E2E is a single smoke test that doesn't exercise the extension | `e2e/extension.spec.ts` | Add tests for: session creation, scoring, capture, export. Consider using Playwright's extension testing. |
| TEST-8 | No test for `ScoreOverviewBar` badge overflow at narrow widths | Missing | Add CSS/rendering test for `@media (max-width: 360px)` behavior |

### Performance

| ID | Finding | File | Fix |
|----|---------|------|-----|
| PERF-2 | Full session serialization on every autosave (1000ms interval) | `lib/auto-save.ts`, `lib/session-repository.ts` | Dirty-check: only serialize if Zustand state has changed since last save |
| PERF-3 | Screenshots stored as base64 strings in Zustand state | `stores/session.ts` | Store only capture metadata in Zustand; keep base64 in IDB. Load on demand. |
| PERF-4 | `computeScores` recalculated on every evaluation change | `components/Evaluation.tsx` | Memoize with `useMemo` keyed by evaluations array hash |
| PERF-5 | `report.css` (1085 lines) shipped with extension but only used in exports | `lib/report.css` | Don't bundle in sidepanel; only include in exported HTML |

### Accessibility

| ID | Finding | File | Fix |
|----|---------|------|-----|
| A11Y-4 | Radio groups in `ScoreOption` lack `aria-label` context | `components/ScoreOption.tsx` | Add `aria-label="Score for {question.title}"` to each radio group |
| A11Y-5 | Tab panels missing `role="tabpanel"` + `aria-labelledby` | `components/ActiveSession.tsx` | Add proper tab panel semantics |
| A11Y-6 | Capture thumbnail buttons too small for touch (24×24px) | `lib/components.css:565` | Increase to 32×32px minimum touch target |
| A11Y-7 | No focus trap in EvidenceModal (tldraw) | `components/EvidenceModal.tsx` | The `useFocusTrap` hook exists but may not be wired |
| A11Y-8 | Progress circle lacks `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | `components/ProgressCircle.tsx` | Add ARIA attributes for screen reader progress announcement |
| A11Y-9 | Toast notifications not announced to screen readers | `components/Toast.tsx` | Add `role="status"` and `aria-live="polite"` to toast container |
| A11Y-10 | Color swatches in ScoreOverviewBar rely on color alone | `components/ScoreOverviewBar.tsx` | Add text labels or patterns alongside colors (already has numbers — verify) |

### Security

| ID | Finding | File | Fix |
|----|---------|------|-----|
| SEC-2 | Custom metadata values not sanitized in export HTML | `lib/html-report.ts` | Escape all user-provided text through `esc()` before HTML insertion |
| SEC-3 | ZIP import lacks path traversal check for `../` in filenames | `lib/session-repository.ts` or import handler | Validate all ZIP entry paths are relative and don't escape target directory |
| SEC-4 | Reviewer name/email stored unencrypted in IDB | `stores/session.ts`, `stores/registry.ts` | Consider encrypting PII at rest, or document that IDB is not encrypted |
| SEC-5 | No integrity check on imported session data | Session import flow | Validate imported JSON against schema before loading into state |

### Type Safety

| ID | Finding | File | Fix |
|----|---------|------|-----|
| TYPE-1 | Session/Capture/Evaluation IDs are plain `string` | `lib/types.ts` | Add branded types: `type SessionId = string & { __brand: 'SessionId' }` |
| TYPE-2 | `Evaluation.score` allows `number` but should be `0 | 1 | 2 | 3` | `lib/types.ts` | Narrow to `type Score = 0 | 1 | 2 | 3` |
| TYPE-3 | Zustand `setEvaluation` accepts partial `Evaluation` without type narrowing | `stores/session.ts` | Use `Partial<Evaluation> & Pick<Evaluation, 'id'>` for required fields |

---

## P2 — Nice to Have (52 findings, highlights)

### Architecture
- Extract shared `<EmptyState>` component (used in Captures, Evaluation, SessionManager)
- Consolidate `lib/report-model.ts` and `lib/export-pipeline.ts` — overlapping concerns
- Add a proper state machine for session lifecycle (`empty → active → finalizing → done`)
- Remove `lib/contexts.tsx` — RubricContext can live in a hook file

### Testing
- Add snapshot tests for HTML report output (`html-report.ts`)
- Property-based tests for `computeScores` — random evaluation combinations
- Test rubric v1.1 with both `usesAi: true` and `usesAi: false` consistently
- Add visual regression tests for key components (using Playwright screenshots)

### Performance
- Lazy-load `lib/report.css` and `lib/logos.ts` — only needed in export path
- Consider `useDeferredValue` for score recalculation
- Batch IDB writes during multi-capture sequences
- Pre-compute session size estimate from capture count instead of full serialization

### Accessibility
- Add `aria-describedby` to form inputs linking to helper text
- Ensure all dialogs have `role="dialog"` and `aria-modal="true"`
- Add `aria-live="polite"` to score update announcements
- Add skip-link between tab navigation and tab content
- Verify all focus indicators visible at 200% zoom
- Add `prefers-reduced-motion` media query to disable animations

### Security
- Add Content-Security-Policy to exported HTML reports
- Strip tracking cookies/headers from captured pages
- Sanitize CSS in archived HTML (`<style>` tag injection)
- Rate-limit auto-save to prevent IDB thrashing

### Type Safety
- Make `RubricQuestion` and `RubricCategory` readonly with `as const` assertion
- Add exhaustive switch checking in score computation
- Type color hex values as template literal: `type HexColor = `#${string}`

---

## P3 — Future Consideration (25 findings)

- Replace string concatenation in `html-report.ts` with tagged template literals
- Add internationalization (i18n) infrastructure for all user-facing strings
- Extract design tokens from CSS to TypeScript for type-safe token access
- Add structured logging with log levels (debug/info/warn/error)
- Consider service worker for background export processing
- Add undo/redo support for evaluation changes
- Export reports to PDF (currently only HTML + ZIP)
- Add comparison view for re-evaluations (previous scores vs current)
- Collapsible rubric categories for focused review
- Evidence heatmap showing which questions have most/least evidence
- Score timestamps in CSV for audit trail
- Animate progress fraction on change
- Add rubric versioning for backward compatibility
- Consider IndexedDB encryption via Web Crypto API
- Move `data/rubrics/` into code (tree-shake unused rubrics)

---

## Effort Estimates

### Quick Wins (1 file, <1 hour each)
1. PERF-1: tldraw lazy-loading — massive bundle win, 3 lines changed
2. A11Y-3: Fix border-radius and box-shadow violations — 5 lines in CSS
3. TEST-2: Fix AllProviders to accept usesAi prop — 5 lines
4. A11Y-1: Add skip-link — 10 lines
5. SEC-1: Replace JSON.stringify quota check with size estimate — 10 lines
6. TYPE-2: Narrow Evaluation.score to union type — 1 line + minor callers

### Single-Sprint Items (2-5 files, focused scope)
1. ARCH-2: Split capture.ts into 3 focused modules
2. ARCH-7: Move lib/hooks.ts to hooks/ directory
3. ARCH-6: Split components.css into domain-specific files
4. TEST-1 + TEST-3: Add missing tests + centralize fixtures
5. A11Y sweep: Add ARIA attributes across all components

### Multi-Sprint Items (cross-cutting, requires planning)
1. ARCH-1: Refactor html-report.ts template system
2. PERF-3: Move screenshot base64 out of Zustand state
3. PERF-2: Dirty-check auto-save system
4. Full E2E test suite (TEST-7)
5. Branded types + exhaustive switch (TYPE-1, TYPE-2, TYPE-3)
