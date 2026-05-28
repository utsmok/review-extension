# Impeccable Audit: TRUST Review Extension

**Date**: 2026-05-28
**Scope**: All components in `components/`, CSS in `lib/tokens.css` + `lib/components.css`, design system in `DESIGN.md`/`PRODUCT.md`
**Auditor**: Fresh-eyes technical audit (no reference to prior analyses)

---

## Audit Health Score

| # | Dimension | Score (0–4) | Key Finding |
|---|-----------|:-----------:|-------------|
| 1 | Accessibility | **3** | Solid ARIA structure, roving tab index, focus-visible. Missing radiogroup labels on score rows; some touch targets below 44px |
| 2 | Performance | **3** | Good memoization (`QuestionRow`, `useMemo` on eval maps). Inline IIFEs in JSX cause per-render allocations; `ScoreOverviewBar` does O(n²) capture→rubric reverse index |
| 3 | Responsive Design | **3** | Proper overflow handling, flex-shrink, truncation. `@media (max-width: 500px)` for overview bar. Some fixed pixel sizes in captures/metadata sections |
| 4 | Theming | **3** | Mature token system with `color-mix()` families, data-attribute-driven accent scoping. 5 hardcoded `#fff` in CSS; 5 hardcoded hex colors in `EvidenceModal.tsx`; `border-radius: 4px` violates 0–2px system |
| 5 | Anti-Patterns | **4** | No AI slop tells. No gradients, no glassmorphism, no generic fonts. Flat by doctrine. Intentional dense design. Minimal magic values |
| **Total** | | **16/20** | **Good** — address weak dimensions |

---

## Anti-Patterns Verdict

**Pass.** This does not look AI-generated. The design is distinctive and intentional:

- Custom regimented visual language (0–2px radius, no shadows, navy-tinted neutrals)
- Four-font system with strict role separation (display / heading / body / mono)
- Data-attribute-driven accent coloring — declarative, not decorative
- Dense information architecture matching the "Review Bench" creative direction
- Every pixel earns its place; no hero metrics, no card grids, no gradient text

**Minor tells (not disqualifying):**
- `box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15)` on `.grade-btn.is-selected` contradicts the flat-surface rule from DESIGN.md
- `border-radius: 4px` in tooltip, textarea, metadata sections violates the 0–2px system

---

## Executive Summary

- **Audit Health Score: 16/20** (Good)
- **Issues found: 6 P1, 10 P2, 8 P3**
- **No P0 blockers** — the extension is functional and accessible for its target audience

**Top 5 Critical Issues:**
1. Radiogroups in score rows lack `aria-label` — screen readers cannot distinguish between questions
2. `border-radius: 4px` in 6 CSS locations violates the design system's 0–2px rule
3. Hardcoded `#fff` in 5 CSS locations instead of `var(--ut-white)` token
4. Inline styles in `Metadata.tsx` for remove buttons could be CSS classes
5. `box-shadow` on `.grade-btn.is-selected` contradicts the flat-by-doctrine rule

---

## Detailed Findings by Severity

### P1 Findings (Should Fix)

#### P1-01: Radiogroups Lack Accessible Names
- **Location**: `components/QuestionSection.tsx` lines 33, 104 — `role="radiogroup"` elements
- **Category**: Accessibility
- **Impact**: Screen readers announce "radiogroup" without context — users cannot tell which question they are scoring. Affects every quality gate and scoring question in the application.
- **WCAG**: 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)
- **Recommendation**: Add `aria-label` to each radiogroup div, e.g. `aria-label="Score for ${question.title}"` or `aria-label="Judgment for ${rubricId}"`

#### P1-02: Touch Targets Below 44px for Score Badges
- **Location**: `lib/components.css` lines 365–366 — `.score-row .score-badge` is 18×18px
- **Category**: Accessibility / Responsive Design
- **Impact**: Score row badges (the clickable radio labels) have an 18×18px hit area. The parent `label` is larger, but the visual target is tiny. On touch-enabled ChromeOS devices this may be difficult to activate.
- **WCAG**: 2.5.8 Target Size (Minimum) (Level AA) — 24px minimum
- **Recommendation**: Ensure the clickable `label` element has at least 24px height via padding. The label already wraps the content so this may be a padding adjustment on `.score-row`.

