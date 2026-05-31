# TRUST Framework Questionnaire for AI-Based Search Tools

**University of Twente -- EIS-IS Team**

> This document is a specification for the TRUST framework evaluation questionnaire. It defines every field, section, and response option required to assess AI-based information search tools.

## Persisted Review-Record Note (T001)

This document specifies the **questionnaire content**. Saved-review persistence adds a separate review-record envelope defined in:

- `docs/contracts/review-state-contract.md`
- `docs/contracts/lifecycle-state-map.md`
- `docs/contracts/schema-versioning-policy.md`

The following persisted metadata are required by the T001 contracts and are **not** questionnaire response fields:

| Metadata field | Required | Notes |
|----------------|----------|-------|
| `review_id` | Yes | Stable internal identifier for the saved review record. |
| `public_id` | Yes | Stable human-facing identifier for routes, exports, and operator workflows. |
| `workflow_mode` | Yes | One of the current questionnaire workflow modes from `static/js/config/sections.js`; remains separate from lifecycle state. |
| `lifecycle_state` | Yes | Backend review-record lifecycle value from `docs/contracts/lifecycle-state-map.md`; not a questionnaire field. |
| `state_schema_version` | Yes | Persisted review-state schema version. Initial contract value: `"1"`. |
| `framework_version` | Yes | TRUST framework semantics version. Initial contract value: `"2.0"`. |
| `current_revision_number` | Yes | Monotonic immutable revision counter for the latest saved state. |
| `current_etag` | Yes | Opaque concurrency token for accepted writes. |
| `created_at` / `updated_at` | Yes | Saved-review record timestamps. |
| `created_by_user_id` | Yes | User identifier for the actor that created the review record. |

Questionnaire responses remain the inner `current_state_json` payload. The metadata above sit outside the questionnaire field inventory and must not be added to Appendix A field totals.

## Evidence Model Note (T002)

This document remains the canonical specification for **questionnaire prompts and reviewer-authored response fields**. It is **not** the canonical runtime or persistence model for evidence storage.

For T002, the authoritative runtime/persistence evidence model is defined in:

- `docs/contracts/evidence-model-contract.md`
- `docs/contracts/evidence-manifest-compatibility.md`
- `docs/contracts/import-export-package-contract.md`

Interpret the evidence-related questionnaire labels in this document as follows:

- per-criterion `Evidence summary` and `Evidence links` remain questionnaire-spec prompts for reviewers, including legacy/import normalization needs;
- the runtime and persisted evidence model is one durable **asset + scoped link** system, not a separate primary `Evidence links` storage structure per criterion;
- Section `2.10 Evidence folder link` remains a workflow/documentation field describing a shared-location practice, not the canonical durable evidence record once backend evidence storage exists.

---

## Standard Answer Sets

The following answer sets are referenced throughout the questionnaire.

### Criterion Rating Scale

Used for scoring every individual TRUST criterion (TR1--TR3, RE1--RE3, UC1--UC4, SE1--SE4, TC1--TC2).

| Score | Label              | Meaning                                                      |
|-------|--------------------|--------------------------------------------------------------|
| 0     | Fails              | The criterion is not met; significant deficiency found.      |
| 1     | Partial/unclear    | Some evidence exists but is incomplete or inconsistent.      |
| 2     | Meets baseline     | The criterion is satisfactorily met with adequate evidence.  |
| 3     | Strong             | The criterion is exceeded with compelling, well-documented evidence. |

### Final Recommendation Options

| Value                        | Meaning                                                                         |
|------------------------------|---------------------------------------------------------------------------------|
| Recommended                  | Tool meets TRUST standards for the evaluated use case(s).                       |
| Recommended with caveats     | Tool is acceptable but requires specific conditions or monitoring.               |
| Needs review/provisional     | Insufficient evidence or minor concerns; requires further evaluation.            |
| Pilot only                   | Tool may be used in a limited pilot but not for broad deployment.                |
| Not recommended              | Tool does not meet TRUST standards for the evaluated use case(s).                |
| Out of scope                  | Tool falls outside the evaluation scope as defined in Section 1.                 |

