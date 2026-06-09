# TRUST Framework — Complete Reference

> **Last reviewed:** 2026-06-09
> **Changelog:**
> - 2026-06-09 — Aligned to `data/rubrics/trust-full.json` v1.1: fixed QG3 (now IP Preservation), SE1 title (now Bibliographic equity & diversity), AI-only count (4) and always-applicable count (10). Removed Expert/Standard/Lite variant columns — the implementation uses a single rubric. Score tables now use canonical rubric descriptions.

## What Is This?

The TRUST framework is a structured evaluation method for assessing academic search tools — particularly AI-powered ones like Semantic Scholar, Elicit, Consensus, Perplexity, and similar platforms. It was developed at the University of Twente by LISA-EIS (Embedded Information Services) for use by academic librarians and information services staff.

**TRUST** is an acronym: **T**ransparent, **R**eliable, **U**ser-centric, **S**ound, **T**raceable. These five principles define the evaluation dimensions. Each principle contains one or more questions scored on a 0–3 rubric.

The framework produces an auditable, evidence-backed review that a second reviewer can independently verify.

---

## Purpose

Academic search tools are increasingly AI-powered and increasingly opaque. Librarians need a consistent, defensible way to answer: "Should we recommend this tool to researchers?" TRUST provides that by:

- Standardizing what to look for across tools
- Requiring evidence (screenshots, annotations) for every judgment
- Producing a final report that documents the reasoning, not just the scores
- Making reviews comparable across tools and reviewers

---

## Single Rubric Variant

The current implementation uses a single rubric (`data/rubrics/trust-full.json`) with no variant fields. Earlier designs explored Expert/Standard/Lite wording levels, but these were abandoned before implementation. All questions use one canonical set of score descriptions.
---

## AI vs Non-AI Tools

Not every question applies to every tool. Some questions are marked **AI-only** — they only make sense when the tool uses AI/LLM technology. When reviewing a non-AI tool (e.g., a traditional database search interface), these questions are marked N/A and excluded from scoring.

The reviewer records whether the tool uses AI as a metadata field. This single flag controls which questions are active.

**AI-only questions (4):**
- Training Policy (quality gate)
- Methodology Disclosure (TR2)
- Accuracy and Hallucination (RE1)
- Critical Thinking Prompts (US2)

**Always-applicable questions (10 — regardless of AI):**
- Data Privacy (quality gate)
- IP Preservation (quality gate)
- Accessibility (quality gate)
- Data Source Clarity (TR1)
- Output Consistency (RE2)
- Workflow Integration (US1)
- Bibliographic equity & diversity (SE1)
- Data Handling Practices (SE2)
- Source Attribution Depth (TC1)
- Source Quality Indicators (TC2)

---

## Step 1: Quality Gates (Pass/Fail)

Before scoring any rubric questions, the reviewer checks four prerequisites. These are **gate conditions** — a failure on any gate means the tool does not pass the review, regardless of how well it scores on the rubric.

Each gate is scored **Pass**, **Fail**, **N/A**, or **Unsure**.

### QG1: Data Privacy

| Field | Value |
|-------|-------|
| Category | Privacy & Security |
| AI-only | No |
| Requirement | Vendor must explicitly state that user search queries, history, and uploaded content are not sold, shared with third-party advertisers, or used for commercial profiling. User data must not be retained beyond the stated service period without explicit consent. |
| **Pass example** | The tool's privacy policy states: 'User search queries, browsing history, and uploaded documents are never shared with third-party advertisers, sold to data brokers, or used for commercial profiling. Data is retained only for the duration needed to provide the service and is deleted within 30 days of account closure.' |
| **Fail example** | The terms of service state that 'user interaction data may be shared with select partners for improved service delivery' or there is no mention of third-party data sharing practices at all. |

**Why it matters:** Academic tools often handle researcher queries about sensitive or unpublished work. Without a clear privacy policy that addresses collection, processing, retention, and alignment with a recognized data protection framework (GDPR or equivalent), there is no baseline guarantee that this data is protected. The operationalization here is practical: reviewers check for the *presence* of these statements in the policy, not their legal sufficiency. The goal is to verify that the vendor has thought through and documented their data practices, not to conduct a legal audit.

### QG2: Training Policy

| Field | Value |
|-------|-------|
| Category | Privacy & Security |
| AI-only | **Yes** — N/A if the tool does not use AI |
| Requirement | Vendor must explicitly state that user queries/inputs/uploads are NOT used to train future AI models. |
| **Pass example** | The tool's documentation includes a section titled 'Data and AI Training' that states: 'User queries, uploaded documents, and search interactions are never used to train, fine-tune, or improve our AI models.' |
| **Fail example** | The terms of service state that 'interactions with the service may be used to improve our products and services' with no option to opt out, or there is no mention of training data practices at all. |

