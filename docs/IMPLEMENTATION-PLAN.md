# Implementation Plan — Codebase Improvements (P0–P2 + Multi-Sprint Epics)

**Source**: `docs/IMPROVEMENT-SWEEP.md` (125 findings: 9 P0, 39 P1, 52 P2)
**Approach**: 5 sprints for P0/P1/P2, then 6 independent epics for cross-cutting work.
**Sprints are ordered by severity. Each sprint is one atomic commit group.**

---

## Sprint 1 — P0 Quick Wins (9 findings, ~1 day)

Single-focus changes, each <30 lines. Combined into one commit to minimize review overhead.

### 1.1 PERF-1: Lazy-load tldraw
- **File**: `components/EvidenceModal.tsx`
- **Change**: Replace static `import { Tldraw, ... } from "tldraw"` with:
  ```
  const Tldraw = React.lazy(() => import("tldraw").then(m => ({ default: m.Tldraw })));
  ```
  Keep named-type imports (`Editor`, `TLShapeId`, etc.) as static — they're types, erased at build.
- **Add**: `<Suspense fallback={<div>Loading annotation editor…</div>}>` wrapper around `<Tldraw>` usage.
- **Verify**: `pnpm build` — sidepanel chunk should drop from ~2.02MB to ~400KB. `pnpm test` — existing tests pass (EvidenceModal tests mock tldraw already).

### 1.2 A11Y-3: Fix CSS design-system violations
- **File**: `lib/components.css`
- **Line 874**: Replace `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)` with `border: 1px solid var(--ut-border)` on `.quick-note-overlay`.
- **Line 993**: Replace `border-radius: 3px` with `border-radius: var(--radius-md)` on first instance.
- **Line 1009**: Same replacement on second instance.
- **Verify**: Visual check that quick-note overlay and inline badges look correct. DESIGN.md mandates max 2px radius and zero box-shadow.

### 1.3 TEST-2: Fix AllProviders to accept usesAi prop
- **File**: `tests/helpers/render-utils.tsx`
- **Change**: Add optional `usesAi` prop to `AllProviders` with default `true`:
  ```tsx
  export function AllProviders({
    children,
    usesAi = true,
  }: {
    children: React.ReactNode;
    usesAi?: boolean;
  }) {
  ```
- **Update**: `renderWithProviders(ui, options?)` to pass `usesAi` through.
- **Add**: Export `renderWithoutAi(ui)` convenience wrapper for the common `usesAi: false` case.
- **Verify**: All existing tests pass (default is `true` — no behavior change).

### 1.4 A11Y-1: Add skip-link for keyboard navigation
- **File**: `components/AppShell.tsx`
- **Add**: At the very top of the component, before the header:
  ```tsx
  <a href="#main-content" className="skip-link">Skip to content</a>
  ```
- **File**: `lib/components.css`
- **Add**: Visually-hidden skip-link class that becomes visible on focus:
  ```css
  .skip-link {
    position: absolute;
    left: -9999px;
    top: 0;
    z-index: 100;
    padding: var(--space-1) var(--space-2);
    background: var(--ut-primary);
    color: var(--ut-on-accent);
    font-size: var(--text-sm);
  }
  .skip-link:focus {
    left: var(--space-2);
  }
  ```
- **Add**: `id="main-content"` to the main content container in `ActiveSession.tsx` tab panel area.

### 1.5 A11Y-2: Add aria-label to SessionManager session list
- **File**: `components/SessionManager.tsx`
- **Change**: Wrap the session list `<ul>` or container in `<section aria-label="Review sessions">`.
- **Verify**: Screen reader announces landmark region.

### 1.6 SEC-1: Replace JSON.stringify quota check
- **File**: `lib/session-repository.ts:71-86`
- **Current**: Serializes entire `SessionData` (including multi-MB base64 screenshots) just to check size.
- **Change**: Replace with estimation-based check:
  ```ts
  // Estimate: ~500KB base overhead + ~2MB per capture (screenshot + HTML)
  const estimatedSize = 500_000 + data.captures.length * 2_000_000;
  if (estimatedSize > headroom * 0.8) { ... warn ... }
  ```
- **Keep**: The `navigator.storage.estimate()` call (cheap, no serialization).
- **Verify**: Existing `session-repository.test.ts` still passes. The warning path still fires when storage is low.