### Confidence Levels

| Value  | Meaning                                                          |
|--------|------------------------------------------------------------------|
| High   | Evaluation evidence is thorough and unambiguous.                 |
| Medium | Evaluation evidence is adequate but some gaps remain.            |
| Low    | Evaluation evidence is insufficient or significant uncertainty.  |

### Critical-Fail Flags (Checkboxes)

A checked flag indicates a critical deficiency that must be resolved before the tool can receive a positive recommendation. Multiple flags may be checked.

- [ ] Fabricated or unverifiable citation found
- [ ] Materially unfaithful synthesis found
- [ ] Major claim not traceable to a primary source
- [ ] Provenance path not inspectable enough for academic use
- [ ] Privacy/data-use terms unclear or unacceptable
- [ ] Serious security/compliance concern
- [ ] Serious bias/fairness concern without credible mitigation

---

## Section 0 -- Workflow Control

> This section captures administrative metadata about the evaluation submission. It determines the type of submission, identifies the tool, and records the responder's role.

| #   | Field                  | Type               | Required | Notes                                                                                      |
|-----|------------------------|--------------------|----------|--------------------------------------------------------------------------------------------|
| 0.1 | Submission type        | Dropdown (single)  | Yes      | Nomination / Primary evaluation / Second review / Final team decision / Re-evaluation      |
| 0.2 | Tool name              | Short text         | Yes      | Official product name.                                                                     |
| 0.3 | Tool URL               | URL                | Yes      | Primary access URL for the tool.                                                           |
| 0.4 | Existing evaluation ID | Short text         | No       | Reference ID of a prior evaluation, if this is a second review, re-evaluation, or final decision. |
| 0.5 | Responder role         | Dropdown (single)  | Yes      | Information specialist / Researcher / Teacher / PhD candidate / Student / IT admin / Other  |
| 0.6 | Nomination reason      | Long text          | Conditional | Required when Submission type is "Nomination." Briefly explain why this tool should be evaluated. |

---

## Section 1 -- Tool Profile

> This section builds a factual profile of the tool under evaluation. It establishes the tool's category, intended audience, and access model, and confirms whether the tool falls within the evaluation scope.

| #    | Field                 | Type                     | Required | Notes                                                                                                                                   |
|------|-----------------------|--------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------|
| 1.1  | Vendor                | Short text               | Yes      | Organisation or company that produces or maintains the tool.                                                                            |
| 1.2  | Category              | Checkboxes (multi-select)| Yes      | AI search engine / AI layer on existing database / Summarisation assistant / Citation discovery / Query development / Other              |
| 1.3  | Deployment type       | Dropdown (single)        | Yes      | Cloud SaaS / On-premises / Hybrid / Browser extension / API-only                                                                       |
| 1.4  | In-scope check        | Dropdown (single)        | Yes      | In scope / Out of scope / Partially in scope                                                                                            |
| 1.5  | Scope rationale       | Long text                | Conditional | Required when In-scope check is "Out of scope" or "Partially in scope." Explain which aspects fall in or out of scope and why.          |
| 1.6  | Primary use cases     | Checkboxes (multi-select)| Yes      | Literature search / Paper discovery / Citation tracing / Abstract summarisation / Teaching/demo / Query development / Other              |
| 1.7  | Target user groups    | Checkboxes (multi-select)| Yes      | Students / Researchers / PhD candidates / Teachers / Information specialists / All UT users / Other                                      |
| 1.8  | Access model          | Dropdown (single)        | Yes      | Free / Freemium / Subscription / Institutional licence / API key required                                                               |
| 1.9  | Account required      | Dropdown (single)        | Yes      | Yes / No / Optional                                                                                                                     |
| 1.10 | Sign-in method        | Short text               | Conditional | Required when Account required is "Yes." Describe the authentication method (e.g., email, institutional SSO, Google, Microsoft).        |