**Why it matters:** Researchers may input unpublished hypotheses, proprietary datasets, or confidential peer-review content. If the vendor uses these inputs for training, it creates a direct risk of intellectual property leakage. The requirement must be explicit — vague promises of "privacy" do not satisfy this gate.

### QG3: Intellectual Property Preservation

| Field | Value |
|-------|-------|
| Category | Intellectual Property |
| AI-only | No |
| Requirement | The vendor's Terms of Service must explicitly state that the user retains full copyright and intellectual property rights over all uploaded documents, prompts, and generated outputs. The vendor must not claim any license to distribute, publish, or commercially exploit user uploads. |
| **Pass example** | The Terms of Service include a section titled 'Your Content — Ownership' that states: 'You retain all rights, title, and interest in and to your content. We do not claim any ownership or license to distribute, publish, or commercially exploit your uploaded documents, prompts, or outputs.' No contradictory language appears elsewhere in the agreement. |
| **Fail example** | The Terms of Service state: 'By uploading content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for the purpose of improving our services.' Alternatively, the Terms make no mention of user intellectual property rights at all. |

**Why it matters:** Academic researchers routinely upload unpublished manuscripts, grant proposals, proprietary datasets, and pre-publication findings into search or synthesis tools. Some tools state in their Terms of Service that they acquire a perpetual, royalty-free license to use uploaded content for any purpose — including model improvement, redistribution, or commercial exploitation. This creates a direct risk of intellectual property loss, which can compromise patent applications, embargoed research, and institutional data ownership policies. Review the Terms of Service, paying particular attention to sections on 'User Content', 'License Grant', or 'Intellectual Property'. N/A may apply for tools that do not accept any user-uploaded content.

### QG4: Accessibility

| Field | Value |
|-------|-------|
| Category | Accessibility |
| AI-only | No |
| Requirement | Tool must support keyboard navigation to all major features, allow text resizing to at least 200% without content loss, and provide alt text for images. An accessibility statement or conformance claim (e.g., WCAG 2.1 AA) is strong supporting evidence. |
| **Pass example** | You can navigate to all search features, settings, and export options using only the Tab and Enter keys. Zooming the browser to 200% preserves the layout with no overlapping text or hidden controls. The tool's footer links to an accessibility statement declaring WCAG 2.1 AA conformance. |
| **Fail example** | Critical features such as the search filters or export button cannot be reached via keyboard — they only respond to mouse clicks. Zooming to 200% causes the navigation menu to overflow and become partially hidden. |

**Why it matters:** Universities have legal and ethical obligations to ensure recommended tools are accessible. The v2 wording shifts from asking reviewers to assess technical WCAG conformance (which requires specialized expertise and tools) to listing three observable behaviors: keyboard navigation, text resizing, and alt text. An accessibility statement or WCAG conformance claim is accepted as supporting evidence but is not itself the test. A tool that fails these observable behaviors cannot be recommended for institutional use regardless of its other qualities.

---

## Step 2: Scoring Rubric (0–3 Scale)

After passing quality gates, each of the 10 rubric questions is scored on a 0–3 scale. Higher is better. "N/A" and "Unsure" are also available for questions that genuinely do not apply or where the reviewer could not determine a score.

### Score Semantics

| Score | Meaning | Color Coding |
|-------|---------|-------------|
| 0 | Fail — the tool does not meet this criterion at all | Red |
| 1 | Poor — minimal or superficial compliance | Orange |
| 2 | Fair — meets the criterion with minor gaps | Teal |
| 3 | Good — fully meets or exceeds the criterion | Green |
| N/A | Not applicable to this tool | Grey |
| Unsure | Insufficient information to score — the reviewer could not determine a score | Gray |

---

### Principle T — Transparent (TR)

**What this principle measures:** Does the tool make its data sources and methods visible, or is it a black box? Transparency is the first principle because you cannot evaluate anything else meaningfully if you do not know what the tool is working with.

#### TR1: Data Source Clarity

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | Are the tool's data sources clearly documented? |

| Score | Description |
|-------|-------------|
| 0 | No information about which databases, publishers, or indices the tool searches — no sources page exists and documentation does not mention coverage scope. |
| 1 | General source types mentioned (e.g., 'scientific articles', 'patents') but no specific databases named. |
| 2 | Key databases and publishers identified by name (e.g., PubMed, IEEE Xplore) but coverage dates, update frequency, or regional sources may be unspecified. |
| 3 | Complete list of indexed sources with coverage dates and update frequency. |

**Why it matters:** A tool that claims to search "millions of academic papers" but won't say which publishers, journals, or repositories it indexes is effectively asking you to trust it blindly. Researchers need to know coverage gaps — if a tool doesn't index preprint servers or non-English publications, that shapes what results you get.

**Note on scoring:** The jump from 1 to 2 is the critical threshold. "General source types" (1) is marketing copy. "Named databases" (2) is verifiable. Level 3 has been updated from "full corpus composition and API documentation" to focus on coverage dates and update frequency. API documentation is a developer concern; knowing when sources were last indexed and how often they refresh is a librarian concern that directly affects research decisions.