#### P1-03: `border-radius: 4px` Violates Design System
- **Location**: `lib/components.css` lines 828, 858, 933, 950, 966, 981
- **Category**: Theming
- **Impact**: DESIGN.md specifies "border-radius is near-zero (0 to 2px)" and the system tokens define `--radius-sm: 1px` and `--radius-md: 2px`. Six locations use raw `4px`, creating visual inconsistency — the tooltip, quick-note textarea, metadata capture panels, and capture notes inputs look softer than the rest of the UI.
- **Recommendation**: Replace all `border-radius: 4px` with `var(--radius-md)` (2px). For `border-radius: 3px` (lines 966, 981), use `var(--radius-sm)` (1px).

#### P1-04: Hardcoded `#fff` Instead of `--ut-white` Token
- **Location**: `lib/components.css` lines 802, 830, 864, 951, 969, 983
- **Category**: Theming
- **Impact**: The design system defines `--ut-white: #fafbfc` (a navy-tinted off-white, not pure white). Six CSS locations use raw `#fff`, which is perceptibly different from the token value. This breaks the "no pure white" design rule.
- **Recommendation**: Replace `#fff` with `var(--ut-white)` in all six locations.

#### P1-05: `box-shadow` on Grade Button Contradicts Flat-Surface Rule
- **Location**: `lib/components.css` line 1245 — `.grade-btn.is-selected`
- **Category**: Theming / Anti-Patterns
- **Impact**: DESIGN.md states "No `box-shadow` anywhere in the system." The grade selection button adds a shadow on selection, creating a visual inconsistency with the rest of the flat UI.
- **Recommendation**: Replace with `border: 2px solid currentColor` or `inset` border treatment for emphasis without shadow.

#### P1-06: Inline Styles for Remove Buttons in Metadata
- **Location**: `components/Metadata.tsx` lines 423–430, 503–509
- **Category**: Anti-Patterns
- **Impact**: Two remove buttons use inline `style={{...}}` for layout reset (marginLeft: auto, background: none, border: none, cursor: pointer, color: var(--ut-red), fontSize: 13). This duplicates what should be a shared CSS class, and `fontSize: 13` is a magic number not from the type scale.
- **Recommendation**: Create a `.btn-icon-remove` CSS class in `lib/components.css` using tokens: `color: var(--ut-red)`, `font-size: var(--text-xs)`, etc.

---

### P2 Findings (Nice to Have)

#### P2-01: Hardcoded Hex Colors in EvidenceModal
- **Location**: `components/EvidenceModal.tsx` lines 29–31, 443–446
- **Category**: Theming
- **Impact**: Highlighter colors (`#ffe033`, `#ff66c4`, `#66ff8c`) and pen fallback colors (`#172033`, `#c60c30`, `#007d9c`) are hardcoded. The last three happen to match tokens (`--ut-text`, `--ut-red`, `--ut-blue`), but the reference is not via token.
- **Recommendation**: For pen colors, use token references. For highlighter colors, these are annotation-specific and can remain as constants, but consider extracting to tokens if annotation colors need to be themeable.

#### P2-02: Hardcoded Pixel Font Sizes in CSS
- **Location**: `lib/components.css` — `font-size: 11px` (3 locations), `font-size: 12px` (3 locations), `font-size: 13px` (2 locations)
- **Category**: Theming
- **Impact**: The design system defines a type scale (`--text-xs: 0.75rem`, `--text-sm: 0.8125rem`, etc.), but 8 locations use raw pixel values that don't map to the scale. `11px` ≈ 0.6875rem (the label size), `12px` ≈ 0.75rem (the xs size), `13px` ≈ 0.8125rem (the sm size).
- **Recommendation**: Map these to existing tokens: `11px` → `var(--text-xs)` or define a `--text-2xs: 0.6875rem`, `12px` → `var(--text-xs)`, `13px` → `var(--text-sm)`.

#### P2-03: Inline Style for Position Relative
- **Location**: `components/ActiveSession.tsx` line 313
- **Category**: Anti-Patterns
- **Impact**: `style={{ position: "relative" }}` on the tabpanel container. This can be a Tailwind class (`relative`) or a CSS rule.
- **Recommendation**: Replace with `className="... relative"`.

