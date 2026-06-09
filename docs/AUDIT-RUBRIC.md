# Audit: Rubric Question Content

> **Date:** 2026-06-09
> **Scope:** `data/rubrics/trust-full.json`, `lib/rubric.ts`, `components/QuestionSection.tsx`
> **Reference:** `docs/TRUST-FRAMEWORK.md` (canonical), `docs/TRUST-NORTH-STAR.md`, `docs/trust framework background/revised-framework.md`

---

## Summary

The rubric (`trust-full.json` v1.1) contains **4 quality gates** and **10 scoring questions** across 5 TRUST principles. Cross-referencing against the canonical TRUST-FRAMEWORK.md reveals one critical coverage gap (QG3 substitution), several naming/staleness issues from the v1→v2 rename, and moderate boundary-discrimination concerns on 3 scoring questions. Question wording is generally strong — backgrounds explain *why* and *how*, examples are concrete and realistic, and the 0–3 scale is applied consistently. The main risks to inter-rater reliability come from ambiguous score boundaries (not ambiguous wording) and undocumented data fields.

**Total findings:** 2 P1, 4 P2, 5 P3.

---

## Coverage Matrix

### Quality Gates

| # | Framework Doc (QG) | Rubric JSON Key | Rubric Title | Covered? | Notes |
|---|-------------------|-----------------|-------------|----------|-------|
| QG1 | Data Privacy | `privacy_and_security.data_privacy` | Data privacy policy | ✅ | Aligned |
| QG2 | Training Policy | `privacy_and_security.training_policy` | AI model training policy | ✅ | Aligned, `ai_only: true` |
| QG3 | Citation Mechanism | `intellectual_property.ip_preservation` | Intellectual property preservation | ⚠️ | **Different gate** — rubric has IP Preservation where framework expects Citation Mechanism (see P1-1) |
| QG4 | Accessibility | `accessibility.compliance` | Accessibility | ✅ | Aligned |

### Scoring Questions

| # | Framework Doc (Question) | Rubric JSON Key | Rubric Title | ai_only | Covered? | Notes |
|---|-------------------------|-----------------|-------------|---------|----------|-------|
| TR1 | Data Source Clarity | `TR.data_source_clarity` | Data source clarity | false | ✅ | Aligned |
| TR2 | Methodology Disclosure | `TR.methodology_disclosure` | Methodology disclosure | true | ✅ | Aligned |
| RE1 | Accuracy and Hallucination | `RE.accuracy_and_hallucination` | Accuracy and hallucination | true | ✅ | Aligned |
| RE2 | Output Consistency | `RE.variance_consistency` | Output consistency | false | ✅ | Title aligned; **key name is stale v1** (see P2-1) |
| US1 | Workflow Integration | `US.workflow_integration` | Workflow integration | false | ✅ | Aligned |
| US2 | Critical Thinking Prompts | `US.cognitive_guardrails` | Critical thinking prompts | true | ✅ | Title aligned; **key name is stale v1** (see P2-1) |
| SE1 | Algorithmic Fairness | `SE.algorithmic_fairness` | Bibliographic equity & diversity | false | ✅ | Title diverges from framework heading (see P2-2) |
| SE2 | Data Handling Practices | `SE.data_handling` | Data handling practices | false | ✅ | Aligned; has `related_gate` + `merged_gate` |
| TC1 | Source Attribution Depth | `TC.source_attribution_depth` | Source attribution depth | false | ✅ | Has `merged_gate: true` |
| TC2 | Source Quality Indicators | `TC.bibliometric_credibility` | Source quality indicators | false | ✅ | Title aligned; **key name is stale v1** (see P2-1) |

### Framework Criteria NOT Covered by Rubric

The following criteria appear in the revised framework v2 draft (`docs/trust framework background/revised-framework.md`) but have no corresponding rubric question. These may be intentionally out of scope (the north star doc describes the rubric as a "streamlined subset"), but are listed for completeness:

| Revised Framework Criterion | Status |
|----------------------------|--------|
| TR3: Known limitations & indexing gaps | Partially covered by TR1 score 3 (update frequency) — no standalone question |
| RE3: Faithfulness (synthesis = source material) | **Not covered** — distinct from accuracy (RE1) and consistency (RE2) |
| UC1: Fitness for purpose | **Not covered** — no "fit for intended purpose" question |
| UC3: Usability (beyond accessibility) | **Not covered** — accessibility gate covers compliance, not general usability |
| SE3: Security practice transparency | Partially covered by SE2 — no standalone security question |
| SE4: Algorithmic/data bias (explicit) | Covered by SE1 under different framing |
| TC2 (revised): Query-to-output auditability | **Not covered** — no provenance/audit trail question |

