# 03 — Rubric Content Review: Questions, Examples, Scoring Levels

**Reviewer**: 46-ReviewQuestionContent  
**Date**: 2024-05-24  
**Scope**: `data/rubrics/trust-full.json` (v1.1), `lib/rubric.ts`, `lib/principles.ts`, `components/Metadata.tsx`  
**Baseline**: `v0.3.0` tag → HEAD (16 commits)

---

## Summary

The TRUST rubric v1.1 is a well-structured evaluation instrument with strong background text, realistic examples, and a clear progression pattern across scoring levels. The v1.0→v1.1 upgrade adds two new quality gates (data privacy, intellectual property), renames SE1 to better reflect its scope, enriches background text with N/A guidance and cross-references, and introduces the `merged_gate` mechanism.

The rubric is ready for use with minor content gaps. The main issues are: (1) TC1 `source_attribution_depth` retains `merged_gate: true` without a corresponding `related_gate`, creating a semantic mismatch; (2) scoring questions lack N/A usage guidance despite the system supporting `na` scores; (3) several scoring questions have inconsistent description verbosity. No blocking issues were found.

---

## Findings

### F1 — TC1 `merged_gate` flag orphaned after `related_gate` removal
**Severity**: P2  
**Location**: `data/rubrics/trust-full.json` → `scoring_rubric.TC.source_attribution_depth`  
**Confidence**: 0.90

In v1.0, TC1 had `related_gate: "traceability.citation_mechanism"` (referencing a non-existent QG category) and `merged_gate: true`. The v1.1 diff correctly removed the stale `related_gate` but retained `merged_gate: true`. Now TC1 appears as a "Merged Gates" badge in the QG section without linking to any parent QG — unlike SE2 which has both `merged_gate: true` and a valid `related_gate: "privacy_and_security.data_privacy"`.

The `merged_gate` mechanism is designed for scoring questions that double as pass/fail gates. TC1 semantically works as a gate (score > 0 = pass), but without a `related_gate`, the "Merged Gates" section header is misleading — there is no gate being "merged."

**Recommendation**: Either remove `merged_gate: true` from TC1 (making it a pure scoring question), or document the intent with a comment. If the intention is for TC1 to serve as an implicit gate (any attribution = pass), that is valid but should be noted in the rubric design docs.

---

### F2 — No N/A usage guidance for scoring rubric questions
**Severity**: P2  
**Location**: `data/rubrics/trust-full.json` → all 10 scoring rubric questions  
**Confidence**: 0.85

All QG questions that are not `ai_only` include explicit N/A guidance in their background text (e.g., "N/A is applicable only if evaluating a purely local, offline-installed tool..."). In contrast, none of the 10 scoring rubric questions document when N/A is appropriate, even though the scoring system supports `na` as a valid score and the UI renders it.

For some questions, N/A may be genuinely inapplicable (e.g., US1 — all tools have some level of export capability). For others, edge cases exist: TC1 `source_attribution_depth` could be N/A for a tool that does not produce cited output; TC2 `bibliometric_credibility` could be N/A for a tool that returns no individual sources.

**Recommendation**: Add N/A guidance to scoring questions where applicable, or add a single statement to the rubric header noting that "na" should only be used when the question fundamentally does not apply to the tool's design (not as a substitute for scoring 0).

---

### F3 — Inconsistent scoring description verbosity across questions
**Severity**: P3  
**Location**: `data/rubrics/trust-full.json` → `scoring_rubric.US.workflow_integration`, `scoring_rubric.TC.source_attribution_depth`  
**Confidence**: 0.95

Level description lengths vary dramatically:

| Question | Level 0 | Level 1 | Level 2 | Level 3 |
|---|---|---|---|---|
| US1 (Workflow) | 18 chars | 23 chars | 34 chars | 67 chars |
| TC1 (Attribution) | 24 chars | 36 chars | 30 chars | 58 chars |
| RE1 (Accuracy) | 144 chars | 158 chars | 156 chars | 145 chars |
| SE1 (Equity) | 171 chars | 120 chars | 176 chars | 137 chars |

US1 level 0 is "Siloed, no export." — a fragment. RE1 level 0 is a full sentence with specific criteria. Both are functional but the inconsistency means reviewers get different levels of guidance depending on which question they are evaluating. The terse descriptions (US1, TC1) read like shorthand notes rather than evaluative criteria.

**Recommendation**: Expand US1 and TC1 level descriptions to match the sentence-length pattern used by other questions. E.g., US1 level 0: "Siloed — no export or download mechanism exists; the only way to preserve results is manual copy-paste."

---

### F4 — TC2 levels 0 and 1 have overlapping boundary
**Severity**: P3  
**Location**: `data/rubrics/trust-full.json` → `scoring_rubric.TC.bibliometric_credibility`  
**Confidence**: 0.80

- Level 0: "Includes retracted or predatory sources without any warning or flag."
- Level 1: "No filtering or labeling of source quality — all sources appear equivalent."

A tool that includes retracted sources without warning satisfies BOTH criteria — it has no filtering (level 1) AND includes bad sources (level 0). The distinction depends on whether retracted/predatory sources happen to be present in results, not on the tool's behavior. A reviewer testing with different queries could score the same tool differently.

The examples clarify the distinction (level 0 example shows specific retracted paper present; level 1 shows uniform formatting), but the level descriptions themselves do not make the boundary sharp.

**Recommendation**: Reframe level 0 to emphasize active harm: "Surfaces retracted or predatory sources as authoritative without any warning — testing reveals specific retracted papers or known predatory publishers in results." Level 1: "No quality differentiation — all sources display identically regardless of publication type, peer-review status, or credibility. Testing did not surface retracted or predatory sources specifically, but no safeguards are visible."