### 1.7 TEST-1: Add tests for untested modules
- **New file**: `tests/principles.test.ts` — Test `getScoreColor()`, `getScoreLabel()`, all score levels, edge cases (score 0, na, unsure).
- **New file**: `tests/evaluation-state.test.ts` — Test `getEvaluationState()`, isScored/done transitions, `manualDone` override.
- **Files**: `lib/contexts.tsx` (RubricContext) and `components/RubricChipGroup.tsx` — these are React components, test via existing `renderWithProviders` pattern; add smoke tests confirming they render rubric data.
- **Verify**: All new tests pass, existing tests unchanged.

### 1.8 ARCH-2 + 1.9 ARCH-1 — Deferred to multi-sprint epics (see below)

**Sprint 1 does NOT include**: ARCH-1 (html-report refactor) and ARCH-2 (capture.ts split). These are large enough to be their own commits and have different risk profiles. They're covered as Sprint 2 items below.

---


## Sprint 2 — P1 Architecture (6 findings, ~1 day)

Focused refactoring. Each item is one commit.

### 2.1 ARCH-2: Split capture.ts into 3 modules
- **Current**: `lib/capture.ts` (367 lines) — god object mixing Chrome API, DOM sanitization, data extraction.
- **Create directory**: `lib/capture/`
- **Split into**:
  - `lib/capture/sanitize.ts` — `archivePageHtml()` and all its helpers (lines 8–~200). Pure DOM manipulation, no Chrome APIs.
  - `lib/capture/extract.ts` — `extractLogoFromPage()` (lines ~240–338). Runs via `chrome.scripting.executeScript`.
  - `lib/capture/browser.ts` — `captureActiveTab()`, `captureForMetadataField()`, `captureCurrentPageInfo()` (Chrome API calls).
  - `lib/capture/index.ts` — Re-exports public API so all consumers still import from `@/lib/capture`.
- **Update imports**: Consumers currently import from `"@/lib/capture"` — no change needed if index.ts re-exports everything.
- **Verify**: `pnpm typecheck && pnpm test && pnpm build`. All 496+ tests pass.

### 2.2 ARCH-7: Move lib/hooks.ts into hooks/ directory
- **Current**: `lib/hooks.ts` (101 lines) exports `useFocusTrap`, `useRovingTabIndex`, `useAutoFocus`.
- **Consumers**: `ActiveSession.tsx`, `ConfirmDialog.tsx`, `EvidenceModal.tsx`, `NewSessionModal.tsx` — all import from `"@/lib/hooks"`.
- **Move**: `lib/hooks.ts` → `hooks/focus.ts` (rename to be descriptive).
- **Create**: `hooks/index.ts` barrel that re-exports from `focus.ts` alongside existing hooks.
- **Update**: All 4 consumer imports from `"@/lib/hooks"` → `"@/hooks"`.
- **Delete**: `lib/hooks.ts`.
- **Verify**: `pnpm typecheck && pnpm test`.

### 2.3 ARCH-3: Extract sub-components from QuestionSection
- **Current**: `components/QuestionSection.tsx` (678 lines) — largest component.
- **Extract into separate files**:
  - `components/question-section/DoneToggle.tsx` — the manual-done override button (already partially extracted as inline).
  - `components/question-section/QuestionNotes.tsx` — the notes textarea + char count.
  - `components/question-section/QualityGateSection.tsx` — pass/fail/na/unsure radio group (distinct from scoring questions).
- **Barrel**: `components/question-section/index.ts` re-exports `QuestionSection` as default.
- **Verify**: No visual change. `pnpm typecheck && pnpm test`.

### 2.4 ARCH-4: Extract sub-components from FinalizationScreen
- **Current**: `components/FinalizationScreen.tsx` (466 lines).
- **Extract**:
  - `components/finalization/GradeSelector.tsx` — pass/conditional/fail grade buttons.
  - `components/finalization/ExportActions.tsx` — export + save buttons.
- **Verify**: `pnpm typecheck && pnpm test`.

### 2.5 ARCH-5: Replace inline styles with CSS classes
- **Files**: `components/Metadata.tsx`, `components/ActiveSession.tsx`, `components/Captures.tsx`.
- **Pattern**: Find `style={{ ... }}` attributes, extract equivalent CSS classes in `lib/components.css`.
- **Common classes to extract**:
  - `.btn-icon-remove` — small icon button for remove/delete actions.
  - `.capture-thumb` — capture thumbnail sizing.
- **Verify**: Visual regression check. `pnpm typecheck && pnpm test`.

