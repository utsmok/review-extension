# TRUST Framework version 2

**Evaluating AI-based information search tools for academic use**

*University of Twente -- EIS-IS Team (Embedded Information Services, Library, ICT Services & Archive)*

Date: April 2026 | Framework version: 2.0

---

## Version note

Version 2 supersedes the original TRUST framework. It incorporates refinements from an internal deep review, a comparative analysis of versions 1 and 2, gaps identified in the academic literature, and operational requirements drawn from the questionnaire specification. The principal changes from version 1 are:

- **Identifier scheme.** Criteria now use unique prefixes per principle -- `TR` (Transparent), `RE` (Reliable), `UC` (User-centric), `SE` (Secure), `TC` (Traceable) -- replacing the overlapping `T1`-`T5` labels that caused ambiguity between Transparent and Traceable.
- **Realistic reliability standards.** The unachievable demand for exact reproducibility has been replaced with a *consistency of consensus* standard (RE2), and an explicit *faithfulness* requirement has been added (RE3) to address synthesis that over-extends beyond retrieved evidence.
- **Cognitive guardrails.** UC4 introduces explicit expectations for automation-bias mitigation and AI-assistance transparency, reflecting the literature on generative AI literacy.
- **Bias as an ethical mandate.** Algorithmic and data bias has been elevated from a transparency footnote to a first-class ethical and compliance criterion (SE4).
- **Operational layer.** This version adds a scoring model, minimum evidence requirements, critical-fail flags, confidence levels, and a governance workflow -- all drawn from the operational specification.

---

## 1. Introduction

Academic libraries increasingly encounter tools that use generative AI to help users discover, summarize, and synthesize scholarly information. These tools can be powerful, but they also introduce risks that matter in a scholarly context: fabricated citations, unfaithful synthesis, opaque provenance, hidden bias, and the erosion of critical evaluation skills. The TRUST framework provides the EIS-IS team with a principled, structured, and repeatable method for evaluating such tools before recommending them to the University of Twente community.

TRUST stands for **Transparent**, **Reliable**, **User-centric**, **Secure**, and **Traceable**. These five principles encode the academic standards that an AI-based search tool must meet to be considered trustworthy enough for institutional recommendation. The framework is designed to complement the university's commitment to the FAIR Guiding Principles (Findable, Accessible, Interoperable, Reusable) and to align with the transparency and risk-tier requirements of the EU AI Act. It is intentionally stricter than generic AI evaluation checklists because it is built around scholarly use and library mediation: a tool that is impressive in a general context may still fail the standards required for academic recommendation.

---

## 2. Scope and definitions

### 2.1 What counts as an AI-based search tool

For the purposes of this framework, an "AI-based search tool" is any information search system that relies on non-deterministic, generative models -- such as large language models -- to produce output. The defining characteristic is that identical queries may yield non-identical results, and that the system performs generative synthesis or conversational interaction beyond deterministic retrieval.

Tools that incorporate only deterministic techniques -- such as vector similarity search, keyword matching, or rule-based ranking -- are not classified as AI tools under this framework unless they also perform generative synthesis or conversational interaction.

**Examples:**

- *Not an AI tool under this framework:* Google Scholar uses vector embeddings for semantic search, which is deterministic. It does not have generative capabilities and is therefore out of scope.
- *AI-based tool:* Semantic Scholar is classified as AI-based because, alongside semantic search, it uses LLMs to add generative functionality such as summarizing abstracts and identifying citation contexts.

### 2.2 Coverage

This framework applies to:

- **Standalone AI search tools** -- dedicated products whose primary function is AI-assisted information retrieval and synthesis (e.g., Elicit, Consensus, ai2 Asta).
- **AI features on existing platforms** -- generative AI capabilities added to established scholarly databases or search engines (e.g., an AI summarization layer on a citation database).
- **General-purpose LLM interfaces** -- tools such as ChatGPT or Gemini when assessed for scholarly search use.

The same TRUST criteria apply across all tool classes, though expectations and common failure modes may differ. Reviewers should note the tool category during evaluation, as this context affects how criteria are interpreted.

### 2.3 Exclusions

This framework does not cover:

- Deterministic search tools without generative capabilities.
- AI tools used for purposes other than information search (e.g., writing assistants, code generators, image generators).
- Internal research prototypes not available to end users.

---

## 3. The five TRUST principles

### 3.1 Transparent (TR)

