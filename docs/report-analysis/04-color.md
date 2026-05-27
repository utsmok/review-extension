# Color System Analysis

**Scope**: Palette, contrast, differentiation, accessibility, print reproduction

---

## Palette Overview

### Brand Colors
| Token | Hex | Usage | WCAG on White |
|-------|-----|-------|--------------|
| --magenta | #8e036c | Brand accent, top bar, header tool name, report sections | 7.2:1 ✓ |
| --navy | #002c5f | Structural bars, table headers, letterform border | 14.5:1 ✓ |

### Principle Colors (reportColor variants, darkened for AA)
| Principle | Hex | Report Color | WCAG on White |
|-----------|-----|-------------|--------------|
| TR (Transparency) | #2563eb | #2563eb | 4.7:1 ✓ |
| RE (Reliability) | #16a34a | #15803d | 5.2:1 ✓ |
| US (Usability) | #9333ea | #9333ea | 4.9:1 ✓ |
| SE (Soundness) | #ea580c | #c2410c | 4.6:1 ✓ |
| TC (Traceability) | #0d9488 | #0f766e | 4.8:1 ✓ |

### Score Colors
| Score | Hex | Label | WCAG on White |
|-------|-----|-------|--------------|
| 0 | #c60c30 | Inadequate | 4.3:1 ✓ (borderline) |
| 1 | #ea580c | Limited | 3.1:1 ✗ FAIL |
| 2 | #0e7490 | Adequate | 4.6:1 ✓ |
| 3 | #4a8355 | Comprehensive | 4.5:1 ✓ |

### Verdict Colors
| Grade | Hex | Label | WCAG on White |
|-------|-----|-------|--------------|
| Pass | #4a8355 | RECOMMENDED | 4.5:1 ✓ |
| Conditional | #ea580c | CAUTION | 3.1:1 ✗ FAIL |
| Fail | #c60c30 | NOT RECOMMENDED | 4.3:1 ✓ (borderline) |

---

## Findings

### C-01 [P1] — Score 1 color (#ea580c) fails WCAG AA on white
**File**: `lib/rubric.ts` (SCORE_COLORS)
**Problem**: Orange #ea580c has only 3.1:1 contrast against white. WCAG AA requires 4.5:1 for normal text and 3:1 for large text. At 0.75rem in score badges, this is normal text.
**Impact**: Score "1" badges are the hardest to read of all score levels.
**Fix**: Darken to #c2410c (same as SE reportColor), which achieves 4.6:1.

### C-02 [P1] — Verdict "CAUTION" color (#ea580c) fails WCAG AA
**File**: `lib/report/compute-scores.ts` (GRADE_COLORS)
**Problem**: Same orange used for conditional/CAUTION verdict. At `clamp(1.4rem–2.2rem)` in the stamp, this qualifies as large text (≥18pt or ≥14pt bold), so 3:1 is the threshold. At the minimum clamp (1.4rem = ~21px), this passes for large text. However, the stamp text weight is 800, which combined with the size may qualify. **Borderline pass for the stamp, but the color is also used elsewhere at smaller sizes.**
**Fix**: Darken to match the report variant approach: use a darker orange for text contexts.