---

## Section 2 -- Evaluation Setup

> This section records the practical details of how the evaluation was conducted. It ensures reproducibility and documents the testing conditions.

| #    | Field                         | Type            | Required | Notes                                                                                                     |
|------|-------------------------------|-----------------|----------|-----------------------------------------------------------------------------------------------------------|
| 2.1  | Testing dates                 | Date range      | Yes      | Start and end dates of hands-on testing.                                                                   |
| 2.2  | Pricing tier tested           | Short text      | Yes      | Specify the pricing tier or plan used during evaluation (e.g., Free, Pro, Enterprise trial).               |
| 2.3  | Hands-on access confirmed     | Dropdown (single)| Yes     | Yes / No                                                                                                   |
| 2.4  | Sample queries/scenarios      | Long text       | Yes      | List the representative queries or scenarios used during testing. Include enough detail for reproducibility.|
| 2.5  | Repeated query test performed | Dropdown (single)| Yes     | Yes / No                                                                                                   |
| 2.6  | Repeated query text           | Long text       | Conditional | Required when Repeated query test performed is "Yes." Provide the exact query text that was repeated.    |
| 2.7  | Benchmark comparison performed| Dropdown (single)| Yes     | Yes / No                                                                                                   |
| 2.8  | Benchmark sources             | Long text       | Conditional | Required when Benchmark comparison performed is "Yes." List the benchmark tools or sources compared.     |
| 2.9  | Sensitive data entered        | Dropdown (single)| Yes     | Yes / No                                                                                                   |
| 2.10 | Evidence folder link          | URL             | Yes      | Link to the shared folder containing screenshots, exported results, and other supporting evidence. This is a questionnaire/workflow reference field, not the canonical durable evidence-storage model. |

---

## Section 3 -- Transparent (TR)

> This principle assesses whether the tool is open about its data sources, methodology, and limitations. Transparency is foundational to academic trust.

### TR1: Source Documentation

> **TR1:** The tool provides clear documentation on its primary data sources and the scope of its indexed content.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| TR1 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| TR1 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Reference specific documentation pages or sections. |
| TR1 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| TR1 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### TR2: Methodology Documentation

> **TR2:** The tool's methodology is explicitly documented, including the model family/version used, the retrieval/generation architecture, the corpus or source base used to answer queries, how many or what type of sources inform an answer, and whether users can inspect source-selection or provenance information.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| TR2 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| TR2 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Reference specific documentation pages or sections. |
| TR2 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| TR2 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### TR3: Limitation Acknowledgement

> **TR3:** The tool openly acknowledges its known limitations, indexing gaps, and update frequency.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| TR3 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| TR3 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Reference specific documentation pages or sections. |
| TR3 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| TR3 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### Transparent -- Principle Summary and Judgment

| Field                  | Type                        | Required | Notes                                                                                      |
|------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------|
| TR Principle summary   | Long text (one paragraph)   | Yes      | Write a single paragraph synthesising findings across TR1, TR2, and TR3.                   |
| TR Principle judgment  | Dropdown (single)           | Yes      | Pass / Conditional pass / Fail                                                             |

---

## Section 4 -- Reliable (RE)

> This principle evaluates the factual accuracy, consistency, and faithfulness of the tool's outputs. Reliability is essential for tools used in academic contexts where accuracy is non-negotiable.

### RE1: Factual Accuracy

> **RE1:** The tool generates factually accurate and verifiable outputs, with robust mechanisms to minimize or eliminate hallucinated citations.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| RE1 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| RE1 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe specific tests performed and results. |
| RE1 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| RE1 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### RE2: Consistency of Consensus

> **RE2:** When identical queries are repeated, the tool shows consistency of consensus: core conclusions remain substantively aligned even if wording or source order varies.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| RE2 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| RE2 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe specific tests performed and results. |
| RE2 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| RE2 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### RE3: Faithful Synthesis