---

## Findings

### P1 — High Severity

#### P1-1: QG3 Substitution — Citation Mechanism replaced by IP Preservation

**Location:** `data/rubrics/trust-full.json` → `quality_gate.intellectual_property.ip_preservation` vs `docs/TRUST-FRAMEWORK.md` QG3 (Citation Mechanism)

The canonical TRUST-FRAMEWORK.md defines QG3 as **"Citation Mechanism"** (AI-only, requiring inline citations as standard output). The rubric JSON instead implements **"Intellectual property preservation"** (not AI-only, requiring user retains IP rights over uploads). These are completely different gates with different scopes, different AI-only flags, and different failure modes.

The north star doc (`TRUST-NORTH-STAR.md:60`) lists "Data privacy, AI training policy, IP preservation, accessibility" — suggesting the rubric is the intended current state and the framework doc is stale on this gate. Either way, the two authoritative documents contradict each other.

**Impact:** A reviewer reading the framework document expects a Citation Mechanism gate. The tool presents an IP Preservation gate. This is the most consequential documentation-implementation divergence in the project.

**Recommendation:** Reconcile the framework doc with the rubric. If IP Preservation is the correct current gate, update TRUST-FRAMEWORK.md QG3. If Citation Mechanism should be the gate, update the rubric JSON. Do not leave them diverged.

**Decision:** The rubric is correct/most recent. Align the rest with the rubric.

---

#### P1-2: SE1 Title Mismatch — "Algorithmic Fairness" vs "Bibliographic Equity & Diversity"

**Location:** `data/rubrics/trust-full.json` → `scoring_rubric.SE.algorithmic_fairness.title` = "Bibliographic equity & diversity"

The TRUST-FRAMEWORK.md heading is **"SE1: Algorithmic Fairness"** with the question "Does the tool produce equitable, geographically diverse results?". The rubric JSON title is **"Bibliographic equity & diversity"**. While the content measures the same thing, the titles differ significantly. "Algorithmic fairness" implies bias in the ranking algorithm; "Bibliographic equity & diversity" frames it as source diversity.

The framework doc's v2 change notes say nothing about renaming this question (it only mentions renaming the S principle from "Secure" to "Sound"). The title divergence is undocumented.

**Impact:** Report output uses the rubric title. A reader familiar with the framework heading "Algorithmic Fairness" will not recognize "Bibliographic equity & diversity" as the same question. Cross-referencing reports to framework documentation becomes error-prone.

**Recommendation:** Pick one title and use it consistently in both the rubric JSON and the framework document. The rubric title "Bibliographic equity & diversity" is more descriptive of what is actually measured; consider adopting it in the framework doc.

**Decision:** The rubric is correct/most recent. Align the rest with the rubric.


---

### P2 — Medium Severity

#### P2-1: Stale JSON Key Names from v1 Rename

**Location:** `data/rubrics/trust-full.json` → scoring_rubric keys

Three scoring questions were renamed in v2, but only the `title` field was updated — the JSON object keys still use v1 names:

| JSON Key (v1) | Title (v2) | Expected Key |
|--------------|------------|-------------|
| `variance_consistency` | Output consistency | `output_consistency` |
| `cognitive_guardrails` | Critical thinking prompts | `critical_thinking_prompts` |
| `bibliometric_credibility` | Source quality indicators | `source_quality_indicators` |

The keys are used as identifiers throughout the codebase (evaluation storage in IndexedDB, `getQuestionCode()`, capture linking, report rendering). Changing them would be a **breaking change** requiring a data migration for existing sessions.

**Impact:** Code that constructs rubric IDs (e.g., `RE.variance_consistency`) is inconsistent with displayed titles. The `getQuestionCode()` function generates codes like "RE2" based on array position, not key name, so the codes are correct. But any code that references keys by string (e.g., `getCategoryScores`, `principleAverage`) uses the stale names. The issue is primarily developer confusion and documentation inconsistency, not user-facing breakage.

**Recommendation:** Add inline code comments at each stale key mapping noting the v2 rename. If a data migration is planned in a future version, rename the keys at that point. Do not rename without migration — it would break existing evaluation data.

**Decision:** Add the comments, document this 'issue' clearly. Postpone migration for now.

