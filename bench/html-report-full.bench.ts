import { bench, describe } from "vitest";
import { buildHtmlReport, buildNutritionLabel } from "@/lib/html-report";
import type { Evaluation, EvaluationScore } from "@/lib/types";
import {
  makeCapture,
  makeEvaluation,
  makeFinalization,
  makeMetadata,
  RUBRIC,
} from "@/tests/fixtures";

// ── Fixtures ──────────────────────────────────────────────────────────

const ALL_QG_IDS = Object.entries(RUBRIC.quality_gate).flatMap(([cat, qs]) =>
  Object.keys(qs).map((qId) => `${cat}.${qId}`),
);

const ALL_SCORING_IDS = Object.entries(RUBRIC.scoring_rubric).flatMap(([cat, qs]) =>
  Object.keys(qs).map((qId) => `${cat}.${qId}`),
);

function fullyScoredEvals(): Evaluation[] {
  return [
    ...ALL_QG_IDS.map((id) => makeEvaluation({ rubricId: id, score: "pass" as EvaluationScore })),
    ...ALL_SCORING_IDS.map((id, i) =>
      makeEvaluation({ rubricId: id, score: (i % 4) as 0 | 1 | 2 | 3 as EvaluationScore }),
    ),
  ];
}

function partiallyScoredEvals(): Evaluation[] {
  return [
    makeEvaluation({ rubricId: ALL_QG_IDS[0], score: "pass" as EvaluationScore }),
    makeEvaluation({ rubricId: ALL_SCORING_IDS[0], score: 2 as EvaluationScore }),
  ];
}

const capturesSmall = Array.from({ length: 3 }, (_, i) =>
  makeCapture({ pageTitle: `Capture ${i}` }),
);

const capturesLarge = Array.from({ length: 20 }, (_, i) =>
  makeCapture({ pageTitle: `Capture ${i}` }),
);

const meta = makeMetadata({ toolName: "BenchTool" });
const fin = makeFinalization({ grade: "pass" });
const fullEvals = fullyScoredEvals();
const partialEvals = partiallyScoredEvals();

// ── Benchmarks ────────────────────────────────────────────────────────

describe("buildHtmlReport", () => {
  bench("fully scored, 3 captures", async () => {
    await buildHtmlReport(meta, capturesSmall, fullEvals, RUBRIC, fin);
  });

  bench("fully scored, 20 captures", async () => {
    await buildHtmlReport(meta, capturesLarge, fullEvals, RUBRIC, fin);
  });

  bench("partially scored, no captures", async () => {
    await buildHtmlReport(meta, [], partialEvals, RUBRIC, null);
  });

  bench("unscored session", async () => {
    await buildHtmlReport(meta, [], [], RUBRIC, null);
  });
});

describe("buildNutritionLabel", () => {
  bench("fully scored", async () => {
    await buildNutritionLabel(meta, fullEvals, RUBRIC, fin);
  });

  bench("unscored", async () => {
    await buildNutritionLabel(meta, [], RUBRIC, null);
  });
});