> **RE3:** When the tool synthesizes information, the synthesis remains faithful to retrieved source material and does not introduce unsupported or materially misleading claims.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| RE3 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| RE3 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe specific tests performed and results. |
| RE3 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| RE3 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### Reliable -- Additional Fields

| Field                          | Type            | Required | Notes                                                                                      |
|--------------------------------|-----------------|----------|--------------------------------------------------------------------------------------------|
| RE Test method description     | Long text       | Yes      | Describe the testing methodology used to evaluate reliability (e.g., repeated queries, manual verification against known sources, benchmark comparisons). |
| RE Claims manually checked     | Number          | Yes      | Enter the count of individual claims that were manually verified against source material during testing. |

---

### Reliable -- Principle Summary and Judgment

| Field                  | Type                        | Required | Notes                                                                                      |
|------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------|
| RE Principle summary   | Long text (one paragraph)   | Yes      | Write a single paragraph synthesising findings across RE1, RE2, and RE3.                   |
| RE Principle judgment  | Dropdown (single)           | Yes      | Pass / Conditional pass / Fail                                                             |

---

## Section 5 -- User-Centric (UC)

> This principle assesses whether the tool meets the practical needs of its intended users at the University of Twente. It covers fitness for purpose, workflow integration, usability, and responsible communication of AI limitations.

### UC1: Fitness for Purpose

> **UC1:** The tool is fit for its intended purpose and aligns with the research and educational needs of the University of Twente community.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| UC1 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| UC1 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Reference specific use cases tested. |
| UC1 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| UC1 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### UC2: Workflow Integration

> **UC2:** The tool integrates with standard academic workflows through useful export options, citation workflows, or reference-manager compatibility.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| UC2 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| UC2 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe export formats, citation features, and reference manager support. |
| UC2 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| UC2 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### UC3: Usability and Accessibility

> **UC3:** The tool is usable and accessible for its intended audience without prohibitive technical expertise.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| UC3 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| UC3 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe the user experience and any accessibility features or barriers. |
| UC3 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| UC3 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### UC4: AI Transparency to Users

> **UC4:** The interface clearly communicates that it is AI-assisted, surfaces uncertainty or limitation cues where appropriate, and actively prompts users to verify source material rather than relying on the answer alone.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| UC4 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| UC4 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe how the tool communicates its AI nature and prompts verification. |
| UC4 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| UC4 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### User-Centric -- Additional Fields

| Field                           | Type            | Required | Notes                                                                                      |
|---------------------------------|-----------------|----------|--------------------------------------------------------------------------------------------|
| UC Target user personas         | Long text       | Yes      | Describe the specific user personas tested (e.g., undergraduate student, postdoctoral researcher, information specialist). |
| UC Workflow integrations observed| Long text      | Yes      | List the workflow integrations observed during testing (e.g., Zotero export, BibTeX download, DOI linking, clipboard citation). |

---

### User-Centric -- Principle Summary and Judgment

| Field                  | Type                        | Required | Notes                                                                                      |
|------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------|
| UC Principle summary   | Long text (one paragraph)   | Yes      | Write a single paragraph synthesising findings across UC1, UC2, UC3, and UC4.              |
| UC Principle judgment  | Dropdown (single)           | Yes      | Pass / Conditional pass / Fail                                                             |

---

## Section 6 -- Secure (SE)

> This principle evaluates the tool's data protection practices, security posture, and bias safeguards. Security and privacy compliance are prerequisites for institutional deployment.

### SE1: Data Protection by Design

> **SE1:** The tool follows data-protection-by-design and by-default principles in a way that is acceptable under GDPR-oriented review.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| SE1 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| SE1 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Reference privacy policies, terms of service, and data processing documentation. |
| SE1 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| SE1 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### SE2: Data Use Transparency and User Control