### 2.6 ARCH-6: Split components.css into domain files
- **Current**: `lib/components.css` (1394 lines) — monolith.
- **Split into** (all under `lib/components/`):
  - `sidebar.css` — `.sidebar-*`, `.sidebar-tab-*` (~100 lines).
  - `evaluation.css` — `.score-*`, `.score-row-*`, `.score-option-*` (~200 lines).
  - `captures.css` — `.capture-*`, `.evidence-thumb-*`, `.quick-note-*` (~200 lines).
  - `metadata.css` — `.meta-*` (~150 lines).
  - `modal.css` — `.modal-*`, `.confirm-dialog-*` (~100 lines).
  - `score-overview.css` — `.score-overview-bar-*` (~150 lines).
  - `finalization.css` — `.grade-*`, `.finalization-*` (~100 lines).
  - `session-manager.css` — `.session-*` (~100 lines).
  - `shared.css` — everything else, utility classes (~300 lines).
- **Create barrel**: `lib/components/index.css` that `@import`s all of the above.
- **Update**: Main entry CSS file imports `lib/components/index.css` instead of `lib/components.css`.
- **Delete**: `lib/components.css`.
- **Verify**: `pnpm build` — visual output identical. No class name changes.

|

---

## Sprint 3 — P1 Testing (6 findings, ~1 day)

### 3.1 TEST-3: Centralize test fixtures
- **Current**: `makeCapture`, `makeEvaluation`, `makeMetadata` params copy-pasted across 7+ test files with local variations.
- **Refactor**: Move all factory functions into `tests/fixtures/index.ts` (already have `tests/fixtures.ts` — extend or rename).
- **Add**: Builder-pattern helpers for common variations:
  ```ts
  makeCapture({ metadataField: "toolLogoUrl" })  // logo capture
  makeEvaluation({ score: 3 })                    // scored evaluation
  ```
- **Update**: All test files import from centralized fixtures.
- **Delete**: Duplicate factory definitions in individual test files.
- **Verify**: All tests pass with identical behavior.

### 3.2 TEST-4: Add review lifecycle integration test
- **New file**: `tests/review-lifecycle.test.ts`
- **Scope**: Full session lifecycle using `InMemorySessionRepository`:
  1. Create session with metadata
  2. Add captures (screenshot + HTML archive)
  3. Score evaluations across quality gates and scoring questions
  4. Link evidence to evaluations
  5. Finalize (set grade, conclusion, strengths, weaknesses)
  6. Export to ZIP blob
  7. Import ZIP blob and verify round-trip
- **Key assertions**: Score computation correct, evidence links preserved, export contains expected files.
- **Verify**: New test passes, existing tests unchanged.

### 3.3 TEST-5: Expand export-pipeline test coverage
- **File**: `tests/export.test.ts`
- **Add test cases**:
  - Empty captures array → export succeeds, no image files in ZIP
  - Missing optional metadata fields → export uses defaults/fallbacks
  - Special characters in tool name → sanitized in filenames (no path traversal)
  - Very long tool name → truncated in filenames
  - Session with `usesAi: false` → AI-only questions excluded from export
- **Verify**: All new tests pass.

### 3.4 TEST-6: Test session-repository quota check
- **File**: `tests/session-repository.test.ts`
- **Add**: Mock `navigator.storage.estimate` to return low quota, verify warning is logged.
- **Note**: After Sprint 1 SEC-1 change, this tests the estimation-based check (not JSON.stringify).
- **Verify**: Warning path fires correctly. Normal save path unaffected.

### 3.5 TEST-8: Test ScoreOverviewBar at narrow widths
- **New file**: `tests/score-overview-bar-narrow.test.tsx`
- **Test**: Render `ScoreOverviewBar` with many scored questions, verify badges don't overflow at 320px and 360px widths.
- **Approach**: Use `renderWithProviders` + check that `.score-overview-bar__badge` elements exist and don't have zero dimensions.
- **Verify**: New test passes.

### 3.6 TEST-7 (E2E expansion) — Deferred to Multi-Sprint Epic E8
Full E2E suite requires Playwright extension testing setup. Too large for this sprint.

---

## Sprint 4 — P1 Performance / A11Y / Security / Types (15 findings, ~2 days)

Mixed discipline. Grouped to minimize context-switching within each domain.

### Performance

#### 4.1 PERF-2: Dirty-check auto-save
- **Current**: `lib/session-lifecycle.ts` auto-save fires on every Zustand `subscribe()` callback (debounced 1s), even if nothing changed.
- **Change**: Store a hash of the last-saved state. On subscribe callback, compute current state hash and skip `autoSaveFlush` if identical.
- **Hash strategy**: Cheap comparison — check `evaluations.length`, `captures.length`, and `session.finalizedAt` before deep compare. Only deep-compare `evaluations` (small array).
- **Files**: `lib/session-lifecycle.ts`
- **Verify**: Auto-save still fires on real changes. Add test confirming no save when state unchanged.

