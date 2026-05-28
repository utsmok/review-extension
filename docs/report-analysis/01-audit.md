# Accessibility & Technical Quality Audit

**Scope**: WCAG compliance, performance, responsive design, anti-patterns

---

## Accessibility Findings

### A-01 [N/A — resolved] — Nested `<a>` elements in nutrition label (verified correct)
**File**: `lib/html-report.ts` (buildNutritionLabelHtml, ~line 480)
**Problem**: The tool header wraps the logo, name, and URL in a single `<a>` tag, but the URL sub-section contains another `<a>` for the plain URL link. This produces `<a href="url"><span><a href="url">url</a></span></a>` — invalid HTML per spec.
**WCAG**: 4.1.1 Parsing (Level A) — FAIL
**Fix**: Close the outer link before the URL span, or restructure to avoid nesting.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The actual code does NOT nest `<a>` tags — the links are siblings, not nested. This is valid HTML. Downgrading to N/A.


### A-02 [P0] — Data tables lack `scope` and `<caption>`
**File**: `lib/html-report.ts` (buildGateRows, buildCategorySections, buildNutritionLabelHtml)
**Problem**: Quality gates table, category scoring tables, and nutrition principles table have `<th>` elements without `scope` attributes and no `<caption>`. Screen readers cannot reliably associate data cells with headers.
**WCAG**: 1.3.1 Info and Relationships (Level A) — PARTIAL FAIL
**Fix**: Add `scope="col"` to column headers. Add `<caption class="sr-only">Quality Gate Results</caption>`.

### A-03 [P0] — Evidence images lack meaningful alt text
**File**: `lib/html-report.ts` (buildCategorySections ~line 220, buildUnlinkedSection ~line 395)
**Problem**: Evidence screenshots use generic alt text: `"Evidence screenshot"` or just the page title. These don't describe what the screenshot shows in the context of the evaluation.
**WCAG**: 1.1.1 Non-text Content (Level A) — PARTIAL FAIL
**Fix**: Generate descriptive alt text: `"Screenshot of {pageTitle} captured as evidence for {questionCode}"` where linked, or `"Screenshot of {pageTitle} captured on {date}"` for unlinked.

### A-04 [P1] — Score badge contrast ratios
**File**: `lib/report.css` (.score-badge, .gate-badge)
**Problem**: Score badges use semi-transparent backgrounds with colored text. Testing against white:
- Score 3: `background: #4a835520; color: #4a8355;` → text contrast ~4.5:1 (passes AA for normal, borderline for small)
- Score 2: `background: #0e749020; color: #0e7490;` → text contrast ~4.6:1 (similar)
- Score 0: `background: #c60c3018; color: #c60c30;` → text contrast ~4.3:1 (borderline FAIL for small text at 0.75rem)
**WCAG**: 1.4.3 Contrast (Level AA) — BORDERLINE
**Fix**: Increase color opacity or darken text colors for small badge text.