#### TR2: Methodology Disclosure

| Field | Value |
|-------|-------|
| AI-only | **Yes** |
| Question | Does the tool explain how it processes queries and generates results? |

| Score | Description |
|-------|-------------|
| 0 | No explanation of the retrieval method, ranking algorithm, or generation process — the tool provides no technical documentation on how results are produced. |
| 1 | States the tool uses 'AI' or 'machine learning' generically without naming the model type, describing retrieval, or explaining ranking. |
| 2 | The tool explicitly names a specific model (e.g., 'GPT-4') and states the retrieval approach using a general summary. |
| 3 | The tool explicitly names the retrieval method, ranking or filtering steps, generation model, and any post-processing. |

**Why it matters:** "Powered by AI" is meaningless. The reviewer needs to know: Is it using a retrieval-augmented generation (RAG) pipeline? What language model? Does it use chain-of-thought (CoT) reasoning? Can the user see the retrieval step separately from the generation step? These details determine whether the tool's outputs can be meaningfully evaluated and trusted.

**Note on scoring:** RAG = Retrieval-Augmented Generation. CoT = Chain-of-Thought reasoning. The v2 rubric smooths the cliff between levels 1 and 2. Previously, level 2 required disclosing both the model/architecture AND the RAG structure — a high bar that many tools couldn't clear even when they were more transparent than level 1. Now level 2 requires naming the model/technology and describing retrieval at a high level. Level 3 requires documenting the full pipeline including ranking, filtering, and post-processing. A tool that says "we use GPT-4 with retrieval over our corpus" earns a 2. A tool that also documents how results are ranked, filtered, and fed to the generator earns a 3.

---

### Principle R — Reliable (RE)

**What this principle measures:** Can you depend on this tool to produce accurate, consistent results? Reliability has two dimensions: factual accuracy (does it make things up?) and consistency (does it give you the same answer twice?).

#### RE1: Accuracy and Hallucination

| Field | Value |
|-------|-------|
| AI-only | **Yes** |
| Question | Does the tool produce factually correct outputs, or does it fabricate information? |

| Score | Description |
|-------|-------------|
| 0 | Fabricated claims or citations appear routinely — the tool generates papers, authors, or conclusions that cannot be found in any database across multiple test queries. |
| 1 | Mostly accurate but with recurring detail errors — misattributed findings, incorrect author names or years in citations, or factual inaccuracies that a domain expert would catch. |
| 2 | All cited papers are real and correctly attributed, but synthesis may oversimplify nuanced debates or present contested findings without noting the controversy. |
| 3 | All claims are verifiable against original sources across every test query — no fabricated citations, no misattributions, and synthesis accurately represents areas of consensus and ongoing debate. |

**Why it matters:** "Hallucination" in the AI context means the tool generates information that sounds plausible but is factually wrong — fake citations, fabricated statistics, misattributed findings. This is the most dangerous failure mode for academic tools because users may not have the domain expertise to catch it. The reviewer should test the tool with queries where they know the correct answer.

**How to evaluate:** Run a test battery — a set of queries where you already know the correct answer. Check whether the tool's claims match the actual literature. Pay special attention to: citation details (author, year, journal), statistical claims, and causal assertions. A single fabricated citation in a test battery is a serious red flag.

**Note on scoring:** The v2 rubric removes "virtually zero" from level 3 — no current LLM achieves truly zero hallucination. Level 3 now describes consistent accuracy across tested queries with no fabricated claims or fake citations. The 0/1 boundary has been clarified: 0 means multiple fabricated claims per session (systematic fabrication), while 1 means occasional errors in details (the tool is fundamentally honest but imperfect). Scoring hinges on verifiability — can the claims be checked against real sources?

#### RE2: Output Consistency

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | Does the tool produce semantically consistent results when given the same or similar queries? |

| Score | Description |
|-------|-------------|
| 0 | Running the identical query three times produces conflicting claims, mutually exclusive recommendations, and completely different source citations on each individual attempt. |
| 1 | Running the identical query multiple times yields varied source selections and emphasis; the user must execute three or more runs to obtain matching claims. |
| 2 | Across repeated identical queries, the tool cites the same top sources and reaches matching conclusions, while secondary citations and specific sentence phrasing shift between individual generated runs. |
| 3 | Repeated runs of the same query return identical claims, identical key sources, and identical conclusions, with only minor phrasing changes observed. |

**Why it matters:** If a tool gives meaningfully different answers to the same query, it undermines the entire point of a structured evaluation. The reviewer cannot score accuracy if the results are random. Inconsistency also erodes user trust — a researcher who gets different results each time will stop relying on the tool. This question was renamed from "Variance Consistency" to "Output Consistency" in v2 because the focus is on semantic consistency (same claims, same sources) rather than textual consistency. Minor surface-level variation in wording is acceptable; changing the core claims or conclusions is not.