#### 4.2 PERF-4: Optimize ScoreOverviewBar score computation
- **Current**: `components/ScoreOverviewBar.tsx` computes badge states and scored counts inline on every render without memoization.
- **Change**: Wrap the `scored/total` computation and badge-building logic in `useMemo` keyed by `evaluations`, `captures`, and `rubric`.
- **Verify**: Rendering test passes. No visual change.

#### 4.3 PERF-5: Exclude report.css from sidepanel bundle
- **Current**: `lib/report.css` (1085 lines) is imported via `?raw` in `lib/html-report.ts` (line 23), so it's already only in the export path — not in the sidepanel JS bundle. **Verified: already optimized.**
- **Status**: No change needed. The `?raw` import causes Vite to inline the CSS as a string constant, which is only referenced in the export function. It does not ship in the sidepanel chunk.

### Accessibility

#### 4.4 A11Y-4: Add aria-label to ScoreOption radio groups
- **File**: `components/ScoreOption.tsx`
- **Change**: Add `aria-label={`Score for ${questionTitle}`}` to the radio group container or `<input>` elements. Pass `questionTitle` as prop from `QuestionSection`.
- **Verify**: Axe audit passes. Screen reader announces context.

#### 4.5 A11Y-5: Add tab panel semantics
- **File**: `components/ActiveSession.tsx`
- **Change**: Add `role="tabpanel"` and `aria-labelledby={tabId}` to each tab panel content area. Ensure `id` attributes on tab buttons match.
- **Verify**: Tab navigation works with screen reader. Biome a11y lint passes.

#### 4.6 A11Y-6: Increase capture thumbnail touch target
- **File**: `lib/components.css` (or split file after Sprint 2.6)
- **Change**: Increase `.evidence-thumb-overlay button` from 24×24px to 32×32px (minimum touch target per WCAG).
- **Verify**: Visual check — buttons slightly larger but still fit in thumbnail overlay.

#### 4.7 A11Y-7: Wire focus trap in EvidenceModal
- **File**: `components/EvidenceModal.tsx`
- **Current**: Imports `useFocusTrap` but may not be applied to the modal container.
- **Change**: Apply `useFocusTrap(containerRef)` to the modal overlay div. Ensure focus cycles within modal when open.
- **Verify**: Tab key stays within modal. Escape closes modal.

