# Consolidated Implementation Plan

**Date**: 2026-05-28
**Sources**: 6 independent review passes + roborev automated reviews
**Status**: Ready for prioritization

---

## Executive Summary

Across 6 review passes (code quality, architecture/testing, security/performance, impeccable audit, UI/UX design, data viz/content), **67 unique findings** were identified. After deduplication across reviews, **37 distinct issues** remain.

| Severity | Count | Description |
|----------|-------|-------------|
| P0 | 2 | Must fix — data loss or accessibility blocker |
| P1 | 12 | Should fix — UX, maintainability, correctness |
| P2 | 14 | Nice to have — polish, performance, design system |
| P3 | 9 | Future consideration |
| **New Features** | 8 | Exciting opportunities identified by reviewers |

### Already Fixed (This Session)
- ✅ Keyboard accessibility: `tabIndex={0}` added to score labels (roborev #355)
- ✅ `manualDone` toggle: uses `undefined` instead of `false` (roborev #355)
- ✅ Stale documentation: 6 findings corrected in docs/report-analysis/ (roborev #351)
- ✅ Empty commit removed from history (roborev #358)

---

## Phase 1: P0 — Must Fix

### P0-1: `markDoneAndClose` fire-and-forget save → data loss risk
**Found by**: architecture-testing, security-performance
**Files**: `lib/session-lifecycle.ts`
The final save before session close uses `saveCurrentSession()` (fire-and-forget). If IDB write fails, session is marked "done" but final state is lost.
**Fix**: Change to `saveCurrentSessionAsync()` (awaited) with error handling. Only clear store on success.

### P0-2: Radiogroups lack accessible names
**Found by**: impeccable-audit
**Files**: `components/QuestionSection.tsx` (lines 33, 104)
Screen readers announce "radiogroup" without context — users cannot tell which question they are scoring. Affects every quality gate and scoring question.
**Fix**: Add `aria-label` to each `role="radiogroup"` div: `aria-label="Score for ${question.title}"`.

---

## Phase 2: P1 — Should Fix

### P1-1: Decompose `QuestionSection.tsx` (753 lines, 6x duplicated handlers)
**Found by**: code-quality
**Files**: `components/QuestionSection.tsx`
Extract `ScoreOption` component for the 6x repeated label + radio + click/keyDown pattern. Reduces file by ~200 lines.

### P1-2: `useActiveSession` causes over-rendering
**Found by**: code-quality
**Files**: `hooks/useActiveSession.ts`
Hook returns 17 bindings as new object every call. Every consumer re-renders on any state change.
**Fix**: Split into `useSessionActions` + `useSessionState`, or use Zustand shallow comparison.

### P1-3: `archivePageHtml` (200 lines) has no unit tests
**Found by**: code-quality, architecture-testing
**Files**: `lib/capture.ts`
Core DOM sanitization logic (script stripping, CSS inlining, URL resolution) is untested.
**Fix**: Extract sanitization into testable pure functions that take a `Document` and return a sanitized clone.

### P1-4: Design system violations — `border-radius: 4px` in 6 locations
**Found by**: impeccable-audit
**Files**: `lib/components.css` (lines 828, 858, 933, 950, 966, 981)
DESIGN.md specifies 0–2px radius. Six locations use 4px.
**Fix**: Replace with `var(--radius-md)` (2px).

### P1-5: Hardcoded `#fff` instead of `--ut-white` token
**Found by**: impeccable-audit
**Files**: `lib/components.css` (lines 802, 830, 864, 951, 969, 983)
Design system defines `--ut-white: #fafbfc` (navy-tinted). Raw `#fff` breaks the "no pure white" rule.
**Fix**: Replace with `var(--ut-white)`.

### P1-6: `box-shadow` on grade button contradicts flat-surface rule
**Found by**: impeccable-audit
**Files**: `lib/components.css` (line 1245)
DESIGN.md: "No `box-shadow` anywhere in the system."
**Fix**: Replace with `border: 2px solid currentColor` treatment.

### P1-7: Score row touch targets below 44px
**Found by**: impeccable-audit
**Files**: `lib/components.css` (.score-row)
Score badges are 18×18px. Interactive labels should have min 24px height.
**Fix**: Add `min-height: 24px` and adequate padding to `.score-row`.

### P1-8: Distribution bars have poor data-ink ratio (Tufte)
**Found by**: data-viz-content
**Files**: `lib/rubric.ts`, `lib/report.css`
Most categories show single-color bars. Replace with numeric display.
**Fix**: Replace with compact "avg X.X/3.0" display.

### P1-9: Score circles lack numeric labels
**Found by**: data-viz-content
**Files**: `lib/html-report.ts`
4 filled/empty circles (●●●○) are ambiguous for non-experts.
**Fix**: Add "3/4" label next to each circle group.

### P1-10: Rubric scoring criteria are vague
**Found by**: data-viz-content
**Files**: `data/rubrics/trust-full.json`
"Partially meets the criterion" is subjective. Needs concrete, measurable indicators.
**Fix**: Add specific examples for each score level.

### P1-11: ScoreOverviewBar badges overflow at 320px width
**Found by**: ui-ux-design
**Files**: `lib/components.css`, `components/ScoreOverviewBar.tsx`
14 badges don't fit in single row at narrow sidepanel width.
**Fix**: Collapse to counts at ≤360px.

### P1-12: No empty state for evaluation tab
**Found by**: ui-ux-design
**Files**: `components/Evaluation.tsx`
No guidance when no evaluations exist.
**Fix**: Add empty state with CTA to switch to Captures tab.

---

## Phase 3: P2 — Nice to Have

### P2-1: Single color source of truth
**Found by**: code-quality
**Files**: `lib/tokens.css`, `lib/rubric.ts`, `lib/principles.ts`
Colors defined in 3 places. Changes require coordinated edits.
**Fix**: Define all colors in `principles.ts`, generate CSS tokens.

### P2-2: Auto-save serializes multi-MB SessionData every 300ms
**Found by**: security-performance
**Files**: `lib/session-repository.ts`, `lib/auto-save.ts`
`JSON.stringify` for quota check is expensive with large screenshots.
**Fix**: Approximate payload size from capture count; skip stringify.

### P2-3: Screenshot compression runs unbounded parallel
**Found by**: security-performance
**Files**: `lib/html-report.ts`
`Promise.all` on all captures at once causes memory spike.
**Fix**: Batch in groups of 4-6.

### P2-4: `export.ts` (456 lines) mixes concerns
**Found by**: architecture-testing
**Files**: `lib/export.ts`
Minification, ZIP assembly, CSV generation all in one file.
**Fix**: Extract `lib/minify.ts` and `lib/export-zip.ts`.

### P2-5: `FinalizationScreen` has no dedicated test
**Found by**: architecture-testing
**Files**: `components/FinalizationScreen.tsx`
Most complex UI interaction is untested directly.
**Fix**: Add component tests for grade selection, conclusion, export trigger.

### P2-6: Inline styles in Metadata.tsx
**Found by**: impeccable-audit
**Files**: `components/Metadata.tsx`, `components/ActiveSession.tsx`, `components/Captures.tsx`
8 inline style instances should be CSS classes.
**Fix**: Extract `.btn-icon-remove` and utility classes.

### P2-7: Hardcoded pixel font sizes in CSS
**Found by**: impeccable-audit
**Files**: `lib/components.css`
`11px`, `12px`, `13px` should use type scale tokens.
**Fix**: Map to `var(--text-xs)`, `var(--text-sm)`.

### P2-8: Verdict stamp underwhelming
**Found by**: data-viz-content
**Files**: `lib/report.css`, `lib/html-report.ts`
Too small for the primary decision signal.
**Fix**: Increase to `clamp(1.8rem, 5vw, 3rem)`, add padding.

### P2-9: "Unsure" vs "N/A" not visually distinguished
**Found by**: data-viz-content
**Files**: `lib/html-report.ts`, `lib/report.css`
Same gray color for different semantics.
**Fix**: Dashed border for N/A, dotted for Unsure.

### P2-10: Metadata form has no validation feedback
**Found by**: ui-ux-design
**Files**: `components/Metadata.tsx`
Invalid URLs accepted silently.
**Fix**: Add URL format validation on blur.

### P2-11: No undo for score selection
**Found by**: ui-ux-design
Accidentally clicking a score overwrites previous value with no undo.
**Fix**: Consider undo toast or "Revert" per question.

### P2-12: Captures list lacks visual linked-evidence indicator
**Found by**: ui-ux-design
**Files**: `components/Captures.tsx`
**Fix**: Add colored chip showing linked question ID.

### P2-13: Category header tint barely visible
**Found by**: data-viz-content
**Files**: `lib/report.css`
6% tint is imperceptible. Increase to 8-10%.

### P2-14: ScoreOverviewBar O(n²) capture reverse index
**Found by**: impeccable-audit
**Files**: `components/ScoreOverviewBar.tsx`
**Fix**: Build reverse index with single pass over evaluations.

---

## Phase 4: P3 — Future Consideration

| ID | Finding | Files |
|----|---------|-------|
| P3-1 | No heading hierarchy in tab content | Evaluation.tsx, Captures.tsx |
| P3-2 | `aria-live` autosave announcement too frequent | FinalizationScreen.tsx |
| P3-3 | Evidence thumbnail overlay buttons too small | lib/components.css |
| P3-4 | Tooltip only shows on hover, not keyboard | lib/components.css |
| P3-5 | Score badges too small at narrow viewport | lib/components.css |
| P3-6 | Infinite animation on captures empty icon | lib/components.css |
| P3-7 | `inset` box-shadow on score row — semantic vs elevation | lib/components.css |
| P3-8 | Replace `uuid` with `crypto.randomUUID()` | package.json |
| P3-9 | E2E coverage minimal — only 1 smoke test | e2e/extension.spec.ts |

---

## New Feature Opportunities

### High Impact
1. **Keyboard shortcuts** — Next/prev question, capture screenshot, score shortcuts. Dramatically speeds up power-user workflow.
2. **Score comparison view** — For re-evaluations, show previous scores alongside current with delta indicators.
3. **Question search/filter** — Find specific rubric questions by keyword.
4. **Finalization score summary card** — Show per-principle averages on the finalize screen.

### Medium Impact
5. **Collapsible categories** — Let reviewers focus on one TRUST principle at a time.
6. **Progress persistence animation** — Animate the progress fraction on change for satisfying feedback.
7. **Evidence heatmap** — Show which questions have most/least evidence.
8. **Export scoring metadata** — Add `scored_at` timestamps to CSV export for audit trail.

---

## Open Questions for the User

1. **`<all_urls>` host permissions**: Can we test if `activeTab` alone suffices for `scripting.executeScript` + `captureVisibleTab`? Removing it would eliminate Chrome's enhanced safe browsing warning. (security-performance S1)

2. **Rubric criteria specificity**: How prescriptive should score-level descriptions be? Adding concrete examples ("3 clicks from homepage") makes scoring more objective but may not fit all tool types. (data-viz-content V7)

3. **`tldraw` bundle impact**: The annotation library is ~400KB gzipped. Is screenshot annotation used enough to justify this? Could it be behind a feature flag or lazy-loaded more aggressively? (security-performance)

4. **Auto-save debounce interval**: Currently 300ms. Reviewers suggest 1000ms to reduce main-thread blocking from `JSON.stringify` of multi-MB sessions. Trade-off: shorter interval = less data loss risk, longer = better performance. Your preference? (security-performance P1)

5. **Distribution bars vs numeric display**: Reviews unanimously recommend replacing distribution bars with numeric scores. This changes the visual character of the reports. Confirm? (data-viz-content V1)

6. **Component decomposition priority**: `QuestionSection.tsx` (753 lines) and `export.ts` (456 lines) are the top decomposition targets. Should we decompose both in one pass, or prioritize QuestionSection first?

7. **New feature prioritization**: Of the 8 feature opportunities listed above, which (if any) should be included in the next implementation pass?