**How to evaluate:** Submit the same query at least 3 times. Also try semantically equivalent phrasings ("What is the effect of X on Y?" vs. "How does X influence Y?"). Score based on whether the core claims remain consistent, not whether the wording is identical.

---

### Principle U — User-Centric (US)

**What this principle measures:** Does the tool fit into a researcher's actual workflow, and does it encourage critical thinking rather than passive acceptance?

#### US1: Workflow Integration

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | Can the tool's outputs be exported, saved, or integrated into existing research workflows? |

| Score | Description |
|-------|-------------|
| 0 | No export, download, or integration options — results are trapped in the tool with no mechanism to transfer citations or data to reference managers or other software. |
| 1 | Results can be manually copied as plain text, but no structured export format (BibTeX, RIS, CSV) or direct integration with reference managers is available. |
| 2 | Supports structured export in at least one standard format (BibTeX, RIS, or CSV) that imports cleanly into reference managers, but lacks direct integrations, API access, or browser extension support. |
| 3 | Offers direct push to reference managers (Zotero, EndNote, Mendeley), a documented API for programmatic access, or a browser extension that captures results with full metadata. |

**Why it matters:** A search tool that cannot export results forces researchers into manual transcription — error-prone and time-consuming. Integration with reference managers (Zotero, EndNote, Mendeley) is the gold standard because it eliminates the friction between finding and citing.

**Note on scoring:** RIS and BibTeX are the standard bibliographic export formats. Level 2 means at least one of these is available. Level 3 requires direct integration (not just file download) — a "Send to Zotero" button, browser connector compatibility, or an API.

#### US2: Critical Thinking Prompts

| Field | Value |
|-------|-------|
| AI-only | **Yes** |
| Question | Does the tool actively encourage critical thinking, or does it present AI outputs as final answers? |

| Score | Description |
|-------|-------------|
| 0 | AI outputs are presented as authoritative facts with no source links, no uncertainty flags, no AI-generated label, and no prompt for the user to verify claims against original literature. |
| 1 | A generic disclaimer appears (e.g., 'AI may make mistakes') but no source material is surfaced within responses — the user has no way to see what the tool based its answer on. |
| 2 | Source excerpts are displayed alongside generated text — the user can click to read the original passage and compare it to the tool's summary or synthesis. |
| 3 | The tool actively prompts verification: confidence scores per claim, flags for contested findings, side-by-side source comparison views, or built-in fact-checking aids that guide the user to evaluate rather than passively accept. |

**Why it matters:** "Automation bias" is the tendency to trust machine-generated outputs more than warranted. AI search tools that present answers with high confidence and no caveats exploit this bias. Good tools counteract it by: surfacing uncertainty, prompting comparison across sources, showing confidence levels, and making the original sources immediately accessible.

**Note on scoring:** This question was renamed from "Cognitive Guardrails" to "Critical Thinking Prompts" in v2 to better describe what is being measured. A footer disclaimer ("AI may make mistakes") is a 1. A tool that shows source excerpts alongside the generated summary (making comparison possible) is a 2. The distinction between 2 and 3 is whether the tool *actively prompts* the user to engage critically (level 3) vs. merely *making it possible* to do so (level 2). The GLAT acronym (Generative AI Literacy Tools) was removed from level 3 in v2 to keep the criterion focused on observable behavior rather than terminology.

---

### Principle S — Sound (SE)

**What this principle measures:** Is the tool fair and transparent about its data practices? "Sound" in the TRUST context encompasses algorithmic fairness (does the tool systematically favor or disadvantage certain perspectives, regions, or types of research?) and data handling transparency (how does the tool protect and manage user data beyond the binary privacy gate?).

#### SE1: Bibliographic equity & diversity

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | Does the tool address bias in its source selection and ranking? |

| Score | Description |
|-------|-------------|
| 0 | Results consistently return exclusively English-language, Western-published sources without presenting demographic metrics, mitigation plans, or public documentation addressing this demographic or geographic imbalance. |
| 1 | The vendor's website states a commitment to diversity but omits source distribution data, lacks documented mitigation methods, and test queries return over 80% single-demographic sources. |
| 2 | Test queries yield at least ten percent non-English sources or non-Western research, OR documentation specifies exact methods used to reduce demographic or geographic bias in retrieval. |
| 3 | The tool surfaces multilingual, non-Western research in test queries and publishes downloadable reports detailing exact source distribution, geographic scope, and quantitative fairness metrics. |

**Why it matters:** Academic search tools trained on English-language, Western-published, high-impact-factor literature may systematically underrepresent research from the Global South, non-English publications, and smaller or newer journals. This creates a feedback loop that further marginalizes underrepresented research.