#### 4.8 A11Y-8: Add ARIA attributes to ProgressCircle
- **File**: `components/ProgressCircle.tsx`
- **Change**: Add `role="progressbar"`, `aria-valuenow={pct}`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-label="Review progress"` to the SVG or wrapper.
- **Verify**: Screen reader announces progress percentage.

#### 4.9 A11Y-9: Announce toast notifications
- **File**: `components/Toast.tsx`
- **Change**: Add `role="status"` and `aria-live="polite"` to the toast container div.
- **Verify**: Screen reader announces toast messages when they appear.

#### 4.10 A11Y-10: Verify color + text in ScoreOverviewBar
- **File**: `components/ScoreOverviewBar.tsx`
- **Current**: Badges already display score numbers alongside colors — verify this is sufficient.
- **If insufficient**: Add a `title` attribute or visually-hidden text label per badge.
- **Verify**: No color-only information.

### Security

#### 4.11 SEC-2: Sanitize metadata values in export HTML
- **File**: `lib/html-report.ts`
- **Change**: Audit all user-provided text insertions (tool name, reviewer name, description, notes, conclusions). Ensure every `${variable}` in template literals goes through the existing `esc()` HTML-escape function.
- **Verify**: Export HTML with `<script>alert(1)</script>` as tool name — script tag is escaped.

#### 4.12 SEC-3: Add path traversal check to ZIP import
- **File**: `lib/export.ts` (import path)
- **Change**: Before extracting each ZIP entry, validate that the filename:
  - Does not start with `/`
  - Does not contain `..`
  - Does not contain `\` (Windows path traversal)
- **Add test**: Import ZIP with `../../etc/passwd` entry → throws error.
- **Verify**: Normal imports still work. Malicious ZIPs are rejected.

#### 4.13 SEC-4: Document IDB PII handling
- **Files**: `stores/session.ts`, `stores/registry.ts`
- **Change**: Add JSDoc comments documenting that reviewer name/email are stored unencrypted in IDB. Link to browser IDB security docs.
- **Rationale**: Encrypting at rest is complex (key management, Web Crypto overhead). Documenting the trade-off is the pragmatic fix. Full encryption deferred to P3.
- **Verify**: Comments present, no behavior change.

#### 4.14 SEC-5: Validate imported session schema
- **File**: `lib/session-lifecycle.ts` (`importSessionFromZipFile`)
- **Change**: After parsing imported JSON, validate:
  - `metadata.id` is a non-empty string
  - `metadata.toolName` is a non-empty string
  - `evaluations` is an array
  - `captures` is an array
  - `schemaVersion` is a number ≤ current version
- **On failure**: Throw descriptive error, don't load into state.
- **Verify**: Import test with malformed JSON → error thrown.

### Type Safety

#### 4.15 TYPE-3: Narrow setEvaluation parameter type
- **File**: `stores/session.ts`
- **Current**: `setEvaluation(rubricId: string, patch: Partial<Evaluation>)` — allows omitting `rubricId` from patch (since it's a separate param), but also allows omitting `score`.
- **Change**: Accept `patch: Partial<Evaluation>` as-is (the caller controls what fields to set). This is already correct — the `Partial<Evaluation>` type is appropriate because `setEvaluation` does a shallow merge.
- **Re-evaluation**: After reading the code, TYPE-3 is already well-handled. The `setEvaluation` correctly merges partial patches. **Skip this item** — no change needed.

#### 4.16 TYPE-2: Evaluate score type narrowing
- **Current**: `EvaluationScore = QualityGateScore | ScoringScore` = `"pass" | "fail" | "na" | "unsure" | "" | 0 | 1 | 2 | 3`. This is already a discriminated union.
- **Re-evaluation**: The type is already narrow. Further splitting (e.g., separate types for quality-gate vs scoring evaluations) would complicate the store since both share the same `Evaluation` interface. **Skip** — the current type is adequate.

#### 4.17 TYPE-1: Branded types for IDs
- **Deferred to Multi-Sprint Epic E5** — requires changes across types.ts, all stores, all repositories, and all tests. High touch count for moderate benefit.

---

## Sprint 5 — P2 Nice-to-Have (curated subset, ~2 days)

52 P2 findings total. Below is a curated subset with highest impact. Remaining P2 items are listed as optional appendices.

### Architecture

#### 5.1 Extract shared EmptyState component
- **Files**: `components/Captures.tsx`, `components/Evaluation.tsx`, `components/SessionManager.tsx`
- **Current**: Each has its own "no data yet" empty state markup.
- **Create**: `components/EmptyState.tsx` — accepts `icon`, `title`, `description`, `action` props.
- **Replace**: All 3 inline empty states with `<EmptyState>`.
- **Verify**: Visual regression check. `pnpm test`.

#### 5.2 Consolidate report-model and export-pipeline
- **Files**: `lib/report-model.ts` (301 lines), `lib/export-pipeline.ts` (310 lines)
- **Current**: Overlapping concerns — both deal with transforming session data for export.
- **Change**: Merge into a single `lib/export-pipeline.ts`. `report-model.ts` was an intermediate extraction that hasn't paid for itself.
- **Delete**: `lib/report-model.ts`, re-export types from `export-pipeline.ts`.
- **Verify**: `pnpm typecheck && pnpm test && pnpm build`.

#### 5.3 Remove lib/contexts.tsx
- **File**: `lib/contexts.tsx` — exports `RubricContext`, `useRubric`, `TabNavigationContext`.
- **Move**: Into `hooks/useRubric.ts` (for RubricContext + useRubric) and appropriate component file for TabNavigationContext.
- **Update**: All consumers to import from new locations.
- **Verify**: `pnpm typecheck && pnpm test`.

### Testing

#### 5.4 Snapshot test for HTML report output
- **New file**: `tests/html-report-snapshot.test.ts`
- **Approach**: Generate report HTML with known inputs, snapshot the output. Future changes that break the report format will be caught.
- **Content**: Test with a fully-scored session (all questions answered), usesAi=true.
- **Verify**: Snapshot matches expected output.

#### 5.5 Property-based test for computeScores
- **New file**: `tests/compute-scores-property.test.ts`
- **Approach**: Generate random combinations of evaluations (various score values, na, unsure, empty). Assert invariants:
  - Total score is always 0-100 (percentage)
  - Unanswered questions are excluded from denominator
  - NA questions are excluded from denominator
- **Verify**: Property tests pass for thousands of random inputs.

#### 5.6 Test rubric with usesAi: false
- **Files**: `tests/compute-scores.test.ts`, `tests/rubric.test.ts`
- **Add**: Test cases confirming AI-only questions are excluded when `usesAi: false`.
- **Leverage**: Sprint 1 `renderWithoutAi` helper for component tests.
- **Verify**: Tests pass.

### Performance

#### 5.7 Lazy-load logos in export path
- **Files**: `lib/html-report.ts`
- **Current**: `report.css` is already loaded via `?raw` (not in sidepanel bundle). `logos.ts` is statically imported — small (16 lines of SVG constants), low priority.
- **Change**: If bundle analysis shows logos in sidepanel chunk, convert to dynamic `import()`. Otherwise skip — marginal benefit for 16 lines.
- **Verify**: Export still produces correct HTML.

#### 5.8 Batch IDB writes during multi-capture
- **File**: `lib/session-lifecycle.ts`
- **Current**: Each capture triggers a separate auto-save debounce.
- **Change**: Add a "batch mode" flag. When multiple captures are queued (useCaptureQueue), suppress auto-save until batch completes, then flush once.
- **Verify**: Multi-capture scenario only triggers one save.

### Accessibility

#### 5.9 Add aria-describedby to form inputs
- **Files**: `components/Metadata.tsx`, `components/QuestionSection.tsx`
- **Change**: Link helper text `<p>` elements to inputs via `aria-describedby`. Add `id` attributes to description paragraphs.
- **Verify**: Screen readers announce helper text when input is focused.

#### 5.10 Ensure dialogs have role="dialog" + aria-modal
- **Files**: `components/EvidenceModal.tsx`, `components/ConfirmDialog.tsx`, `components/NewSessionModal.tsx`
- **Audit**: Check each modal/dialog has `role="dialog"` and `aria-modal="true"`.
- **Fix**: Add attributes where missing.
- **Verify**: Screen reader identifies modals correctly.

#### 5.11 Add prefers-reduced-motion support
- **File**: `lib/tokens.css` or `lib/base.css`
- **Add**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Verify**: Animations disabled when OS setting is enabled.

### Security

#### 5.12 Add CSP meta tag to exported HTML reports
- **File**: `lib/html-report.ts`
- **Add**: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;">` in the `<head>` of exported reports.
- **Rationale**: Exported reports are standalone HTML. CSP prevents any injected scripts from executing.
- **Verify**: Exported report renders correctly. No console errors.

