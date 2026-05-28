# Consolidated Report Analysis & Improvement Plan

**Date**: 2026-05-26  
**Scope**: Full Evaluation Report (`Evaluation_Report_*.html`) + Nutrition Label (`TRUST_Label_*.html`)  
**Analyzed**: HTML structure, CSS, scoring logic, export pipeline, example output (Ai2 Asta)

---

## Executive Summary

The TRUST report system produces two standalone HTML artifacts: a detailed evaluation report and a nutrition-label summary. The overall quality is **solid** — the reports are well-structured, print-ready, and carry the TRUST brand identity clearly. However, there are meaningful opportunities across accessibility, data visualization clarity, nutrition label impact, and edge case handling.

**Overall Quality Scorecard**:

| Dimension | Rating | Summary |
|-----------|--------|---------|
| Accessibility (WCAG) | B | Good semantic structure, but missing ARIA, lang attrs on numbers, focus indicators for print |
| Typography | A- | Strong hierarchy, distinctive heading font, good monospace usage |
| Layout & Spacing | B+ | Clean structure, but tables could breathe more; nutrition label well-contained |
| Color System | B+ | Clear category differentiation, but score badge contrast on colored backgrounds is borderline |
| Data Visualization (Tufte) | B- | Distribution bars waste ink; circles are ambiguous; category overview table is strong |
| UX / Information Architecture | B+ | Good scanability for experts; nutrition label needs more impact for non-experts |
| Clarity & Microcopy | A- | Clear labels, good terminology, verdicts are unambiguous |
| Resilience & Edge Cases | B | Handles null finalization, empty evaluations; but missing alt text on evidence images, no fallback fonts |
| Nutrition Label Impact | B | Functional but could be significantly more visually distinctive and shareable |

---

## Priority-Ordered Improvement Plan

### P0 — Must Fix (Accessibility & Correctness)

#### P0.1 — Missing `<th scope>` and `<caption>` on data tables
**Files**: `lib/html-report.ts` (buildGateRows, buildCategorySections, buildNutritionLabelHtml)
**Problem**: Quality gates table, category scoring tables, and nutrition principles table lack `scope` attributes on `<th>` and have no `<caption>`. Screen readers cannot associate headers with data cells.
**Fix**: Add `scope="col"` to all `<th>` in column-header rows. Add `<caption class="sr-only">` to each table.

#### P0.2 — Evidence images missing meaningful `alt` text
**Files**: `lib/html-report.ts` (buildCategorySections, buildUnlinkedSection)
**Problem**: Evidence screenshots use generic `alt` like `"Evidence screenshot"` or just the page title. This is unhelpful for screen readers.
**Fix**: Use `"Screenshot of {pageTitle} showing evidence for {questionCode}"` as alt text where available.

#### P0.3 — Nutrition label nested `<a>` inside `<a>`
**Files**: `lib/html-report.ts` (buildNutritionLabelHtml, the tool URL section)
**Problem**: The tool URL section nests `<a href="...">` inside another `<a>` wrapping the tool name. This is invalid HTML.
**Example**: `<a href="url"><span class="nutrition-tool-url"><a href="url">url</a></span></a>`
**Fix**: Close the outer `<a>` before the URL sub-section, or use a single link wrapping all elements.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The links are siblings, not nested — the HTML is valid as-is. No code change needed.

#### P0.4 — Score badge text contrast on colored backgrounds
**Files**: `lib/report.css` (`.gate-badge`, `.score-badge`), `lib/html-report.ts`
**Problem**: Gate badges and score badges use semi-transparent colored backgrounds (e.g., `#4a835518`) with colored text. The contrast ratio is not consistently verified for WCAG AA.
**Fix**: Test all badge color combinations with a contrast checker. For `background: #4a835520; color: #4a8355;` on white — the text color `#4a8355` against white has ~4.5:1 which passes AA for normal text but is borderline for small text. Increase opacity or darken colors.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. Score 1 and CAUTION colors were updated to #c2410c (4.6:1, passes AA) in commit 7030c68.

### P1 — Should Fix (UX & Clarity)

#### P1.1 — Distribution bars have low data-ink ratio
**Files**: `lib/rubric.ts` (distributionBar), `lib/report.css` (.dist-bar)
**Problem**: The distribution bars use 10px height + border + background, but with only 4 segments (scores 0-3), most categories show a single-color bar (e.g., 100% green). This provides almost no information — it's decorative ink masquerading as data.
**Fix options**: 
- (a) Replace with a simple numeric score display: "3.0/3.0" or percentage
- (b) Make the bar thicker (20px) and add score-level labels inside segments
- (c) Use a sparkline-style display with just the average number prominent and a small bar underneath
**Recommended**: (a) — Replace the distribution bar with a prominent "avg X.X" display; the circle indicators already convey the same information more intuitively.