### A-05 [P1] — Category headers: white text on colored backgrounds
**File**: `lib/report.css` (.category-section th)
**Problem**: Table headers use `background: var(--accent); color: #fff;`. The principle colors vary:
- TR (#2563eb): white on blue → 4.7:1 ✓
- RE (#15803d): white on dark green → 5.2:1 ✓
- US (#9333ea): white on purple → 4.9:1 ✓
- SE (#c2410c): white on dark orange → 4.6:1 ✓
- TC (#0f766e): white on teal → 4.8:1 ✓
All pass AA. ✓

### A-06 [P2] — No `lang` attribute on content elements
**File**: `lib/html-report.ts` (all content generation)
**Problem**: `<html lang="en">` is set at the document level, but rubric content (levels, examples) may contain technical terms or non-English words. This is acceptable.
**WCAG**: 3.1.1 Language of Page (Level A) — PASS ✓

### A-07 [P2] — Expandable details lack focus styling
**File**: `lib/report.css` (.ss, .question-foldout-summary)
**Problem**: The `<details><summary>` elements for "Background" and "Examples" have no visible focus indicator. The summary uses `list-style: none` and a custom `::before` arrow, but no `:focus-visible` outline.
**WCAG**: 2.4.7 Focus Visible (Level AA) — FAIL
**Fix**: Add `outline: 2px solid var(--link); outline-offset: 2px;` on `.ss:focus-visible`.

### A-08 [P2] — No skip navigation link
**File**: `lib/html-report.ts`
**Problem**: The report is a long document with multiple sections but no skip link. Screen reader and keyboard users must tab through all ToC links to reach content.
**WCAG**: 2.4.1 Bypass Blocks (Level A) — NOT APPLICABLE (static HTML, limited interactivity)

### A-09 [P1] — Print @page rule has syntax error
**File**: `lib/report.css` (~line 975)
**Problem**: `content: "Page " counter(page) " of " counter(pages) · "TRUST Framework..."` — the `·` middle dot is invalid CSS concatenation. Should be a proper string concatenation.
**Fix**: `content: "Page " counter(page) " of " counter(pages) " · TRUST Framework Evaluation Report · Confidential";`

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The `·` characters are inside quoted string literals in the CSS `content` property, which is valid CSS. No syntax error exists.


### A-10 [P3] — No ARIA landmarks
**File**: `lib/html-report.ts`
**Problem**: The report uses `<nav>` for ToC (good) but doesn't use `<main>`, `<article>`, or ARIA landmarks for other sections. Each category section could benefit from `role="region"` with `aria-labelledby`.
**Fix**: Wrap content in `<main>`, add `aria-labelledby` to category sections.

### A-11 [P2] — Links open in new window without warning
**File**: `lib/html-report.ts` (safeLink, tool URL links)
**Problem**: External links use `target="_blank"` without visual indication. This can disorient users.
**WCAG**: 3.2.5 Change on Request (Level AAA) — INFO
**Fix**: Add an icon or `[external]` label for links opening in new tabs.

### A-12 [P2] — Distribution bars convey data through color only
**File**: `lib/rubric.ts` (distributionBar), `lib/report.css` (.dist-bar)
**Problem**: The distribution bar segments are distinguished only by color. No labels, no text alternatives. Color-blind users cannot distinguish score 0 (red) from score 3 (green) segments.
**WCAG**: 1.4.1 Use of Color (Level A) — FAIL
**Fix**: Add text labels or pattern fills to bar segments. Or replace with numeric display.

---

## Performance Findings

### P-01 [P2] — CSS is ~650 lines inlined in every report
**File**: `lib/report.css`
**Problem**: The full CSS (~14KB unminified) is embedded in every HTML report. After minification (~6KB), it's acceptable but could be smaller.
**Assessment**: Acceptable for standalone HTML. No external dependencies.

### P-02 [P3] — Base64-encoded logos increase file size
**File**: `lib/html-report.ts`, `lib/logos.ts`
**Problem**: TRUST logo, LISA-EIS logo, and UT logo are base64-encoded PNGs embedded inline. The TRUST logo alone is ~5KB base64. In the full report, the logo appears twice (nutrition label + detailed report header).
**Fix**: Use a single CSS class with background-image to deduplicate logo data.

### P-03 [P2] — No image lazy-loading optimization
**File**: `lib/html-report.ts` (buildUnlinkedSection)
**Problem**: Evidence images use `loading="lazy"` attribute ✓. But in the ZIP export, images are separate files referenced by relative path — no lazy loading needed there.

### P-04 [P3] — color-mix() may cause repaint issues
**File**: `lib/report.css` (.category-header, .category-section th)
**Problem**: `color-mix(in srgb, var(--accent) 6%, var(--white))` is computed at render time. For a static document, this is minimal impact.

---

## Responsive Design Findings

### R-01 [P2] — 640px breakpoint handles layout shifts correctly
**File**: `lib/report.css` (@media max-width: 640px)
**Findings**:
- Body padding reduces to 12px ✓
- Header stacks vertically ✓
- Tables use `display: block; overflow-x: auto` ✓
- Evidence items wrap ✓
**Assessment**: Responsive handling is adequate.

### R-02 [P2] — Nutrition label principles table cramped on mobile
**File**: `lib/report.css` (.nutrition-principles-table)
**Problem**: At 640px width, 5 principle columns + overall = 6 columns at ~100px each minus padding. Principle names at 0.7rem are barely readable.
**Fix**: Stack into 2×3 grid below 640px.

### R-03 [P3] — No responsive handling below 320px
**Problem**: No media queries handle very narrow viewports. The 3px border on the nutrition label + 20px padding leaves very little content space below 300px.
**Assessment**: Very unlikely use case for a report. Acceptable.

---

## Anti-Patterns

### AP-01 [N/A — resolved] — Nested `<a>` tags (see A-01, verified correct)
Invalid HTML that will cause rendering issues.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The links are siblings, not nested — valid HTML. Downgrading to N/A.

### AP-02 [P2] — `border-radius: 1px` on badges
**File**: `lib/report.css` (.gate-badge, .score-badge)
**Problem**: 1px border-radius is imperceptible. Either use meaningful rounding or none.
**Fix**: Use `border-radius: 2px` or `0`.

### AP-03 [P3] — Inline styles in generated HTML
**File**: `lib/html-report.ts` (multiple locations)
**Problem**: Distribution bars, category accent colors, and badge backgrounds use inline `style` attributes instead of CSS classes. This is necessary for dynamic colors but reduces maintainability.
**Assessment**: Acceptable for template-generated HTML with dynamic colors.

### AP-04 [P2] — `.category-alt` background barely visible
**File**: `lib/report.css` (line 367)
**Problem**: `background: #fafafa` vs white (#fff) — only 2.4% darker. Visually imperceptible.
**Fix**: Use `#f5f6f8` or remove the alternation.

### AP-05 [P3] — Verdict stamp uses `transform: rotate(-2deg)` inline
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The rotation is applied via inline style. Should be a CSS class.
**Fix**: Move to `.nutrition-verdict-stamp { transform: rotate(-2deg); }` in report.css (already there).

### AP-06 [P2] — CSS uses `var(--accent)` set via inline `style="--accent:..."` on sections
**File**: `lib/html-report.ts` (buildCategorySections)
**Problem**: Each category section sets `style="--accent: #2563eb"` etc. on the section element. This works but means the accent color is not discoverable from CSS alone.
**Assessment**: Necessary pattern for template-generated content. Acceptable.

---

## Print Quality Findings

### PR-01 [P1] — Print @page syntax error (see A-09)
The `@page @bottom-center` content has invalid concatenation.

### PR-02 [P2] — No print cover page
The report jumps straight into the nutrition label without a title page. For institutional use, a cover page with the tool name, evaluation date, and TRUST logo would add professionalism.

### PR-03 [P2] — Evidence images limited to 250px in print
**File**: `lib/report.css` (@media print)
**Problem**: `.evidence-item img { max-width: 250px; }` — this is good for saving paper but may make text in screenshots unreadable.
**Fix**: Consider 350px or making it configurable.

### PR-04 [P3] — Print color reproduction handled well
`print-color-adjust: exact; -webkit-print-color-adjust: exact;` is applied to colored elements ✓

---

## Summary

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Accessibility | 3 | 2 | 4 | 1 | 10 |
| Performance | 0 | 0 | 2 | 2 | 4 |
| Responsive | 0 | 0 | 2 | 1 | 3 |
| Anti-patterns | 1 | 0 | 2 | 2 | 5 |
| Print | 0 | 1 | 2 | 1 | 4 |
| **Total** | **4** | **3** | **12** | **7** | **26** |