#### 5.13 Rate-limit auto-save
- **File**: `lib/session-lifecycle.ts`
- **Current**: Debounce at 1000ms.
- **Change**: Add hard rate limit — maximum one save per 3 seconds, even if multiple state changes occur. Track last-save timestamp.
- **Verify**: Rapid state changes don't cause save storms.

### Type Safety

#### 5.14 Make rubric data readonly
- **File**: `lib/rubric.ts`
- **Change**: Add `as const` to `RUBRIC_DATA` import/usage. Ensure `RubricQuestion` and `RubricCategory` types reflect readonly.
- **Verify**: `pnpm typecheck` — callers that mutate rubric data will now error (expected — rubric should be immutable).

#### 5.15 Type color hex values
- **File**: `lib/tokens.css` → `lib/types.ts`
- **Add**: `type HexColor = \`#\${string}\`` and use for color-returning functions in `lib/principles.ts`.
- **Verify**: `pnpm typecheck`.

---

## Multi-Sprint Epics

These are cross-cutting changes that span multiple files/systems. Each epic is independently schedulable. Order does not imply priority — they can run in any sequence after Sprints 1–5.

### Epic E1: Refactor html-report.ts template system (ARCH-1)
- **Current state**: `lib/html-report.ts` (625 lines) builds HTML via string concatenation with `${variable}` interpolation. Hard to review, easy to introduce XSS, no syntax highlighting.
- **Approach**: Convert to tagged template literals with a safe `html` tag that auto-escapes interpolations:
  ```ts
  function html(strings: TemplateStringsArray, ...values: unknown[]): string {
    return strings.reduce((acc, str, i) =>
      acc + esc(String(values[i - 1] ?? '')) + str);
  }
  ```
- **Scope**: Rewrite all template-building functions to use `html` tagged templates. ~625 lines → ~500 lines (cleaner syntax).
- **Files changed**: `lib/html-report.ts`, `tests/html-report*.test.ts`
- **Risk**: Medium — must verify exported HTML is byte-identical before/after. Snapshot tests (Sprint 5.4) help here.
- **Dependencies**: Sprint 5.4 (snapshot tests) should land first to catch regressions.