The tool's inner workings, data sources, and limitations must be clearly documented and disclosed. Users and evaluators should not have to operate on faith; they should be given the information needed to understand the tool's context and capabilities.

**TR1.** The tool provides clear documentation on its primary data sources and the scope of its indexed content, including the disciplines, languages, and date ranges covered, and the update cadence of the corpus.

**TR2.** The tool's methodology is explicitly documented, including the model family/version used, the retrieval/generation architecture, the corpus or source base used to answer queries, how many or what type of sources inform an answer, and whether users can inspect source-selection or provenance information.

**TR3.** The tool's known limitations, indexing gaps (e.g., disciplines or languages omitted), and update frequency are openly acknowledged.

---

### 3.2 Reliable (RE)

The tool's outputs must be accurate, verifiable, and consistent enough to be depended upon for scholarly work. The convenience of a tool cannot come at the cost of its intellectual integrity.

**RE1.** The tool generates factually accurate and verifiable outputs, with robust mechanisms to minimize or eliminate hallucinated citations.

**RE2.** When identical queries are run multiple times, the tool's core conclusions should remain substantively aligned even if wording or source order varies.

**RE3.** When the tool synthesizes information, the synthesis must remain faithful to retrieved source material and must not introduce claims that are unsupported, exaggerated, or materially misleading.

---

### 3.3 User-centric (UC)

The tool must be designed with the needs of its academic users in mind, integrating smoothly into their existing workflows and actively encouraging their critical thinking expertise.

**UC1.** The tool is fit for its intended purpose and aligns with the research and educational needs of the University of Twente community.

**UC2.** The tool integrates with standard academic workflows through features such as support for reference managers, standard data export formats, persistent links, and citation portability.

**UC3.** The tool is usable and accessible for its intended audience without prohibitive technical expertise.

**UC4.** The interface clearly communicates that it is AI-assisted, surfaces uncertainty or limitation cues where appropriate, and actively prompts users to verify source material rather than relying on the answer alone.

---

### 3.4 Secure (SE)

The tool must be designed to protect user privacy and data, complying with all relevant legal, institutional, and ethical regulations.

**SE1.** The tool adheres to the principles of data protection by design and by default, in compliance with GDPR.

**SE2.** Users are clearly informed how their data -- including prompts and queries -- is used, stored, retained, and whether it may be used for model improvement or analytics; users have meaningful control where applicable.

**SE3.** The tool's security practices are transparent and do not conflict with relevant institutional policies, national guidelines (e.g., SURF), or sector frameworks (e.g., EU AI Act).

**SE4.** The tool documents major disciplinary, geographic, and language coverage gaps, acknowledges relevant algorithmic or data-bias risks, and provides evidence of any mitigation measures or safeguards that are actually in place.

---

### 3.5 Traceable (TC)

Every piece of information generated by the tool must be traceable back to its original source. This principle is the cornerstone of academic accountability and is non-negotiable.

**TC1.** The tool provides clear, accurate, and persistent attribution for the sources used to generate an answer. Where available, it should also surface helpful source-quality cues such as publication type, peer-review status, or retraction notices.

**TC2.** The tool allows users and reviewers to inspect the provenance of an answer by showing which sources were selected and how retrieved evidence is distinguished from generated synthesis.

---

## 4. Evaluation scoring model

### 4.1 Criterion rating scale

Every TRUST criterion is scored on a four-point scale. Reviewers assign one score per criterion based on documented evidence and hands-on testing.

| Score | Label | Meaning |
|:-----:|-------|---------|
| 0 | Fails | The criterion is not met, or there is no evidence that it is met. |
| 1 | Partial / unclear | Some evidence exists but is incomplete, inconsistent, or insufficient to confirm the criterion is met. |
| 2 | Meets baseline | The criterion is met to a satisfactory standard, supported by evidence. |
| 3 | Strong | The criterion is met to a high standard, with clear and compelling evidence. |

### 4.2 Per-principle judgment

After scoring all criteria within a principle, the reviewer assigns an overall judgment for that principle:

| Judgment | When to assign |
|----------|---------------|
| **Pass** | All criteria score 2 or above, with no significant unresolved concerns. |
| **Conditional pass** | One or more criteria score 1, but the principle is substantially met overall. Conditions or caveats are documented. |
| **Fail** | One or more criteria score 0, or the principle as a whole is not met. |

### 4.3 Final recommendation categories