#### P1.2 — Principle circles are ambiguous for non-experts
**Files**: `lib/html-report.ts` (scoreCircles), `lib/report.css` (.circles, .circle)
**Problem**: 4 filled/empty circles (●●●● vs ●●○○) are visually clear but semantically ambiguous. A non-expert reader doesn't know if 3/4 is good or mediocre. There's no scale label.
**Fix**: Add a small label below the circles: e.g., "3/4" or a tiny text showing the numeric average. Add a legend at the bottom of the principles table: "● = met threshold ○ = below threshold".

#### P1.3 — Nutrition label verdict stamp could be more impactful
**Files**: `lib/report.css` (.nutrition-verdict-stamp), `lib/html-report.ts`
**Problem**: The stamp is small (`clamp(1.4rem, 3.5vw, 2.2rem)`), has a subtle `-2deg` rotation, and sits in a crowded layout. For the most important piece of information, it doesn't command enough attention.
**Fix**: 
- Increase font size to `clamp(1.8rem, 5vw, 3rem)`
- Add more padding (16px 32px instead of 8px 24px)
- Consider a subtle background tint behind the stamp
- Add a thick left border accent (4px) in the verdict color
- Consider removing the TRUST logo from inside the stamp text (it's already in the header)

#### P1.4 — Nutrition label lacks an overall score number
**Files**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The nutrition label shows principle circles and an overall circle rating, but no single numeric score. A reader scanning 10 labels needs a number to quickly compare.
**Fix**: Add a prominent score display next to the verdict: e.g., "78/100" or "26/36 points". Place it in the verdict section, above the stamp.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The code renders `<div class="nutrition-score-number">26/36 points</div>` in the nutrition label. Remaining work would be styling/prominence improvements only.

#### P1.5 — Full report lacks a prominent score summary at the top
**Files**: `lib/html-report.ts` (buildHtmlReport)
**Problem**: The report opens with the nutrition label, then jumps into quality gates. There's no "at a glance" score summary for the detailed report — the reader must scroll through all 5 categories to piece together the overall picture.
**Fix**: Add a compact score summary section between the nutrition label and the quality gates: a single-row table showing each principle code, average score, and a mini distribution, similar to the category overview in the current header area but more prominent.

#### P1.6 — Quality gates expandable sections have poor discoverability
**Files**: `lib/report.css` (.ss, .sc), `lib/html-report.ts` (buildGateRows)
**Problem**: The "Background" and "Examples" expandable sections use a tiny `▸` arrow at 8px font size. They look like plain text, not interactive elements. Many readers will miss them.
**Fix**: 
- Style the summary as a clear interactive element: add a subtle background, padding, border-radius
- Increase the arrow size
- Add hover/focus states
- Consider using a different visual pattern (e.g., a bordered disclosure widget)

#### P1.7 — Category header uses `color-mix()` — limited browser support
**Files**: `lib/report.css` (`.category-header`)
**Problem**: `background: color-mix(in srgb, var(--accent) 6%, var(--white));` and `border-bottom: 2px solid color-mix(in srgb, var(--accent) 70%, black)` require CSS Color 4 support. Won't work in older browsers.
**Fix**: Provide fallback values. Since the report is standalone HTML, consider computing these values at build time rather than relying on CSS functions.

### P2 — Nice to Have (Polish & Delight)

#### P2.1 — Nutrition label should have a QR code or link to full report
**Problem**: The nutrition label is designed for sharing but has no way to link back to the detailed report. If shared as a screenshot, there's no path to the full analysis.
**Fix**: Add a small "View full report" link at the bottom with the session URL or a QR code.

#### P2.2 — Report footer is minimal
**Files**: `lib/report.css` (.footer), `lib/html-report.ts`
**Problem**: The full report footer is just a thin line with text. It could reinforce the TRUST brand and provide context.
**Fix**: Add TRUST logo to the footer, add a "Confidential" or "For internal use" label, add page numbering visible on screen (not just print).

#### P2.3 — Print styles could be richer
**Files**: `lib/report.css` (@media print)
**Problem**: The `@page` rule has a syntax error: `· "TRUST Framework Evaluation Report · "` — the middle dot `·` is used as a concatenation operator in CSS `content` but the syntax is wrong. Should use `counter(page) " of " counter(pages) " · TRUST Framework Evaluation Report · Confidential"`.
**Fix**: Fix the `@page @bottom-center` content property to use proper CSS string concatenation.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The `·` characters are inside quoted string literals in the CSS `content` property, which is valid CSS. No syntax error exists.

#### P2.4 — No dark mode support for on-screen reading
**Files**: `lib/report.css`
**Problem**: Reports only support light mode. For a Chrome extension, users may have dark mode preferences.
**Fix**: This is marked as a design decision (no dark mode per project rules), but a `prefers-color-scheme: dark` media query with inverted colors could be a future enhancement. **Low priority per project constraints.**

#### P2.5 — Nutrition label strength/weakness lists lack bullets in minified output
**Files**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The `<li>` elements in strength/weakness lists are not wrapped in `<ul>` — they're bare `<li>` elements. While the CSS `.nutrition-sw-list` is styled as `ul`, the example HTML shows `<ul class="nutrition-sw-list"><li>free<li>open source...` — missing closing `</li>` tags (valid HTML but some parsers may struggle).
**Fix**: Ensure proper `<li>` closing. Already mostly fine since HTML5 allows omitted `</li>`.

#### P2.6 — Category section alternating background is too subtle
**Files**: `lib/report.css` (.category-alt)
**Problem**: `.category-section.category-alt { background: #fafafa; }` — the alternating background is barely distinguishable from white (#fff). This is intentional subtlety but fails to aid visual scanning.
**Fix**: Consider slightly more contrast: `#f5f6f8` or a very light tint of the category color.

#### P2.7 — Evidence thumbnails in the full report are large
**Files**: `lib/report.css` (.evidence-item img)
**Problem**: `max-width: 100%` means evidence images can be very large. In a report with many captures, this creates an extremely long document.
**Fix**: Set `max-width: 300px` for on-screen display and keep `max-width: 250px` for print (already set).

### P3 — Future Consideration

#### P3.1 — Consider making the nutrition label embeddable
**Problem**: As standalone HTML, the label can't be easily embedded in other pages.
**Fix**: Generate a PNG/SVG version of the nutrition label for embedding in emails, docs, etc.

#### P3.2 — Add comparison support
**Problem**: No way to compare two tools side-by-side in the report format.
**Fix**: Future consideration for a comparison report mode.

#### P3.3 — Internationalization
**Problem**: All labels are hardcoded English.
**Fix**: Extract strings to a constants file for future i18n support.

---

## Recommended Implementation Order

1. ~~**P0.3** — Fix nested `<a>` tags~~ (verified correct — links are siblings, not nested)
2. **P0.1** — Add table accessibility (scope, caption, 30 min)
3. ~~**P0.4** — Verify badge contrast ratios~~ (already fixed in commit 7030c68 — #c2410c at 4.6:1)
4. **P0.2** — Improve image alt text (20 min)
5. **P1.3** — Enhance verdict stamp (30 min)
6. ~~**P1.4** — Add overall score number~~ (already exists as `nutrition-score-number`)
7. **P1.1** — Replace distribution bars with numeric display (1 hr)
8. **P1.2** — Add circle scale labels (30 min)
9. **P1.6** — Improve gate section discoverability (45 min)
10. **P1.5** — Add score summary to full report (1 hr)
11. **P1.7** — Fix color-mix fallbacks (30 min)
12. ~~**P2.3** — Fix print @page syntax~~ (valid CSS — `·` is inside string literals)
13. **P2.7** — Limit evidence image size (15 min)
14. **P2.1** — Add link to full report in nutrition label (30 min)
15. **P2.2** — Enhance footer (30 min)
16. **P2.6** — Increase alternating background contrast (10 min)

---

## Strengths Worth Preserving

These aspects of the current design are strong and should be maintained during improvements:

1. **Standalone HTML architecture** — No external dependencies, works offline, trivially shareable
2. **TRUST brand consistency** — Magenta accent, navy structure, principle colors create a clear identity
3. **Nutrition label concept** — The "food label" metaphor is clever and memorable for public consumption
4. **Print optimization** — Print styles with page numbering, color-adjust, page-break control are well done
5. **Category letter system** — TR, RE, US, SE, TC with large letters creates strong visual anchors
6. **Score badge system** — Color-coded badges with monospace font are scannable and precise
7. **Evidence linking** — Screenshots linked to rubric questions create a strong audit trail
8. **Responsive design** — 640px breakpoint handles mobile view well
9. **Quality gate transparency** — Expandable background/examples provide depth without clutter
10. **Minification pipeline** — CSS variable resolution, whitespace collapse, comment stripping keep file sizes manageable

---

## Reports in This Analysis

| # | File | Focus |
|---|------|-------|
| 00 | This file | Consolidated improvement plan |
| 01 | audit.md | Technical quality audit |
| 02 | typography.md | Typography analysis |
| 03 | layout.md | Layout & spacing |
| 04 | color.md | Color system analysis |
| 05 | ux-critique.md | UX perspective critique |
| 06 | tufte-data-viz.md | Tufte data visualization principles |
| 07 | clarity.md | UX copy & microcopy |
| 08 | hardening.md | Edge cases & resilience |
| 09 | nutrition-label.md | Nutrition label focused design |
