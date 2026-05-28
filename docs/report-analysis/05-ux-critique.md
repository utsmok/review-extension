# UX Critique Analysis

**Scope**: Expert and non-expert user experience evaluation of both reports

---

## Persona-Based Evaluation

### Persona A: Researcher evaluating a tool
**Goal**: Determine if Ai2 Asta is suitable for their literature review workflow.

**Journey through the report**:
1. Opens the Evaluation Report HTML
2. Sees the nutrition label at top — "RECOMMENDED" verdict is immediately visible ✓
3. Scans the principle circles: TR=●●●●, RE=●●●●, US=●●○○, SE=●●●○, TC=●●●○
4. **Friction**: What do the circles mean? Is 3/4 good? No scale legend. ✗
5. Scrolls to quality gates — sees 2 unsure items
6. **Friction**: "Unsure" is ambiguous — is this the reviewer's uncertainty or the tool's failure? ✗
7. Scrolls to categories — sees per-question scores
8. **Friction**: No summary comparison across categories. Must mentally aggregate. ✗
9. Wants to see evidence for low US score
10. **Friction**: "0 evidence" shown for every category — no screenshots linked to questions. ✗
11. Scrolls to unlinked evidence at bottom — sees 8 screenshots
12. **Friction**: Can't tell which screenshot supports which conclusion. ✗

**Researcher verdict**: The report gives me a conclusion (RECOMMENDED) and detailed rubric scores, but I can't trace the reasoning from evidence to scores. The lack of evidence linkage undermines trust.

### Persona B: Librarian making a recommendation
**Goal**: Quick comparison of 3 tools to recommend one to faculty.

**Journey**:
1. Opens the Nutrition Label
2. Sees "RECOMMENDED" stamp — good, positive ✓
3. Scans principle circles — TR and RE are full, US is lower
4. **Friction**: I need a NUMBER to compare tools. Circles are not comparable at a glance. ✗
5. Reads strengths: "free, open source, non profit, transparent workflow"
6. Reads weaknesses: "no opt out of training, only searches semantic scholar, low amount of immediate metadata"
7. **Positive**: Strengths/weaknesses are concise and actionable ✓
8. Wants to compare with other tools
9. **Friction**: No standardized score format (e.g., "78/100") that enables direct comparison ✗

**Librarian verdict**: The label communicates a clear verdict but lacks the standardized scoring needed for multi-tool comparison.

### Persona C: Administrator making a purchasing decision
**Goal**: Decide whether to fund/purchase a tool based on the evaluation.

**Journey**:
1. Receives the Nutrition Label
2. Sees "RECOMMENDED" — positive signal ✓
3. Sees "Free" in description and "Pricing: Free" — immediately valuable ✓
4. Sees 2 unsure quality gates about AI training and IP
5. **Friction**: "Unsure" is not actionable — should I be concerned or not? ✗
6. Wants to understand risk level
7. **Friction**: No confidence level or risk assessment summary ✗
8. Opens full report for details
9. **Friction**: The full report doesn't summarize the risk from unsure gates either ✗

**Administrator verdict**: The report tells me it's recommended but doesn't quantify the risk from unresolved quality gates.

---

## Scoring Dimensions (1-10)

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Visual hierarchy** | 8 | Clear top-to-bottom flow; nutrition label creates strong focal point |
| **Information architecture** | 7 | Good separation between summary and detail; but no cross-category comparison view |
| **Cognitive load** | 6 | Full report has moderate-high density; nutrition label is well-contained |
| **Emotional resonance** | 7 | Feels authoritative and institutional; verdict stamp adds gravitas |
| **Scannability (expert)** | 7 | Codes, badges, and distribution bars enable quick scanning for trained users |
| **Scannability (non-expert)** | 5 | Circle system is ambiguous; no numeric scores; terminology is technical |
| **Navigation** | 6 | ToC links work but are visually weak; no "back to top" links; long scroll |
| **Evidence trail** | 5 | Screenshots are captured but poorly linked to conclusions |
| **Print experience** | 7 | Good page breaks, color reproduction; but no cover page |
| **Shareability** | 6 | Nutrition label is shareable as screenshot but lacks a URL or QR code |

---

## Key Findings

### UX-01 [P1] — Circle rating system lacks scale context
The filled/empty circle system (●●●○) is used for both per-principle and overall scores. There is no legend, no numeric label, and no explanation of what the thresholds mean. A non-expert has no idea if 3/4 is excellent or mediocre.