#### P2-04: Inline Style for Flex Reset
- **Location**: `components/Captures.tsx` line 361
- **Category**: Anti-Patterns
- **Impact**: `style={{ flex: 1, minWidth: 0 }}` — standard flex reset pattern that should be a utility class.
- **Recommendation**: Replace with `className="flex-1 min-w-0"`.

#### P2-05: Inline Style for Logo Image
- **Location**: `components/Metadata.tsx` line 407
- **Category**: Anti-Patterns
- **Impact**: `style={{ width: 24, height: 24, objectFit: "contain", flexShrink: 0 }}` — all expressible via Tailwind (`w-6 h-6 object-contain shrink-0`).
- **Recommendation**: Replace with utility classes.

#### P2-06: Inline Style for Custom Score Badge
- **Location**: `components/QuestionSection.tsx` line 239
- **Category**: Anti-Patterns
- **Impact**: `style={{ width: 28, height: 28 }}` on custom score buttons. The standard `.score-badge` uses 18×18px. This 28×28 override creates inconsistency.
- **Recommendation**: Define a `.score-badge--large` variant in CSS using tokens, or align with the standard badge size.

#### P2-07: ScoreOverviewBar O(n²) Capture Reverse Index
- **Location**: `components/ScoreOverviewBar.tsx` lines 71–80 — nested loop in `captureMap` useMemo
- **Category**: Performance
- **Impact**: For each capture, iterates all evaluations, then for each evaluation checks `explicitEvidenceIds.includes(capture.id)`. With N captures and M evaluations, this is O(N×M×K) where K is average evidence IDs per evaluation. For the expected dataset (< 50 captures, < 40 evaluations) this is negligible, but the pattern is inefficient.
- **Recommendation**: Build the reverse index by iterating evaluations once and collecting capture→rubricId pairs.

#### P2-08: `question-foldout-summary` Has Hardcoded `0.78rem`
- **Location**: `lib/components.css` line 447 — `.question-foldout-summary { font-size: 0.78rem }`
- **Category**: Theming
- **Impact**: `0.78rem` is not on the type scale. It falls between `--text-xs` (0.75rem) and `--text-sm` (0.8125rem).
- **Recommendation**: Use `var(--text-xs)` (12px) for consistency with the mono label role.

#### P2-09: Question `<details>` Summary Missing Accessible Name for Expanded State
- **Location**: `components/QuestionSection.tsx` — `<details>` elements for each question
- **Category**: Accessibility
- **Impact**: The `<details>/<summary>` pattern is semantically correct for disclosure, but the rotated `▶` arrow is purely visual. Screen readers handle `<details>` natively, so this is minor. However, when a question is auto-NA (opacity 0.5), there's no ARIA indication of the disabled state.
- **Recommendation**: Add `aria-disabled="true"` to the `<details>` element when `isAutoNa` is true.

#### P2-10: `.captures-list-row` Uses Magic Pixel Padding/Gap
- **Location**: `lib/components.css` lines 903–910 — hardcoded `gap: 8px`, `padding: 6px 8px`, `font-size: 13px`
- **Category**: Anti-Patterns
- **Impact**: Three magic values in one rule. `8px` = `var(--space-2)`, `6px` has no token, `13px` is not on the type scale.
- **Recommendation**: Use design tokens where possible.

---

### P3 Findings (Future Consideration)

#### P3-01: No Heading Hierarchy in Active Tab Content
- **Location**: `components/Evaluation.tsx`, `components/Captures.tsx`
- **Category**: Accessibility
- **Impact**: The `Evaluation` component renders `QuestionSection` which uses `<section>` with `<h2>` and `<h3>` for kickers. `Captures` has no heading structure. `Metadata` uses `<h2>` for "Tool Details". The tabpanel doesn't have its own `<h1>` or `<h2>`, which means heading levels jump from the tab bar context into content.
- **Recommendation**: Consider adding a visually-hidden `<h2>` in each tabpanel for screen reader orientation.

#### P3-02: `aria-live="polite"` on Draft Saved Toast May Announce Too Frequently
- **Location**: `components/FinalizationScreen.tsx` line 169
- **Category**: Accessibility
- **Impact**: Every autosave triggers "Draft saved locally" which fades out after 2s. With 50ms debounce on every keystroke in the finalization form, this announces frequently during rapid editing.
- **Recommendation**: Consider throttling the announcement or using a less intrusive visual indicator for autosave.