**How to evaluate:** Check whether the tool documents its source coverage (geographic scope, language coverage, inclusion criteria). Look for published reports on diversity metrics. Test with queries that should surface non-Western or non-English research and observe whether results are skewed.

**Note on scoring:** The v2 rubric shifts from measuring vendor statements to measuring observable behavior. Level 0 now requires that results *appear* systematically skewed without acknowledgment (not just absence of mitigation documentation). Level 2 accepts either demonstrated diverse results OR documented mitigation (either one earns the score). Level 3 requires both observable diversity AND published transparency reports.

#### SE2: Data Handling Practices

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | How transparent is the tool about data retention, security, and user rights beyond the basic privacy policy? |

| Score | Description |
|-------|-------------|
| 0 | Privacy policy is vague or missing on data retention, encryption, and breach notification — no specifics on how long data is kept, how it is protected, or what happens after a breach. |
| 1 | A privacy policy exists with generic statements about data protection (e.g., 'we use industry-standard security') but no specifics on retention periods, encryption standards, or user data export/deletion mechanisms. |
| 2 | Clearly states concrete retention periods and encryption practices (e.g., 'queries retained for 30 days', 'AES-256 at rest, TLS 1.3 in transit') so reviewers can verify compliance with institutional data governance policies. |
| 3 | Comprehensive data handling documentation covering: per-data-type retention periods, encryption standards, breach notification timelines (e.g., 72-hour GDPR), data residency, and self-service export/deletion tools for users. |

**Why it matters:** Data security is addressed as a binary pass/fail in the Data Privacy quality gate (QG1), which checks for the existence of a GDPR-aligned privacy policy. This scored question evaluates the *depth* of data handling transparency — going beyond presence of a policy to assess how thoroughly the vendor documents retention periods, encryption, breach procedures, and user rights. A tool may pass QG1 by having any privacy policy, but SE2 distinguishes between a minimal policy and a comprehensive one.

**How to evaluate:** Read the full privacy policy and any dedicated security/data handling documentation. Look for specific statements about: how long data is retained (with actual timeframes, not "as needed"), encryption standards used (TLS, at-rest encryption), what happens in case of a breach, where data is stored (residency), and whether users can export or delete their data.

---

### Principle T — Traceable (TC)

**What this principle measures:** Can you trace a claim back to its source, and are those sources credible? Traceability is about the depth and quality of the link between a tool's output and the underlying literature.

#### TC1: Source Attribution Depth

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | How deep do the source links go — to the journal, the article, or the specific passage? |

| Score | Description |
|-------|-------------|
| 0 | Citation links are broken, resolve to 404 pages, or do not exist — there is no navigable path from a claim in the tool's output to the original source material. |
| 1 | Citation links resolve to the publisher's journal homepage or domain (e.g., nature.com) but not to the specific article — the user must manually locate the referenced paper within the journal site. |
| 2 | Each citation links directly to the article's abstract or DOI landing page (e.g., doi.org/10.1038/s41586-023-12345), enabling immediate access to metadata and full text where available. |
| 3 | Citations link to the exact passage, page, or highlighted paragraph in the source document that supports the claim — the user can verify the claim in one click without searching within the paper. |

**Why it matters:** The depth of linking determines how efficiently a reviewer can verify claims. A link to a journal homepage (level 1) requires the reviewer to search within the journal to find the specific article — if it even exists. A deep link to the specific passage (level 3) allows immediate verification.

**Note on scoring:** Level 3 is aspirational for most tools. It requires RAG-style pinpointing where the tool identifies the specific passage that supports each claim. Very few academic search tools currently achieve this. Level 2 (direct link to the article's abstract/landing page on the publisher's site) is the practical good standard.

#### TC2: Source Quality Indicators

| Field | Value |
|-------|-------|
| AI-only | No |
| Question | Does the tool provide quality indicators for its sources? |

| Score | Description |
|-------|-------------|
| 0 | Retracted papers or predatory-journal articles appear in search results without any warning label, retraction flag, or quality indicator — the user cannot distinguish them from legitimate sources. |
| 1 | No quality labels or metadata distinguish source types — peer-reviewed articles, preprints, conference papers, and blog posts all appear with identical formatting and no retraction warnings. |
| 2 | Displays basic publication type labels distinguishing preprints from peer-reviewed articles, but omits retraction warnings or detailed citation metrics. |
| 3 | Provides contextual quality indicators: retraction status, citation count, publication type, and whether the source is open access. |

**Why it matters:** Citing a retracted paper as if it were valid, or treating a predatory journal as equivalent to a peer-reviewed one, undermines the entire purpose of an academic search tool. The minimum acceptable standard is distinguishing preprints from peer-reviewed publications (level 2). The gold standard is surfacing retraction status, citation counts, publication type, and open access status so the researcher can make an informed judgment.

**How to evaluate:** Search for topics known to have high retraction rates (e.g., certain cancer research areas). Search for topics where preprints are common. Observe whether the tool labels these distinctions. Check whether retracted papers appear in results without warning.

