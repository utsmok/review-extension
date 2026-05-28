# Nutrition Label Design Analysis

**Scope**: Focused analysis of the TRUST Label public-facing summary

---

## First Impression Assessment

Opening `TRUST_Label_Ai2 Asta.html` in a browser:

1. **Eye lands on**: The TRUST logo + "Information Tool Reviews" tagline (centered, branded) — 0.5s
2. **Second focus**: The tool name "AI2 ASTA" in magenta uppercase — 1s
3. **Third focus**: The verdict stamp "RECOMMENDED" with green border — 1.5s
4. **Then scans**: Quality gate issues, principle circles, strengths/weaknesses

**Assessment**: The verdict IS visible within 2 seconds, but it competes with the TRUST logo for attention. The stamp could be larger and more dominant.

---

## Detailed Findings

### NL-01 [P1] — Verdict stamp is too small for its importance
**File**: `lib/report.css` (.nutrition-verdict-stamp)
**Current**: `font-size: clamp(1.4rem, 3.5vw, 2.2rem); padding: 8px 24px; border: 3px solid; transform: rotate(-2deg)`
**Problem**: For the single most important piece of information in the entire label, the stamp occupies only ~15% of the vertical space. The maximum size (2.2rem ≈ 33px) is smaller than the category letters in the full report (2.5rem).
**Recommendation**:
- Increase to `clamp(1.8rem, 5vw, 3rem)` — matching the letterform size
- Increase padding to `16px 36px`
- Add a subtle background tint: `background: color-mix(in srgb, currentColor 8%, white)`
- Consider adding a subtle box-shadow: `box-shadow: 0 2px 8px rgba(0,0,0,0.1)`

### NL-02 [P1] — Missing numeric overall score
**Problem**: The label shows circles and a verdict word, but no number. When comparing 5 tools, a librarian needs to sort by score. "●●●○" doesn't support sorting. "78%" or "26/36" does.
**Recommendation**: Add a prominent score display above or next to the verdict stamp:
```
26/36 points
RECOMMENDED
```
Or a circular progress indicator showing the percentage.

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The code renders `<div class="nutrition-score-number">26/36 points</div>` in the nutrition label. Remaining work would be styling/prominence improvements only.


