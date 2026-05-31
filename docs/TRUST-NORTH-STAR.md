# TRUST Review Tool — North Star

> This document defines the goal, scope, user, outputs, and quality standards for the TRUST review tool and its content. It is the authoritative reference for anyone improving rubric text, UI copy, field labels, evaluation guidance, or export output.

---

## 1. What the Tool Is

A browser sidepanel extension for conducting structured, evidence-backed evaluations of academic search tools — primarily AI-powered ones — against the TRUST framework (Transparent, Reliable, User-centric, Sound, Traceable). The tool guides a reviewer through scoring, captures screenshots as evidence, and produces a self-contained HTML report documenting the reasoning behind every judgment.

**Not:** A policy engine, a database frontend, a multi-user workflow system, or a regulatory compliance checker.

---

## 2. Who Uses It

**Primary user:** Academic librarians and information specialists at the University of Twente (EIS-IS team). These are domain experts in scholarly information retrieval, not AI engineers or legal scholars. They are comfortable with academic terminology (peer review, DOI, BibTeX, GDPR) but may not know RAG architecture details, WCAG testing methodology, or encryption standards without guidance.

**Secondary user:** A second reviewer or team lead who reads the exported report. They did not conduct the review and rely on the report to understand what was observed, how it was scored, and why.

**Tertiary user:** The "client" — researchers, students, and colleagues who see only the nutrition label (the standalone infocard at the top of the report). This audience has no familiarity with the TRUST framework. They need to understand at a glance whether a tool is recommended and why. The nutrition label is also used in outreach and public information contexts.

**Not:** Software developers, external auditors, or procurement officers (the tool evaluates trustworthiness, not purchasing decisions).

---

## 3. What the Tool Produces

**Export artifacts:**

| Artifact | Purpose |
|----------|---------|
| `Evaluation_Report_[Tool].html` | Full detailed report with inline evidence screenshots. Contains the nutrition label at the top, followed by quality gates, per-principle scoring, and finalization. |
| `TRUST_Label_[Tool].html` | **Nutrition label** — standalone infocard showing verdict stamp, principle score circles, quality gate notes, and key strengths/weaknesses. Designed to be shared independently of the full report. Used in outreach to researchers, students, and colleagues. |
| `session_metadata.csv` | Machine-readable tool metadata (name, URL, company, pricing, etc.) |
| `rubric_scores.csv` | Per-question scores, notes, and evidence links |
| `capture_log.csv` | Screenshot metadata and tagged rubric IDs |
| `review_conclusions.csv` | Finalization data (grade, conclusion, strengths, weaknesses, recommendations) |

The nutrition label is the public-facing deliverable. The full report is the detailed reference. Both must be understandable without the reviewer present and without familiarity with the TRUST framework's internal structure.
---

## 4. What the Tool Evaluates