---

### F5 — Discipline option names missing commas
**Severity**: P3  
**Location**: `components/Metadata.tsx` → `DISCIPLINE_OPTIONS` (lines 32–67)  
**Confidence**: 0.90

Four discipline options appear to be based on the Scopus subject area classification but are missing the commas that Scopus uses:

| Current | Scopus standard |
|---|---|
| "Biochemistry Genetics and Molecular Biology" | "Biochemistry, Genetics and Molecular Biology" |
| "Business Management and Accounting" | "Business, Management and Accounting" |
| "Economics Econometrics and Finance" | "Economics, Econometrics and Finance" |
| "Pharmacology Toxicology and Pharmaceutics" | "Pharmacology, Toxicology and Pharmaceutics" |

Additionally, the list includes granular humanities categories (History, Philosophy, Performing Arts, etc.) but omits "Social Sciences" as a broad category. The additions of "Education and Educational Research", "Law, Policy, and Criminology" etc. are reasonable discipline-specific additions.

**Recommendation**: Add missing commas to the four compound names for consistency with Scopus naming conventions. Consider adding "Social Sciences" if the list aims to be comprehensive.

---

### F6 — QG examples lack N/A examples despite type support
**Severity**: P3  
**Location**: `data/rubrics/trust-full.json` → all QG questions  
**Confidence**: 0.85

The `PassFailQuestion` TypeScript type supports `examples.na?: string`, and the QG questions for `data_privacy` and `ip_preservation` both include N/A guidance in their background text. However, none of the 4 QG questions include an `examples.na` entry. Adding concrete N/A examples would help reviewers understand when N/A is appropriate vs when they should score fail.

**Recommendation**: Add N/A examples to `data_privacy` (e.g., local-only tool) and `ip_preservation` (e.g., read-only database with no uploads). The `accessibility` gate could have N/A for API-only tools. The `training_policy` gate (ai_only) does not need an N/A example since it is hidden for non-AI tools.

---

### F7 — SE1 question key does not match renamed title
**Severity**: P3 (info)  
**Location**: `data/rubrics/trust-full.json` → `scoring_rubric.SE.algorithmic_fairness`  
**Confidence**: 0.95

The v1.1 diff renamed the SE1 title from "Algorithmic fairness" to "Bibliographic equity & diversity" but retained the key `algorithmic_fairness`. This key appears in stored evaluations as `SE.algorithmic_fairness`, in code references, and in the eval map. While renaming keys would be a migration concern, the mismatch between key and title may confuse developers reading code.

**Recommendation**: Document the key-to-title mapping in the rubric design docs. A key rename is low priority but should be planned for a future version bump.

---

## Content Quality Scores by Section

| Section | Code | Score | Notes |
|---|---|---|---|
| Quality Gates | QG | **4.5/5** | Strong requirements, good N/A guidance in backgrounds, concrete examples. Missing N/A examples (F6). New IP gate is well-scoped. |
| Transparency | TR | **4.5/5** | Clear progression, excellent background cross-reference to TC2. Levels well-differentiated. |
| Reliability | RE | **4.0/5** | Strong accuracy question with specific test methodology in background. Consistency question cleverly covers both AI and deterministic tools. RE1 background is long but justified. |
| Usability | US | **3.5/5** | Weakest section. Level descriptions are too terse (F3). Workflow integration is well-conceived but underspecified at each level. Cognitive guardrails are strong. |
| Soundness | SE | **4.5/5** | Renamed title is more precise. Equity question has excellent geographic/linguistic framing. Data handling overlaps QG by design with clear `related_gate` link. |
| Traceability | TC | **4.0/5** | Attribution depth is well-structured but terse (F3) and has orphaned `merged_gate` (F1). Quality indicators has a level boundary overlap (F4). Background cross-reference to TR1 is helpful. |

**Overall**: **4.2/5** — A mature, well-designed rubric. Content quality is high across all sections with the main gap being N/A documentation for scoring questions and verbosity consistency.

---

## Positive Observations

1. **Background cross-referencing**: TR1 explicitly distinguishes itself from TC2 ("It is distinct from TC2..."), and TC2 reciprocates. This prevents reviewer confusion about scope overlap.

2. **Structured test methodology in RE1**: The background text specifies 5 distinct test query types (broad, niche, recent, negative, synthesis). This is unusually helpful for a rubric and promotes consistent evaluation.

3. **Dual-audience RE2 background**: The `variance_consistency` background addresses both AI tools (where variance is stochastic) and deterministic tools (where variance indicates bugs), with clear scoring guidance for each. The `ai_only: false` flag is correct here.

4. **New IP gate is well-scoped**: The `ip_preservation` gate targets a specific, measurable requirement (ToS license grant language) with realistic N/A conditions. The pass/fail examples clearly demonstrate what to look for.

5. **Merged gate mechanism**: The `merged_gate` + `related_gate` pattern (as implemented in SE2) is an elegant way to surface scoring questions as QG badges while maintaining their role in the scoring rubric. This avoids duplicating questions across sections.

6. **Consistent ai_only assignment**: All 4 AI-only questions (QG `training_policy`, TR2 `methodology_disclosure`, RE1 `accuracy_and_hallucination`, US2 `cognitive_guardrails`) are correctly scoped — they evaluate AI-specific behaviors that do not apply to deterministic tools. RE2 correctly is NOT ai_only despite having AI-relevant language.

7. **Auth method options are comprehensive**: The 8 authentication methods cover the major academic access patterns (SSO, IP, OpenAthens, EZproxy, LibKey, email, API key, none).
