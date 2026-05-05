import { describe, expect, it } from "vitest";
import { computeCompletion, getCategoryLabel, getLinkedRubricIdsForCapture, getQuestionCode, getRubricQuestionIds } from "@/lib/rubric";
import trustFull from "@/data/rubrics/trust-full.json";
import trustLite from "@/data/rubrics/trust-lite.json";
import type { Evaluation, RubricData } from "@/lib/types";

const TRUST_RUBRIC = trustFull as unknown as RubricData;
const TRUST_LITE = trustLite as unknown as RubricData;

describe("TRUST_RUBRIC (full)", () => {
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

  it("all quality gate questions have title, requirement, background, and examples", () => {
    for (const questions of Object.values(TRUST_RUBRIC.quality_gate)) {
      for (const q of Object.values(questions)) {
        expect(q.type).toBe("pass_fail");
        expect(q.title.length).toBeGreaterThan(0);
        expect(q.requirement.length).toBeGreaterThan(0);
        expect(q.background!.length).toBeGreaterThan(0);
        expect(q.examples).toBeDefined();
        expect(q.examples!.pass.length).toBeGreaterThan(0);
        expect(q.examples!.fail.length).toBeGreaterThan(0);
      }
    }
  });

  it("all scoring questions have title, levels 0-3, background, and examples", () => {
    for (const questions of Object.values(TRUST_RUBRIC.scoring_rubric)) {
      for (const [_qId, levels] of Object.entries(questions)) {
        expect(levels.title.length).toBeGreaterThan(0);
        expect(levels["0"].length).toBeGreaterThan(0);
        expect(levels["1"].length).toBeGreaterThan(0);
        expect(levels["2"].length).toBeGreaterThan(0);
        expect(levels["3"].length).toBeGreaterThan(0);
        expect(levels.background!.length).toBeGreaterThan(0);
        expect(levels.examples).toBeDefined();
        expect(levels.examples!["0"].length).toBeGreaterThan(0);
        expect(levels.examples!["3"].length).toBeGreaterThan(0);
      }
    }
  });
});

describe("TRUST_LITE (simplified)", () => {
  it("has correct framework name", () => {
    expect(TRUST_LITE.framework_name).toContain("TRUST Lite");
  });

  it("has same quality gate structure as full", () => {
    const fullCats = Object.keys(TRUST_RUBRIC.quality_gate);
    const liteCats = Object.keys(TRUST_LITE.quality_gate);
    expect(liteCats).toEqual(fullCats);
  });

  it("has same scoring category keys as full", () => {
    const fullCats = Object.keys(TRUST_RUBRIC.scoring_rubric);
    const liteCats = Object.keys(TRUST_LITE.scoring_rubric);
    expect(liteCats).toEqual(fullCats);
  });

  it("all questions have background and examples", () => {
    for (const questions of Object.values(TRUST_LITE.quality_gate)) {
      for (const q of Object.values(questions)) {
        expect(q.background!.length).toBeGreaterThan(0);
        expect(q.examples).toBeDefined();
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
      "SE.data_handling",
      "TC.source_attribution_depth",
      "TC.bibliometric_credibility",
    ]);
  });

  it("returns 14 total question IDs", () => {
    const ids = getRubricQuestionIds(TRUST_RUBRIC);
    expect(ids).toHaveLength(14);
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
    expect(getCategoryLabel("SE")).toBe("SE — Sound");
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

describe("computeCompletion", () => {
  it("returns 0% with no evaluations", () => {
    expect(computeCompletion([], TRUST_RUBRIC)).toBe(0);
  });

  it("returns partial percentage with some evaluations scored", () => {
    const totalQuestions = getRubricQuestionIds(TRUST_RUBRIC).length;
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
      { rubricId: "RE.accuracy_and_hallucination", score: "", notes: "", explicitEvidenceIds: [] },
      { rubricId: "US.workflow_integration", score: 1, notes: "", explicitEvidenceIds: [] },
    ];

    const result = computeCompletion(evaluations, TRUST_RUBRIC);
    // 2 scored out of totalQuestions
    const expected = Math.round((2 / totalQuestions) * 100);
    expect(result).toBe(expected);
  });

  it("returns 100% when all questions are scored", () => {
    const allIds = getRubricQuestionIds(TRUST_RUBRIC);
    const evaluations: Evaluation[] = allIds.map((id) => ({
      rubricId: id,
      score: 2,
      notes: "",
      explicitEvidenceIds: [],
    }));

    expect(computeCompletion(evaluations, TRUST_RUBRIC)).toBe(100);
  });
});

describe("getLinkedRubricIdsForCapture", () => {
  it("returns rubric IDs where capture is in explicitEvidenceIds", () => {
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: ["cap-1", "cap-2"] },
      { rubricId: "RE.accuracy_and_hallucination", score: 1, notes: "", explicitEvidenceIds: ["cap-1"] },
      { rubricId: "US.workflow_integration", score: "", notes: "", explicitEvidenceIds: [] },
    ];

    const result = getLinkedRubricIdsForCapture("cap-1", evaluations);
    expect(result).toEqual(["TR.data_source_clarity", "RE.accuracy_and_hallucination"]);
  });

  it("returns empty array for unlinked capture", () => {
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: ["cap-2"] },
    ];

    const result = getLinkedRubricIdsForCapture("cap-1", evaluations);
    expect(result).toEqual([]);
  });

  it("returns empty array with no evaluations", () => {
    const result = getLinkedRubricIdsForCapture("cap-1", []);
    expect(result).toEqual([]);
  });
});
