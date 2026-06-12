// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { buildBusinessCardLabel } from "@/lib/html-report";
import type { Evaluation } from "@/lib/types";
import { makeEvaluation, makeFinalization, makeMetadata, RUBRIC } from "@/tests/fixtures";

vi.mock("@/lib/logos", () => ({
  TRUST_LOGO: "data:image/svg+xml,trust",
  LISA_EIS_LOGO: "data:image/svg+xml,lisa",
  UT_LOGO: "data:image/svg+xml,ut",
}));

/** Helper: build evaluations that pass all quality gates and score high on every scoring question. */
function allHighScoringEvaluations(): Evaluation[] {
  const qgIds = [
    "privacy_and_security.data_privacy",
    "privacy_and_security.training_policy",
    "intellectual_property.ip_preservation",
    "accessibility.compliance",
  ];
  const scoringIds = [
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
  const evals = qgIds.map((id) => makeEvaluation({ rubricId: id, score: "pass" }));
  for (const id of scoringIds) {
    evals.push(makeEvaluation({ rubricId: id, score: 3 }));
  }
  return evals;
}

/** Helper: build evaluations that fail a quality gate. */
function failQGEvaluations(): Evaluation[] {
  return [
    makeEvaluation({ rubricId: "privacy_and_security.data_privacy", score: "fail" }),
    makeEvaluation({ rubricId: "privacy_and_security.training_policy", score: "pass" }),
    makeEvaluation({ rubricId: "intellectual_property.ip_preservation", score: "pass" }),
    makeEvaluation({ rubricId: "accessibility.compliance", score: "pass" }),
  ];
}

describe("buildBusinessCardLabel", () => {
  it("returns a non-empty HTML string", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toBeTruthy();
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("contains tool name in output", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata({ toolName: "ChatGPT" }),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain("ChatGPT");
    expect(html).toContain('class="bc-tool-name"');
  });

  it("contains the verdict stamp", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-verdict-stamp"');
    expect(html).toContain("RECOMMENDED");
  });

  it("contains principle codes (TR, RE, US, SE, TC)", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    for (const code of ["TR", "RE", "US", "SE", "TC"]) {
      expect(html).toContain(`class="bc-pcode">${code}`);
    }
  });

  it("contains score fraction", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-score"');
    expect(html).toMatch(/\d+\/\d+/);
  });

  it("shows quality gate failures when gates fail", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      failQGEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain("bc-gate-fail");
    expect(html).toContain("FAIL");
  });

  it("hides quality gate section when all gates pass", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).not.toContain("bc-gate-fail");
    expect(html).not.toContain("bc-gates");
  });

  it("contains TRUST Framework v1.1 in footer", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain("TRUST Framework v1.1");
  });

  it("contains bc-card CSS class", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-card"');
  });

  it("with finalization grade 'fail' → verdict is NOT RECOMMENDED", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({ grade: "fail" }),
    );
    expect(html).toContain("NOT RECOMMENDED");
  });

  it("with no evaluations → verdict is NOT EVALUATED", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      [],
      RUBRIC,
      null,
    );
    expect(html).toContain("NOT EVALUATED");
  });

  it("does not contain strengths or weaknesses", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({
        grade: "pass",
        strengths: ["Great tool"],
        weaknesses: ["Expensive"],
      }),
    );
    expect(html).not.toContain("Great tool");
    expect(html).not.toContain("Expensive");
    expect(html).not.toContain("Strengths");
    expect(html).not.toContain("Weaknesses");
  });
});