After all five principles have been judged, the evaluation team assigns one of the following recommendation statuses:

| Category | Meaning |
|----------|---------|
| **Recommended** | The tool meets the TRUST standards and is suitable for recommendation to the UT community. |
| **Recommended with caveats** | The tool is suitable for recommendation, but specific limitations or conditions must be communicated to users. |
| **Needs review / provisional** | The tool shows promise but has issues that must be resolved or re-examined before full recommendation. |
| **Pilot only** | The tool may be used in a controlled pilot setting but is not ready for broad recommendation. |
| **Not recommended** | The tool fails one or more core TRUST standards and should not be recommended. |
| **Out of scope** | The tool does not meet the definition of an AI-based search tool under this framework. |

### 4.4 Confidence levels

Every evaluation includes an overall confidence rating that reflects the reviewer's certainty in their own assessment, independent of the tool's quality:

| Level | Meaning |
|-------|---------|
| **High** | Sufficient evidence was collected, the tool was hands-on tested, and conclusions are well supported. |
| **Medium** | Evidence is adequate but incomplete in some areas, or testing was limited by access constraints. |
| **Low** | Evidence is sparse, critical areas could not be tested, or the evaluation relies heavily on vendor claims. |

A tool can receive a negative recommendation with high confidence, or a positive recommendation with low confidence. The confidence level ensures that these situations are visible and distinguishable.

### 4.5 Critical fail flags

The following conditions are treated as critical failures. If any one of them is observed during an evaluation, it must be flagged regardless of the criterion scores.

1. **Fabricated or unverifiable citation found** -- the tool presents a citation that does not exist or cannot be verified.
2. **Materially unfaithful synthesis found** -- the tool's summary introduces claims that are unsupported by or contradict the retrieved source material.
3. **Major claim not traceable to a primary source** -- a substantive factual claim in the output cannot be connected to any identifiable source.
4. **Provenance path not inspectable enough for academic use** -- the tool provides no meaningful way to inspect which sources were selected or how evidence was used.
5. **Privacy or data-use terms unclear or unacceptable** -- the tool's handling of user data, particularly prompts and queries, is opaque or conflicts with institutional and legal requirements.
6. **Serious security or compliance concern** -- the tool's security posture conflicts with institutional policies, national guidance, or regulatory requirements.
7. **Serious bias or fairness concern without credible mitigation** -- the tool exhibits or acknowledges significant algorithmic or data bias without providing evidence of mitigation.

**Rule:** Any critical fail flag triggers a mandatory team review, regardless of the individual criterion scores. The evaluation cannot be finalized as "Recommended" or "Recommended with caveats" until the flagged issue has been reviewed by the team and a collective decision has been recorded.

---

## 5. Minimum evidence requirements

Every primary evaluation must include the following minimum evidence before it can be finalized. Evaluations that do not meet these requirements should be marked as incomplete.

### 5.1 Desk review of documentation

- Vendor documentation (methodology, architecture, data sources)
- Privacy policy and terms of service
- Any available technical white papers or model cards

### 5.2 Hands-on testing (minimum 3 scenarios)

- **Scenario A -- Known-item query.** Search for a specific paper, author, or topic where the correct answer is known in advance, to test retrieval accuracy.
- **Scenario B -- Exploratory literature search.** Run an open-ended query to assess breadth and relevance of results.
- **Scenario C -- Answer or synthesis query with cited sources.** Ask the tool to summarize or synthesize information on a topic, then verify whether the cited sources actually exist and support the claims made.

### 5.3 Repeated-query test (minimum 1 query, run 3 times)

- Run the same query at least three times.
- Record whether the core conclusion remains substantively aligned across runs.
- Note any significant variation in sources cited or claims made.

### 5.4 Manual source verification (minimum 5 claims)

- Select at least five claims or citations from the tool's output.
- Verify each against the original source material.
- Record whether the source exists, whether it says what the tool claims it says, and whether it supports the specific claim made.

### 5.5 Evidence bundle

Collect and store:

- Screenshots of key outputs, interface elements, and disclosure pages.
- Copied excerpts or saved PDFs of vendor statements and policies.
- Links to privacy policies, terms of service, and methodology documentation.
- Reviewer notes explaining what was observed, tested, and concluded.

The evidence bundle should be stored in a SharePoint document library linked to the evaluation record, with metadata indicating the criterion code, evidence type, capture date, and reviewer.