**Note on scoring:** This question was renamed from "Bibliometric Credibility" to "Source Quality Indicators" in v2. "Bibliometric" implies citation metrics specifically, but the question covers a broader set of quality signals: retraction status, publication type (preprint vs. peer-reviewed), and now open access status (added at level 3 in v2).

---

## Step 3: Final Score Calculation

### Overall Score

The total score is the sum of all numeric scores (0–3 per question), divided by the maximum possible score (3 points per answered question).

**Formula:** `score_ratio = sum_of_all_scores / (number_of_scored_questions × 3)`

N/A and Unsure answers are excluded from both the numerator and denominator — they neither help nor hurt.

**Example (10 questions):**
- 10 questions answered, all scored 2: total = 20, max = 30, ratio = 66.7%
- 8 questions answered (2 N/A), scores: 3,3,2,2,1,3,2,2: total = 18, max = 24, ratio = 75.0%

### Per-Principle Scores

Each principle (TR, RE, US, SE, TC) gets its own subtotal, average, and distribution bar showing the proportion of 0/1/2/3 scores within that category.

### Per-Principle Minimum

No principle average may fall below 1.0. If any principle's average score is below 1.0, the tool fails regardless of the overall ratio. This prevents a tool from compensating for catastrophic weakness in one dimension with strong performance in others.

### Quality Gate Status

The quality gates are reported separately. The overall gate status is:
- **PASSED** if all gates passed (or were N/A)
- **FAILED** if any gate failed
- **INCOMPLETE** if some gates are not yet evaluated

---

## Step 4: Final Verdict

The verdict can be determined automatically or manually.

### Automatic Verdict (computed)

If no manual finalization is provided:
- **FAILED** if any quality gate failed, OR the overall score ratio is below 60%, OR any principle average is below 1.0
- **PASSED** otherwise

The auto-verdict reason text specifies which condition caused the failure (gate failure, score below threshold, or principle minimum violation).

### Manual Finalization

The reviewer can override the automatic verdict with one of three grades:

| Grade | Meaning | Color |
|-------|---------|-------|
| **Pass** | Tool meets standards for institutional recommendation | Green |
| **Conditional** | Tool is acceptable with caveats — see conclusion and recommendations | Orange |
| **Fail** | Tool does not meet minimum standards | Red |

The manual finalization includes:
- **Grade:** Pass / Conditional / Fail
- **Conclusion:** Free-text summary of the review findings
- **Strengths:** List of notable positive aspects
- **Weaknesses:** List of notable negative aspects
- **Recommendations:** Actionable advice for institutional decision-making

**Why manual override exists:** Numbers don't capture everything. A tool might score well but have a critical flaw in one area that the scoring system doesn't fully penalize (e.g., a serious but isolated privacy issue). Or a tool might score mediocrely but show exceptional promise in a specific use case. The reviewer's expert judgment should have the final say.

---

## Evidence

Evidence is the backbone of a TRUST review. Every score should be supported by captured evidence — screenshots of the tool's interface, annotated to highlight the relevant features or failures.

### What Counts as Evidence

- **Screenshots** of the tool's interface showing the feature (or lack thereof) being evaluated
- **Annotated screenshots** with highlights, arrows, or text callouts pointing to specific elements
- **HTML snapshots** of pages (preserving the DOM state at capture time)
- **URLs** of relevant pages (privacy policy, terms of service, documentation)

### How Evidence Links to Questions

Each capture can be tagged to one or more rubric questions. This creates a bidirectional link:
- From the question: you can see which captures support the score
- From the capture: you can see which questions it was used for

### The Role of Evidence in the Report

The exported HTML report includes inline evidence thumbnails within each question section. This means a reader of the report can see the actual screenshot that the reviewer used to justify a score, without needing to open the tool themselves.

### Capturing Strategy

Good evidence collection requires:
1. **Capture before scoring** — take screenshots as you explore the tool, then score based on what you captured
2. **Capture both presence and absence** — if a tool lacks a privacy policy, screenshot the page where it should be. The absence is the evidence.
3. **Annotate key findings** — use annotation tools to highlight specific elements (e.g., circle the citation link, highlight the "powered by AI" claim)
4. **Capture the source URL** — every capture records the URL it was taken from, which is critical for verification

---

## Metadata

In addition to scores and evidence, the review captures metadata about the tool and the session:

### Tool Metadata

| Field | Purpose |
|-------|---------|
| Tool Name | Identifies the tool being reviewed |
| Tool URL | Direct link to the tool's main page |
| Company | Organization behind the tool (e.g., "Elsevier", "Allen Institute for AI") |
| Pricing | Cost model (e.g., "Freemium", "Subscription", "Free for academic use") |
| Availability | Access requirements (e.g., "Institutional license required", "Open access") |
| Terms & Conditions URL | Direct link to the tool's terms of service |
| Uses AI / LLM | Whether the tool uses AI technology — controls which questions are active |
| Session Notes | Free-text field for general observations and context |