> **SE2:** Users are clearly informed how their data, including prompts/queries, is used, stored, retained, and whether it may be used for model improvement or analytics; users have meaningful control where applicable.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| SE2 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| SE2 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe data retention policies, opt-in/opt-out mechanisms, and user controls. |
| SE2 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| SE2 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### SE3: Security Posture

> **SE3:** The tool's security posture is transparent and does not conflict with relevant institutional, national, or sector guidance.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| SE3 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| SE3 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Reference certifications, audit reports, or compliance statements. |
| SE3 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| SE3 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### SE4: Bias and Fairness

> **SE4:** The tool documents major disciplinary, geographic, language, or algorithmic bias risks and provides evidence of any mitigation measures or safeguards in place.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| SE4 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| SE4 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe documented bias risks and any mitigation measures observed. |
| SE4 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| SE4 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### Secure -- Additional Fields

| Field                          | Type                        | Required | Notes                                                                                      |
|--------------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------|
| SE DPIA/privacy escalation required | Dropdown (single)      | Yes      | Yes / No / Unclear                                                                         |
| SE Copyright/licensing concern | Dropdown (single)           | Yes      | Yes / No / Unclear                                                                         |
| SE Compliance confidence      | Dropdown (single)           | Yes      | Verified / Likely / Unclear / Escalated                                                    |

---

### Secure -- Principle Summary and Judgment

| Field                  | Type                        | Required | Notes                                                                                      |
|------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------|
| SE Principle summary   | Long text (one paragraph)   | Yes      | Write a single paragraph synthesising findings across SE1, SE2, SE3, and SE4.               |
| SE Principle judgment  | Dropdown (single)           | Yes      | Pass / Conditional pass / Fail                                                             |

---

## Section 7 -- Traceable (TC)

> This principle examines whether the tool provides verifiable, persistent attribution and allows users to inspect how answers are constructed from source material. Traceability is critical for academic integrity.

### TC1: Source Attribution

> **TC1:** The tool provides clear, accurate, and persistent attribution for the sources used to generate an answer; where available, it also surfaces helpful source-quality cues such as publication type, peer-review status, or retraction notices.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| TC1 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| TC1 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe attribution quality, persistence of links, and any source-quality cues observed. |
| TC1 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| TC1 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### TC2: Provenance Inspection

> **TC2:** The tool allows users and reviewers to inspect the provenance of an answer by showing which sources were selected and how retrieved evidence is distinguished from generated synthesis.

| Field                   | Type          | Required | Notes                                            |
|-------------------------|---------------|----------|--------------------------------------------------|
| TC2 Score               | 0 / 1 / 2 / 3 | Yes      | Use the Criterion Rating Scale.                  |
| TC2 Evidence summary    | Long text     | Yes      | Summarise the evidence found. Describe the provenance inspection features and their usability. |
| TC2 Evidence links      | Long text     | Yes      | Provide URLs or references to supporting evidence. Separate multiple links with line breaks. |
| TC2 Uncertainty or blockers | Long text | Conditional | Required if score is 0 or 1. Describe what is missing, unclear, or blocking a higher score. |

---

### Traceable -- Additional Fields

| Field                            | Type    | Required | Notes                                                                                       |
|----------------------------------|---------|----------|---------------------------------------------------------------------------------------------|
| TC Claims traceable percentage   | Number  | Yes      | Estimated percentage of tested claims that could be fully traced to a verifiable primary source (0--100). |

---

### Traceable -- Principle Summary and Judgment

| Field                  | Type                        | Required | Notes                                                                                      |
|------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------|
| TC Principle summary   | Long text (one paragraph)   | Yes      | Write a single paragraph synthesising findings across TC1 and TC2.                          |
| TC Principle judgment  | Dropdown (single)           | Yes      | Pass / Conditional pass / Fail                                                             |

---

## Section 8 -- Critical Fails and Confidence

