# Autoresearch Iteration Report

## Summary

Two iterations of automated rubric improvement ran against \(	ext{data/rubrics/trust-full.json}) (14 questions: 4 quality gates + 10 scored).

| Metric | Baseline | After Iter 2 | Δ |
|--------|----------|-------------|---|
| Total flags | 17 | 7 | −10 (−59%) |
| Questions with 0 flags | 0/10 | 4/10 | +4 |
| Questions with N/A conditions | 2/10 | 10/10 | +8 |
| Balanced score levels | 9/10 | 10/10 | +1 |

## What Changed

### Iteration 1 (5 proposals, all accepted)
- **TC.bibliometric_credibility** level 2: 8w → 18w (balanced with other levels, behavioral)
- **TC.bibliometric_credibility** background: added N/A conditions
- **RE.variance_consistency** level 2: abstract “stable claims” → observable “conclusions and primary sources match”
- **RE.variance_consistency** background: added N/A conditions
- **US.cognitive_guardrails** background: added N/A conditions

### Iteration 2 (19 proposals, 18 accepted, 1 rejected)
- Added N/A conditions to 7 questions: TR.data_source_clarity, TR.methodology_disclosure, RE.accuracy_and_hallucination, US.workflow_integration, SE.data_handling, SE.algorithmic_fairness, TC.source_attribution_depth
- Improved behavioral grounding for RE.variance_consistency (all 4 levels rewritten), TR.methodology_disclosure (3/4 levels rewritten), SE.algorithmic_fairness (4 levels rewritten)
- **Rejected**: TR.methodology_disclosure L0 rewrite — lost behavioral indicator “provides”

### Remaining Flags (7)

| Question | Flags | Notes |
|----------|-------|-------|
| TC.bibliometric_credibility | bg-long (168w) | Grew from N/A addition; content is good |
| TR.methodology_disclosure | bg-long (156w) | Grew from N/A addition |
| RE.accuracy_and_hallucination | bg-long (176w) | Grew from N/A addition |
| RE.variance_consistency | bg-long (158w), mod-behav | Heuristic gap — “produces/yields/returns” are behavioral but not in indicator list |
| US.cognitive_guardrails | mod-behav | 75% behavioral (3/4 levels) |
| SE.algorithmic_fairness | mod-behav | 75% behavioral (3/4 levels) |

All remaining flags are marginal: bg-long (150-200w range) is from valuable N/A additions, and mod-behav (75%) reflects a heuristic that misses words like “produces”, “yields”, “returns”, “cites”.

## LLM Measurements

- **Boundary discrimination**: 100% consistency across all tested questions (3 runs × 5 synthetic profiles per question). Score boundaries are well-discriminated.
- **Behavioral grounding (LLM-as-judge)**: All questions except RE.variance_consistency L2 pass the LLM grounding test. The heuristic is more aggressive than the LLM judge.

## Verification

- ✓ Typecheck passes (tools/ excluded from project)
- ✓ Lint passes (tools/ excluded from biome)
- ✓ All 575 tests pass (snapshots updated)
- ✓ Rubric JSON structurally valid (all fields, titles, ai_only flags, examples preserved)
