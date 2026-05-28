# Clarity & Microcopy Analysis

**Scope**: Text content, labels, terminology, empty states in both reports

---

## Findings

### CL-01 [P1] — "Unsure" quality gate label is ambiguous
**File**: `lib/html-report.ts` (buildGateRows, buildNutritionLabelHtml)
**Problem**: Quality gates can show PASS, FAIL, UNSURE, N/A, or "—" (null). "Unsure" could mean:
- The reviewer couldn't determine the answer
- The tool's documentation was unclear
- The question isn't applicable but was marked unsure instead of N/A
This ambiguity makes the nutrition label's "Quality Gate Issues" section confusing.
**Fix**: Rename to "COULD NOT VERIFY" or add a parenthetical: "UNSURE (reviewer could not determine)".

### CL-02 [P2] — Gate badge "—" for null result is cryptic
**File**: `lib/html-report.ts` (buildGateRows)
**Problem**: When a gate has no result (null), it shows "—" (em dash). This could mean "not applicable", "not answered", or "skipped". The meaning is unclear.
**Fix**: Show "NOT EVALUATED" or "—" with a title attribute explaining the state.

### CL-03 [P2] — Score level descriptions vary greatly in length
**File**: Example report HTML
**Problem**: Level descriptions range from ~40 chars ("Consistently accurate across all tested queries...") to ~250 chars. This creates uneven table rows where some notes are a single line and others wrap to 4+ lines.
**Assessment**: This is a rubric content issue, not a report template issue. The template handles it correctly with wrapping. Acceptable.

### CL-04 [P1] — "0 evidence" label is unhelpful
**File**: `lib/html-report.ts` (buildCategorySections)
**Problem**: Category metadata shows "0 evidence" when no evidence is linked. This is technically accurate but sounds negative — it implies the evaluation was done without evidence. The label should either be hidden at 0 or rephrased.
**Fix**: Hide the evidence count when 0, or show as "No linked evidence" (less accusatory).

### CL-05 [P3] — Date format YYYY-MM-DD HH:mm is precise but not user-friendly
**File**: `lib/html-report.ts` (formatDate)
**Problem**: "2026-05-07 15:52" is ISO-adjacent but not localized. For an international audience, a more readable format would be "May 7, 2026 at 15:52" or "7 May 2026, 3:52 PM".
**Assessment**: The current format is unambiguous and sortable. A design choice, not a bug. Acceptable for the technical audience of the full report. Consider friendlier format for the nutrition label.

### CL-06 [P2] — Table column header "Level" is vague
**File**: `lib/html-report.ts` (buildCategorySections)
**Problem**: The "Level" column header in category scoring tables doesn't clearly communicate that it contains the rubric level description (the criteria for that score). "Criteria" or "Description" would be more descriptive.
**Fix**: Rename to "Criteria" or "Description".