> This section captures any critical-fail conditions and assesses the overall confidence in the evaluation. A critical-fail flag overrides individual criterion scores and prevents a positive recommendation.

| #   | Field                       | Type                     | Required | Notes                                                                                                        |
|-----|-----------------------------|--------------------------|----------|--------------------------------------------------------------------------------------------------------------|
| 8.1 | Critical fail flags         | Checkboxes (multi-select)| Yes      | Select all that apply from the Critical-Fail Flags list. If none apply, leave all unchecked and note "None." |
| 8.2 | Critical fail notes         | Long text                | Conditional | Required if any critical fail flag is checked. Provide a detailed explanation for each flag, including specific examples and evidence. |
| 8.3 | Completion checklist        | Checkboxes (multi-select)| Yes      | Confirm the following items are complete:                                                                     |

Completion checklist items:

- [ ] All TRUST criteria scored with evidence
- [ ] Evidence folder populated with screenshots and exports
- [ ] Repeated query test completed (or documented reason for omission)
- [ ] Benchmark comparison completed (or documented reason for omission)
- [ ] Privacy terms reviewed
- [ ] Sample queries documented
- [ ] All uncertainty/blocker fields completed for scores of 0 or 1

| #   | Field                      | Type              | Required | Notes                                        |
|-----|----------------------------|-------------------|----------|----------------------------------------------|
| 8.4 | Overall review confidence  | Dropdown (single) | Yes      | High / Medium / Low (see Confidence Levels)  |

---

## Section 9 -- Overall Recommendation

> This section synthesises all evaluation findings into a final recommendation. It should be written so that decision-makers can understand the outcome without reading every criterion in detail.

| #   | Field                           | Type                          | Required | Notes                                                                                                                |
|-----|---------------------------------|-------------------------------|----------|----------------------------------------------------------------------------------------------------------------------|
| 9.1 | Recommendation status           | Dropdown (single)             | Yes      | Recommended / Recommended with caveats / Needs review/provisional / Pilot only / Not recommended / Out of scope       |
| 9.2 | Conclusion summary              | Long text                     | Yes      | Write a concise narrative summary (2--4 paragraphs) explaining the overall assessment, key strengths, and key weaknesses. |
| 9.3 | Conditions/caveats              | Long text                     | Conditional | Required when Recommendation status is "Recommended with caveats," "Needs review/provisional," or "Pilot only." List specific conditions, limitations, or monitoring requirements. |
| 9.4 | Suitable use cases              | Long text                     | Yes      | List the specific use cases for which the tool is deemed suitable, referencing the Primary use cases from Section 1. |
| 9.5 | Unsuitable/high-risk use cases  | Long text                     | Yes      | List any use cases for which the tool should not be used, or where extra caution is required. Explain the risk.       |
| 9.6 | Public-facing summary draft     | Long text (one paragraph)     | Yes      | Draft a single paragraph suitable for publication on the UT intranet or wiki. This should be neutral, factual, and accessible to a non-specialist audience. |
| 9.7 | Next review due                 | Date                          | Yes      | Suggested date for the next evaluation. Consider the tool's update frequency and the pace of change in the AI search landscape. |

---

## Section 10 -- Second Review and Governance

> This section supports the multi-reviewer workflow. Section 10A is completed by the primary evaluator at handoff. Section 10B is completed by the second reviewer. Section 10C is completed during the final team decision meeting.

---

### Section 10A -- Primary Evaluation Handoff

> Completed by the primary evaluator when submitting the evaluation for second review.

| #     | Field                          | Type              | Required | Notes                                                                                        |
|-------|--------------------------------|-------------------|----------|----------------------------------------------------------------------------------------------|
| 10A.1 | Primary evaluator name         | Short text        | Yes      | Full name of the primary evaluator.                                                          |
| 10A.2 | Date submitted for review      | Date              | Yes      | Date the evaluation is handed off for second review.                                         |
| 10A.3 | Key concerns for second reviewer| Long text        | Yes      | Highlight areas where the second reviewer should focus attention. Reference specific criteria codes where possible. |
| 10A.4 | Areas of uncertainty           | Long text         | Yes      | List any criteria or topics where the primary evaluator has low confidence or needs a second opinion. |