### Epic E2: Move screenshots out of Zustand state (PERF-3)
- **Current state**: `Capture.screenshotBase64` and `Capture.annotatedScreenshotBase64` stored in Zustand store, serialized on every state change, loaded into memory for every render.
- **Approach**:
  1. Add a separate IDB object store `screenshots` keyed by capture ID.
  2. Split `Capture` type: `CaptureMeta` (lightweight, stays in Zustand) vs `CaptureBlob` (heavy, IDB-only).
  3. On capture, write base64 to IDB screenshots store, store only metadata in Zustand.
  4. Load screenshots on demand: `EvidenceModal`, `Captures.tsx` thumbnails, export pipeline.
- **Files changed**: `lib/types.ts`, `stores/session.ts`, `lib/session-repository.ts`, `lib/session-lifecycle.ts`, `lib/export-pipeline.ts`, `lib/export.ts`, `lib/html-report.ts`, `components/EvidenceModal.tsx`, `components/Captures.tsx`, `components/EvidenceThumbnails.tsx`, ~15 test files.
- **Risk**: High — touches the core data model, all consumers, and all tests. Requires careful migration (existing sessions in IDB must still load).
- **Migration**: On `loadSession`, detect old format (captures with `screenshotBase64`), migrate to new format (split into metadata + blob store), save back.
- **Benefit**: Zustand state shrinks from multi-MB to ~KB. React rendering becomes fast. Auto-save is cheap.
- **Dependencies**: None, but should land after Sprint 1 (SEC-1 quota fix) and Sprint 4.1 (dirty-check auto-save).

### Epic E3: Dirty-check auto-save (PERF-2)
- **Note**: This is Sprint 4.1 as a P1 item. Listed here only for completeness — it's small enough to be a sprint item, not a full epic.
- **Status**: Covered in Sprint 4.

### Epic E4: Full E2E test suite (TEST-7)
- **Current state**: Single smoke test in `e2e/extension.spec.ts`.
- **Approach**: Use Playwright's experimental extension testing to test the full browser extension:
  1. Session creation flow
  2. Scoring flow (quality gates + scoring questions)
  3. Capture flow (screenshot + evidence linking)
  4. Finalization + export flow
  5. Import flow (round-trip verification)
- **Infrastructure**: Set up Playwright extension testing in CI. Requires a test manifest and fixture extension.
- **Files**: `e2e/*.spec.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`
- **Risk**: Medium — Playwright extension testing has rough edges. May need to iterate on setup.
- **Dependencies**: None.

### Epic E5: Branded types + exhaustive switches (TYPE-1)
- **Approach**: Add branded types for `SessionId`, `CaptureId`, `EvaluationId`:
  ```ts
  type SessionId = string & { readonly __brand: unique symbol };
  const asSessionId = (s: string) => s as SessionId;
  ```
- **Scope**: Update `lib/types.ts`, all stores, all repositories, all test fixtures.
- **Also**: Add exhaustive switch checking in `computeScores` and `getScoreColor` using `never` type:
  ```ts
  default: { const _exhaustive: never = score; throw new Error(`Unhandled: ${_exhaustive}`); }
  ```
- **Risk**: Low but high-touch — many files changed. Compile-time safety improvement.
- **Dependencies**: None.

### Epic E6: Session lifecycle state machine
- **Current state**: Session status is `"started" | "done"` managed ad-hoc across `SessionMetadata.status`, `StoreStatus`, and `RegistryStore`.
- **Approach**: Define explicit states and transitions:
  ```
  empty → loading → active → finalizing → done
  ```
  Each state has legal transitions. Prevent impossible operations (e.g., adding captures when "done").
- **Implementation**: Use a Zustand middleware or a simple `validateTransition(from, to)` guard.
- **Files**: `lib/types.ts`, `stores/session.ts`, `stores/registry.ts`, `lib/session-lifecycle.ts`, `components/ActiveSession.tsx`
- **Risk**: Medium — must ensure all callers respect the state machine.
- **Dependencies**: None.

### Epic E7: IDB schema versioning and migration
- **Current state**: `schemaVersion: 2` is stored but there's no migration logic. When v3 arrives, existing data is at risk.
- **Approach**: Add a migration runner in `session-repository.ts`:
  ```ts
  const MIGRATIONS: Record<number, (data: unknown) => SessionData> = {
    1: migrateV1toV2,
    2: migrateV2toV3,
    // future migrations
  };
  ```
  On load, check `schemaVersion`, run all applicable migrations.
