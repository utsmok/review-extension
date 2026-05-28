import { bench, describe } from "vitest";
import { minifyCss } from "@/lib/minify";
import { REPORT_CSS } from "@/lib/html-report";
import { distributionBar, principleAverage, qualityGateResults, scoreColor } from "@/lib/rubric";
import type { Evaluation, EvaluationScore } from "@/lib/types";
import { makeEvaluation, RUBRIC } from "@/tests/fixtures";

// ── Fixtures ──────────────────────────────────────────────────────────

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

function buildReportEvaluations(): Evaluation[] {
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

const evals = buildReportEvaluations();

const DISTRIBUTION_SCORES = [0, 1, 2, 3, 2, 1, 0, 3, 2, 1];
const ALL_MAX_SCORES = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const ALL_MIN_SCORES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

// ── Benchmarks ────────────────────────────────────────────────────────

describe("minifyCss on REPORT_CSS", () => {
  bench("production CSS (16KB+)", () => {
    minifyCss(REPORT_CSS);
  });
});

describe("scoreColor", () => {
  bench("numeric scores 0–3", () => {
    scoreColor(0);
    scoreColor(1);
    scoreColor(2);
    scoreColor(3);
  });

  bench("special values", () => {
    scoreColor("na");
    scoreColor("unsure");
    scoreColor(undefined);
  });
});

describe("distributionBar", () => {
  bench("mixed scores", () => {
    distributionBar(DISTRIBUTION_SCORES);
  });

  bench("all max scores", () => {
    distributionBar(ALL_MAX_SCORES);
  });

  bench("all min scores", () => {
    distributionBar(ALL_MIN_SCORES);
  });

  bench("empty scores", () => {
    distributionBar([]);
  });
});

describe("qualityGateResults", () => {
  bench("full evaluations against rubric", () => {
    qualityGateResults(evals, RUBRIC);
  });
});

describe("principleAverage", () => {
  bench("single category (TR)", () => {
    principleAverage("TR", evals, RUBRIC);
  });

  bench("all five categories", () => {
    for (const catId of ["TR", "RE", "US", "SE", "TC"]) {
      principleAverage(catId, evals, RUBRIC);
    }
  });
});
