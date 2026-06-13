import { bench, describe } from "vitest";
import {
  computeCompletion,
  getCategoryScores,
  getLinkedRubricIdsForCapture,
  getRubricQuestionIds,
  principleAverage,
  qualityGateResults,
  scoreColor,
} from "@/lib/rubric";
import type { Evaluation, EvaluationScore } from "@/lib/types";
import { makeEvaluation, RUBRIC } from "@/tests/fixtures";

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

function buildFullEvaluations(): Evaluation[] {
  return [
    ...QG_IDS.map((id) => makeEvaluation({ rubricId: id, score: "pass" as EvaluationScore })),
    ...SCORING_IDS.map((id, i) =>
      makeEvaluation({
        rubricId: id,
        score: (i % 4) as EvaluationScore,
        explicitEvidenceIds: [`capture-${i % 3}`],
      }),
    ),
  ];
}

const fullEvaluations = buildFullEvaluations();

describe("getRubricQuestionIds", () => {
  bench("extract all question IDs", () => {
    getRubricQuestionIds(RUBRIC);
  });
});

describe("qualityGateResults", () => {
  bench("evaluate quality gates", () => {
    qualityGateResults(fullEvaluations, RUBRIC);
  });
});

describe("getCategoryScores", () => {
  bench("single category (TR)", () => {
    getCategoryScores("TR", fullEvaluations, RUBRIC);
  });

  bench("all categories", () => {
    for (const catId of ["TR", "RE", "US", "SE", "TC"]) {
      getCategoryScores(catId, fullEvaluations, RUBRIC);
    }
  });
});

describe("principleAverage", () => {
  bench("single category", () => {
    principleAverage("TR", fullEvaluations, RUBRIC);
  });

  bench("all categories", () => {
    for (const catId of ["TR", "RE", "US", "SE", "TC"]) {
      principleAverage(catId, fullEvaluations, RUBRIC);
    }
  });
});

describe("computeCompletion", () => {
  bench("full evaluations", () => {
    computeCompletion(fullEvaluations, RUBRIC);
  });
});

describe("scoreColor", () => {
  bench("all score values", () => {
    scoreColor(0);
    scoreColor(1);
    scoreColor(2);
    scoreColor(3);
    scoreColor("na");
    scoreColor("unsure");
    scoreColor(undefined);
  });
});

describe("getLinkedRubricIdsForCapture", () => {
  bench("find linked rubric IDs", () => {
    getLinkedRubricIdsForCapture("capture-0", fullEvaluations);
  });
});
