# AUDIT: Output & Artifacts

**Date:** 2026-06-09
**Scope:** HTML reports, CSV exports, ZIP structure, nutrition label, image processing, report CSS
**Files:** `lib/html-report.ts`, `lib/report.css`, `lib/report-model.ts`, `lib/report/compute-scores.ts`, `lib/export-pipeline.ts`, `lib/export.ts`, `lib/image-convert.ts`, `lib/minify.ts`

---

## Summary

The output pipeline is well-architected with clean separation between data transformation (`report-model.ts`), rendering (`html-report.ts`), and assembly (`export-pipeline.ts`). Reports are fully standalone with all images inlined as data URLs and CSS embedded inline. Print styles are comprehensive. However, there are several findings around the nutrition label denominator bug, accessibility gaps in the nutrition label table, CSV edge cases, and missing `<html lang>` attributes in the right language context.

**Overall Quality: Good with specific issues**

---

## Artifact Inventory

### ZIP Contents (per export)
| File | Type | Source |
|------|------|--------|
| `Evaluation_Report_<tool>.html` | Full HTML report | `buildHtmlReport()` |
| `TRUST_Label_<tool>.html` | Nutrition label | `buildNutritionLabel()` |
| `session_metadata.csv` | Tool metadata | PapaParse unparse |
| `rubric_scores.csv` | All rubric question scores | PapaParse unparse |
| `capture_log.csv` | Capture audit trail | PapaParse unparse |
| `review_conclusions.csv` | Finalization (if present) | PapaParse unparse |
| `session.json` | Machine-readable session data | JSON.stringify |
| `<shortId>.png/jpg` | Screenshot images | base64 from IDB |
| `<shortId>_annotated.png/jpg` | Annotated screenshots | base64 from IDB |
| `<shortId>.html` | Capture page HTML | minified |
| `1.jpg`, `2.jpg`, `3.jpg` | Logos (TRUST, LISA-EIS, UT) | Converted to JPEG |

### HTML Reports
- **Full Report:** Complete evaluation with nutrition label header, quality gates, per-principle scoring sections, evidence thumbnails, finalization section, unlinked evidence
- **Nutrition Label:** Standalone summary card with verdict, gate notes, principle circles, strengths/weaknesses

---

## Findings

### P1 — Nutrition Label Overall Score Denominator Bug

**File:** `lib/html-report.ts:449`
**Severity:** P1

```html
<div>${scoreCircles(scores.totalMax > 0 ? (scores.totalActual / scores.totalMax) * 3 : null)}</div>
```

The overall score circles use `totalActual / totalMax * 3`, which produces a score out of 3 averaged across ALL scoring questions. However, `principleAverage()` (line 429) computes per-principle averages also dividing only by answered numeric scores (not total possible). This means:

1. The "Overall" cell's denominator is `totalMax` (3 × answered numeric questions), not `3 × total_scoring_questions`. Unanswered questions are excluded from the denominator, inflating the overall score relative to per-principle scores when questions are skipped.
2. The per-principle circles (`principleAverage`) and the overall circles use different denominator semantics — per-principle only counts numeric answers, overall also only counts numeric answers, but the visual implication is that "3/3" means perfect across all questions.

**Recommendation:** Decide on consistent semantics: either both include all questions in denominator (with 0 for unanswered), or both exclude unanswered. The current approach of excluding unanswered is user-friendly but should be clearly labeled. Add a subtitle like "among answered questions" or make the denominator total possible.

### P2 — Nutrition Label Principles Table Inaccessible

**File:** `lib/html-report.ts:424`
**Severity:** P2

```html
<table class="nutrition-principles-table" aria-label="Principle scores">
  <tr>
    ${PRINCIPLES...map(td per principle + overall td)}
  </tr>
</table>
```

The table has `aria-label` but:
- No `<th>` header cells — all cells are `<td>`, so screen readers cannot announce column headers
- Each principle is a `<td>` containing code, name, circles, and fraction — semantic structure is lost
- The table is really a display grid disguised as a table; it has only one row

**Recommendation:** Replace with a `<div>` grid using `role="list"` and `role="listitem"`, or restructure as a proper table with `<thead>` and column headers. If keeping the visual layout, `role="presentation"` would at least avoid confusing screen readers.

### P2 — `safeLink` XSS Vector via `attrs` Parameter

