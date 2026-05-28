# Data Visualization & Content Review

**Date**: 2026-05-28
**Scope**: Report HTML generation, scoring logic, rubric content, export pipeline, data visualization elements
**Method**: Fresh review against Tufte principles and data visualization best practices

---

## Executive Summary

The report generation pipeline (`lib/html-report.ts`) is the crown jewel of this extension — a 560-line function that produces professional, standalone HTML reports. The nutrition label metaphor is clever and memorable. However, there are meaningful data visualization issues: distribution bars waste ink, the scoring tables could encode data more efficiently, and the rubric content could be more rigorous for an academic evaluation instrument.

**Report Quality: B+** | **Data Viz: B-** | **Rubric Content: B** | **Export: A-**

---

## Report HTML Quality

### Good
- **Standalone architecture** — no external dependencies, works offline
- **Print-ready** — `@page` rules, page breaks, color-adjust
- **Brand consistency** — TRUST magenta, navy, principle colors
- **Nutrition label metaphor** — memorable, shareable, appropriate for non-expert audience
- **Accessibility foundation** — semantic HTML tables, proper heading hierarchy

### Issues

#### V1 [P1] — Distribution bars have poor data-ink ratio
**File**: `lib/rubric.ts` (`distributionBar`), `lib/report.css` (.dist-bar)
Distribution bars use ~100px width × 10px height + borders for 4 segments (scores 0-3). Most categories show a single-color bar (e.g., 100% green for all score 3). This provides almost no information — it's decorative ink masquerading as data.

**Tufte violation**: Low data-ink ratio. The bar encodes 1-2 data points but consumes significant visual space.

**Fix**: Replace with a compact numeric display: "avg 2.8/3.0" or a sparkline. The principle circles already convey the same information more intuitively.

#### V2 [P1] — Score circles lack numeric labels
**File**: `lib/html-report.ts` (`scoreCircles`)
The 4 filled/empty circles (●●●○) are visually clear but semantically ambiguous for non-experts. A reader doesn't know if 3/4 is good or mediocre.

**Fix**: Add a small "3/4" label next to each circle group. The legend already exists ("● = threshold met, ○ = below threshold") but the numeric score is missing.

#### V3 [P2] — Verdict stamp underwhelming
**File**: `lib/report.css` (.nutrition-verdict-stamp), `lib/html-report.ts`
The verdict stamp ("RECOMMENDED", "CAUTION", "NOT RECOMMENDED") is the most important single piece of information but uses `clamp(1.4rem, 3.5vw, 2.2rem)` — too small for the primary decision signal. The `-2deg` rotation is barely perceptible.

**Fix**: Increase to `clamp(1.8rem, 5vw, 3rem)`, add more padding, consider a colored background stripe.

#### V4 [P2] — Category header tint barely visible
**File**: `lib/report.css` (.category-header)
`background: color-mix(in srgb, var(--accent) 6%, var(--white))` — 6% tint is imperceptible. The categories don't feel distinct from each other.

**Fix**: Increase to 8-10% for a noticeable but subtle tint.

---

## Scoring Logic

### Good
- `compute-scores.ts` is clean and well-tested
- Handles edge cases (all N/A, partial scores, no evidence)
- Principle averages computed correctly

### Issues

#### V5 [P2] — No confidence intervals or score ranges
The report shows point estimates (e.g., "2.5/3.0") but no indication of score distribution within a principle. A principle with scores [3,3,2,3] (avg 2.75) looks nearly identical to [3,3,3,1] (avg 2.5) but the latter has more variance.

**Fix**: Add a small range indicator or variance badge next to the average.

#### V6 [P2] — "Unsure" scores not visually distinguished from N/A
Both "unsure" and "N/A" use the same muted gray color (#6b7f94). They have different semantics: "I couldn't determine this" vs "This doesn't apply".

**Fix**: Use a different visual treatment — dashed border for N/A, dotted border or question mark icon for Unsure.

---

## Rubric Content Quality

**File**: `data/rubrics/trust-full.json`

### Good
- 14 well-structured questions across 5 TRUST principles
- Quality gates properly separate pass/fail prerequisites
- 4 AI-specific questions (training policy, methodology, accuracy, cognitive guardrails)
- Scoring criteria (0-3) have clear descriptions for each level

### Issues

#### V7 [P1] — Scoring criteria descriptions are sometimes vague
Several score-level descriptions use subjective language:
- Score 1: "Partially meets the criterion" — what counts as partial?
- Score 2: "Meets the criterion with minor issues" — what's minor vs major?

**Fix**: Add concrete, measurable indicators for each score level. E.g., "Score 1: The tool provides a privacy policy but it is not easily discoverable (requires >3 clicks from homepage)."

#### V8 [P2] — No cross-reference between related questions
Questions like "data_source_clarity" and "citation_mechanism" are related but there's no indication of this in the rubric. Reviewers may duplicate evidence.

**Fix**: Add a `relatedQuestions` field to rubric items and show cross-references in the UI.

#### V9 [P2] — Quality gate examples are generic
Quality gate "examples" sections provide generic guidance. For an academic search tool evaluation, specific examples would be more useful.

**Fix**: Add tool-specific examples (e.g., "Semantic Scholar provides a clear citation export feature → pass for citation_mechanism").

---

## Export Pipeline

### Good
- ZIP structure is clean: evidence/, CSVs, HTML report
- CSV format includes all necessary fields
- Filename generation handles special characters
- Annotated export includes reviewer notes

### Issues

#### V10 [P2] — Export doesn't include scoring metadata
The `rubric_scores.csv` includes scores but not the time spent on each question or the order in which questions were answered. For audit purposes, this metadata would strengthen the evaluation trail.

**Fix**: Add `scored_at` timestamp to each evaluation in the CSV export.

#### V11 [P3] — No export format options
Only one export format (ZIP with HTML + CSV). For institutional use, PDF or DOCX export might be preferred.

**Fix**: Consider adding PDF export via the browser's print-to-PDF API, or a markdown export option.

---

## Tufte Principles Assessment

| Principle | Rating | Notes |
|-----------|--------|-------|
| Data-ink ratio | C+ | Distribution bars waste ink; score badges are efficient |
| Chartjunk | B | Minimal decoration; alternating row backgrounds too subtle |
| Small multiples | A- | Principle circles effectively show 5+1 comparisons at once |
| Graphical integrity | A | Scores accurately represent data; no misleading scales |
| Layering | B- | All information at same visual priority; no clear figure-ground |
| Multivariate display | B | Score + evidence + notes per question; could be richer |

---

## Missed Opportunities

1. **Sparkline progress** — Replace distribution bars with sparklines showing score distribution over time (if re-evaluating)
2. **Comparison mode** — Generate a side-by-side comparison report for two tools
3. **Score trend chart** — If the tool is re-evaluated over time, show a trend line
4. **Evidence heatmap** — Show which questions have the most/least evidence attached
5. **Confidence badges** — Mark scores where the reviewer selected "Unsure" with a visual indicator
6. **Rubric versioning** — Track rubric version in exports so future rubric changes don't invalidate old reviews

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 3 | Distribution bars, circle labels, rubric criteria clarity |
| P2 | 6 | Verdict stamp, scoring metadata, N/A vs Unsure, rubric cross-references |
| P3 | 2 | Export formats, rubric versioning |
| **Total** | **11** | |