#### P3-03: Evidence Thumbnails Overlay Not Keyboard-Accessible
- **Location**: `lib/components.css` lines 532–547 — `.evidence-thumb-overlay` uses `:hover` and `:focus-within`
- **Category**: Accessibility
- **Impact**: The overlay appears on hover and focus-within, which is good. However, the overlay buttons (view/remove) are 24×24px, which is below the 44px touch target recommendation.
- **Recommendation**: Increase the visual + touch target size of overlay buttons to at least 32×32px with padding.

#### P3-04: Quick Action Button Tooltips Hover-Only
- **Location**: `lib/components.css` lines 818–841 — `.quick-action-btn::after` tooltip
- **Category**: Accessibility
- **Impact**: Tooltips appear on `:hover` only. Keyboard users cannot see them. The `title` attribute on the button provides a fallback, but it's a degraded experience.
- **Recommendation**: Show tooltip on `:focus-visible` as well (add `.quick-action-btn:focus-visible::after { opacity: 1 }`).

#### P3-05: Score Overview Bar Badges Very Small at Narrow Viewports
- **Location**: `lib/components.css` lines 1184–1197 — `@media (max-width: 500px)`
- **Category**: Responsive Design
- **Impact**: At the 500px breakpoint, badges shrink to `font-size: 0.5625rem` (9px) with `padding: 1px 3px`. The state indicator (`●`, `○`, `✓`) at `0.5rem` (8px) becomes nearly invisible.
- **Recommendation**: Consider a scrollable horizontal strip instead of shrinking badges below 10px.

#### P3-06: `@keyframes omp-float` Runs Infinitely on Captures Empty Icon
- **Location**: `lib/components.css` line 1199 — `animation: omp-float 3s ease-in-out infinite`
- **Category**: Performance / Accessibility
- **Impact**: The infinite animation runs even when the tab is not visible (browsers may throttle but not always stop). The `prefers-reduced-motion` media query should already suppress this via the global `animation-duration: 0ms` rule, but the `infinite` keyword keeps the animation registered.
- **Recommendation**: Verify this is properly suppressed by the reduced-motion rule. Consider using `animation-iteration-count: 1` with a longer duration for a single float, or remove if the motion adds no value.

#### P3-07: `inset 0 0 0 1px currentColor` Box-Shadow on Score Row
- **Location**: `lib/components.css` line 315 — `.score-row.is-selected`
- **Category**: Theming
- **Impact**: This is an inset border simulation via box-shadow rather than an actual shadow. It's technically a `box-shadow` but serves a border function. The DESIGN.md prohibition on `box-shadow` likely targets elevation shadows, not this.
- **Recommendation**: Consider migrating to `border: 1px solid currentColor` with a corresponding padding adjustment for semantic correctness, or document this as an accepted exception.

#### P3-08: Color Swatch in Evidence Modal Uses 18×18px Target
- **Location**: `lib/components.css` lines 693–699 — `.color-swatch { width: 18px; height: 18px }`
- **Category**: Accessibility / Responsive Design
- **Impact**: Color swatches are 18×18px interactive elements. The focus ring helps keyboard users, but touch targets are small.
- **Recommendation**: Add padding to increase the touch target while keeping the visual swatch at 18px.

---

## Patterns & Systemic Issues

### 1. Metadata/Captures Section Has a Parallel Sub-Design System
The metadata capture panel (`.meta-capture-*`), captures list (`.captures-list-*`), and quick-note overlay use hardcoded pixel values (`11px`, `12px`, `13px`, `3px`, `4px`, `#fff`) while the rest of the application uses the token system consistently. This suggests these sections were added later without full token integration.

**Files affected**: `lib/components.css` lines 845–990, `components/Metadata.tsx`

### 2. Inline Styles Concentrated in Metadata
5 of the 8 inline style instances are in `Metadata.tsx`. The pattern is consistent: small icon-like buttons with reset styles that should be utility classes. This indicates a missing utility pattern in the CSS layer for "icon action buttons."

**Files affected**: `components/Metadata.tsx`, `components/Captures.tsx`