**File:** `lib/html-report.ts:51-57`
**Severity:** P2

```ts
function safeLink(url: string, attrs: string = ""): string {
  const escaped = esc(url);
  if (isSafeUrl(url)) {
    return `<a href="${escaped}" rel="noopener noreferrer" target="_blank" ${attrs}>${escaped}</a>`;
  }
  ...
}
```

The `attrs` parameter is injected raw without escaping. Currently all call sites pass safe literal strings (`class="report-meta-url"`), so this is not exploitable today. However, the function signature allows injection if future code passes user-controlled attributes.

**Recommendation:** Either document that `attrs` must be a compile-time literal, or escape it. Prefer removing the parameter and handling attribute additions at call sites.

### P2 — `esc()` Not Applied to All User Content in Nutrition Label

**File:** `lib/html-report.ts:324`
**Severity:** P2

```ts
const toolLink = `<a href="${toolUrl}" target="_blank" rel="noopener noreferrer">`;
```

Here `toolUrl` was escaped on line 322 (`esc(metadata.toolUrl)`) and used in `href`. But the pattern of pre-building the opening tag and concatenating it later is fragile — if anyone changes the flow, the escaping guarantee is lost. This is not currently a bug but an architectural smell.

More concretely, on line 376:
```ts
${logo ? `${toolLink}<img class="nutrition-tool-logo" src="${esc(logo)}" alt="${toolName}" />${toolLinkClose}` : ""}
```

The `logo` URL comes from `metadata.toolLogoUrl` or `metadata.faviconUrl` — both are user-controlled. While `esc()` is applied to `src`, the URL is not validated with `isSafeUrl()`. A `javascript:` URL in `src` on an `<img>` tag won't execute in modern browsers, but CSP in the report (`default-src 'none'; img-src data:;`) blocks non-data URLs. If the logo is a remote URL (not data:), it simply won't render. This is correct behavior but should be documented.

**Recommendation:** Add a comment explaining CSP protection for logo URLs, or explicitly convert remote URLs to data URLs during export.

### P2 — CSV Missing Columns for Multi-Value Fields

**File:** `lib/export-pipeline.ts:258-265`
**Severity:** P2

In `captureLogCsv`, `Tagged_Rubric_IDs` is a semicolon-joined list built from a nested loop. For large evaluation sets, this could produce very long cell values. CSV consumers (Excel) have a 32,767 character cell limit. While unlikely to hit in practice, there's no truncation guard.

**Recommendation:** Document the semicolon delimiter in a CSV header comment or README. Consider adding a `Tagged_Count` integer column for quick filtering.

### P3 — `principleAverage` Inconsistency with Report Model Averages

**File:** `lib/rubric.ts:213-232` vs `lib/report-model.ts:148`
**Severity:** P3

`principleAverage()` divides `sum / count` only over numeric scores (excluding NA, unsure, unanswered). The report model's `PrincipleScoreRow.avg` uses the same logic. However, the `PrincipleScoreRow.total` and `PrincipleScoreRow.max` fields count only numeric scores: `max = numCount * 3`.

This means `avg` can be e.g. 1.5 while `total = 3, max = 6` — the displayed "3/6 (avg 1.5)" is consistent. But `scoreCircles()` uses `avg < 0.5 ? 0 : avg < 1.5 ? 1 : avg < 2.5 ? 2 : 3`, which thresholds at half-points. This means a 1.5 average gives 2 filled circles (out of 3), which looks like a "passing" grade but the actual score is only 50%. The visual may mislead.

**Recommendation:** Consider whether the circle thresholds should align with the TRUST framework's actual passing criteria (currently `principleFail` triggers when average < 1.0).

### P3 — Report Minifier Strips Closing Tags Aggressively

**File:** `lib/minify.ts:3`
**Severity:** P3

```ts
const HTML_COMMENT_OR_TAG =
  /<!--[\s\S]*?-->|<\/(?:li|dt|dd|p|tr|td|th|thead|tbody|tfoot|colgroup|option|optgroup)>/gi;
```

The minifier strips closing tags for listed elements. While valid HTML5, this causes issues when the report is opened in tools that expect well-formed XHTML (e.g., some XML-based report processors). Additionally, `<!-- comments -->` are stripped, but the report HTML doesn't contain meaningful comments anyway (only the `<!-- Full Report -->` separator).

