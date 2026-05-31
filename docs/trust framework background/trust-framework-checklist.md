# TRUST Framework — Evaluation Checklist

> **Purpose.** This document is a self-contained, printable checklist for manually evaluating an AI-based information search tool against the TRUST framework (Transparent, Reliable, User-centric, Secure, Traceable). It contains every question to answer, how to score each criterion, and the rules for deriving judgments and recommendations. Bring this document, a browser, and your evidence folder — nothing else is needed.

---

## How Scoring Works

### Criterion scores (0–3)

Every TRUST criterion is scored on this four-point scale. Base your score on documented evidence and hands-on testing — not on assumptions or vendor marketing.

| Score | Label | When to assign |
|:-----:|-------|----------------|
| **0** | Fails | The criterion is not met, or there is no evidence that it is met. |
| **1** | Partial / unclear | Some evidence exists but is incomplete, inconsistent, or insufficient to confirm the criterion is met. |
| **2** | Meets baseline | The criterion is met to a satisfactory standard, supported by evidence. |
| **3** | Strong | The criterion is met to a high standard, with clear and compelling evidence. |

For each criterion you also write:
- **Evidence** — what you observed, tested, or found in documentation. Be specific: quote pages, link URLs, describe test results.
- **Uncertainty / blockers** *(required when score is 0 or 1)* — explain what is missing, unclear, or preventing a higher score. Minimum ~20 characters of substantive explanation.

### Principle judgments (derived from criterion scores)

After scoring all criteria within a principle, a judgment is automatically derived:

| If... | Judgment |
|-------|----------|
| Any criterion scored **0** | **Fail** |
| Any criterion scored **1**, no 0s | **Conditional pass** |
| All criteria scored **2 or above** | **Pass** |

You may override a judgment **downward only** (Pass → Conditional → Fail) if the scores don't capture a concern. Upward override is not allowed. If you override, you must document why in the principle summary.

### Overall recommendation

After all five principles are judged, assign one recommendation:

| Category | When to use |
|----------|-------------|
| **Recommended** | Tool meets TRUST standards. Suitable for institutional recommendation. |
| **Recommended with caveats** | Suitable, but specific limitations must be communicated to users. |
| **Needs review / provisional** | Shows promise but has unresolved issues requiring further evaluation. |
| **Pilot only** | May be used in a controlled pilot — not ready for broad recommendation. |
| **Not recommended** | Fails one or more core TRUST standards. |
| **Out of scope** | Does not meet the definition of an AI-based search tool under this framework. |

**Constraints:**
- If the tool was marked **Out of scope** in Section 1, the only valid recommendation is **Out of scope**.
- If any **critical fail flag** is checked, or if the second reviewer **disagrees** with the primary evaluation, positive recommendations (Recommended / Recommended with caveats) are locked until the team records a final decision.

### Confidence level

Rate how well-supported *your evaluation* is — not how good the tool is:

| Level | When to assign |
|-------|----------------|
| **High** | Sufficient evidence, hands-on testing completed, conclusions well supported. |
| **Medium** | Evidence adequate but incomplete in some areas, or testing limited by access. |
| **Low** | Evidence sparse, critical areas untested, or relying heavily on vendor claims. |

A tool can get a negative recommendation with high confidence, or a positive one with low confidence. The confidence level makes this distinction visible.

---

## How to Prepare

Before starting the evaluation, complete these minimum evidence requirements:

1. **Desk review** — Collect vendor documentation (methodology, architecture, data sources), privacy policy, terms of service, and any technical white papers or model cards.

2. **Hands-on testing (minimum 3 scenarios):**
   - **Scenario A — Known-item query.** Search for a specific paper, author, or topic where you know the correct answer. Test retrieval accuracy.
   - **Scenario B — Exploratory literature search.** Run an open-ended query. Assess breadth and relevance of results.
   - **Scenario C — Synthesis query with cited sources.** Ask the tool to summarize a topic. Verify whether cited sources actually exist and support the claims made.

3. **Repeated-query test (minimum 1 query, run 3 times):** Run the same query three times. Record whether core conclusions stay aligned. Note variation in sources or claims.

4. **Manual source verification (minimum 5 claims):** Pick at least five claims or citations from the tool's output. Verify each against the original source. Record: does the source exist? Does it say what the tool claims? Does it support the specific claim?

5. **Evidence bundle** — Screenshots, exported results, copied policy excerpts, reviewer notes. Store in a shared folder and link it in Section 2.

---

## Evaluation Checklist

Fill in each section in order. Sections 0–2 establish context. Sections 3–7 are the five TRUST principles. Sections 8–10 close the evaluation.