- **Files**: `lib/session-repository.ts`, new file `lib/migrations.ts`
- **Risk**: Low — additive. Existing data continues to work.
- **Dependencies**: Should land before Epic E2 (screenshot split) which will need a migration.

### Epic E8: HTML report template refactor (ARCH-1, expanded)
- **Note**: This is the same as Epic E1. Listed for cross-reference with the original 5 multi-sprint items.


---

## Additional Multi-Sprint Proposals (not in original 5)

Beyond the 5 multi-sprint items listed in the improvement sweep summary, I identified 3 more cross-cutting opportunities worth your assessment:

### Proposal P-A: Session lifecycle state machine (→ Epic E6 above)
Already detailed as Epic E6. The ad-hoc status management across `SessionMetadata.status`, `StoreStatus`, and `RegistryStore` creates implicit invariants that are easy to violate. A state machine makes transitions explicit and prevents impossible states. **Recommend**: Include — it's a foundation that makes future changes (like Epic E2 screenshot split) safer.

### Proposal P-B: IDB schema versioning and migration (→ Epic E7 above)
Already detailed as Epic E7. Currently `schemaVersion: 2` is stored but never checked. The next schema change (e.g., Epic E2's screenshot split) will silently break existing user data without a migration path. **Recommend**: Include before E2 — it's small, additive, and prevents data loss.

### Proposal P-C: Component test isolation standardization
- **Current state**: Tests use two patterns inconsistently:
  1. `vi.mock("./ChildComponent")` → renders as `<div>` (fast, isolated)
  2. Full rendering with real children (slower, more realistic)
- **Proposal**: Standardize on pattern 1 for unit tests, pattern 2 for integration tests only. Create a `tests/helpers/mock-components.ts` utility with standard mock factories.
- **Effort**: Low — refactor existing tests to consistent pattern.
- **Recommend**: Optional — reduces test fragility but not blocking.

---

## Items Intentionally Skipped (with rationale)

| Finding | Why Skipped |
|---------|-------------|
| TYPE-2 (narrow Evaluation.score) | `EvaluationScore` is already a discriminated union. Further narrowing would complicate the shared `Evaluation` interface. |
| TYPE-3 (setEvaluation parameter) | `Partial<Evaluation>` is correct — `setEvaluation` does shallow merge. No change needed. |
| ARCH-8 (toast + capturing state pattern) | Already addressed by `useCaptureAction` extraction. Remaining patterns (finalization/export) are sufficiently distinct. |
| PERF-3 (screenshots in Zustand) | Deferred to Epic E2 — high-risk, high-reward. Needs its own sprint. |
| TEST-7 (E2E expansion) | Deferred to Epic E4 — requires Playwright extension testing infrastructure. |
| TYPE-1 (branded types) | Deferred to Epic E5 — high touch count for moderate benefit. |

---

## Execution Order Summary

```
Sprint 1 (P0 Quick Wins)        ← Start here
  │
  ├─→ Sprint 2 (P1 Architecture)
  ├─→ Sprint 3 (P1 Testing)
  └─→ Sprint 4 (P1 Perf/A11Y/Sec/Types)
       │
       └─→ Sprint 5 (P2 Nice-to-Have)
            │
            └─→ Epics (any order, independently schedulable)
                 E1: HTML report template refactor
                 E2: Screenshots out of Zustand  ← highest impact
                 E4: E2E test suite
                 E5: Branded types
                 E6: Session lifecycle state machine
                 E7: IDB schema migrations        ← prerequisite for E2
                 P-C: Test isolation standardization (optional)
```

**Recommended epic ordering**: E7 → E2 → E1 → E6 → E5 → E4. Rationale: E7 (migrations) is a prerequisite for E2 (screenshot split). E1 (report refactor) is safe once snapshot tests exist. E6 (state machine) is foundational. E5 and E4 are independent.

---

## Total Scope

| Category | Items | Files Changed (est.) | New Tests (est.) |
|----------|-------|---------------------|------------------|
| Sprint 1 | 7 | 12 | 15 |
| Sprint 2 | 6 | 20 | 5 |
| Sprint 3 | 5 | 8 | 30 |
| Sprint 4 | 13 | 18 | 10 |
| Sprint 5 | 15 | 20 | 12 |
| **Sprints total** | **46** | **~78** | **~72** |
| Epics | 6 | ~60 | ~40 |
| **Grand total** | **52** | **~138** | **~112** |
