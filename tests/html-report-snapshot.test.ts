import { describe, expect, it } from "vitest";
import { buildHtmlReport, buildNutritionLabel } from "@/lib/html-report";
import {
  makeCapture,
  makeEvaluation,
  makeFinalization,
  makeMetadata,
  RUBRIC,
} from "@/tests/fixtures";

/**
 * Build evaluations for every quality-gate question, all scoring "pass".
 */
function allQualityGatePassEvaluations() {
  const evaluations = [];
  for (const [catKey, catQuestions] of Object.entries(RUBRIC.quality_gate)) {
    for (const qKey of Object.keys(catQuestions)) {
      evaluations.push(makeEvaluation({ rubricId: `${catKey}.${qKey}`, score: "pass" }));
    }
  }
  return evaluations;
}

/**
 * Build evaluations for every scoring question, all scoring 3.
 */
function allScoringMaxEvaluations() {
  const evaluations = [];
  for (const [catKey, catQuestions] of Object.entries(RUBRIC.scoring_rubric)) {
    for (const qKey of Object.keys(catQuestions)) {
      evaluations.push(makeEvaluation({ rubricId: `${catKey}.${qKey}`, score: 3 }));
    }
  }
  return evaluations;
}

describe("HTML report snapshot", () => {
  it("matches snapshot for fully-scored session", async () => {
    const metadata = makeMetadata({ toolName: "SnapshotTestTool" });
    const captures = [makeCapture({ pageTitle: "Page 1" }), makeCapture({ pageTitle: "Page 2" })];

    const evaluations = [...allQualityGatePassEvaluations(), ...allScoringMaxEvaluations()];

    const finalization = makeFinalization({ grade: "pass" });

    const html = await buildHtmlReport(metadata, captures, evaluations, RUBRIC, finalization);
    expect(html).toMatchSnapshot();

    const label = await buildNutritionLabel(metadata, evaluations, RUBRIC, finalization);
    expect(label).toMatchSnapshot();
  });

  it("matches snapshot for partially-scored session", async () => {
    const metadata = makeMetadata({ toolName: "PartialTool", usesAi: false });
    const captures = [makeCapture()];
    // Only score a few questions
    const evaluations = [
      makeEvaluation({ rubricId: "privacy_and_security.data_privacy", score: "pass" }),
      makeEvaluation({ rubricId: "TR.data_source_clarity", score: 2 }),
    ];

    const html = await buildHtmlReport(metadata, captures, evaluations, RUBRIC, null);
    expect(html).toMatchSnapshot();
  });
});
