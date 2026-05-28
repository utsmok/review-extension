# UI/UX Design Review

**Date**: 2026-05-28
**Scope**: Full extension UI — sidepanel components, design system compliance, interaction patterns
**Method**: Fresh review against DESIGN.md and PRODUCT.md

---

## Executive Summary

The TRUST Review Extension UI is solid for a v1. The design system (flat, dense, monospace-heavy) is consistently applied. The recent ScoreOverviewBar replacement is a significant UX improvement over the old hero/chips pattern. Key gaps: missing empty/error states in several components, inconsistent focus treatment, and some responsive edge cases at narrow sidepanel widths.

**Overall Score: B+**

---

## Design System Compliance

### Good
- **Color tokens** used consistently via Tailwind — no hardcoded hex values in components
- **Typography hierarchy** maintained: heading font for section labels, body for prose, mono for metadata
- **Flat aesthetic** preserved — no box-shadow anywhere, border radius ≤2px
- **TRUST principle accent colors** correctly scoped via `data-accent-key` attributes
- **Score semantic colors** consistently applied through the ramp (red → orange → teal → green)

### Issues

#### D1 [P1] — ScoreOverviewBar sticky positioning may overlap content
**File**: `components/ScoreOverviewBar.tsx`, `lib/components.css` (.score-overview-bar)
The sticky bar uses `position: sticky; top: 0; z-index: 10`. When scrolling, it overlaps the question content below. The bar's background should be opaque (`background: var(--white)`) but currently uses a semi-transparent panel color. On scroll with partially transparent background, content bleeds through.

**Fix**: Ensure `.score-overview-bar` has `background: var(--ut-white, #fafbfc)` explicitly.

#### D2 [P1] — QuestionSection Done button lacks keyboard discoverability
**File**: `components/QuestionSection.tsx` (~line 403)
The "Done" override button inside `<summary>` is `type="button"` with `tabIndex={0}`, but it's visually subtle (small mono text, thin border). Keyboard users may tab past it without noticing. There's no focus-visible ring specified.

**Fix**: Add `focus-visible:ring-2 focus-visible:ring-ut-blue` or equivalent focus indicator.

#### D3 [P2] — Captures list lacks visual feedback for linked evidence
**File**: `components/Captures.tsx`
Captures that are linked to rubric items should have a visual indicator (accent border or badge) showing which question they're linked to. Currently, the link state is only visible from the rubric side (EvidenceThumbnails in QuestionSection).

**Fix**: Add a small `data-accent-key` colored chip on each capture showing the linked question ID.

#### D4 [P2] — No empty state for evaluation tab when no evaluations exist
**File**: `components/Evaluation.tsx`
If no evaluations have been started, the evaluation tab shows an empty ScoreOverviewBar with "0/14" and blank question sections. No guidance text or call-to-action.

**Fix**: Add an empty state: "Start capturing evidence to begin your evaluation" with a button to switch to the Captures tab.

#### D5 [P2] — Metadata form has no validation feedback
**File**: `components/Metadata.tsx`
The metadata form (tool name, URL, version) has no inline validation. Invalid URLs are accepted silently. The export will include bad metadata.

**Fix**: Add URL format validation on blur. Show red border and helper text for invalid inputs.

#### D6 [P2] — FinalizationScreen could show score breakdown
**File**: `components/FinalizationScreen.tsx`
The finalization step shows text areas for strengths/weaknesses but doesn't show a summary of scores. Reviewers must remember their scores from the evaluation tab.

**Fix**: Add a compact score summary card showing per-principle averages.

#### D7 [P3] — SessionManager lacks session preview
**File**: `components/SessionManager.tsx`
Session list shows name and date but no progress indicator. Users must open a session to see how far along it is.

**Fix**: Add a small progress fraction (e.g., "8/14 questions") to each session card.

---

## Interaction Patterns

### Good
- Score selection with immediate visual feedback (background tint + border color change)
- Tab navigation between Captures/Evaluation/Metadata is clear
- Toast notifications for save errors
- ConfirmDialog for destructive actions (delete session)

### Issues

#### D8 [P2] — No undo for score selection
Score changes are immediate with no undo. Accidentally clicking a score overwrites the previous value. The unselect fix (click same score to clear) partially addresses this, but there's no undo for selecting a different score.

**Fix**: Consider adding an undo toast after score changes, or a "Revert" option per question.

#### D9 [P3] — Tab switching loses scroll position
Switching between Captures, Evaluation, and Metadata tabs resets scroll to top. If a reviewer is deep in the evaluation and switches to check a capture, they lose their place.

**Fix**: Preserve scroll position per tab, or use the new `id={question-${rubricId}}` for scroll restoration.

---

## Responsive Behavior

#### D10 [P1] — ScoreOverviewBar badges overflow at 320px width
At the narrowest sidepanel width (320px), the 14 question badges in the overview bar don't fit in a single row. They wrap to multiple lines, making the sticky bar too tall and consuming valuable vertical space.

**Fix**: At ≤360px, collapse badges to show only completed/incomplete counts with the progress fraction. Show full badges only on hover/expand.

#### D11 [P2] — QuestionSection score rows cramped at 320px
The 4-column score grid (0-3) plus N/A and Unsure rows are tight at 320px. The score badge + description text may truncate.

**Fix**: At ≤360px, hide score descriptions and show only the numeric badge. Descriptions visible on hover.

---

## Missed Opportunities

1. **Keyboard shortcuts** — No keyboard shortcuts for common actions (next question, previous question, capture screenshot). For power users doing many evaluations, this would dramatically speed up workflow.

2. **Question search/filter** — No way to search or filter questions. With 14 questions across 5 categories, finding a specific question by keyword would help.

3. **Progress persistence animation** — ScoreOverviewBar could animate the progress fraction when it changes (count-up effect) to give satisfying feedback on completion.

4. **Dark mode readiness** — DESIGN.md explicitly states no dark mode, but the token system in `lib/tokens.css` is well-structured for it. A future `prefers-color-scheme: dark` media query would be straightforward.

5. **Collapsible categories** — Categories could be collapsible (all expanded by default) to let reviewers focus on one section at a time.

6. **Score comparison view** — For re-evaluations, show previous scores alongside current scores with delta indicators.

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 3 | Sticky bar overlap, keyboard focus, responsive overflow |
| P2 | 5 | Empty states, validation, linked evidence, scroll position |
| P3 | 3 | Session preview, undo, tab scroll |
| **Total** | **11** | |