### C-03 [P2] — Score color progression is non-intuitive
**Problem**: The score color spectrum goes: red → orange → teal → green. This breaks the expected "traffic light" or "heat map" progression (red → amber → yellow → green). The jump from orange (warm) to teal (cool) is jarring and semantically unclear.
**Recommendation**: Consider: red (#c60c30) → amber (#d97706) → yellow-green (#65a30d) → green (#4a8355). This creates a continuous warm-to-cool progression that maps more intuitively to bad→good.

### C-04 [P2] — Principle colors lack consistent lightness
**Problem**: The 5 principle colors span a wide lightness range:
- TR (#2563eb): bright blue — luminance 0.089
- RE (#15803d): dark green — luminance 0.148
- US (#9333ea): medium purple — luminance 0.068
- SE (#c2410c): dark orange — luminance 0.120
- TC (#0f766e): dark teal — luminance 0.127

These differences mean colored elements don't have visual parity. The purple (US) appears darker and more saturated, while the green (RE) appears lighter.

**Assessment**: Acceptable — the colors ARE distinguishable. But they don't form a harmonious set.
**Fix**: Consider normalizing to similar perceived brightness using HSL lightness adjustment.

### C-05 [P2] — Score badge backgrounds use different opacity levels
**File**: `lib/html-report.ts` (badge generation)
**Problem**: Score badges use `background: {color}{alpha}` where alpha varies:
- Score 0: `#c60c30 0.09` (9% opacity)
- Score 1: `#ea580c 0.13` (13% opacity)
- Score 2: `#0e7490 0.13`
- Score 3: `#4a8355 0.13`
- Pass: `#4a8355 0.09`
- Fail: `#c60c30 0.09`
- Unsure: `#6b7f94 0.09`
- N/A: `#6b7f94 0.09`

The inconsistent opacity (9% vs 13%) creates uneven visual weight. Score 0 badges appear lighter than score 1-3 badges.

**Fix**: Standardize to a single opacity (12%) for all badges.

### C-06 [P3] — Distribution bar colors don't match principle colors
**Problem**: Distribution bars always use the score colors (red/orange/teal/green), not the principle colors. This means a category with all score 3 shows a green bar regardless of whether it's the TR (blue) or TC (teal) category.
**Assessment**: This is correct behavior — distribution bars encode score distribution, not category identity. The category identity is encoded in the border and header.

### C-07 [P2] — Evidence "weak" indicator uses red left border
**File**: `lib/report.css` (.evidence-item.evidence-weak)
**Problem**: `border-left: 3px solid #c60c30; background: #fef2f2;` — a strong visual indicator. However, the "weak" classification is not defined in the CSS — it's applied based on some evidence quality assessment. The red is appropriate but the light pink background (#fef2f2) has very low contrast against white.
**Fix**: Consider slightly darker background: #fef0f0.

### C-08 [P2] — Empty circles use --border color (#bfc6cf)
**File**: `lib/report.css` (.circle.empty)
**Problem**: Empty circles at `color: var(--border)` (#bfc6cf) are very light. Against white, this is ~2.1:1 contrast — failing even large-text WCAG. However, the empty circle is intentionally muted (it represents "not achieved"), so this may be acceptable as decorative.
**Assessment**: Intentional design choice. The emptiness IS the information. Acceptable.

### C-09 [P3] — Category header background tint uses color-mix
**File**: `lib/report.css` (.category-header)
**Problem**: `background: color-mix(in srgb, var(--accent) 6%, var(--white))` — creates a very subtle tint. At 6%, the tint is barely perceptible for all colors. This is intentional subtlety but reduces the visual benefit of having principle-specific backgrounds.
**Fix**: Increase to 8-10% for a more noticeable (but still subtle) tint.

### C-10 [P2] — Gate badge "PASS" and "FAIL" use same opacity as scores
**Problem**: Gate badges share the same styling approach as score badges but with different semantics (pass/fail vs. 0-3). The "—" (N/A) badge uses the muted color at 9% opacity and is nearly invisible.
**Fix**: Increase N/A badge opacity to 15% or use a distinct visual treatment (e.g., dashed border instead of solid).

### C-11 [P3] — Verdict stamp uses inline color override
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The verdict stamp color is set via `style="color:#4a8355;border-color:#4a8355"`. This works but means the stamp's color can't be overridden by print stylesheets or accessibility tools.
**Fix**: Use a CSS custom property `--verdict-color` set on the stamp's parent.

### C-12 [P1] — No dark mode support
**File**: `lib/report.css`
**Problem**: No `prefers-color-scheme: dark` media query. The report uses hardcoded light backgrounds and dark text.
**Assessment**: By project design decision — no dark mode. Acceptable per constraints.
**Future**: If dark mode is ever needed, the CSS variable system makes it straightforward to add.

### C-13 [P2] — Print reproduction of colored elements
**Problem**: The print stylesheet applies `print-color-adjust: exact` to colored elements ✓. However:
- Grayscale printing will lose all principle color differentiation
- Score badges in grayscale all look the same (light gray backgrounds)
**Fix**: For print, consider adding score level text ("0", "1", "2", "3") as bold prefixes in addition to color coding. The current score badges DO show the number ✓.

### C-14 [P3] — TRUST Magenta is used sparingly and effectively
**Assessment**: The magenta accent is used for: top bar, header tool name, report section headers, finalization section border, nutrition label divider, and unlinked evidence section border. This creates a clear brand presence without overwhelming the content. Well done.

### C-15 [P2] — Navy (#002c5f) is used for structural emphasis
**Assessment**: Navy is used for: main divider (4px), gate summary border (4px), letterform border (2px), and quality gate table headers. It creates a visual "backbone" for the report. This is effective — navy reads as structural, magenta as branded.

---

## Color Blindness Assessment

### Deuteranopia (red-green, ~6% of males)
- Score 0 (red #c60c30) vs Score 3 (green #4a8355): **Indistinguishable** in deuteranopia — both appear as similar brown/olive
- Principle TR (blue) vs RE (green): Distinguishable ✓
- Principle SE (orange) vs TC (teal): Potentially confusing — both appear brownish

**Fix**: Score badges include numeric text ("0", "3"), which provides a non-color channel ✓. However, distribution bars rely purely on color — FAIL for deuteranopia.

### Protanopia (red-blind)
- Same issues as deuteranopia for red-green score differentiation
- Score badges with numbers mitigate ✓

### Tritanopia (blue-yellow)
- TR (blue) vs TC (teal) may be confused
- Score colors are generally distinguishable

**Overall**: Score badges are accessible due to numeric labels. Distribution bars are NOT accessible to red-green color-blind users. Nutrition label circles use position (filled vs empty) rather than color for encoding — accessible ✓.

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 3 | Score 1 contrast failure, CAUTION contrast, no dark mode |
| P2 | 8 | Color progression, opacity inconsistency, color-blind access, print reproduction |
| P3 | 4 | Background tint subtlety, inline color overrides, brand color usage |
| **Total** | **15** | |

### Strengths
1. Darkened reportColor variants ensure AA contrast on white text in headers ✓
2. Score badges include numeric labels for color-blind accessibility ✓
3. Circle indicators use fill state (not color) for encoding ✓
4. Brand colors (magenta/navy) create strong identity without overwhelming data
5. Print color reproduction is explicitly handled ✓