**Impact**: Non-experts (the nutrition label's primary audience) cannot interpret the scores.
**Fix**: Add "3 of 4" text below circles, add a small legend: "● met threshold ○ below threshold".

> **Update (2026-05-27)**: Verified via roborev review #351 that this is already addressed in the codebase. The code renders `<div class="nutrition-circle-legend">● = threshold met &nbsp; ○ = below threshold</div>`. A legend exists. Downgraded from P0 to P1. Remaining work would be adding per-principle numeric context (e.g., "3/4" below circles).

### UX-02 [P1] — "Unsure" quality gate status is ambiguous
The quality gates show results as PASS, FAIL, or UNSURE. "Unsure" could mean:
- The reviewer couldn't determine the answer
- The tool's documentation was unclear
- The gate is not applicable but was marked unsure anyway

The current display doesn't disambiguate. In the nutrition label, it shows as a plain label with no context.

**Impact**: Decision-makers don't know whether to treat unsure as a risk or a gap in the review.
**Fix**: Replace "UNSURE" with "COULD NOT VERIFY" or add a tooltip/footnote explaining the meaning.

### UX-03 [P1] — No numeric score for quick comparison
The nutrition label shows circles but no number. When comparing 5+ tools, a librarian or administrator needs to sort by score. Circles don't support sorting.

**Impact**: Makes multi-tool comparison impractical without opening every full report.
**Fix**: Add a prominent score: "26/36" or "78%" next to the verdict stamp.

### UX-04 [P1] — Evidence is not connected to conclusions
In the example report, ALL categories show "0 evidence" but there are 8 unlinked screenshots. This creates a credibility gap — the reviewer scored everything without linking evidence to specific questions.

This is partly a user behavior issue (the reviewer didn't link evidence), but the report should still surface this disconnect.

**Impact**: Undermines the report's credibility as an evidence-based evaluation.
**Fix**: When categories have 0 evidence but unlinked evidence exists, show a warning: "N screenshots were captured but not linked to specific questions."

### UX-05 [P2] — Full report has no "back to top" navigation
The report can be very long (5000+ pixels with evidence). Once the reader scrolls to category sections, there's no way to navigate back to the overview without scrolling.

**Impact**: Navigation friction in long reports.
**Fix**: Add sticky "↑ Top" link fixed to the bottom-right corner, or make the ToC sticky.

### UX-06 [P2] — Category sections lack "collapse all" / "expand all"
Each quality gate has expandable Background and Examples sections. With 4 gates, that's 8 potential expansions. No way to expand all at once.

**Impact**: Minor friction for thorough reviewers who want to read all background text.
**Fix**: Add "Expand all backgrounds" / "Collapse all" toggle near the quality gates header.

### UX-07 [P1] — Nutrition label doesn't show the tool's category/type
The label shows the tool name, URL, and description, but not the tool type (e.g., "AI Search Engine", "Citation Manager", "Literature Database"). This context is important for readers who may not know the tool.

**Impact**: Label requires external context to interpret.
**Fix**: Add a category/type line below the description.

### UX-08 [P2] — Verdict stamp rotation is too subtle
The -2deg rotation is barely noticeable. It's meant to evoke a stamp/seal effect but at -2deg it just looks slightly misaligned.

**Impact**: Missed opportunity for a distinctive visual element.
**Fix**: Increase to -3deg or -4deg, or remove rotation entirely and use a stronger border/shadow treatment.

### UX-09 [P3] — Finalization section is visually disconnected from the nutrition label
The nutrition label's verdict stamp and the finalization section's grade block display the same information (RECOMMENDED) but look completely different. This is inconsistent.

**Impact**: Confusing when reading the full report — are these two different verdicts?
**Fix**: Ensure the finalization grade visually echoes the nutrition label stamp.

### UX-10 [P2] — Report lacks creation metadata
The report shows "Evaluated 2026-05-07 15:52" but doesn't show:
- How long the evaluation took
- How many questions were answered
- Who performed the evaluation (reviewer name/institution)
- What version of the rubric was used

**Impact**: Reduced trust — can't assess the rigor of the evaluation.
**Fix**: Add evaluation metadata: duration, rubric version, completion percentage.

### UX-11 [P1] — No risk summary for failed/unsure quality gates
Quality gates represent hard requirements. The report lists them but doesn't provide a risk summary: "2 of 4 quality gates have unresolved issues."

**Impact**: Decision-makers must count failures themselves.
**Fix**: Add a summary line: "2 quality gates could not be verified (AI training policy, IP preservation)."

### UX-12 [P2] — Strengths and weaknesses bullet points could be richer
Currently just text bullets. For a public-facing label, adding severity icons or category tags would help: ✓ free, ⚠ only searches semantic scholar.

**Impact**: Strengths/weaknesses section is text-heavy and doesn't draw the eye.
**Fix**: Add small colored icons (✓ green for strengths, ⚠ amber for weaknesses).

---

## Anti-Patterns Detected

1. **Dead-end evidence**: Screenshots captured but not linked to conclusions (UX-04)
2. **Ambiguous status**: "Unsure" as a quality gate result without definition (UX-02)
3. **Missing comparison hook**: No standardized score format for multi-tool comparison (UX-03)
4. **Information scent gap**: Expandable sections with no visual affordance (quality gate background/examples)