### Session Metadata

| Field | Purpose |
|-------|---------|
| Session ID | UUID identifying this specific review session |
| Start Time | When the review began |
| Rubric Variant | Which version was used (TRUST Full or TRUST Lite) |
| Status | "started" or "done" |
| Finalized At | Timestamp when the manual finalization was completed (if applicable) |

### Reviewer Information

| Field | Purpose |
|-------|---------|
| Reviewer Name | Identity of the reviewer for audit trail |
| Reviewer Email | Contact information |

---

## The Export Package

A completed review is exported as a `.zip` file containing:

```
evidence/
  capture_[UUID].png          # Screenshot images
  capture_[UUID].html         # HTML snapshots (inlined CSS, scripts stripped)
session_metadata.csv           # Tool metadata (1 row)
rubric_scores.csv              # Score + notes + evidence links per question
capture_log.csv                # Capture metadata + tagged rubric IDs
review_conclusions.csv         # Finalization data (if manually finalized)
Evaluation_Report_[Tool].html  # Standalone styled report with inline evidence
```

The HTML report is self-contained — it embeds all evidence screenshots and can be opened without any software other than a browser.

---

## Complete Walkthrough: Conducting a TRUST Review

1. **Set up** — Record your name and email. Start a new session with the tool name and URL.

2. **Record metadata** — Enter company, pricing, availability, terms URL. Check/uncheck "uses AI." Add any initial notes.

3. **Explore and capture** — Navigate the tool. Take screenshots of: privacy policy, source documentation, export features, citation behavior, accessibility features, and any AI disclosures. Annotate where helpful.

4. **Tag evidence** — Link each capture to the rubric question(s) it supports. A single capture can support multiple questions.

5. **Evaluate quality gates** — For each of the 4 gates, mark Pass/Fail/N/A/Unsure. If any gate fails, you can still continue the evaluation but the final verdict will reflect the failure.

6. **Score the rubric** — For each of the 10 scoring questions, assign 0/1/2/3, N/A, or Unsure. Add notes explaining your reasoning. Ensure at least one piece of evidence is linked to each scored question.

7. **Finalize (optional but recommended)** — Write a conclusion. List strengths and weaknesses. Provide recommendations. Choose a final grade (Pass/Conditional/Fail).

8. **Export** — Generate the .zip package. The HTML report is ready to share or archive.

---

## Observations and Commentary

### Strengths of the Framework

- **Evidence-first approach.** Requiring screenshots for every score creates an auditable trail. This is the framework's most valuable feature — it prevents "I gave it a 3 because it felt right" scoring.
- **AI-aware gating.** The AI-only flag is a pragmatic design. It makes the framework applicable to both AI and traditional tools without requiring a separate rubric.
- **Single canonical rubric.** Having one authoritative set of score descriptions ensures consistency across reviewers and eliminates ambiguity about which variant applies.
- **Manual finalization override.** Allowing the reviewer to override the automatic verdict acknowledges that scoring systems have blind spots.
- **Per-principle minimum.** Requiring no principle to average below 1.0 prevents a tool from hiding catastrophic weakness in one dimension behind strong performance elsewhere.

### Limitations and Unaddressed Opportunities

- **No weighted scoring.** All 10 questions count equally toward the final score. In practice, some dimensions matter more than others — hallucination (RE1) is arguably more critical than workflow integration (US1). A weighting system would allow institutional tuning.
- **Binary quality gates.** Gates are pass/fail with no middle ground. A tool that "partially" complies (e.g., has a privacy policy but it is vague on retention) has no way to reflect that nuance. An "Unsure" option was added for cases where the reviewer cannot determine compliance, but a "conditional pass" gate status would help for edge cases.
- **No longitudinal tracking.** The framework evaluates a tool at a single point in time. AI tools change rapidly. There is no mechanism for scheduling re-evaluations or tracking how a tool's scores evolve over time.
- **Missing domain-specific questions.** The framework is general-purpose for academic search. It does not address domain-specific concerns like: Does the tool handle STEM figures/tables? Does it support systematic review methodology? Does it cover non-English literature?
- **No user testing component.** The framework evaluates what a tool claims and shows, but there is no structured protocol for testing the tool with standardized queries. A "test battery" of reference queries with known correct answers would make reliability scoring (RE1, RE2) more rigorous.
- **Scoring granularity.** The 0–3 scale is coarse. Many tools will cluster around 1–2, making it hard to distinguish between them. A 0–5 scale or sub-scores (e.g., separating "claims to do X" from "demonstrably does X") could help.
- **No inter-rater reliability mechanism.** The framework is designed for a single reviewer. There is no built-in mechanism for two reviewers to independently score the same tool and compare/resolve differences.
- **No cost/licensing rubric question.** Pricing and availability are metadata fields but not scored. For institutional recommendations, cost is often a deciding factor. A scoring question about licensing transparency or value-for-money could be valuable.
- **IP Preservation gate is binary.** The quality gate checks whether the vendor's terms preserve user IP rights, but does not score the nuance of what happens with uploaded content. A tool could pass the gate with minimal IP language while still having data practices that concern researchers.

