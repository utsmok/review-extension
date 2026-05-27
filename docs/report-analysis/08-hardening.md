# Hardening & Edge Case Analysis

**Scope**: Error handling, i18n, text overflow, XSS, empty states, export robustness

---

## Findings

### H-01 [P1] — esc() function doesn't handle all output contexts
**File**: `lib/html-report.ts` (esc function, lines 34-45)
**Problem**: `esc()` replaces `& < > ' "` with HTML entities. This is correct for HTML text content and double-quoted attributes. However:
- Single-quoted attributes: `'` is escaped to `&#39;` which works ✓
- JavaScript contexts: If any escaped text is placed in `<script>` or `onclick`, `&#39;` doesn't prevent JS injection
- CSS contexts: If any escaped text is placed in `style` attributes, HTML escaping doesn't prevent CSS injection
- URL attributes: `href` values should additionally be validated (which they are via `isSafeUrl`)

**Current mitigation**: URLs use `isSafeUrl()` (must start with http:// or https://) ✓. Links use `safeLink()` which combines URL validation + escaping ✓.

**Assessment**: The current approach is sufficient for the report's output contexts. All user content goes through `esc()` and URLs through `isSafeUrl()`.

### H-02 [P1] — Text overflow: long tool names break layout
**File**: `lib/report.css` (.header-tool, .nutrition-tool-name)
**Problem**: Tool names use `text-transform: uppercase; letter-spacing: 0.03em` with no `overflow-wrap` or `text-overflow` handling. A very long tool name (e.g., "Academic Search Engine Deluxe Professional Edition v3.0") would:
- In the header: push the metadata to overlap or wrap awkwardly
- In the nutrition label: expand the name element, potentially breaking the centered layout

**Fix**: Add `overflow-wrap: break-word; max-width: 100%;` to `.header-tool` and `.nutrition-tool-name`.

### H-03 [P2] — Text overflow: URLs in plain text mode
**File**: `lib/report.css` (.url-plain)
**Problem**: `word-break: break-all` breaks URLs at any character, including mid-word for path segments. This can create confusing line breaks: `https://example.com/very-long-path/to/resource` → `https://example.com/very-long-pa th/to/resource`.
**Fix**: Use `overflow-wrap: break-word` instead of `word-break: break-all` to prefer breaking at word boundaries.

### H-04 [P2] — Notes text has no length limit
**File**: `lib/report.css` (.category-section .notes, .qg-table .notes)
**Problem**: Notes fields accept unlimited text. In the report, notes appear as `<td class="notes">` with `font-size: 0.78rem`. A 500-word note would create an enormous table cell that dominates the layout.
**Fix**: Add `max-height` with overflow, or collapse long notes behind a "Show more" toggle. At minimum, add `overflow-wrap: break-word`.

### H-05 [P1] — No i18n: all strings hardcoded in English
**File**: `lib/html-report.ts` (throughout)
**Problem**: Every label, heading, and status text is hardcoded English:
- "Quality Gates", "Detailed Report", "Additional Evidence", "Contents"
- "PASS", "FAIL", "UNSURE", "N/A"
- "Background", "Examples", "Notes"
- "RECOMMENDED", "NOT RECOMMENDED", "INCOMPLETE", "NOT EVALUATED"
- "Strengths", "Weaknesses", "Recommendations"
- "Quality Gate Issues", "Overall"
- "Information Tool Reviews"
- Date formatting: YYYY-MM-DD HH:mm (ISO-adjacent, not localized)

**Impact**: The report cannot be generated in other languages without code changes.
**Fix**: Extract all strings to a constants map for future i18n support. Not urgent but should be planned.

### H-06 [P2] — No RTL support
**Problem**: The report uses left-to-right layout exclusively. No `dir="auto"` on text elements. If a tool name or description is in Arabic/Hebrew, it would render incorrectly.
**Fix**: Add `dir="auto"` on user-generated text fields (tool name, description, notes, strengths, weaknesses).

### H-07 [P2] — Division by zero in computeReportScores is guarded
**File**: `lib/report/compute-scores.ts` (line 104)
**Analysis**: `const ratio = totalMax > 0 ? totalActual / totalMax : 0;` — correctly guards against division by zero when `totalMax` is 0. ✓

### H-08 [P2] — principleAverage guards against division by zero
**File**: `lib/rubric.ts` (principleAverage)
**Analysis**: `if (numCount > 0) return numSum / numCount; return null;` — correctly returns null when no numeric scores exist. ✓

### H-09 [P1] — Null finalization is handled correctly
**File**: `lib/report/compute-scores.ts`, `lib/html-report.ts`
**Analysis**: When `finalization` is null:
- Score computation falls through to computed verdict (based on scores) ✓
- HTML generation skips the finalization section ✓
- Nutrition label shows computed verdict instead ✓
Well-handled.

### H-10 [P2] — Empty evaluations array
**File**: `lib/report/compute-scores.ts`
**Analysis**: When evaluations is empty:
- `noEvaluation` is true (0 answered questions) ✓
- Verdict becomes "NOT EVALUATED" with muted color ✓
- Category scores map is populated with empty arrays ✓
Well-handled.

### H-11 [P1] — Evidence images with broken relative paths
**File**: `lib/export.ts` (ZIP generation)
**Problem**: In the exported ZIP, evidence images reference relative paths (e.g., `src="b8f85b96.jpg"`). If the HTML file is opened without the sibling images (e.g., extracted alone), all evidence images will be broken with no fallback.
**Fix**: Add `onerror="this.style.display='none'; this.parentElement.querySelector('.evidence-fallback')?.style.removeProperty('display')"` and a hidden text fallback showing the capture timestamp and URL.

### H-12 [P2] — Export handles missing annotatedScreenshot correctly
**File**: `lib/export.ts` (lines 133-141)
**Analysis**: Annotated screenshots are optional. The code checks `if (capture.annotatedScreenshotBase64)` before processing ✓. The annotated path map only includes captures that have annotated versions ✓.

### H-13 [P2] — color-mix() browser compatibility
**File**: `lib/report.css` (.category-header, .category-section th)
**Problem**: `color-mix(in srgb, ...)` requires CSS Color 4. Browser support:
- Chrome 111+ ✓ (current: 125+)
- Firefox 113+ ✓ (current: 120+)
- Safari 16.2+ ✓
- **Not supported in**: older browsers, some enterprise environments

Since this is a standalone HTML report (not a web app), users might open it in older browsers.
**Fix**: Provide computed fallback values: `background: #f3f4f6; background: color-mix(in srgb, var(--accent) 6%, var(--white));` — progressive enhancement.

### H-14 [P3] — minifyHtml() may break <pre> or <script> content
**File**: `lib/export.ts` (minifyHtml)
**Problem**: `minifyHtml()` removes all whitespace and closing tags. If the report HTML contained `<pre>` blocks (it doesn't currently), the whitespace removal would corrupt content. The current report doesn't use `<pre>`, so this is safe.
**Assessment**: No current issue. Document the limitation for future content changes.

### H-15 [P2] — minifyCss() resolves variables — order-dependent
**File**: `lib/export.ts` (minifyCss)
**Problem**: CSS variable resolution happens in a single pass: extract all `--var: value` definitions, then replace all `var(--var)` references. This works only if variables are defined before they're referenced in the source CSS. If a variable references another variable, the single-pass resolution will leave it unresolved.
**Analysis**: The current CSS doesn't have chained variable references (all variables resolve to literal values). Safe for now.
**Fix**: For robustness, run the resolution in a loop until no more replacements are made (max 10 iterations).

### H-16 [P1] — Print @page syntax error
**File**: `lib/report.css` (@media print, @page rule)
**Problem**: The `@page @bottom-center` content property contains: `counter(pages) · "TRUST Framework..."` where `·` is a Unicode middle dot used as if it were a CSS concatenation operator. In CSS `content`, string concatenation is implicit (adjacent strings/values). The `·` should be inside a quoted string: `"Page " counter(page) " of " counter(pages) " · TRUST Framework Evaluation Report · Confidential"`.

### H-17 [P2] — Very small screens (< 320px)
**Problem**: Below 320px, the 3px border + 20px padding on the nutrition label leaves ~274px for content. The principles table (6 columns) would need ~45px per column — very cramped but not broken.
**Assessment**: Extremely unlikely use case. Acceptable.

### H-18 [P2] — High zoom levels (200-400%)
**Problem**: At 400% zoom (base 15px → effective 60px):
- 0.75rem text → 45px — very large, causes extensive wrapping
- Tables would require significant horizontal scrolling
- The nutrition label would fill most of the viewport height

The responsive 640px breakpoint helps (since 400% zoom on a 1920px screen = 480px effective), triggering the mobile layout.
**Assessment**: Acceptable with current responsive handling.

### H-19 [P3] — ZIP size limits are reasonable
**File**: `lib/export.ts` (lines 285-288)
**Analysis**: MAX_INPUT_SIZE = 200MB compressed, MAX_ZIP_ENTRIES = 500, MAX_TOTAL_BYTES = 500MB uncompressed. These are reasonable limits for an evaluation session. The validation function checks metadata structure ✓.

### H-20 [P2] — Special characters in tool name for filename
**File**: `lib/export.ts` (sanitizeFilename)
**Analysis**: The function strips `<>:"/\|?*` and control characters, collapses dots, and trims. Falls back to "review" for empty results. This handles most edge cases.
**Potential issue**: Tool names with only special characters (e.g., "---") would become "review" after sanitization, which is acceptable.

### H-21 [P2] — Session re-import validates metadata structure
**File**: `lib/export.ts` (validateSessionData)
**Analysis**: Validates metadata.id, metadata.toolName, metadata.startTime are strings ✓. Validates captures is an array ✓. Validates individual capture IDs ✓. This is good defensive programming.

### H-22 [P1] — Empty strengths/weaknesses lists
**File**: `lib/html-report.ts` (buildNutritionLabelHtml, buildFinalizationSection)
**Problem**: If finalization.strengths is an empty array, the section still renders the heading "Strengths" with an empty `<ul>`. This looks broken.
**Fix**: Hide the section entirely when the array is empty: `{finalization.strengths.length > 0 ? '<div>...</div>' : ''}`.

### H-23 [P2] — Score level text can contain HTML
**File**: `lib/html-report.ts` (buildCategorySections, buildGateRows)
**Problem**: Score level descriptions and gate requirement text go through `esc()` ✓. However, the rubric content (examples with HTML entities like `&#39;`) is already escaped at the rubric level. Double-escaping could occur if the rubric data contains pre-escaped content.
**Fix**: Ensure rubric data is stored as plain text, not pre-escaped HTML. Apply `esc()` only at the output boundary.

### H-24 [P2] — Nutrition label description has no length limit
**Problem**: `metadata.description` can be arbitrarily long. In the nutrition label, it's displayed at 0.85rem italic with `max-width: 400px` and centered. A 500-character description would create a very tall centered block.
**Fix**: Truncate to 200 characters with ellipsis, or collapse behind a "Read more" toggle.

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 6 | Text overflow, i18n, broken image fallback, print syntax, empty lists |
| P2 | 14 | Long content handling, browser compat, CSS minification, zoom, RTL |
| P3 | 4 | minifyHtml limitations, ZIP limits, filename sanitization |
| **Total** | **24** | |

### Strengths
1. XSS prevention: `esc()` + `isSafeUrl()` + `safeLink()` cover all output contexts ✓
2. Division by zero guards in score computation ✓
3. Null finalization handled gracefully ✓
4. Empty evaluations produce "NOT EVALUATED" verdict ✓
5. Export validation checks session structure ✓
6. Filename sanitization prevents path traversal ✓
