import { describe, expect, it } from "vitest";
import { getCategoryLabel, getQuestionCode, getRubricQuestionIds, TRUST_RUBRIC } from "@/lib/rubric";

describe("TRUST_RUBRIC", () => {
  it("has correct framework name and version", () => {
    expect(TRUST_RUBRIC.framework_name).toBe("TRUST - UT Embedded Information Services");
    expect(TRUST_RUBRIC.version).toBe("1.0");
  });

  it("has 3 quality gate categories", () => {
    const categories = Object.keys(TRUST_RUBRIC.quality_gate);
    expect(categories).toContain("privacy_and_security");
    expect(categories).toContain("traceability");
    expect(categories).toContain("accessibility");
  });

  it("has 5 scoring rubric categories with two-letter codes", () => {
    const categories = Object.keys(TRUST_RUBRIC.scoring_rubric);
    expect(categories).toEqual([
      "TR",
      "RE",
      "US",
      "SE",
      "TC",
    ]);
  });

  it("all quality gate questions have title and requirement", () => {
    for (const questions of Object.values(TRUST_RUBRIC.quality_gate)) {
      for (const q of Object.values(questions)) {
        expect(q.type).toBe("pass_fail");
        expect(q.title.length).toBeGreaterThan(0);
        expect(q.requirement.length).toBeGreaterThan(0);
      }
    }
  });

  it("all scoring questions have title and levels 0-3", () => {
    for (const questions of Object.values(TRUST_RUBRIC.scoring_rubric)) {
      for (const [_qId, levels] of Object.entries(questions)) {
        expect(levels.title.length).toBeGreaterThan(0);
        expect(levels["0"].length).toBeGreaterThan(0);
        expect(levels["1"].length).toBeGreaterThan(0);
        expect(levels["2"].length).toBeGreaterThan(0);
        expect(levels["3"].length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getRubricQuestionIds", () => {
  it("returns all quality gate IDs first", () => {
    const ids = getRubricQuestionIds(TRUST_RUBRIC);
    const qualityGateIds = ids.filter(
      (id) =>
        id.startsWith("privacy_and_security.") ||
        id.startsWith("traceability.") ||
        id.startsWith("accessibility."),
    );
    expect(qualityGateIds).toEqual([
      "privacy_and_security.data_privacy",
      "privacy_and_security.training_policy",
      "traceability.citation_mechanism",
      "accessibility.compliance",
    ]);
  });

  it("returns all scoring rubric IDs with two-letter codes", () => {
    const ids = getRubricQuestionIds(TRUST_RUBRIC);
    const scoringIds = ids.filter(
      (id) =>
        id.startsWith("TR.") ||
        id.startsWith("RE.") ||
        id.startsWith("US.") ||
        id.startsWith("SE.") ||
        id.startsWith("TC."),
    );
    expect(scoringIds).toEqual([
      "TR.data_source_clarity",
      "TR.methodology_disclosure",
      "RE.accuracy_and_hallucination",
      "RE.variance_consistency",
      "US.workflow_integration",
      "US.cognitive_guardrails",
      "SE.algorithmic_fairness",
      "TC.source_attribution_depth",
      "TC.bibliometric_credibility",
    ]);
  });

  it("returns 13 total question IDs", () => {
    const ids = getRubricQuestionIds(TRUST_RUBRIC);
    expect(ids).toHaveLength(13);
  });

  it("all IDs use category.question_id format", () => {
    const ids = getRubricQuestionIds(TRUST_RUBRIC);
    for (const id of ids) {
      expect(id).toMatch(/^.+\..+$/);
    }
  });
});

describe("getCategoryLabel", () => {
  it("returns human-readable labels for known categories", () => {
    expect(getCategoryLabel("privacy_and_security")).toBe("Privacy & Security");
    expect(getCategoryLabel("TR")).toBe("TR — Transparent");
    expect(getCategoryLabel("RE")).toBe("RE — Reliable");
    expect(getCategoryLabel("US")).toBe("US — User-Centric");
    expect(getCategoryLabel("SE")).toBe("SE — Secure");
    expect(getCategoryLabel("TC")).toBe("TC — Traceable");
  });

  it("returns the raw ID for unknown categories", () => {
    expect(getCategoryLabel("unknown_category")).toBe("unknown_category");
  });
});

describe("getQuestionCode", () => {
  it("returns two-letter code plus index", () => {
    expect(getQuestionCode("TR", 0)).toBe("TR1");
    expect(getQuestionCode("TR", 1)).toBe("TR2");
    expect(getQuestionCode("SE", 0)).toBe("SE1");
  });
});