---

#### P2-2: Ambiguous Score Boundary — RE1 (Accuracy) Between Score 1 and Score 2

**Location:** `data/rubrics/trust-full.json` → `RE.accuracy_and_hallucination`

**Score 1:** "Mostly accurate but with recurring detail errors — misattributed findings, incorrect author names or years in citations, or factual inaccuracies that a domain expert would catch."

**Score 2:** "All cited papers are real and correctly attributed, but synthesis may oversimplify nuanced debates or present contested findings without noting the controversy."

The boundary is ambiguous. "Misattributed findings" at score 1 and "oversimplify nuanced debates" at score 2 are different types of errors (factual vs. interpretive), but the transition isn't framed as such. A tool that correctly attributes all papers but misrepresents one contested finding could reasonably be scored as either 1 or 2 depending on whether the reviewer considers oversimplification a "detail error" or a "synthesis limitation."

Additionally, the example for score 2 describes the tool presenting "a highly contested hypothesis as absolute medical consensus" — this is a strong interpretive error that some reviewers might score as 1 rather than 2.

**Impact:** Inter-rater reliability risk on one of the most important questions in the rubric.

**Recommendation:** Reframe the 1/2 boundary explicitly around error type: Score 1 = factual errors in verifiable details (wrong author, wrong year, fabricated claim). Score 2 = interpretive errors in synthesis (oversimplification, missing nuance). The current wording conflates these.

**Decision:** Good flag. Investigate thoroughly, and rewrite this intelligently. for example make use of multiple subagents to brainstorm/review/judge proposed changes to this text.


---

#### P2-3: Hard Numeric Threshold in Qualitative Rubric — SE1 Score 2

**Location:** `data/rubrics/trust-full.json` → `SE.algorithmic_fairness`

**Score 2:** "Test queries yield at least ten percent non-English sources or non-Western research, OR documentation specifies exact methods used to reduce demographic or geographic bias in retrieval."

The "at least ten percent" threshold is unusually specific for a qualitative rubric. Issues:
1. The reviewer cannot easily measure this percentage without systematic counting across multiple queries.
2. The threshold is arbitrary — why 10% and not 5% or 20%?
3. For discipline-specific tools (e.g., a Dutch law database), 10% non-English sources may be structurally impossible even if the tool is fair.
4. The OR condition creates a loophole: a tool with 0% diverse sources but a documentation page about bias mitigation scores 2.

**Impact:** Reviewers will either ignore the percentage (undermining the criterion) or struggle to measure it (adding friction without clear benefit).

**Recommendation:** Replace the numeric threshold with a qualitative observable: "Test queries surface at least some non-English or non-Western sources where relevant to the search topic." Keep the OR condition for documented mitigation.

**Decision:** Good flag. Investigate thoroughly, and rewrite this intelligently. for example make use of multiple subagents to brainstorm/review/judge proposed changes to this text.


---

#### P2-4: `merged_gate` Field Semantics Undocumented

**Location:** `data/rubrics/trust-full.json` → `SE.data_handling.merged_gate: true`, `TC.source_attribution_depth.merged_gate: true`

The `merged_gate` boolean field exists on two scoring questions but is not documented in the TRUST-FRAMEWORK.md, the north star doc, or the content improvement notes. The `ScoringQuestion` type in `lib/types.ts` declares the field but provides no JSDoc.

From context, `merged_gate: true` appears to mean "this scoring question extends/subsumes a quality gate topic" — SE2 extends QG1 (data privacy), TC1 relates to citation linking. But this is inferred, not stated.

**Impact:** Future maintainers cannot determine the purpose or intended behavior of this field without reading the code that consumes it.

**Recommendation:** Add a JSDoc comment to the `merged_gate` field in `lib/types.ts` explaining its semantics. Document in TRUST-FRAMEWORK.md which scoring questions have merged-gate relationships with which quality gates.

**Decision:** Agreed. Ensure everything aligns with the rubric as implemented now -- that's the canonical version.


---

### P3 — Low Severity

#### P3-1: Missing N/A Examples in Quality Gates

**Location:** `data/rubrics/trust-full.json` → all quality gate questions

The `PassFailQuestion` type supports an `examples.na` field, but none of the 4 quality gates provide an N/A example. Three of the four gates include N/A applicability guidance in their `background` text (data_privacy, ip_preservation, compliance), but no concrete worked example shows what a valid N/A scenario looks like.

