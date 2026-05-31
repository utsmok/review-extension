# Content Improvement Plan — Non-Rubric Surfaces

> Companion to `docs/TRUST-NORTH-STAR.md`. This document addresses the user's request to investigate metadata, finalization, and other non-scoring fields and propose a different approach for improving them.

---

## 1. Correction to Earlier Assessment

The earlier research summary stated: *"Examples only appear in exported HTML report."* This is incorrect. The sidepanel renders examples in a collapsible "Examples" foldout (`<details>` element) below the "Background" foldout for every question (see `QuestionSection.tsx:347-378`). Both quality gates and scoring questions show examples. This is a significant finding: examples ARE available to the reviewer during evaluation, not just in the export.

---

## 2. Current State Audit

### 2.1 Metadata Screen (`components/Metadata.tsx`)

| Field | Label | Placeholder | Assessment |
|-------|-------|-------------|------------|
| Description | "Tool Description" | "e.g. Citation-based searching through a visual interface" | Good. Label is clear, placeholder demonstrates format. |
| Company | "Company" | "e.g. Elsevier" | Good. |
| AI toggle | "Tool uses AI / LLM" | (checkbox, ON/OFF badges) | Good. Has contextual warning when disabled with scored AI questions. |
| Notes | "Review Notes" | "e.g. Primarily used for literature review in biomedical research..." | Good label, helpful placeholder. |
| Logo URL | "Tool Logo URL" | "e.g. https://example.com/logo.png" | Functional but label is technical. "Logo" would suffice — reviewers don't need "URL". |
| Pricing | "Pricing" | "e.g. Freemium, Subscription" | Acceptable but narrow. Many tools are "Free", "Open source", "Institutional license". |
| Access Level | "Access Level" | "e.g. Institutional license required" | Good concept, unclear scope. Could mean authentication requirement, licensing, or availability. |
| T&C | "Terms & Conditions" | "e.g. https://example.com/terms" | Fine. |
| Data Sources | "Data Sources" | "Add custom source..." | Good pill list. Missing: Preprints (arXiv, bioRxiv, SSRN), Google Books, BASE, CORE, Dimensions. |
| Search Methods | "Search Methods" | "Add custom method..." | Good list. Missing: "Vector search", "Hybrid search" for AI tools. |
| Discipline | "Discipline" | "Add custom discipline..." | Very long list (34 options). Mostly maps to Scopus ASJC codes. Several entries lack Oxford comma ("Biochemistry Genetics and Molecular Biology"). |
| Auth Method | "Authentication Method" | (no placeholder, single-select pills) | Functional. "None required" is clear. |

**Pill option gaps:**

- **Data Sources**: Missing arXiv, bioRxiv, SSRN, Google Books, BASE, CORE, Dimensions, ProQuest, EBSCOhost, OCLC WorldCat. These are commonly used in academic libraries.
- **Search Methods**: Missing "Vector search", "Hybrid search", "Retrieval-Augmented Generation (RAG)" — all relevant for AI tools.
- **Discipline**: The list maps to Scopus ASJC but is missing "Multidisciplinary" as an option for cross-domain tools. Several entries need commas for readability.

### 2.2 Finalization Screen (`components/FinalizationScreen.tsx`)

| Field | Label | Placeholder/Guidance | Assessment |
|-------|-------|---------------------|------------|
| Grade | (none visible — GradeSelector buttons) | Three buttons: Pass / Conditional / Fail | **No explanation** of what each grade means. A new reviewer does not know the difference between "Pass" and "Conditional". |
| Conclusion | "Conclusion" | "Overall summary of the review..." | **Weak.** Placeholder gives no guidance on what to include. Should prompt the reviewer to reference specific scores or principles. |
| Strengths | "Strengths" | "Describe a strength..." | **Weak.** Placeholder is generic. Doesn't prompt for evidence-backed observations. |
| Weaknesses | "Weaknesses" | "Describe a weakness..." | Same issue as Strengths. |
| Recommendations | "Recommendations" | "Suggestions for improvement..." | **Weak.** "Suggestions for improvement" is vague. Should prompt for actionable, specific recommendations. |

**Nutrition label impact:** The finalization fields (grade, conclusion, strengths, weaknesses) appear directly in the standalone nutrition label — the public-facing infocard shared with researchers, students, and colleagues. A weak conclusion or empty strengths list doesn't just degrade the full report; it produces a nutrition label that fails at its primary purpose of communicating a clear verdict to a non-expert audience.

### 2.3 Question Section — Per-Question UI (`components/QuestionSection.tsx`)