---

### Section 0 — Workflow Control

> Administrative metadata. Determines the workflow path.

| Field | How to answer |
|-------|---------------|
| **Submission type** | Select one: Nomination / Primary evaluation / Second review / Final team decision / Re-evaluation |
| **Tool name** | Official product name |
| **Tool URL** | Primary access URL |
| **Existing evaluation ID** | Reference ID of the prior evaluation *(required for second review, final decision, or re-evaluation)* |
| **Responder role** | Your role: Information specialist / Researcher / Teacher / PhD candidate / Student / IT admin / Other |
| **Nomination reason** | Briefly explain why this tool should be evaluated *(required if submission type is Nomination)* |
| **Reviewer name** | Your full name |
| **Reviewer email** | Your email address |
| **Reviewer affiliation** | Department or unit *(optional)* |
| **Review date** | Date of this submission |

---

### Section 1 — Tool Profile

> Build a factual profile. Determines whether the tool is in scope.

| Field | How to answer |
|-------|---------------|
| **Vendor** | Organisation or company behind the tool |
| **Category** | Check all that apply: AI search engine / AI layer on existing database / Summarisation assistant / Citation discovery / Query development / Other |
| **Deployment type** | How it's delivered: Cloud SaaS / On-premises / Hybrid / Browser extension / API-only |
| **In-scope check** | **In scope** — tool is an AI-based search tool per the framework definition. **Out of scope** — tool uses only deterministic techniques (vector similarity, keyword matching, rule-based ranking) without generative synthesis. **Partially in scope** — tool has AI features but also significant non-AI components that affect evaluation. |
| **Scope rationale** | Explain which aspects fall in or out of scope and why *(required if out of scope or partially in scope)* |
| **Primary use cases** | Check all that apply: Literature search / Paper discovery / Citation tracing / Abstract summarisation / Teaching or demo / Query development / Other |
| **Target user groups** | Check all that apply: Students / Researchers / PhD candidates / Teachers / Information specialists / All UT users / Other |
| **Access model** | How users gain access: Free / Freemium / Subscription / Institutional licence / API key required |
| **Account required** | Yes / No / Optional |
| **Sign-in method** | Describe the authentication method *(required if account is required — e.g., email, institutional SSO, Google, Microsoft)* |

**Important:** If you mark the tool **Out of scope**, the evaluation is effectively terminated. You can only assign an **Out of scope** recommendation. Consider whether a **Partially in scope** classification with a focused evaluation would be more useful.

---

### Section 2 — Evaluation Setup

> Record how the evaluation was conducted. Ensures reproducibility.

| Field | How to answer |
|-------|---------------|
| **Testing dates** | Start and end dates of hands-on testing |
| **Pricing tier tested** | Which plan or tier you used (e.g., Free, Pro, Enterprise trial) |
| **Hands-on access confirmed** | Yes — you tested the tool yourself. No — you only reviewed documentation. |
| **Sample queries / scenarios** | List the queries and scenarios you used during testing. Include enough detail for reproducibility. |
| **Repeated query test performed** | Yes / No — did you run at least one query multiple times? |
| **Repeated query text** | The exact query you repeated *(required if test performed = Yes)* |
| **Benchmark comparison performed** | Yes / No — did you compare against a baseline or competing tool? |
| **Benchmark sources** | Which tools or sources you compared against *(required if comparison = Yes)* |
| **Sensitive data entered** | Yes / No — did you enter personally identifiable, institutional, or research-sensitive data during testing? |
| **Evidence folder link** | URL to the shared folder containing your screenshots, exports, and notes |

---

### Section 3 — Transparent (TR)

> Is the tool open about its data sources, methodology, and limitations? Transparency is foundational — users and evaluators should not have to operate on faith.

**TR1 — Source documentation**

> Does the tool provide clear documentation on its primary data sources and the scope of its indexed content?

What to look for: documentation pages listing which databases, publishers, or corpora are indexed; which disciplines, languages, and date ranges are covered; how often the corpus is updated.

| | |
|---|---|
| **Score** | 0–3 (use the criterion rating scale above) |
| **Evidence** | Summarise what you found. Link or quote specific documentation pages. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* What is missing or unclear? |

**TR2 — Methodology documentation**

> Is the tool's methodology explicitly documented — model family/version, retrieval/generation architecture, corpus used, how many or what type of sources inform an answer, and can users inspect source selection or provenance?

What to look for: model cards, architecture diagrams, methodology pages, any statement about how answers are generated and sourced.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Summarise what you found. Reference specific pages or sections. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**TR3 — Limitation acknowledgement**