The `training_policy` gate's background mentions "This gate applies only to AI-powered tools" but doesn't provide a worked N/A example for a non-AI tool.

By contrast, the scoring questions include N/A applicability guidance directly in their background text and are generally clear about when N/A applies.

**Impact:** Minor. Reviewers have enough context from background text to determine N/A applicability. But the asymmetry between the type's support for `examples.na` and the absence of any such examples is a missed opportunity for consistency.

**Recommendation:** Add a brief N/A example to each quality gate, following the same concrete-scenario format as the pass/fail examples.

**Decision:** Good flag. Investigate thoroughly, and rewrite this intelligently. for example make use of multiple subagents to brainstorm/review/judge proposed changes to this text.

---

#### P3-2: Framework Doc Describes Lite/Standard/Expert Variants That Don't Exist in Rubric

**Location:** `docs/TRUST-FRAMEWORK.md` — "Two Variants" section (lines 24–34) and score tables throughout

The framework document describes Expert, Standard, and Lite wording variants for each question and states "The reviewer can toggle between these per question." The rubric JSON contains only a single set of score descriptions per question. The north star doc confirms: "Earlier prototypes included multiple variants (Full/Standard/Lite), but this was abandoned."

**Impact:** A reader of the framework doc expects variant functionality that the tool does not provide. The framework doc is the canonical reference — it should describe what is actually implemented.

**Recommendation:** Update the "Two Variants" section in TRUST-FRAMEWORK.md to note that variants were prototyped but the current implementation uses a single rubric. Remove or collapse the multi-variant score tables. Alternatively, mark the variant descriptions as "planned" or "future direction."

**Decision:** The multiple-variant versions have been deprecated. Align the docs with the reality.

---

#### P3-3: Background Text Length Variance

**Location:** `data/rubrics/trust-full.json` — `background` fields across all questions

Background text lengths vary significantly:

| Question | Approx. Words | Assessment |
|----------|--------------|------------|
| QG data_privacy | ~90 | Adequate |
| QG training_policy | ~80 | Adequate |
| QG ip_preservation | ~100 | Adequate |
| QG compliance | ~80 | Adequate |
| TR1 data_source_clarity | ~110 | Includes helpful cross-ref to TC2 |
| TR2 methodology_disclosure | ~130 | Includes N/A guidance |
| RE1 accuracy_and_hallucination | ~180 | Longest — includes test battery instructions |
| RE2 variance_consistency | ~100 | Adequate |
| US1 workflow_integration | ~80 | Adequate |
| US2 cognitive_guardrails | ~80 | Adequate |
| SE1 algorithmic_fairness | ~70 | Shortest scored question |
| SE2 data_handling | ~90 | Adequate |
| TC1 source_attribution_depth | ~70 | Shortest scored question |
| TC2 bibliometric_credibility | ~100 | Includes helpful cross-ref to TR1 |

RE1's background is notably longer because it includes a specific test battery protocol (5 distinct query types). While valuable, embedding the full test protocol in the background blurs the line between "why this matters" and "how to evaluate it." Per the north star doc's quality standards, background should answer (1) why this matters, (2) what to look for, and (3) when N/A applies — not provide a detailed evaluation methodology.

**Impact:** Minor. The RE1 background is comprehensive and useful. But the length asymmetry suggests the evaluation protocol should be documented separately (as the framework doc recommends — "How to evaluate" is a separate paragraph in TRUST-FRAMEWORK.md) rather than embedded in the rubric's background field.

**Recommendation:** Consider extracting the RE1 test battery into a separate "How to evaluate" guidance field or a linked reference document, keeping the background focused on rationale.

**Decision:** Good flag. Investigate thoroughly, and rewrite all background texts intelligently. for example make use of multiple subagents to brainstorm/review/judge proposed changes to the text. Ensure all background texts align have appropriate length and depth. It is not mandatory to have the same length, but large differences in verbosity for similar questions is a red flag. Because the background text is already hidden behind an accordion, it's no problem if it's a bit more verbose: that is preferred over a concise background that does not provide enough clarity.

---

#### P3-4: Inconsistent Cross-Reference Style in Backgrounds

**Location:** `data/rubrics/trust-full.json` → TR1 and TC2 backgrounds

TR1's background includes: "Note: this question evaluates macro-level data scope transparency... It is distinct from TC2 (Source quality indicators), which evaluates item-level metadata enrichment."

TC2's background includes: "Note: this question evaluates item-level metadata enrichment... It is distinct from TR1 (Data source clarity), which evaluates macro-level scope transparency."