| Element | Current State | Assessment |
|---------|--------------|------------|
| Question title | Renders as `<summary>` text | Good. Scannable. |
| Quality gate requirement | Renders as paragraph text | Good. Clear, standalone requirement statement. |
| Score descriptions (0/1/2/3) | Render as labeled radio buttons with description text | Functional but dense. No visual hierarchy between score number and description. |
| Background | Collapsible "Background" foldout | Good. Keeps the main view clean while providing depth. |
| Examples | Collapsible "Examples" foldout | Good. Per-level examples. |
| Notes | Textarea with placeholder "Notes..." (QG: "Notes / remarks...") | **Weak.** Placeholder is too generic. Should prompt for what kind of notes are useful (evidence summary, scoring rationale). |
| Score option labels | Quality gates: "✓ Pass", "✗ Fail", "— N/A", "? Unsure". Scoring: "0", "1", "2", "3", "— N/A", "? Unsure". | **Functional but terse.** No tooltip or guidance on when to use "Unsure" vs. "N/A". |
| "Related gate" cross-reference | Small italic text: "Gate: privacy_and_security" | **Too technical.** Shows the internal ID, not a human-readable label. Should say "Related quality gate: Data privacy policy". |

### 2.4 GradeSelector (`components/finalization/GradeSelector.tsx`)

Three buttons with no descriptive text:
- "Pass" — no explanation
- "Conditional" — no explanation
- "Fail" — no explanation

Color coding exists (green/amber/red) but the semantic meaning is undefined within the UI.

---

## 3. Proposed Approach: Differentiated by Content Type

The rubric content (Layer 1) is the right target for the measurement framework (readability, boundary discrimination, LLM-as-judge). But the non-rubric surfaces need a **different approach** — they are not evaluation instruments subject to inter-rater reliability. They are UX copy whose quality is measured by whether a first-time user can complete the task without documentation.

### Principle: Content in the tool serves three functions

1. **Instrument** — the rubric questions and score descriptions. Quality = scoring consistency.
2. **Scaffolding** — guidance, prompts, placeholders, tooltips. Quality = task completion without external help.
3. **Data collection** — labels and field definitions that determine what information is captured. Quality = completeness and consistency of captured data.

The improvement approach must be different for each:

| Function | Measurement | Improvement method |
|----------|------------|-------------------|
| Instrument | Boundary discrimination, behavioral grounding | Static analysis + LLM-as-judge + rewrite loop |
| Scaffolding | Task completion, comprehensibility | Expert review + placeholder/tooltip rewrite + user walkthrough |
| Data collection | Completeness, option coverage | Gap analysis against known tools + schema review |

---

## 4. Concrete Improvements

### 4.1 Finalization Screen (Scaffolding — highest impact)

**Problem:** The finalization screen is the last thing a reviewer completes and the first thing a report reader sees. Its fields also feed directly into the nutrition label — the public-facing infocard shared with non-expert audiences (researchers, students, colleagues). Currently it provides almost no guidance.

**Proposed changes:**

#### Grade descriptions
Add subtitle text to each grade button:

| Grade | Subtitle |
|-------|----------|
| **Pass** | Meets TRUST standards for institutional recommendation |
| **Conditional** | Acceptable with documented caveats; recommend for limited use cases |
| **Fail** | Does not meet minimum standards; recommend against institutional use |

#### Conclusion placeholder
Replace `"Overall summary of the review..."` with:
```
Summarize the key findings from this evaluation. Reference specific
principles or criteria where relevant (e.g., "Strong transparency but
limited accessibility"). Mention the tool's primary strengths and the
most significant concerns.
```

#### Strengths placeholder
Replace `"Describe a strength..."` with:
```
e.g. Clear source list with coverage dates
```

#### Weaknesses placeholder
Replace `"Describe a weakness..."` with:
```
e.g. No accessibility statement; keyboard navigation incomplete
```

#### Recommendations placeholder
Replace `"Suggestions for improvement..."` with:
```
Specific, actionable suggestions for the tool vendor or for UT's
adoption decision (e.g., "Request WCAG audit before institutional
licensing").
```

#### Guidance text
Add a brief explainer paragraph above the grade selector:

> Select the overall recommendation based on the scoring results and your professional judgment. The grade should reflect whether this tool is suitable for institutional recommendation. The conclusion should stand on its own — a colleague reading only the report should understand your reasoning.

### 4.2 Question Notes Placeholders (Scaffolding)

**Problem:** Generic "Notes..." placeholder gives no guidance on what to write.

**Proposed changes:**

For quality gates:
```
e.g. Privacy policy dated 2025-03; confirms no third-party sharing
```

For scoring questions:
```
e.g. Sources page lists 12 databases but no coverage dates provided
```

### 4.3 Related Gate Cross-Reference (Data collection)

**Problem:** Shows internal ID like `privacy_and_security` instead of a human-readable label.

**Proposed change:** Map internal IDs to question titles. The rubric data already contains the title for each quality gate question — use it instead of the raw ID.

In `QuestionSection.tsx:332-334`, change from:
```
Gate: privacy_and_security
```
to:
```
Related gate: Data privacy policy
```

This requires passing the quality gate question data to the scoring question renderer, or maintaining a lookup map from gate ID → title.

### 4.4 Metadata Pill Options (Data collection)

**Data Sources — add:**
- arXiv
- bioRxiv
- SSRN
- Google Books
- BASE (Bielefeld Academic Search Engine)
- CORE
- Dimensions
- ProQuest
- EBSCOhost
- OCLC WorldCat