### CL-07 [P2] — "Code" column header is technical
**File**: `lib/html-report.ts` (buildGateRows, buildCategorySections)
**Problem**: Both quality gates and scoring tables use "Code" as a column header. For non-technical readers, "ID" or "#" would be more universally understood.
**Fix**: Consider "ID" instead of "Code" for the gates table. Keep "Code" for the scoring table (it's part of the TRUST framework vocabulary).

### CL-08 [P3] — "Additional Evidence" section title doesn't explain context
**File**: `lib/html-report.ts` (buildUnlinkedSection)
**Problem**: "Additional Evidence" sounds like supplementary material, not "evidence that wasn't linked to any rubric question." The reader may wonder why this evidence exists separately.
**Fix**: Rename to "Unlinked Evidence" or add a subtitle: "Captured screenshots not directly linked to rubric questions."

### CL-09 [P1] — Nutrition label lacks principle score legend
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The principle circles (●●●○) have no legend explaining what filled vs empty means. A reader unfamiliar with the TRUST framework has no idea what "3 filled circles" indicates.
**Fix**: Add a small legend: "● threshold met ○ below threshold" or "Filled circles indicate the principle meets quality standards."

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The code renders `<div class="nutrition-circle-legend">● = threshold met &nbsp; ○ = below threshold</div>`. The legend already exists.

### CL-10 [P2] — Verdict terminology is clear and well-chosen
**Assessment**: The verdict terms — RECOMMENDED, CAUTION, NOT RECOMMENDED, INCOMPLETE, NOT EVALUATED — are clear, actionable, and unambiguous. This is well-done. ✓

### CL-11 [P2] — "Quality Gate Issues" section only shows problems
**File**: `lib/html-report.ts` (buildNutritionLabelHtml)
**Problem**: The nutrition label's quality gate section is titled "Quality Gate Issues" and only shows failures and unsures. This means:
- If all gates pass, the section is empty (no heading shown) ✓
- If some gates are unsure, it shows them as "issues" which implies they're problems

A gate marked "unsure" is not necessarily an "issue" — it's an unresolved question.
**Fix**: Rename to "Quality Gate Notes" or "Unresolved Quality Gates" for unsure items.

### CL-12 [P2] — Nutrition label tool description uses italic
**Problem**: `.nutrition-description { font-style: italic; }` — the tool description is the only italic text in the label. This distinguishes it from factual content (appropriate) but may be missed if the description is long.
**Assessment**: Good use of italic to distinguish user-authored description from structured data. ✓

### CL-13 [P3] — Expandable section labels "Background" and "Examples" are clear
**Assessment**: These labels precisely describe the content within. No improvement needed. ✓

### CL-14 [P1] — Category average shown as "avg 3.0" is not formatted consistently
**File**: `lib/html-report.ts` (buildCategorySections)
**Problem**: Category metadata shows "avg 3.0" — lowercase "avg", no unit, decimal formatting varies. When the average is exactly an integer, it shows "avg 3.0" (with decimal). When non-integer, it would show "avg 2.5".
**Fix**: Use "Average: 3.0 / 3.0" or "Avg: 3.0/3.0" for more context about what the number means.

### CL-15 [P2] — "Contents" label in ToC is very small
**File**: `lib/html-report.css` (.toc-label)
**Problem**: The "Contents" label is at 0.75rem, uppercase, and colored --muted. It's easy to overlook.
**Fix**: Increase to 0.8rem or use the heading font for emphasis.

### CL-16 [P2] — Notes column shows "-" for empty notes
**Problem**: When a quality gate or scoring question has no notes, the cell shows "—" (em dash). This is fine but doesn't distinguish between "reviewer didn't write notes" and "not applicable".
**Fix**: Empty notes cells should simply be empty (no dash) to avoid implying missing data.

### CL-17 [P3] — "Evaluated" date label could be more specific
**Problem**: "Evaluated 2026-05-07 15:52" — this is the session start time, not the evaluation completion time. If the evaluation took days, the label is misleading.
**Fix**: Use "Evaluation started: {date}" or show both start and end times.

### CL-18 [P2] — Footer text is functional but sparse
**Problem**: "LISA-EIS / University of Twente / 2026-05-07" — this is the institution and date. Missing: rubric version, evaluation framework name ("TRUST Framework v1.1"), confidentiality notice.
**Fix**: Expand to: "LISA-EIS / University of Twente · TRUST Framework v1.1 · Confidential · 2026-05-07"

### CL-19 [P3] — "AI-powered: Yes/No" label is clear
**Assessment**: Simple, binary, unambiguous. ✓

### CL-20 [P2] — Strengths/weaknesses lack category context
**File**: `lib/html-report.ts` (buildNutritionLabelHtml, buildFinalizationSection)
**Problem**: Strengths and weaknesses are free-text lists. They don't connect to specific principles or rubric questions. "only searches semantic scholar" is a weakness — but which principle does it relate to (TR? TC?).
**Fix**: Optionally tag strengths/weaknesses with principle codes: "only searches Semantic Scholar [TR]".

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 4 | Ambiguous "unsure", missing legend, unhelpful "0 evidence", average formatting |
| P2 | 10 | Label clarity, legend needs, evidence context, note handling, footer content |
| P3 | 4 | Date format, section naming, timestamp accuracy |
| **Total** | **18** | |

### Strengths
1. Verdict terminology (RECOMMENDED/CAUTION/NOT RECOMMENDED) is excellent
2. Expandable section labels (Background/Examples) are precise
3. Tool metadata labels are comprehensive (data sources, search methods, discipline, etc.)
4. The nutrition label is largely self-explanatory to non-experts
5. Score badges combine color + text for accessibility