These cross-references are valuable — they explicitly disambiguate two questions that could overlap. However:
1. No other question pairs have such cross-references, even where overlap exists (e.g., SE2 data_handling vs QG1 data_privacy, US2 critical_thinking vs RE1 accuracy).
2. The cross-references use question titles ("Source quality indicators") but reference question codes ("TC2") — this is good but inconsistent with the code, which uses key names ("bibliometric_credibility").

**Impact:** Minor. The existing cross-references are helpful. The absence of cross-references on other overlapping pairs is a missed opportunity, not a defect.

**Recommendation:** Add brief cross-references to the QG1/SE2 pair (data privacy gate vs data handling score) and potentially the RE1/US2 pair (accuracy vs critical thinking prompts), following the same pattern.

**Decision:** Good flag. Investigate thoroughly, and rewrite all background texts intelligently. for example make use of multiple subagents to brainstorm/review/judge proposed changes to the text.

---

#### P3-5: Score Description Length Inconsistency

**Location:** `data/rubrics/trust-full.json` — score level descriptions

Score descriptions vary from ~15 words to ~40 words. The longest descriptions (RE1 score 3, SE1 score 2, TR1 score 3) pack multiple distinct criteria into a single score level. The shortest (TR1 score 0, RE2 score 3) are single-criterion statements.

Best practice for rubric design (Brookhart, 2013; Reddy & Andrade, 2010) recommends that each score level describes a single, holistic performance profile. Multi-criteria descriptions at a single level (e.g., SE1 score 3 requiring *both* multilingual results *and* published reports) create ambiguity: does a tool that meets one criterion but not the other earn a 2 or a 3?

**Impact:** Minor. The current descriptions are generally clear. The multi-criteria issue is most pronounced in SE1 (see P2-3 for the specific numeric threshold issue).

**Recommendation:** When revising score descriptions, ensure each level describes a single coherent performance profile rather than an AND/OR checklist. Where multiple criteria are required, make the conjunction explicit and consider whether partial fulfillment maps to an adjacent score.

**Decision:** Good flag. Handle in the same way as the review of the background text snippets, but obviously with a different target goal. Use one or more subagents to tackle this, and make them start by reviewing rubric design best practices like the cited works or others.

---

## Recommendations Summary

| ID | Severity | Summary | Effort |
|----|----------|---------|--------|
| P1-1 | High | Reconcile QG3: align framework doc (Citation Mechanism) with rubric (IP Preservation) | Small (doc edit) |
| P1-2 | High | Align SE1 title between rubric and framework doc | Small (doc edit) |
| P2-1 | Medium | Document stale v1 key names with inline comments | Small (code comments) |
| P2-2 | Medium | Clarify RE1 score 1/2 boundary (factual vs. interpretive errors) | Small (rubric text) |
| P2-3 | Medium | Replace SE1 score 2 numeric threshold with qualitative observable | Small (rubric text) |
| P2-4 | Medium | Document `merged_gate` field semantics | Small (JSDoc + doc) |
| P3-1 | Low | Add N/A examples to quality gates | Small (rubric text) |
| P3-2 | Low | Update framework doc to reflect single-variant reality | Medium (doc restructure) |
| P3-3 | Low | Consider extracting RE1 test battery from background | Small (content restructure) |
| P3-4 | Low | Add cross-references to overlapping question pairs | Small (rubric text) |
| P3-5 | Low | Ensure score levels describe single coherent profiles | Small (rubric text, ongoing) |

---

## Methodology

1. Read all files in `data/rubrics/` (index.ts, trust-full.json) to understand data structure
2. Read `lib/rubric.ts` and `lib/types.ts` to understand consumption patterns and type contracts
3. Read `docs/TRUST-FRAMEWORK.md` (49KB canonical reference) for the authoritative framework criteria
4. Read `docs/TRUST-NORTH-STAR.md` for intended design direction
5. Read `docs/trust framework background/revised-framework.md` and `original-framework.md` for evolution history
6. Read `docs/CONTENT-IMPROVEMENT-NON-RUBRIC.md` for planned improvements
7. Read `components/QuestionSection.tsx` to understand how rubric data renders in the UI
8. Cross-referenced all 14 rubric questions against framework criteria for coverage gaps
9. Evaluated score boundary discrimination using rubric design best practices from educational assessment literature
10. Searched web for rubric design best practices (inter-rater reliability, boundary discrimination, exemplar anchors)
