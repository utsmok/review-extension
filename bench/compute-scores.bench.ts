import { bench, describe } from "vitest";
import { computeReportScores } from "@/lib/report/compute-scores";
import type { Evaluation, EvaluationScore } from "@/lib/types";
import { makeEvaluation, makeFinalization, RUBRIC } from "@/tests/fixtures";

const QG_IDS = ["privacy_and_security.training_policy", "accessibility.compliance"];

const SCORING_IDS = [
  "TR.data_source_clarity",
  "TR.methodology_disclosure",
  "RE.accuracy_and_hallucination",
  "RE.variance_consistency",
  "US.workflow_integration",
  "US.cognitive_guardrails",
  "SE.algorithmic_fairness",
  "SE.data_handling",
  "TC.source_attribution_depth",
  "TC.bibliometric_credibility",
];

function allPassEvals(): Evaluation[] {
  return [
    ...QG_IDS.map((id) => makeEvaluation({ rubricId: id, score: "pass" as EvaluationScore })),
    ...SCORING_IDS.map((id) => makeEvaluation({ rubricId: id, score: 3 as EvaluationScore })),
  ];
}

function mixedEvals(): Evaluation[] {
  return [
    ...QG_IDS.map((id, i) =>
      makeEvaluation({
        rubricId: id,
        score: (i % 2 === 0 ? "pass" : "fail") as EvaluationScore,
      }),
    ),
    ...SCORING_IDS.map((id, i) =>
      makeEvaluation({ rubricId: id, score: (i % 4) as EvaluationScore }),
    ),
  ];
}

const passEvals = allPassEvals();
const mixed = mixedEvals();
const finalization = makeFinalization({ grade: "pass" });

describe("computeReportScores", () => {
  bench("all pass, no finalization", () => {
    computeReportScores(passEvals, RUBRIC, null);
  });

  bench("mixed scores, no finalization", () => {
    computeReportScores(mixed, RUBRIC, null);
  });

  bench("all pass, with finalization", () => {
    computeReportScores(passEvals, RUBRIC, finalization);
  });

  bench("empty evaluations", () => {
    computeReportScores([], RUBRIC, null);
  });
});
