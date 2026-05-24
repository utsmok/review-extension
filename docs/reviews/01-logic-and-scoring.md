# Logic & Scoring Review

**Reviewer**: 44-ReviewLogic  
**Scope**: v0.3.0..HEAD — rubric data model, scoring computation, completion tracking, verdict logic, data integrity  
**Date**: 2026-05-24

## Summary

The rubric v1.1 data model and scoring helpers are well-structured with comprehensive test coverage. One P1 bug in `getAiOnlyRubricIds()` breaks the usesAi toggle flow — the confirmation dialog never triggers and AI-only scores are never cleared when toggling off. The `computeCompletion` numerator counts all evaluations instead of filtering to visible questions, which can produce percentages >100% in edge cases.

## Findings

### P1 · `getAiOnlyRubricIds()` returns partial IDs — confirmation dialog and score clearing are both broken

**File**: `components/Metadata.tsx:115–127`  
**Severity**: P1  
**Confidence**: 0.97

`getAiOnlyRubricIds()` pushes bare question keys (e.g., `"training_policy"`, `"methodology_disclosure"`) into the returned array. But evaluations store the full dot-separated rubricId format (`"privacy_and_security.training_policy"`, `"TR.methodology_disclosure"`).

**Consequence**: When a user toggles `usesAi` from true → false:

1. `hasScoredAiOnlyQuestions()` calls `aiIds.has(e.rubricId)` where the Set contains partial IDs — **never matches**. The function always returns `false`.
2. The confirmation dialog that warns about losing AI-only scores **never appears**.
3. The toggle happens immediately with stale AI-only evaluations still in state.
4. If `clearAiOnlyScores()` IS somehow reached, `evaluations.find((e) => e.rubricId === id)` also never matches, and `setEvaluation(id, ...)` would create orphan entries with wrong rubricIds.

Verified by running the rubric JSON through a Node script — all four ai_only questions produce mismatched IDs:

| Full rubricId (stored in evaluations) | getAiOnlyRubricIds returns |
|---|---|
| `privacy_and_security.training_policy` | `training_policy` |
| `TR.methodology_disclosure` | `methodology_disclosure` |
| `RE.accuracy_and_hallucination` | `accuracy_and_hallucination` |
| `US.cognitive_guardrails` | `cognitive_guardrails` |

**Recommendation**: Iterate `Object.entries` at the category level and push `${cat}.${id}`:

```typescript
const getAiOnlyRubricIds = (): string[] => {
  const ids: string[] = [];
  if (!rubric) return ids;
  for (const [cat, section] of Object.entries(rubric.quality_gate)) {
    for (const [id, question] of Object.entries(section)) {
      if (question.ai_only) ids.push(`${cat}.${id}`);
    }
  }
  for (const [cat, section] of Object.entries(rubric.scoring_rubric)) {
    for (const [id, question] of Object.entries(section)) {
      if (question.ai_only) ids.push(`${cat}.${id}`);
    }
  }
  return ids;
};
```

---

### P2 · `computeCompletion()` numerator counts evaluations for hidden questions, can exceed 100%

**File**: `lib/rubric.ts:84–88`  
**Severity**: P2  
**Confidence**: 0.85

```typescript
export function computeCompletion(evaluations: Evaluation[], rubric: RubricData, usesAi: boolean = true): number {
  const totalQuestions = getVisibleRubricQuestionIds(rubric, usesAi).length;
  let scored = 0;
  for (const e of evaluations) if (e.score !== "" && e.score !== undefined) scored++;
  return totalQuestions > 0 ? Math.round((scored / totalQuestions) * 100) : 0;
}
```

The denominator uses `getVisibleRubricQuestionIds` (excludes ai_only when `usesAi=false`), but the numerator counts **all** evaluations with non-empty scores, including those for hidden ai_only questions. Combined with the P1 bug above (ai_only scores never cleared), the numerator can exceed the denominator.

The same pattern appears in `Evaluation.tsx:25`:
```typescript
const scored = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;
```

**Impact**: Completion can show >100% for non-AI sessions with stale AI-only evaluations. The `=== 100` guard in `ActiveSession.tsx:65` prevents premature finalization, but the displayed progress is wrong.

**Recommendation**: Filter scored count to visible question IDs:

```typescript
export function computeCompletion(evaluations: Evaluation[], rubric: RubricData, usesAi: boolean = true): number {
  const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, usesAi));
  const totalQuestions = visibleIds.size;
  let scored = 0;
  for (const e of evaluations) {
    if (visibleIds.has(e.rubricId) && e.score !== "" && e.score !== undefined) scored++;
  }
  return totalQuestions > 0 ? Math.round((scored / totalQuestions) * 100) : 0;
}
```

---

### P2 · `computeReportScores` ignores `usesAi` — `isComplete`/gate counts wrong for non-AI tools

**File**: `lib/report/compute-scores.ts:38–95`  
**Severity**: P2  
**Confidence**: 0.80

`computeReportScores` does not receive a `usesAi` parameter. It always processes all 4 quality gates and all 10 scoring questions via `qualityGateResults()` and `getCategoryScores()`, regardless of whether the tool uses AI.

For a non-AI session:
- `totalQuestions` = 14 (should be 10)
- `isComplete` = false even when all 10 visible questions are answered
- Gate results include AI-only gates that shouldn't apply
- The "X/Y questions answered" display in the HTML report is wrong

The verdict is unaffected because `finalization.grade` overrides, but the report's informational fields are incorrect.

**Recommendation**: Thread `usesAi` through to `computeReportScores` and skip ai_only questions in gate/score iteration.

---

### P2 · Migration does not remap rubricId references from v1.0 question structure

**File**: `lib/session-repository.ts:162–178`  
**Severity**: P2  
**Confidence**: 0.70

`migrateSessionData` handles `finalization` (v1→v2) and `discipline` string→array (v2→v3) but does not remap old question IDs. The rubric was restructured in v1.1:

- Category `traceability` → questions moved to `TC` and `intellectual_property`
- Old IDs like `traceability.citation_mechanism` no longer exist in the rubric

Old evaluations with stale rubricIds become orphans — the evalMap lookup returns `undefined`, treating them as unanswered. No runtime error, but an in-progress review loaded after upgrade would lose all progress silently.

**Recommendation**: Add a v3→v4 migration step that remaps known old rubricIds to their v1.1 equivalents, or at minimum strip orphaned evaluations.

---

### P3 · Unnecessary `as` casts in `getVisibleRubricQuestionIds`

**File**: `lib/rubric.ts:22,29`  
**Severity**: P3  
**Confidence**: 0.90

```typescript
if (usesAi || !(question as { ai_only?: boolean }).ai_only) {
```

Both `PassFailQuestion` and `ScoringQuestion` already define `ai_only?: boolean`. The `as { ai_only?: boolean }` cast is redundant and could mask type errors if the interface definitions diverge. TypeScript correctly narrows the union type through `Object.entries`.

**Recommendation**: Remove the cast:
```typescript
if (usesAi || !question.ai_only) {
```

---

### INFO · `TC.source_attribution_depth` has `merged_gate: true` but no `related_gate`

**File**: `data/rubrics/trust-full.json` (TC section)  
**Severity**: INFO  
**Confidence**: 0.75

The diff removes `related_gate: "traceability.citation_mechanism"` from this question (the old category key no longer exists). The question retains `merged_gate: true` but has no cross-reference. `SE.data_handling` correctly has both `merged_gate: true` and `related_gate: "privacy_and_security.data_privacy"`.

Without a `related_gate`, the "Builds on quality gate" cross-reference in `QuestionSection.tsx:367` won't render for this question. May be intentional if no quality gate is applicable, but worth confirming.

---

### INFO · `qualityGateResults` uses variable shadowing (`result`)

**File**: `lib/rubric.ts:107–121`  
**Severity**: INFO  
**Confidence**: 0.95

Inside the loop body, a local `const result` shadows the outer `const results` array. Functionally correct (the local is pushed to the outer array), but confusing to read.

## Positive Observations

1. **Strong test coverage** — 427 lines of rubric/scoring tests covering edge cases like all-na averages, mixed scores, empty evaluations, and unknown categories.
2. **Correct na/unsure exclusion in `principleAverage`** — only numeric scores contribute to the sum/count, preventing dilution from non-numeric answers.
3. **Clean verdict priority chain** — finalization > no-eval > incomplete > computed is the correct precedence order. Human judgment correctly overrides algorithmic verdict.
4. **EvalMap threading** — passing optional `evalMap` avoids redundant Map construction across chained scoring calls. Good performance pattern.
5. **Defensive defaults throughout** — `?? "control"`, `?? categoryId`, `count > 0` guards prevent crashes on unexpected input.
6. **`countUnsure` is a focused, well-tested utility** — simple iteration with early return for unknown categories.