> Does the tool openly acknowledge its known limitations, indexing gaps, and update frequency?

What to look for: limitation pages, disclosure statements, known-issue lists, transparency reports. Does the vendor proactively tell users what the tool *cannot* do?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Summarise what you found. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**Transparent — Summary and judgment**

| | |
|---|---|
| **Principle summary** | Write one paragraph synthesising your findings across TR1, TR2, and TR3. |
| **Principle judgment** | Pass / Conditional pass / Fail — derived from scores (see rules above). You may override downward with justification. |

---

### Section 4 — Reliable (RE)

> Are the tool's outputs accurate, consistent, and faithful? In academic contexts, convenience cannot come at the cost of intellectual integrity.

**RE1 — Factual accuracy**

> Does the tool generate factually accurate and verifiable outputs, with robust mechanisms to minimize or eliminate hallucinated citations?

What to test: run known-item queries (Scenario A). Verify claims against primary sources. Check whether cited papers actually exist. Count hallucinated citations.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Describe specific tests and results. How many claims verified? How many hallucinations found? |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**RE2 — Consistency of consensus**

> When identical queries are repeated, do core conclusions remain substantively aligned even if wording or source order varies?

What to test: run the repeated-query test (Section 2). Compare outputs across runs. Do the main conclusions agree? Do the same sources appear? Note any significant drift.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Describe the repeated-query results. Quote differences across runs. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**RE3 — Faithful synthesis**

> When the tool synthesizes information, does the synthesis remain faithful to retrieved source material — or does it introduce unsupported, exaggerated, or misleading claims?

What to test: run a synthesis query (Scenario C). Compare the tool's summary against the actual sources it cited. Does the summary accurately represent what the sources say, or does it over-extend?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Describe your source-by-source comparison. Note any claims not supported by the cited material. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**Reliable — Additional fields**

| | |
|---|---|
| **Test method description** | Describe your testing methodology: repeated queries, manual verification, benchmarks used. |
| **Claims manually checked** | Number of individual claims verified against source material. |

**Reliable — Summary and judgment**

| | |
|---|---|
| **Principle summary** | One paragraph across RE1, RE2, and RE3. |
| **Principle judgment** | Derived from scores. May override downward with justification. |

---

### Section 5 — User-centric (UC)

> Does the tool meet the practical needs of academic users at the University of Twente? Covers fitness for purpose, workflow integration, usability, and responsible AI communication.

**UC1 — Fitness for purpose**

> Is the tool fit for its intended purpose and aligned with UT research and educational needs?

What to evaluate: does the tool actually solve a problem UT users have? Are its strengths relevant to academic workflows? Would you recommend it to a colleague for their specific use case?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Reference specific use cases tested. Describe how well results matched academic needs. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**UC2 — Workflow integration**

> Does the tool integrate with standard academic workflows — export options, citation formats, reference manager compatibility?

What to look for: RIS/BibTeX export, Zotero/Mendeley integration, persistent links, citation copy features, API access for programmatic use.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | List the export formats, integrations, and citation features you tested. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**UC3 — Usability and accessibility**

> Can the intended audience use the tool without prohibitive technical expertise?

What to evaluate: is the interface intuitive? Are results readable? Does it work on mobile? Is there documentation for non-technical users? Are accessibility standards met?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Describe the user experience. Note any barriers. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**UC4 — AI transparency to users**

> Does the interface clearly communicate that it is AI-assisted? Does it surface uncertainty or limitation cues? Does it prompt users to verify sources rather than relying on the answer alone?

What to look for: disclaimers that output is AI-generated, confidence indicators, prompts to check sources, warnings about potential inaccuracies. Does the tool actively counteract automation bias?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Quote or screenshot the AI disclosure elements you found. Note if they are prominent or buried. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**User-centric — Additional fields**

| | |
|---|---|
| **Target user personas** | Describe who would actually benefit from this tool and in what contexts. |
| **Workflow integrations observed** | List the integrations and export features you confirmed during testing. |

**User-centric — Summary and judgment**

| | |
|---|---|
| **Principle summary** | One paragraph across UC1, UC2, UC3, UC4. |
| **Principle judgment** | Derived from scores. May override downward with justification. |

---

### Section 6 — Secure (SE)

> Does the tool protect user privacy and data, complying with relevant legal, institutional, and ethical regulations?

**SE1 — Data protection by design**

> Does the tool follow data-protection-by-design and by-default principles, acceptable under GDPR-oriented review?

What to look for: privacy-by-design documentation, data minimisation, default privacy-protective settings, GDPR compliance statements, data processing agreements.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Reference privacy policy sections, data processing terms, and any DPIA documentation. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**SE2 — Data use transparency and user control**