---

### Section 10B -- Second Review

> Completed by the second reviewer after independently reviewing the tool and the primary evaluation.

| #     | Field                          | Type               | Required | Notes                                                                                        |
|-------|--------------------------------|--------------------|----------|----------------------------------------------------------------------------------------------|
| 10B.1 | Second reviewer name           | Short text         | Yes      | Full name of the second reviewer.                                                            |
| 10B.2 | Date of second review          | Date               | Yes      | Date the second review was completed.                                                        |
| 10B.3 | Agreement with primary evaluation | Dropdown (single)| Yes      | Full agreement / Partial agreement / Disagreement                                            |
| 10B.4 | Criteria to revisit            | Long text          | Conditional | Required when Agreement is "Partial agreement" or "Disagreement." List the specific criteria codes (e.g., RE1, SE2) where scores or evidence differ, and explain the differences. |
| 10B.5 | Second reviewer recommendation | Dropdown (single)  | Yes      | Recommended / Recommended with caveats / Needs review/provisional / Pilot only / Not recommended / Out of scope |
| 10B.6 | Conflict summary               | Long text          | Conditional | Required when Agreement is "Disagreement." Summarise the nature of the disagreement and the rationale for the second reviewer's scores. |

---

### Section 10C -- Final Team Decision

> Completed during the final team decision meeting after both the primary evaluation and second review are concluded.

| #     | Field                          | Type               | Required | Notes                                                                                        |
|-------|--------------------------------|--------------------|----------|----------------------------------------------------------------------------------------------|
| 10C.1 | Decision meeting date          | Date               | Yes      | Date of the final team decision meeting.                                                     |
| 10C.2 | Meeting participants           | Long text          | Yes      | List all participants present at the decision meeting, including names and roles.             |
| 10C.3 | Final status                   | Dropdown (single)  | Yes      | Approved / Approved with conditions / Deferred / Rejected / Escalated                        |
| 10C.4 | Final status rationale         | Long text          | Yes      | Explain the rationale for the final status. Reference key findings, score patterns, and any critical-fail flags. |
| 10C.5 | Publication status             | Dropdown (single)  | Yes      | Published internally / Published externally / Restricted / Draft                              |
| 10C.6 | Review cycle frequency         | Dropdown (single)  | Yes      | 3 months / 6 months / 12 months / 24 months / Ad hoc (trigger-based)                         |

---

## Appendix A -- Field Summary Reference

The table below provides a quick reference for the **questionnaire specification** section counts only.

It does **not** include persisted review-record envelope metadata, and it does **not** define the runtime field-definition totals in `static/js/config/questionnaire-schema.js`.

| Section | Title                        | Field count |
|---------|------------------------------|-------------|
| 0       | Workflow Control             | 6           |
| 1       | Tool Profile                 | 10          |
| 2       | Evaluation Setup             | 10          |
| 3       | Transparent (TR)             | 14          |
| 4       | Reliable (RE)                | 16          |
| 5       | User-Centric (UC)            | 20          |
| 6       | Secure (SE)                  | 18          |
| 7       | Traceable (TC)               | 11          |
| 8       | Critical Fails and Confidence| 4           |
| 9       | Overall Recommendation       | 7           |
| 10A     | Primary Evaluation Handoff   | 4           |
| 10B     | Second Review                | 6           |
| 10C     | Final Team Decision          | 6           |
| **Total** |                             | **132**     |

### Current Count Status (T001)

The repository does not currently present one reconciled field total. The counts below refer to different layers and should not be merged into a single number until the repo is reconciled.