**Search Methods — add:**
- Vector search
- Hybrid search

**Discipline — add:**
- Multidisciplinary

**Discipline — fix commas:**
- "Biochemistry Genetics and Molecular Biology" → "Biochemistry, Genetics and Molecular Biology"
- "Economics Econometrics and Finance" → "Economics, Econometrics and Finance"
- "Pharmacology Toxicology and Pharmaceutics" → "Pharmacology, Toxicology and Pharmaceutics"
- "Law, Policy, and Criminology" — already has commas (inconsistent formatting across the list)

### 4.5 Metadata Field Labels (Scaffolding)

| Current | Proposed | Reason |
|---------|----------|--------|
| "Tool Logo URL" | "Logo" | "URL" is technical noise. The capture button and URL input make the purpose clear. |
| "Access Level" | "Availability" | "Access Level" is ambiguous (could mean authentication, licensing, or physical access). Maps to `availability` in the data model already. |

### 4.6 Score Option Guidance (Scaffolding)

Add a tooltip or brief explainer for the "Unsure" and "N/A" options:

- **N/A**: "This criterion does not apply to the tool being evaluated."
- **Unsure**: "Insufficient information to score. Document what was checked in the notes."

This could be a `title` attribute on the score option buttons, or a small info line that appears when hovering.

---

## 5. Prioritized Implementation Order

| Priority | Change | Impact | Effort | Risk |
|----------|--------|--------|--------|------|
| P0 | Grade descriptions in GradeSelector | High — prevents misgrading | Low — add subtitle text | None |
| P0 | Conclusion/strengths/weaknesses/recommendations placeholders | High — determines report quality | Low — text changes | None |
| P0 | Finalization guidance text | High — sets reviewer expectations | Low — add paragraph | None |
| P1 | Question notes placeholders | Medium — improves notes quality | Low — text changes | None |
| P1 | Related gate cross-reference labels | Medium — reduces confusion | Medium — requires data plumbing | None |
| P1 | "Unsure"/"N/A" tooltips | Medium — reduces misclassification | Low — add title attributes | None |
| P2 | Data source pill options expansion | Medium — captures more accurate metadata | Low — add strings | None (additive) |
| P2 | Search method pill options expansion | Low — more complete | Low — add strings | None (additive) |
| P2 | Discipline comma fixes + "Multidisciplinary" | Low — polish | Low — text changes | None |
| P3 | Metadata label renames | Low — marginal clarity gain | Low — text changes | Existing reports unaffected |

---

## 6. What This Approach Does NOT Cover

These are intentionally out of scope for this improvement cycle:

- **Adding missing questionnaire sections** (evaluation setup, critical fails, governance) — architectural scope
- **Per-principle summary fields** in the finalization screen — schema change
- **Confidence level** per question — schema change
- **Metadata field validation** (e.g., enforcing tool name before export) — functional change, not content
- **Report template changes** — separate concern from sidepanel content
- **Multi-reviewer workflow or governance** — out of scope for this tool
- **Standardized test batteries with golden datasets** — deferred

---

## 7. Measurement for Non-Rubric Content

Non-rubric content benefits from both automated and observational measurement. Automated checks can be run in a measurement loop alongside the rubric analysis:

### Automated measurement (run in the same loop as Layer 1 analysis)

| What to measure | How | Target |
|----------------|-----|--------|
| **Placeholder effectiveness** | LLM-as-reviewer: present each placeholder + label to an LLM without documentation; can it infer the expected input? | LLM correctly infers expected input for all fields |
| **Guidance density** | Word count of guidance text per screen. Flag screens with zero guidance. | Every decision screen has ≥1 sentence of guidance |
| **Pill option coverage** | Scan stored sessions for custom entries; high custom-entry rates indicate missing presets. | Custom entries <10% of selections |
| **Label clarity** | LLM-as-judge rates each label for ambiguity without context. | No label rated "ambiguous" |
| **Nutrition label completeness** | Parse exported labels; flag those with missing verdict, empty strengths/weaknesses. | Every label has verdict + ≥1 strength + ≥1 weakness |
| **Conclusion quality** | Word count + LLM-as-judge: does the conclusion reference specific principles or criteria? | Conclusion ≥30 words; references ≥1 principle |

### Observational measurement (human spot-checks)

| What to measure | How |
|----------------|-----|
| **Grade comprehension** | Ask: "What is the difference between Pass and Conditional?" The grade descriptions should make this answerable without documentation. |
| **Notes quality** | Compare notes from reviews before and after placeholder changes. Are notes more specific? Do they reference observable evidence? |
| **Metadata completeness** | Compare the fraction of reviews with populated metadata fields before and after. Better labels and options should increase fill rates. |
| **Nutrition label readability for non-experts** | Show the nutrition label to a colleague unfamiliar with the tool. Can they identify the verdict and the main strengths/weaknesses? |

The automated metrics can be computed by the same static analysis script that processes Layer 1 rubric content. The observational metrics require human spot-checks but are lightweight (single-session walkthroughs, not formal studies).