### 3. Radiogroup Labeling Gap
All radiogroups (`role="radiogroup"`) across the application lack `aria-label`. This is a systemic gap, not a one-off — it affects every quality gate question and every scoring question. Fix once in the `renderQGScores` and `renderScoringScores` helper functions.

**Files affected**: `components/QuestionSection.tsx`

---

## Positive Findings

1. **Excellent token architecture.** The `color-mix()` family generation per section accent is sophisticated and maintainable. The `@property --top-accent-color` registration enables smooth CSS transitions on the accent bar — a smart use of Houdini.

2. **Strong ARIA implementation.** Tab list uses `role="tablist"` with `aria-selected`, `aria-controls`, `id`/`aria-labelledby` bidirectional linking. Roving tab index via `useRovingTabIndex` hook. Modals use `role="dialog"` / `role="alertdialog"` with `aria-modal`. Toast uses `aria-live` with appropriate politeness levels. Drawing toolbar uses `role="toolbar"` with `aria-pressed` on tools.

3. **Deliberate reduced-motion support.** Global `@media (prefers-reduced-motion: reduce)` sets all durations to `0ms` and zeroes animation/transition durations on all elements. No per-animation work needed.

4. **Data-attribute-driven theming.** `data-accent-key` scoping is clean and declarative. Adding a new section requires only a new `[data-accent-key]` block in CSS and the corresponding token family in `:root`. No JS changes needed for color propagation.

5. **Memoization discipline.** `QuestionRow` is wrapped in `React.memo` with appropriate prop passing. Evaluation and capture maps use `useMemo`. `ScoreOverviewBar` computes badge data in a single `useMemo` pass.

6. **No AI slop.** The design is distinctive, intentional, and consistent with its "Review Bench" creative direction. No gradient text, no glassmorphism, no hero metrics, no card grids, no bounce easing.

7. **Focus-visible indicators everywhere.** Every interactive CSS class has a `:focus-visible` rule with the `--focus-ring` token. The global `:focus:not(:focus-visible) { outline: none }` pattern ensures mouse clicks don't show outlines while keyboard navigation does.

8. **Proper `<details>/<summary>` usage.** Collapsible questions use native `<details>` elements, which are semantically correct and keyboard-accessible by default. The custom arrow indicator hides the native marker.

---

## Actionable Plan

### Immediate (P1)

| # | Issue | File(s) | Change |
|---|-------|---------|--------|
| 1 | Radiogroup labels | `components/QuestionSection.tsx` | Add `aria-label` to both `role="radiogroup"` divs in `renderQGScores` and `renderScoringScores` |
| 2 | Score row touch targets | `lib/components.css` | Ensure `.score-row` has `min-height: 24px` and adequate padding |
| 3 | 4px border-radius | `lib/components.css` | Replace `border-radius: 4px` with `var(--radius-md)` (2px) in 6 locations |
| 4 | Hardcoded `#fff` | `lib/components.css` | Replace `#fff` with `var(--ut-white)` in 6 locations |
| 5 | Grade button shadow | `lib/components.css` | Replace `box-shadow` with `border` treatment |
| 6 | Inline remove buttons | `components/Metadata.tsx`, `lib/components.css` | Extract to `.btn-icon-remove` CSS class |

### Next Pass (P2)

| # | Issue | File(s) | Change |
|---|-------|---------|--------|
| 7 | Inline styles | `ActiveSession.tsx`, `Captures.tsx`, `Metadata.tsx`, `QuestionSection.tsx` | Replace all `style={{}}` with utility classes or CSS classes |
| 8 | Hardcoded pixel fonts | `lib/components.css` | Map `11px`/`12px`/`13px` to type scale tokens |
| 9 | Hardcoded hex in EvidenceModal | `components/EvidenceModal.tsx` | Use token references for pen colors |
| 10 | `0.78rem` font size | `lib/components.css` | Replace with `var(--text-xs)` |

### Polish (P3)

| # | Issue | File(s) | Change |
|---|-------|---------|--------|
| 11 | Tooltip keyboard access | `lib/components.css` | Add `:focus-visible::after` rule |
| 12 | Touch targets | `lib/components.css` | Increase color swatch and evidence overlay button sizes |
| 13 | Autosave announcements | `components/FinalizationScreen.tsx` | Throttle `aria-live` announcements |
| 14 | Score badge readability | `lib/components.css` | Don't shrink below 10px at narrow viewport |