| Source / layer | Count | Interpretation |
|----------------|-------|----------------|
| Appendix A total in this document | 132 | Current questionnaire-spec summary table total. |
| Explicit section-by-section listings in this document | 135 | Body-content count. This differs from Appendix A because Section 6 explicitly lists 21 fields while the appendix row still says 18. |
| Runtime field definitions in `static/js/config/questionnaire-schema.js` | 123 | Live runtime field-id namespace. This count includes derived-only field definitions. |
| Runtime non-derived input field definitions | 117 | Runtime field definitions excluding the 6 derived-only ids (`tr/re/uc/se/tc.principleJudgment` and `s8.completionChecklist`). |
| Actual persisted `current_state_json.fields` entries per saved review | Variable | Sparse stored response keys. This is not a fixed total and depends on review completeness and field activity. |

Known current causes of divergence:

- `static/js/config/questionnaire-schema.js` adds four Section 0 runtime fields not listed in the questionnaire body: `s0.reviewerName`, `s0.reviewerEmail`, `s0.reviewerAffiliation`, and `s0.reviewDate`.
- The questionnaire body lists separate criterion fields for `Evidence summary` and `Evidence links`, while the runtime schema currently defines one combined `${criterion}.evidence` field per criterion. For T002, the split wording remains a questionnaire-spec prompt model, not the canonical runtime/export-package model; legacy summary/link text must be normalized into the durable asset/link evidence system before or during import.
- Section `2.10 Evidence folder link` remains part of the questionnaire specification for reproducibility and shared-folder workflows, but it is not the canonical durable evidence record in the T002 contracts.
- The runtime field-definition total and the questionnaire-spec total answer different questions; neither should be restated as the other's canonical count.

---

## Appendix B -- Scoring Guidance

When assigning scores to individual TRUST criteria, apply the following guidance consistently:

- **Score 0 (Fails):** Assign when there is no evidence that the criterion is met, or when evidence directly contradicts the criterion. This score triggers the critical-fail review process.
- **Score 1 (Partial/unclear):** Assign when some relevant evidence exists but is incomplete, inconsistent, or insufficient to confirm the criterion is met. The "Uncertainty or blockers" field must be completed.
- **Score 2 (Meets baseline):** Assign when the criterion is satisfactorily met. Evidence is adequate, documented, and supports a positive assessment without significant gaps.
- **Score 3 (Strong):** Assign when the tool exceeds the criterion with compelling, well-documented evidence. This score should be reserved for cases where the tool demonstrably goes beyond baseline expectations.

### Principle Judgment Rules

A principle receives an overall judgment based on its constituent criterion scores:

- **Pass:** All criteria score 2 or higher, with at most one criterion scoring 2 and the rest scoring 3.
- **Conditional pass:** At least one criterion scores 1, but no criteria score 0. Conditions must be documented in the principle summary.
- **Fail:** Any criterion scores 0. This triggers the critical-fail flag review in Section 8.

---

## Appendix C -- Glossary

| Term                      | Definition                                                                                                  |
|---------------------------|-------------------------------------------------------------------------------------------------------------|
| Critical-fail flag        | A serious deficiency that prevents a positive recommendation regardless of individual criterion scores.     |
| DPIA                      | Data Protection Impact Assessment, required under GDPR for high-risk data processing.                       |
| Evidence folder           | A shared directory containing screenshots, exports, and other artifacts from the evaluation.                 |
| Hallucinated citation     | A citation or reference generated by the AI that does not correspond to a real, verifiable source.           |
| Provenance                | The documented chain of evidence showing how an answer was derived from source material.                    |
| Synthesis                 | The process of combining information from multiple sources into a coherent answer or summary.               |
| TRUST framework           | The evaluation framework comprising five principles: Transparent, Reliable, User-centric, Secure, Traceable. |
| UT                        | University of Twente.                                                                                       |

---

*Document version: 1.0*
*Last updated: 2026-04-06*
*Maintained by: EIS-IS Team, University of Twente*