**Recommendation:** Low risk. Consider keeping the `<!-- Full Report -->` comment as a structural marker for readability.

### P3 — Print Styles: Evidence Images Capped at 200px

**File:** `lib/report.css:1494-1496`
**Severity:** P3

```css
.evidence-item img {
  max-width: 200px;
}
```

When printing, evidence screenshots are capped at 200px wide. For detailed screenshots containing text (e.g., search results), this may be too small to read. The screen version shows them at full resolution.

**Recommendation:** Increase print evidence image max-width to 300px or add a `@page { size: A4 landscape }` hint for the report. Consider offering a "print with full-size images" option.

### P3 — `formatDate` Silently Returns "—" for Short Inputs

**File:** `lib/html-report.ts:60-64`
**Severity:** P3

```ts
function formatDate(isoString: string): string {
  if (!isoString || isoString.length < 16) return "—";
  return `${isoString.slice(0, 10)} ${isoString.slice(11, 16)}`;
}
```

No validation that the input is actually ISO 8601. If `startTime` or `finalizedAt` contains a non-ISO string ≥ 16 chars, the output will be garbage. Given that timestamps come from `new Date().toISOString()` in the app, this is safe in practice.

**Recommendation:** Add a comment noting the ISO 8601 assumption.

### P3 — ZIP File Naming Not Deterministic for Logos

**File:** `lib/export-pipeline.ts:305-313`
**Severity:** P3

Logo files are named `1.jpg`, `2.jpg`, `3.jpg` — position-based, not semantic. This is fragile if the logo array order changes. The files aren't referenced from within the HTML reports (which inline logos as data URLs), so this only matters for consumers of the raw ZIP.

**Recommendation:** Rename to `logo_trust.jpg`, `logo_lisa_eis.jpg`, `logo_ut.jpg` for clarity.

### P3 — `color-mix()` CSS Function Limited Browser Support

**File:** `lib/report.css:17`
**Severity:** P3

```css
--score-0-tint: color-mix(in srgb, var(--score-0) 6%, var(--white));
```

`color-mix()` is supported in Chrome 111+, Firefox 113+, Safari 16.2+. Since the reports are standalone HTML opened locally, users on older browsers will see an invalid color value. However, `--score-0-tint` is defined but never actually used in the CSS — it appears to be dead code.

**Recommendation:** Remove the unused `--score-0-tint` variable, or replace with a static color value.

### P3 — Session JSON Type Casting

**File:** `lib/export-pipeline.ts:298-299`
**Severity:** P3

```ts
const sessionData: import("./types").SessionData = {
  metadata,
  captures: lightweightCaptures as import("./types").Capture[],
  ...
};
```

The `as Capture[]` cast hides the fact that `LightweightCapture` is a proper subset of `Capture` (omitting `screenshotBase64`, `htmlContent`, `annotatedScreenshotBase64`). This is intentional for ZIP storage, but the import site must handle missing fields gracefully.

**Recommendation:** The cast is acceptable given the explicit `LightweightCapture` type. Consider making `SessionData.captures` accept `LightweightCapture[]` directly.

---

## Data Visualization Assessment

### Score Circles (Nutrition Label)
- **Design:** Filled/empty circles (●/○) with count "2/3" — immediately readable
- **Tufte compliance:** High data-ink ratio. No chartjunk. The circles serve as both visual gauge and numeric readout.
- **Issue:** Binary threshold (filled/empty) loses granularity. A score of 1.4 gets 1 circle while 1.5 gets 2 circles — the discontinuity may confuse.

### Distribution Bars (Category Sections)
- **Design:** Horizontal stacked bar showing proportion of score levels (0-3) per principle
- **Tufte compliance:** Good. Segmented bar effectively shows distribution without redundant labels.
- **Issue:** The bar has no axis labels or scale indicators. A viewer unfamiliar with the color coding must cross-reference the legend.

### Quality Gate Badges
- **Design:** Color-coded PASS/FAIL badges with hex codes
- **Tufte compliance:** Excellent. Minimal, immediately parseable. The pass/fail binary is appropriate for gate questions.

### Score Badges (Category Tables)
- **Design:** Colored badge with numeric score, custom reasoning indicator (*)
- **Tufte compliance:** Good. N/A and Unsure have distinct visual treatments (dashed/dotted borders).