> Are users clearly informed how their data (including prompts and queries) is used, stored, retained? Can it be used for model training? Do users have meaningful control?

What to look for: privacy policy sections on data usage, retention periods, opt-out mechanisms, data deletion options, model training opt-in/out settings.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Quote the relevant policy language. Note whether controls are easy to find and use. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**SE3 — Security posture**

> Is the tool's security posture transparent and free from conflicts with institutional, national, or sector guidance (SURF, EU AI Act)?

What to look for: security documentation, SOC 2 / ISO 27001 certifications, SURF compatibility, incident disclosure history, encryption standards.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | List certifications, security documentation, and any institutional guidance you cross-referenced. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**SE4 — Bias and fairness**

> Does the tool document major disciplinary, geographic, language, or algorithmic bias risks? Does it provide evidence of mitigation?

What to look for: bias disclosures, fairness documentation, coverage gaps (e.g., only English-language sources, STEM-heavy corpus), mitigation measures with evidence they are actually implemented.

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Note coverage gaps you observed during testing. Reference any bias documentation from the vendor. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**Secure — Additional fields**

| | |
|---|---|
| **DPIA / privacy escalation required** | Yes / No / Unclear — does this tool's data handling require a formal Data Protection Impact Assessment? |
| **Copyright / licensing concern** | Yes / No / Unclear — are there licensing issues with how the tool uses or surfaces copyrighted content? |
| **Compliance confidence** | Verified / Likely / Unclear / Escalated — how confident are you that the tool meets institutional compliance requirements? |

**Secure — Summary and judgment**

| | |
|---|---|
| **Principle summary** | One paragraph across SE1, SE2, SE3, SE4. |
| **Principle judgment** | Derived from scores. May override downward with justification. |

---

### Section 7 — Traceable (TC)

> Can every piece of information the tool generates be traced back to its original source? Traceability is non-negotiable for academic accountability.

**TC1 — Source attribution**

> Does the tool provide clear, accurate, and persistent attribution for sources used? Does it surface quality cues like publication type, peer-review status, or retraction notices?

What to test: check whether citations are real and persistent. Do links resolve to the actual papers? Are retractions flagged? Can you distinguish peer-reviewed from preprint sources?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Test specific citations. Record which resolved correctly, which were fabricated, and which lacked quality cues. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**TC2 — Provenance inspection**

> Can users and reviewers inspect how an answer was generated — which sources were selected and how retrieved evidence is distinguished from generated synthesis?

What to test: does the tool show source selection? Can you see the retrieved passages separately from the generated summary? Is there a clear distinction between "found in source" and "synthesized by AI"?

| | |
|---|---|
| **Score** | 0–3 |
| **Evidence** | Describe what provenance information is visible. Screenshot the source-inspection interface if available. |
| **Uncertainty / blockers** | *(required if score ≤ 1)* |

**Traceable — Additional field**

| | |
|---|---|
| **Claims traceable percentage** | Of the claims you checked, what percentage could be traced back to a specific, verifiable source? |

**Traceable — Summary and judgment**

| | |
|---|---|
| **Principle summary** | One paragraph across TC1 and TC2. |
| **Principle judgment** | Derived from scores. May override downward with justification. |

---

### Section 8 — Critical Fails and Confidence

> Flag any critical failures observed during testing. These override individual scores and trigger mandatory team review.

**Critical fail flags** — Check every condition you observed:

- [ ] **Fabricated or unverifiable citation found** — the tool presented a citation that does not exist or cannot be verified.
- [ ] **Materially unfaithful synthesis found** — a summary introduced claims unsupported by or contradicting the retrieved sources.
- [ ] **Major claim not traceable to a primary source** — a substantive factual claim has no identifiable source.
- [ ] **Provenance path not inspectable enough for academic use** — no meaningful way to inspect source selection or evidence use.
- [ ] **Privacy/data-use terms unclear or unacceptable** — data handling is opaque or conflicts with institutional/legal requirements.
- [ ] **Serious security or compliance concern** — security posture conflicts with institutional policies or regulatory requirements.
- [ ] **Serious bias or fairness concern without credible mitigation** — significant bias without evidence of mitigation measures.

If any flag is checked:
- Write **critical fail notes** explaining each flagged concern in detail.
- The evaluation **cannot** be finalized as Recommended or Recommended with caveats until the team reviews and records a collective decision.

**Completion checklist** — Verify these are done before submitting:

- [ ] All TRUST criteria scored with evidence
- [ ] Evidence folder populated with screenshots and exports
- [ ] Repeated query test completed (or omission documented)
- [ ] Benchmark comparison completed (or omission documented)
- [ ] Privacy terms reviewed
- [ ] Sample queries documented
- [ ] All uncertainty/blocker fields completed for scores of 0 or 1

**Overall review confidence:** High / Medium / Low

---

### Section 9 — Overall Recommendation

> Synthesise all findings into a final recommendation.

| Field | How to answer |
|-------|---------------|
| **Recommendation status** | Use the recommendation categories above. Remember the constraints: out-of-scope tools → only "Out of scope"; critical fails or reviewer disagreement → positive recommendations locked until team decision. |
| **Conclusion summary** | Write a clear, concise summary of why you are making this recommendation. Reference specific criteria and evidence. |
| **Conditions / caveats** | *(required for Recommended with caveats, Needs review/provisional, or Pilot only)* What conditions, limitations, or monitoring requirements apply? |
| **Suitable use cases** | Specific scenarios where the tool can be recommended (e.g., "literature discovery for STEM researchers", "teaching demonstrations in information literacy courses"). |
| **Unsuitable / high-risk use cases** | Scenarios where the tool should **not** be used. Required for any conditional or provisional recommendation. |
| **Public-facing summary draft** | Draft text for a public or institutional audience explaining the evaluation outcome. |
| **Next review due** | Date when the tool should be re-evaluated. |

---

### Section 10 — Governance Workflow

> The governance process ensures two-person review before any final recommendation.

#### 10A — Primary Evaluation Handoff *(filled by primary evaluator)*

| Field | How to answer |
|-------|---------------|
| **Primary evaluator name** | Your name |
| **Date submitted for review** | Date you hand off the completed evaluation |
| **Key concerns for second reviewer** | Highlight any areas you want the second reviewer to focus on. |
| **Areas of uncertainty** | Note anything you are not confident about. |

#### 10B — Second Review *(filled by second reviewer)*

| Field | How to answer |
|-------|---------------|
| **Second reviewer name** | Your name |
| **Date of second review** | Must be on or after the handoff date. |
| **Agreement with primary evaluation** | Full agreement / Partial agreement / Disagreement |
| **Criteria to revisit** | *(required if partial agreement or disagreement)* Select the criterion codes (TR1–TC2) that need re-examination. |
| **Second reviewer recommendation** | Your independent recommendation using the same categories. |
| **Conflict summary** | *(required if disagreement)* Explain the nature of the disagreement. |

#### 10C — Final Team Decision *(filled in team meeting)*

| Field | How to answer |
|-------|---------------|
| **Decision meeting date** | Must be on or after the second review date. |
| **Meeting participants** | List all attendees. At least two members must have reviewed the tool. |
| **Final status** | Approved / Approved with conditions / Deferred / Rejected / Escalated |
| **Final status rationale** | Explain the team's decision. Document conditions, deferrals, or escalation reasons. |
| **Publication status** | Internal only / External / Restricted / Draft |
| **Review cycle frequency** | When to re-evaluate: 3 months / 6 months / 12 months / 24 months / Ad hoc (trigger-based) |

---

## Quick Reference: Scorecard

Use this table to track scores at a glance. Principle judgments are derived automatically.

| Principle | Criterion | Title | Score (0–3) | Judgment |
|-----------|-----------|-------|:-----------:|----------|
| **TR** | TR1 | Source documentation | | |
| | TR2 | Methodology documentation | | |
| | TR3 | Limitation acknowledgement | | |
| | | **→ TR judgment** | | *derived* |
| **RE** | RE1 | Factual accuracy | | |
| | RE2 | Consistency of consensus | | |
| | RE3 | Faithful synthesis | | |
| | | **→ RE judgment** | | *derived* |
| **UC** | UC1 | Fitness for purpose | | |
| | UC2 | Workflow integration | | |
| | UC3 | Usability and accessibility | | |
| | UC4 | AI transparency to users | | |
| | | **→ UC judgment** | | *derived* |
| **SE** | SE1 | Data protection by design | | |
| | SE2 | Data use transparency & user control | | |
| | SE3 | Security posture | | |
| | SE4 | Bias and fairness | | |
| | | **→ SE judgment** | | *derived* |
| **TC** | TC1 | Source attribution | | |
| | TC2 | Provenance inspection | | |
| | | **→ TC judgment** | | *derived* |

**Critical fails:** ☐ none / ☐ flagged (list): ___________________________

**Confidence:** ☐ High / ☐ Medium / ☐ Low

**Recommendation:** ☐ Recommended / ☐ With caveats / ☐ Needs review / ☐ Pilot only / ☐ Not recommended / ☐ Out of scope