---

## 6. Governance and review workflow

### 6.1 Evaluation cycle

The evaluation process follows a structured cycle designed to ensure consistency, accountability, and defensibility.

**Step 1: Nomination.** Any EIS-IS team member can nominate a tool for review. The nominator records the tool name, URL, vendor, and reason for nomination using the standard submission form.

**Step 2: Primary evaluation.** A designated evaluator conducts the full TRUST evaluation, including desk review, hands-on testing, repeated-query testing, and manual source verification. The evaluator scores all criteria, judges each principle, flags any critical failures, assigns a confidence level, and drafts a recommendation with supporting evidence.

**Step 3: Second review.** A second team member reviews the primary evaluation. The second reviewer can agree, agree with reservations, or disagree. If there is disagreement, the specific criteria in question are identified and documented.

**Step 4: Final team decision.** The completed evaluation is discussed in a regular EIS-IS team meeting. At least two members must have reviewed the tool before a final recommendation status is assigned. The team records the decision, any conditions or caveats, the publication status, and the next review date.

### 6.2 Two-person review requirement

No tool may receive a final recommendation without review by at least two EIS-IS team members. This ensures that:

- individual scoring drift is caught;
- different disciplinary perspectives are considered;
- the evidence and conclusions are challenged before publication.

### 6.3 Disagreement handling

If the primary evaluator and second reviewer disagree on a principle judgment or the final recommendation:

- The specific criteria in dispute are documented.
- Both reviewers provide written justification for their position.
- The matter is escalated to the full team for discussion and resolution.
- The final decision is recorded in the decision log with the rationale.

### 6.4 Re-evaluation triggers

A tool must be re-evaluated when any of the following occurs:

- The vendor makes a major change to the model, architecture, or data sources.
- A significant issue is reported by users or discovered during monitoring.
- The scheduled review cycle date is reached (default: 12 months; adjustable to 3, 6, or 12 months depending on tool category and risk).
- A critical fail flag was recorded in a previous evaluation and the vendor claims the issue has been resolved.

Re-evaluations follow the same workflow as primary evaluations and require their own evidence bundle.

### 6.5 Decision categories

The team records not only the recommendation status but also the following decision attributes:

- **Publication status:** Do not publish / Internal only / Publish in public list / Publish after user guide.
- **Suitable use cases:** Specific scenarios for which the tool is approved (e.g., literature discovery, citation tracing, teaching demonstrations).
- **Unsuitable or high-risk use cases:** Scenarios for which the tool should not be used, which must be explicitly documented for any provisional or conditional recommendation.
- **Review cycle frequency:** When the next evaluation is due.

---

## 7. Implementation notes

The TRUST framework is operationalized through the university's Microsoft 365 environment:

- **Microsoft Forms** serves as the data-entry interface for all evaluation workflow modes: nomination, primary evaluation, second review, final team decision, and re-evaluation. The form uses section branching to present the appropriate fields for each workflow mode.
- **Power Automate** processes form submissions into structured data, routes notifications to the appropriate team members, and enforces workflow rules (e.g., critical-fail flags trigger team-review alerts).
- **MS Lists / SharePoint** stores the evaluation records. The recommended storage model uses a parent list (`TRUST_Evaluations`) for high-level structured fields (tool name, scores, judgments, recommendation status, confidence, critical-fail flags) and a SharePoint document library for the evidence bundle, with metadata linking each evidence item to its evaluation and criterion code.

This implementation ensures that evaluations are auditable, searchable, and durable. Structured fields are stored as typed data rather than buried in free-text notes, making it possible to filter, compare, and report on evaluations across tools and over time.

---

## References and sources

This framework was developed by the EIS-IS team at the University of Twente and informed by the following sources:

### Project documents

- EIS-IS Search Tools Policy Document v3
- TRUST Framework v1 (original draft)
- TRUST Framework v2 draft (revised)
- Deep review of TRUST Framework v1
- V2 comparison and final review
- Questionnaire specification for Microsoft Forms
- Addendums from literature
- Project progress overview (September 2025)

### External references

- GO FAIR. FAIR Principles. https://www.go-fair.org/fair-principles/
- Hervieux, S. & Wheatley, A. The ROBOT Test. https://thelibrairy.wordpress.com/2020/03/11/the-robot-test/
- High-level summary of the EU AI Act. https://artificialintelligenceact.eu/high-level-summary/