### Overall Assessment
The data visualization follows Tufte principles well: high data-ink ratio, no chartjunk, clear encoding. The main gap is the lack of explicit scale indicators on distribution bars and the potential confusion from circle threshold boundaries.

---

## Accessibility Assessment

### Strengths
- ✅ `<html lang="en">` on both report types
- ✅ Content Security Policy meta tag
- ✅ `<caption class="sr-only">` on quality gates and category tables
- ✅ `aria-label` on nutrition principles table
- ✅ `aria-labelledby` on category sections
- ✅ `scope="col"` on table headers
- ✅ `.sr-only` utility class for screen reader content
- ✅ `alt` text on evidence images ("Evidence for TR1: <page title>")
- ✅ Focus-visible styles on interactive elements (`details > summary`)
- ✅ `loading="lazy"` on evidence images for performance

### Gaps
- ❌ Nutrition label principles table lacks `<th>` headers (P2 above)
- ❌ No skip navigation link for the full report
- ❌ `<details>/<summary>` elements lack explicit ARIA (rely on native semantics — acceptable)
- ❌ Score colors rely on color alone — no text/pattern redundancy for color-blind users on distribution bars

---

## Offline Capability

### ✅ Fully Offline
- All CSS is inline via `<style>${REPORT_CSS}</style>`
- All images are data URLs (screenshots, logos, evidence thumbnails)
- No external font loading (system font stack fallback)
- No JavaScript required to view reports
- CSP `default-src 'none'; style-src 'unsafe-inline'; img-src data:;` enforces no network requests

### Assessment
Reports are fully self-contained. A user can save the HTML file and open it offline with no degradation. This is excellent for academic review contexts where network access may be limited.

---

## Print Quality

### Strengths
- ✅ Dedicated `@media print` block (~160 lines)
- ✅ `page-break-inside: avoid` on sections, evidence items, finalization
- ✅ `page-break-before: always` on report header
- ✅ Print-safe colors (black text, gray muted)
- ✅ `print-color-adjust: exact` for badges and bars
- ✅ Reduced font size (12px) for print density
- ✅ `@page { margin: 1.5cm 1cm; }` for reasonable margins
- ✅ Interactive states removed (cursor: default, no hover)

### Gaps
- ⚠️ Evidence images capped at 200px in print (may be too small for text screenshots)
- ⚠️ No `@page { size }` hint — defaults to user's printer settings
- ⚠️ Nutrition label `page-break-inside: avoid` may cause large whitespace on the preceding page

---

## Export Pipeline Quality

### Strengths
- ✅ Clean separation: `prepareExportArtifacts()` (data) → `assembleZip()` (ZIP)
- ✅ UTF-8 BOM on all CSVs for Excel compatibility
- ✅ Filename sanitization with Windows-invalid character stripping
- ✅ DEFLATE compression level 9
- ✅ Logo images converted to JPEG (size reduction)
- ✅ Screenshot preservation as PNG (lossless, text readability)

### Import Quality
- ✅ ZIP bomb protection (200MB compressed, 500MB uncompressed, 500 entries)
- ✅ Path traversal protection (rejects `..`, `/`, `\` in entries)
- ✅ Session data validation with specific error messages
- ✅ Multiple legacy path formats supported for backward compatibility
- ✅ Screenshots persisted to separate IDB store after import

### CSV Quality
- ✅ All rubric questions included (even unanswered)
- ✅ Question metadata (code, category, type, AI-only flag)
- ✅ Custom score and reasoning columns
- ✅ Linked capture IDs for traceability

---

## Recommendations (Priority Order)

1. **[P1]** Fix nutrition label overall score denominator semantics — decide on and document consistent behavior
2. **[P2]** Make nutrition label principles table accessible — add proper headers or switch to grid layout
3. **[P2]** Remove or escape the `attrs` parameter in `safeLink()` to prevent future XSS
4. **[P2]** Add `isSafeUrl()` check for logo URLs or document CSP protection
5. **[P3]** Remove unused `--score-0-tint` CSS variable
6. **[P3]** Rename logo files in ZIP to semantic names
7. **[P3]** Increase print evidence image max-width to 300px
8. **[P3]** Add a `Tagged_Count` integer column to capture_log.csv
9. **[P3]** Add scale indicators to distribution bars (text labels at min/max)
10. **[P3]** Add pattern/shape redundancy to distribution bars for color-blind accessibility