### Changes in v2

The following changes were made in the v2 revision of the TRUST rubric:

- **SE principle renamed: "Secure" -> "Sound".** The S in TRUST still stands for the same letter, but "Sound" better captures the principle's scope — algorithmic fairness and data handling practices. "Secure" led reviewers to expect data security questions, which live in the quality gates instead.
- **QG1 Data Privacy updated.** Removed SURF/institutional reference; now focuses on GDPR-aligned policy content (collection, processing, retention). Reviewers check for presence of required statements, not legal sufficiency.
- **QG3 replaced: Citation Mechanism → IP Preservation.** The original QG3 (Citation Mechanism) required inline citations as the standard output format. This was replaced by IP Preservation, which checks whether the vendor's Terms of Service preserve user copyright and IP rights over uploaded content. Citation concerns are now addressed by the scoring rubric (TC1, TC2).
- **QG4 renamed to Accessibility.** Shifted from assessing WCAG conformance (technical audit) to three observable behaviors: keyboard navigation, text resizing, and alt text.
- **TR1 level 3 updated.** Changed from "API documentation" to "coverage dates and update frequency" — librarian-relevant freshness data rather than developer documentation.
- **TR2 levels smoothed.** Reduced the cliff between levels 1 and 2; level 2 now requires naming the model and describing retrieval at a high level; level 3 covers the full pipeline.
- **RE1 level 3 grounded.** Removed "virtually zero hallucination" (unachievable); clarified 0/1 boundary around systematic vs. occasional fabrication.
- **RE2 renamed to Output Consistency.** Focus shifted from textual consistency to semantic consistency (same claims, same sources).
- **US2 renamed to Critical Thinking Prompts.** Removed GLAT terminology; clarified 2/3 distinction around active prompting vs. enabling comparison.
- **SE1 refocused on behavior.** Scoring now measures observable result diversity and published reports, not just vendor statements.
- **SE2 added (new question).** Data Handling Practices evaluates depth of transparency beyond the binary privacy gate.
- **TC2 renamed to Source Quality Indicators.** Broader than "bibliometric"; added open access status at level 3.
- **Score threshold raised to 60%.** Up from 50%; a tool must now demonstrate stronger overall performance to pass.
- **Per-principle minimum added.** No principle may average below 1.0, preventing dimensional collapse.
- **"Unsure" score added.** Reviewers can now indicate insufficient information to score, excluded from calculation like N/A.
- **10 scoring questions (was 9).** Addition of SE2 brings the total to 10 scored questions (14 total including quality gates).

### Lessons Learned

- **Plain-language rubric descriptions work best.** Most reviewers are not AI specialists. The rubric's canonical descriptions avoid excessive jargon (RAG, CoT, hallucination testing) that many academic librarians would need to look up, while still capturing the necessary technical nuance at each score level.
- **Evidence capture is the bottleneck.** Taking, annotating, and tagging screenshots is the most time-consuming part of the review. Any tooling that speeds up this step would significantly improve adoption.
- **The 60% threshold balances rigor and realism.** Raised from 50% in v2, this threshold sets a meaningful minimum while remaining achievable for tools that are genuinely useful despite imperfections.
- **The framework would benefit from benchmarking.** Scoring a well-known tool (e.g., Google Scholar, Semantic Scholar) as a reference point would help calibrate reviewer expectations. A score of "2" means something different if you have seen how a top-performing tool scores.
- **Observable behavior beats vendor claims.** The v2 revisions consistently shift scoring criteria toward what reviewers can observe (diverse results in practice, working keyboard navigation, verifiable claims) rather than what vendors state in documentation. This makes reviews more defensible and harder to game.

### Recommendations

1. **Add a standardized test battery.** Include 5–10 reference queries with known correct answers that every reviewer should run. This makes RE1 and RE2 scores comparable across reviews.
2. **Introduce weightings.** Allow institutions to weight principles differently based on their priorities (e.g., a medical library might weight reliability higher than workflow integration).
3. **Add a "conditional pass" gate status** to reflect partial compliance.
4. **Create benchmark reviews** for widely-known tools to calibrate new reviewers.
5. **Consider adding questions about:** update frequency of the underlying corpus, multilingual support, API availability for systematic review use, and transparency about sponsored/promoted results.
6. **Add a "confidence level" field** per question — let the reviewer indicate how confident they are in their score (high/medium/low). This helps identify where more investigation is needed.
7. **Develop inter-rater reliability protocols.** For institutional adoption, having two reviewers independently score the same tool and reconcile differences would strengthen the framework's credibility.