**Target:** AI-based information search tools used in academic contexts. This includes standalone AI search engines (Elicit, Consensus, ai2 Asta), AI features on existing platforms (Semantic Scholar's summarization), and general-purpose LLMs when assessed for scholarly search.

**Scope boundary:** The tool evaluates whether a tool is trustworthy enough for institutional recommendation — not whether it is the "best" tool, whether it should be purchased, or how it compares to alternatives. Cost, licensing, and procurement are out of scope.

**AI vs. non-AI:** Some questions are AI-only. A single `usesAi` flag in metadata controls which questions are active. Non-AI tools (e.g., traditional database interfaces) can still be evaluated, with AI-specific questions marked N/A.

---

## 5. Content Architecture

The review content is structured in three layers, each with distinct quality requirements:

### Layer 1: Rubric Content (`data/rubrics/trust-full.json`)

The core evaluation instrument. Contains:

- **Quality gates** (4 pass/fail questions): Data privacy, AI training policy, IP preservation, accessibility
- **Scoring questions** (10 questions, scored 0–3): Distributed across 5 principles (TR, RE, US, SE, TC)

Each question contains:
| Field | Purpose | Quality requirement |
|-------|---------|-------------------|
| `title` | Short display name | ≤5 words, scannable |
| `background` | Why this matters + what to look for + edge cases | See §6 below |
| `0`/`1`/`2`/`3` | Score-level descriptions | Observable, behavioral, discriminating |
| `examples` | Concrete pass/fail or per-level scenarios | Realistic, specific, not hypothetical |
| `ai_only` | Whether question applies only to AI tools | Correct boolean |

The rubric JSON is the single source of truth for question text. The sidepanel renders title, background, score descriptions, and examples (each in its own collapsible foldout). The HTML report renders all of the same content inline.

### Layer 2: UI Copy and Field Labels (React components)

Labels, placeholders, tooltips, and instructional text in the sidepanel. Includes:
- Metadata field labels and placeholders (`components/Metadata.tsx`)
- Finalization field labels and placeholders (`components/FinalizationScreen.tsx`)
- Score option labels (`"✓ Pass"`, `"✗ Fail"`, `"— N/A"`, `"? Unsure"`)
- Notes field placeholder (`"Notes..."`)
- Section headings and status messages
- Pill field option lists (data sources, disciplines, search methods, authentication methods)

**Quality requirement:** Every label and placeholder must be immediately comprehensible to a librarian who has not read the framework documentation. No jargon without context. No placeholders that say "e.g." without providing a realistic example.

### Layer 3: Export Report Content (`lib/html-report.ts`, `lib/report-model.ts`)

The rendered HTML report. Combines rubric content, metadata, scores, captures, and finalization into a single document. The report must:
- Stand alone (no external stylesheets, no live URLs that may rot)
- Be readable by a second reviewer who was not present during the evaluation
- Include all rubric text (backgrounds, score descriptions, examples) inline
- Show evidence screenshots inline within question sections
- Present scores with color-coded visual indicators
- Include finalization data (grade, conclusion, strengths, weaknesses, recommendations)

---

## 6. Quality Standards for Rubric Content

### Background Text

Each question's `background` field must answer three questions in this order:
1. **Why this matters** — 1–2 sentences establishing the academic rationale
2. **What to look for** — concrete, actionable evaluation instructions (not abstract principles)
3. **Edge cases / N/A conditions** — when the question does not apply, and why

**Anti-patterns to avoid:**
- Mixing motivation with evaluation instructions in the same paragraph
- Repeating the score-level descriptions in the background
- Writing for an AI researcher instead of a librarian
- Omitting N/A conditions (reviewers must know when to skip)

### Score-Level Descriptions

Each score level (0, 1, 2, 3) must:
- Describe **observable behavior**, not abstract quality ("links resolve to the specific article" not "good attribution")
- Be **discriminating** — a reviewer should be able to distinguish level 2 from level 3 without re-reading the descriptions
- Be **approximately equal in detail** across all 4 levels within a question (no one-sentence level 2 next to a paragraph level 3)
- Use **qualitative thresholds**, not just quantity ("fabricated claims appear routinely" vs. "occasional detail errors", not "many errors" vs. "few errors")

**The critical test:** Can two reviewers read only the score-level descriptions (without the background or examples) and consistently agree on which score to assign? If not, the boundaries are ambiguous.

### Examples

Each example must:
- Describe a **concrete, realistic scenario** — a specific tool behavior a reviewer could actually observe
- Be **anchored to observable evidence** — "the privacy policy states..." not "the tool seems to..."
- Cover the **boundary between adjacent levels**, not just the easy cases

---

## 7. Quality Standards for Non-Rubric Content

### Metadata Fields

| Standard | Applies to |
|----------|-----------|
| Every field has a descriptive label that would make sense to a non-specialist | All field labels |
| Every input has a realistic placeholder that demonstrates the expected format | All text inputs |
| Pill/dropdown options are exhaustive for the academic search tool domain | Data sources, disciplines, search methods |
| Optional fields are visually secondary (behind progressive disclosure) | All secondary metadata |

### Finalization Fields

The finalization screen currently provides minimal guidance. It should:
- Explain what each grade means (Pass = meets standards for institutional recommendation; Conditional = acceptable with documented caveats; Fail = does not meet minimum standards)
- Provide prompts or scaffolding for the conclusion field (not just "Overall summary of the review...")
- Guide the reviewer to reference specific scores or principles in their conclusion

### Score Options

The four score options for quality gates (Pass/Fail/N/A/Unsure) and six options for scoring questions (0/1/2/3/N/A/Unsure) must be self-explanatory. The current labels are functional but provide no guidance on when to use "Unsure" vs. "N/A" or how to distinguish adjacent scores.

---

## 8. What "Good" Looks Like

A well-conducted TRUST review produces:
1. **Complete scoring** — all applicable questions scored, N/A where appropriate, no blank scores
2. **Evidence-backed** — every score has at least one linked screenshot or annotation
3. **Notes that explain the reasoning** — not just "saw the feature" but "clicked the export button and got a BibTeX file with correct metadata"
4. **A conclusion that a second reviewer can follow** — referencing specific criteria, not vague impressions
5. **An exported report that stands alone** — a team member can read it 6 months later and understand the judgment

---

## 9. Relationship to the Questionnaire Specification

The full TRUST questionnaire specification (`docs/trust framework background/trust-questionnaire.md`) defines a 132-field form covering workflow control, tool profile, evaluation setup, per-principle summaries and judgments, critical fail flags, confidence levels, recommendation categories, and a full governance workflow (second review, team decision).

The implemented tool is a **streamlined subset** optimized for single-reviewer use in a browser sidepanel:

| Questionnaire section | Implemented? | Notes |
|----------------------|-------------|-------|
| §0 Workflow Control | Partial | Tool name + URL captured at session start; reviewer info in settings; no submission type, existing evaluation ID, or nomination reason |
| §1 Tool Profile | Partial | Metadata tab captures company, pricing, availability, AI flag, data sources, search methods, discipline, auth method; no category checkboxes, deployment type, in-scope check, or target user groups |
| §2 Evaluation Setup | Not implemented | No testing dates, sample queries, repeated query text, benchmark comparison, or evidence folder link |
| §3–§7 Principle questions | Yes | Rubric questions fully implemented with scoring and evidence linking |
| §8 Critical Fails & Confidence | Not implemented | No critical fail flags, completion checklist, or confidence level |
| §9 Overall Recommendation | Simplified | Finalization has Pass/Conditional/Fail grade + free-text conclusion; no recommendation status (6 levels), suitable/unsuitable use cases, public-facing summary, or next review date |
| §10 Governance | Not implemented | No second review, team decision, or publication status |

This is a deliberate simplification. The tool focuses on the core evaluation task (score questions, capture evidence, write a conclusion). Workflow and governance features are out of scope — multi-reviewer coordination will be handled separately if needed.

---

## 10. Relationship to the TRUST Framework Document

`docs/TRUST-FRAMEWORK.md` is the comprehensive framework reference. It describes the complete walkthrough for conducting a review, with observations, limitations, and recommendations.

The implemented rubric (`data/rubrics/trust-full.json`) is the single active question set. Earlier prototypes included multiple variants (Full/Standard/Lite), but this was abandoned. The codebase scaffolding for variants remains, but the current focus is on a single, well-tuned rubric. The framework document may still reference variant wording — treat those as historical context, not a parallel target for content updates.

---

## 11. Content Quality Measurement — What to Measure

When evaluating whether the rubric content is good enough, measure these properties:

### For rubric questions (Layer 1)

| Property | How to measure | Target |
|----------|---------------|--------|
| **Boundary clarity** | LLM boundary discrimination test: can an LLM consistently score synthetic tool profiles using only the score descriptions? | ≤1 score level variance across 5 runs per profile |
| **Background density** | Word count + readability; ratio of "what to look for" to "why this matters" content | Backgrounds should be ≤150 words with a clear instruction/evaluation split |
| **Score description balance** | Word count per level within each question | No level should be <50% or >200% of the question's average level word count |
| **Behavioral grounding** | Fraction of score descriptions that describe observable tool behavior vs. abstract quality | ≥80% behavioral |
| **Discriminating power** | Boundary test variance at the 1/2 and 2/3 boundaries specifically | These boundaries should be no more ambiguous than the 0/1 boundary |

### For UI copy (Layer 2)

| Property | How to measure | Target |
|----------|---------------|--------|
| **Placeholder quality** | Automated: does every placeholder include a realistic example (not just a description of the field)? Manual: can a new user correctly identify what to enter without documentation? | Every placeholder includes a realistic example; LLM-as-reviewer can infer the expected input |
| **Label clarity** | Automated: LLM-as-judge rates each label for ambiguity without context. Manual: spot-check with user. | No label requires reading the framework doc to understand |
| **Guidance density** | Automated: word count of guidance text per screen (metadata, finalization). Flag screens with zero guidance text. | Every screen with a judgment call has at least one sentence of guidance |
| **Pill option coverage** | Automated: compare custom entries in stored sessions against preset options. High custom-entry rates indicate missing presets. | Custom entries <10% of total selections |

### For export report and nutrition label (Layer 3)

| Property | How to measure | Target |
|----------|---------------|--------|
| **Standalone readability** | Automated: LLM-as-reader reads the nutrition label without context and summarizes the tool's verdict, strengths, and weaknesses. Compare to the actual finalization data. Manual: human spot-check. | LLM summary matches finalization data on all key points |
| **Visual scannability** | Automated: report HTML structure analysis (section count, nesting depth, evidence-to-text ratio). Manual: can a reader identify key findings in <30 seconds? | Report structure is consistent across evaluations |
| **Nutrition label completeness** | Automated: flag labels with missing verdict, empty strengths/weaknesses, or no quality gate notes. | Every exported label has a verdict + at least one strength and one weakness |
| **Information density** | Automated: word count of finalization fields vs. total report word count. Flag reports where the conclusion is <20 words. | Conclusion ≥30 words; at least one strength and one weakness listed |

---

## 12. Constraints and Non-Goals

**Constraints:**
- Single user group: academic librarians at UT. No multi-variant testing.
- Clarity > brevity. Do not overfit on reducing text length. A longer background that produces more consistent scoring is better than a shorter one that leaves the reviewer confused.
- No large-scale human review study. Measurement relies on static analysis, LLM-as-judge, and targeted human spot-checks.
- Content changes must not break existing reviews. Score semantics must remain stable — a "2" means the same thing before and after any text revision.
- The rubric JSON schema is fixed. New fields require code changes.

**Non-goals for this improvement cycle:**
- Adding missing questionnaire sections (evaluation setup, critical fails, governance)
- Changing the scoring model (0–3 scale, pass/fail gates)
- Building inter-rater reliability tooling
- Creating a standardized test battery with golden datasets
- Changing the export format or report structure
- Multi-reviewer workflow or governance process

---

## 13. Institutional Context

- **Organization:** University of Twente, LISA-EIS (Library, ICT Services & Archive — Embedded Information Services)
- **Policy alignment:** EU AI Act, GDPR, SURF guidelines, UT AI-in-Education policy
- **Framework lineage:** Inspired by FAIR principles; informed by ROBOT test, ALTAI, and academic literature on AI trustworthiness
- **Evolution:** v1 (Sept 2025) → v2 (Apr 2026, current). v2 renamed "Secure" to "Sound", added SE2 (Data Handling), relaxed QG3, raised score threshold to 60%, added per-principle minimum, added "Unsure" score option.
