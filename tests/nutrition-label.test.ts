// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { buildNutritionLabel } from "@/lib/html-report";
import { RUBRIC, makeMetadata, makeEvaluation, makeFinalization } from "@/tests/fixtures";
import type { Evaluation } from "@/lib/types";

vi.mock("@/lib/logos", () => ({
  TRUST_LOGO: "data:image/svg+xml,trust",
  LISA_EIS_LOGO: "data:image/svg+xml,lisa",
  UT_LOGO: "data:image/svg+xml,ut",
}));

/** Helper: build evaluations that pass all quality gates. */
function allPassQGEvaluations(): Evaluation[] {
  return [
    makeEvaluation({ rubricId: "privacy_and_security.training_policy", score: "pass" }),
    makeEvaluation({ rubricId: "accessibility.compliance", score: "pass" }),
  ];
}

/** Helper: build evaluations that pass all quality gates AND score high on every scoring question. */
function allHighScoringEvaluations(): Evaluation[] {
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
  return [
    ...allPassQGEvaluations(),
    ...scoringIds.map((id) => makeEvaluation({ rubricId: id, score: 3 })),
  ];
}

/** Helper: build evaluations that fail a quality gate. */
function failQGEvaluations(): Evaluation[] {
  return [
    makeEvaluation({ rubricId: "privacy_and_security.training_policy", score: "pass" }),
    makeEvaluation({ rubricId: "accessibility.compliance", score: "fail" }),
  ];
}

describe("buildNutritionLabel", () => {
  it("returns a non-empty HTML string", async () => {
    const html = await buildNutritionLabel(makeMetadata(), [], RUBRIC);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });

  it("contains tool name (escaped) in output", async () => {
    const toolName = "Test & Search <Tool>";
    const html = await buildNutritionLabel(makeMetadata({ toolName }), [], RUBRIC);
    expect(html).toContain("Test &amp; Search &lt;Tool&gt;");
  });

  it("contains tool URL", async () => {
    const html = await buildNutritionLabel(makeMetadata(), [], RUBRIC);
    expect(html).toContain("https://testsearch.example.com");
  });

  it("contains the verdict inside the stamp element", async () => {
    const html = await buildNutritionLabel(makeMetadata(), [], RUBRIC);
    // With no evaluations → NOT EVALUATED inside the stamp
    expect(html).toMatch(/nutrition-verdict-stamp[^>]*>[\s\S]*NOT EVALUATED/);
  });

  it("with partial evaluations and no finalization → verdict is INCOMPLETE", async () => {
    const partialEvals = [
      makeEvaluation({ rubricId: "privacy_and_security.training_policy", score: "pass" }),
    ];
    const html = await buildNutritionLabel(makeMetadata(), partialEvals, RUBRIC);
    expect(html).toContain("INCOMPLETE");
  });

  it("with all-pass QG and high scoring, no finalization → verdict is RECOMMENDED", async () => {
    const html = await buildNutritionLabel(makeMetadata(), allHighScoringEvaluations(), RUBRIC);
    expect(html).toContain("RECOMMENDED");
  });

  it("with finalization grade 'fail' → verdict is NOT RECOMMENDED", async () => {
    const html = await buildNutritionLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({ grade: "fail" }),
    );
    expect(html).toContain("NOT RECOMMENDED");
  });

  it("with finalization grade 'conditional' → verdict is CAUTION", async () => {
    const html = await buildNutritionLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({ grade: "conditional" }),
    );
    expect(html).toContain("CAUTION");
  });

  it("contains Quality Gate Issues section when gates fail", async () => {
    const html = await buildNutritionLabel(makeMetadata(), failQGEvaluations(), RUBRIC);
    expect(html).toContain("Quality Gate Issues");
  });

  it("no Quality Gate Issues section when all gates pass", async () => {
    const html = await buildNutritionLabel(makeMetadata(), allHighScoringEvaluations(), RUBRIC);
    expect(html).not.toContain("Quality Gate Issues");
  });

  it("contains principle scores table with principle codes (TR, RE, US, SE, TC)", async () => {
    const html = await buildNutritionLabel(makeMetadata(), allHighScoringEvaluations(), RUBRIC);
    for (const code of ["TR", "RE", "US", "SE", "TC"]) {
      expect(html).toContain(`nutrition-principle-code">${code}`);
    }
  });

  it("contains strengths and weaknesses when finalization provides them", async () => {
    const html = await buildNutritionLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({
        strengths: ["Excellent transparency", "Good source attribution"],
        weaknesses: ["Limited language support"],
      }),
    );
    expect(html).toContain("Excellent transparency");
    expect(html).toContain("Limited language support");
    expect(html).toContain("Strengths");
    expect(html).toContain("Weaknesses");
  });

  it("no strengths/weaknesses section when finalization is null", async () => {
    const html = await buildNutritionLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    // The nutrition-sw div should not exist (CSS class defs remain in stylesheet)
    expect(html).not.toContain('class="nutrition-sw"');
  });

  it("handles empty metadata fields gracefully", async () => {
    const html = await buildNutritionLabel(
      makeMetadata({ description: undefined, company: undefined }),
      [],
      RUBRIC,
    );
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
    // No description div rendered when description is undefined
    expect(html).not.toContain('class="nutrition-description"');
  });
});