### NL-03 [P1] — Principle circles lack numeric context
**File**: `lib/html-report.ts` (scoreCircles), `lib/report.css` (.circles, .circle)
**Problem**: 4 circles per principle, filled or empty. Without knowing the scale:
- Is 3/4 good? (Yes, it's above average)
- Is 2/4 failing? (It's borderline)
- What's the difference between "●●●○" and "●●○○"?
**Recommendation**: Add "3/4" text below each principle's circles. Add a scale legend: "● meets threshold ○ below threshold".

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The code renders `<div class="nutrition-circle-legend">● = threshold met &nbsp; ○ = below threshold</div>`. The legend exists. Remaining work would be adding per-principle numeric context (e.g., "3/4" below circles).

### NL-04 [P2] — The 3px border doesn't evoke "nutrition label" strongly enough
**File**: `lib/report.css` (.nutrition-label)
**Current**: `border: 3px solid var(--text)`
**Problem**: Real FDA nutrition labels have a distinctive thick border with internal rules. The current border is clean but generic — it could be any card component.
**Recommendation**: Consider:
- Thicker outer border (4px)
- Double-rule effect at top and bottom (like FDA labels)
- A "TRUST™" text treatment in the top border (like "Nutrition Facts" on food labels)
- More pronounced section dividers

### NL-05 [P2] — TRUST logo appears twice in the stamp
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The verdict stamp includes a small TRUST logo inline: `<img ... alt="TRUST" style="height:0.9em"/> Framework Verdict`. The same logo appears in the header above. This redundancy wastes space and dilutes the stamp's impact.
**Recommendation**: Remove the logo from the stamp text. The header already establishes the brand. The stamp should be pure verdict text.

### NL-06 [P2] — Quality gate "issues" section could be more visually distinct
**File**: `lib/report.css` (.nutrition-gates)
**Problem**: Quality gate issues appear as plain text with colored "UNSURE" / "FAIL" labels. They don't stand out as warnings. For items that could affect the verdict, they deserve more visual weight.
**Recommendation**: Add a warning icon (⚠) before each item. Use a light amber background tint for the entire gates section. Add a left border in amber.

### NL-07 [P2] — Strengths/weaknesses lack visual differentiation
**File**: `lib/report.css` (.nutrition-sw)
**Problem**: Strengths and weaknesses are visually identical — same font, same color (--muted), same bullet style. Only the title text "Strengths" vs "Weaknesses" distinguishes them.
**Recommendation**:
- Strengths: use a green-tinted left border or background
- Weaknesses: use an amber/red-tinted left border or background
- Add ✓ and ⚠ icons as list markers
- Color the title text: green for strengths, red/amber for weaknesses

### NL-08 [P1] — No link or reference to the full report
**Problem**: The nutrition label is designed as a standalone shareable artifact, but it provides no way to access the full detailed report. If shared as a screenshot, there's no URL or QR code.
**Recommendation**:
- Add a "View detailed report" link at the bottom (if available online)
- Add a QR code in the footer encoding the full report URL
- At minimum, add "For the full evaluation, see: Evaluation_Report_Ai2 Asta.html"

### NL-09 [P2] — Tool description is centered in a narrow column
**File**: `lib/report.css` (.nutrition-description)
**Problem**: `max-width: 400px; text-align: center;` — the description is constrained to 400px and centered. This creates a narrow column that forces line breaks more aggressively than needed.
**Recommendation**: Increase to `max-width: 500px` or remove the constraint and let the full label width (860px content area) accommodate the text.

### NL-10 [P2] — Footer is well-designed but could carry more information
**Current**: Institution logos (LISA-EIS, University of Twente) + date
**Missing**: 
- TRUST Framework version (v1.1)
- Number of questions answered
- Evaluation duration
- Confidentiality notice
**Recommendation**: Add metadata line: "TRUST Framework v1.1 · 14 questions · Confidential"

### NL-11 [P3] — Verdict stamp rotation is barely perceptible
**Current**: `transform: rotate(-2deg)`
**Problem**: At -2 degrees, the rotation is subtle enough to look like a rendering error rather than a design choice. Either commit to a visible stamp effect (-4 to -6 degrees) or remove it.
**Recommendation**: Increase to -3deg for a subtle but intentional feel, or remove entirely.

### NL-12 [P2] — Tool logo loading from external URL
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The tool logo is loaded from an external URL (`https://cdn.prod.website-files.com/...asta-logo.svg`). In a standalone HTML context (offline, behind firewall), this image will fail to load.
**Fix**: Export should embed the tool logo as base64 if available, similar to how TRUST/institution logos are handled. Add a fallback: `onerror="this.style.display='none'"`.

### NL-13 [P3] — Principles table could benefit from color tinting
**Problem**: Each principle column has colored text but white background. Adding a very subtle background tint per column would reinforce the color coding.
**Recommendation**: Add `background: color-mix(in srgb, {color} 3%, white)` to each principle cell.

### NL-14 [P2] — "Overall" cell border is too subtle
**File**: `lib/report.css` (.nutrition-overall-cell)
**Problem**: `border-left: 1px solid var(--border)` — the separation between principles and overall is barely visible.
**Recommendation**: Use `border-left: 2px solid var(--text)` to create a stronger visual break, mirroring the label's outer border weight.

### NL-15 [P2] — No empty state for "Quality Gate Issues" when all pass
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: When all quality gates pass, the section is hidden entirely. While this avoids showing an empty section, it also removes positive reinforcement.
**Recommendation**: Show "All quality gates passed ✓" instead of hiding the section.

### NL-16 [P1] — Stamp should include the grade, not just the label
**Problem**: The stamp shows "RECOMMENDED" but doesn't indicate this is one of three possible grades. A reader doesn't know what the alternatives are.
**Recommendation**: Add small sub-text: "One of: Recommended · Caution · Not Recommended" in the verdict area.

---

## Design Inspiration from FDA Nutrition Labels

FDA nutrition labels use:
1. **Thick border** with bold header "Nutrition Facts" — TRUST uses thinner border + logo
2. **Thick/thin rule system** for section separation — TRUST uses this ✓
3. **Large percentage values** for key metrics — TRUST lacks this (no numeric score)
4. **Bold/highlight for key data** — TRUST uses uppercase but not bold weight differentiation
5. **Serving size context** — TRUST lacks evaluation context (duration, question count)
6. **Footnote with daily values** — TRUST footer is minimal

**Key takeaway**: The most impactful addition would be a prominent numeric score (like the "% Daily Value" in FDA labels).

---

## Shareability Assessment

**Question**: Would someone screenshot this and share it?

**Current**: Maybe. The label is self-contained and clear, but:
- No URL or QR code to link back
- No obvious "share" affordance
- The verdict stamp is visually interesting but not striking
- The overall aesthetic is professional but not visually memorable

**Recommendations for shareability**:
1. Add a distinctive visual element (not just the stamp) — a colored banner or gradient header
2. Add a QR code or short URL
3. Make the score number the hero element (large, bold, in the verdict color)
4. Add a subtle pattern or texture to the border for visual distinction

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 5 | Stamp size, missing score, circle context, no link, grade context |
| P2 | 9 | Border design, visual differentiation, logo redundancy, footer content, external images |
| P3 | 2 | Rotation degree, color tinting |
| **Total** | **16** | |

### Overall Assessment
The nutrition label is functional and well-branded but plays it too safe. It needs one or two bold design elements — a prominent score number, a stronger stamp, and richer section differentiation — to go from "clean and professional" to "memorable and shareable."
