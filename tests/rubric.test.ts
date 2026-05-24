import { describe, expect, it } from "vitest";
import trustFull from "@/data/rubrics/trust-full.json";
import {
  computeCompletion,
  distributionBar,
  getCategoryLabel,
  getCategoryScores,
  getLinkedRubricIdsForCapture,
  getQuestionCode,
  getRubricQuestionIds,
  principleAverage,
  qualityGateResults,
  scoreColor,
} from "@/lib/rubric";
import type { Evaluation, RubricData } from "@/lib/types";

const TRUST_RUBRIC = trustFull as unknown as RubricData;

describe("TRUST_RUBRIC (full)", () => {
  it("has correct framework name and version", () => {
    expect(TRUST_RUBRIC.framework_name).toBe("TRUST - UT Embedded Information Services");
    expect(TRUST_RUBRIC.version).toBe("1.1");
  });

  it("has 3 quality gate categories", () => {
    const categories = Object.keys(TRUST_RUBRIC.quality_gate);
    expect(categories).toContain("privacy_and_security");
    expect(categories).toContain("accessibility");
    expect(categories).toContain("intellectual_property");
  });
  it("has 5 scoring rubric categories with two-letter codes", () => {
    const categories = Object.keys(TRUST_RUBRIC.scoring_rubric);
    expect(categories).toEqual(["TR", "RE", "US", "SE", "TC"]);
  });

  it("all quality gate questions have title, requirement, background, and examples", () => {
    for (const questions of Object.values(TRUST_RUBRIC.quality_gate)) {
      for (const q of Object.values(questions)) {
        expect(q.type).toBe("pass_fail");
        expect(q.title.length).toBeGreaterThan(0);
        expect(q.requirement.length).toBeGreaterThan(0);
        expect(q.background?.length).toBeGreaterThan(0);
        expect(q.examples).toBeDefined();
        expect(q.examples?.pass.length).toBeGreaterThan(0);
        expect(q.examples?.fail.length).toBeGreaterThan(0);
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
        expect(levels.background?.length).toBeGreaterThan(0);
        expect(levels.examples).toBeDefined();
        expect(levels.examples?.["0"].length).toBeGreaterThan(0);
        expect(levels.examples?.["3"].length).toBeGreaterThan(0);
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
        id.startsWith("accessibility.") ||
        id.startsWith("intellectual_property."),
    );
    expect(qualityGateIds).toEqual([
      "privacy_and_security.data_privacy",
      "privacy_and_security.training_policy",
      "intellectual_property.ip_preservation",
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
    expect(getCategoryLabel("intellectual_property")).toBe("Intellectual Property");
    expect(getCategoryLabel("accessibility")).toBe("Accessibility");
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
      {
        rubricId: "TR.data_source_clarity",
        score: 2,
        notes: "",
        explicitEvidenceIds: ["cap-1", "cap-2"],
      },
      {
        rubricId: "RE.accuracy_and_hallucination",
        score: 1,
        notes: "",
        explicitEvidenceIds: ["cap-1"],
      },
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

// ---------------------------------------------------------------------------
// Merged from tests/scoring.test.ts
// ---------------------------------------------------------------------------

const RUBRIC = TRUST_RUBRIC;

/** Helper: build evaluations for every scoring question with the same score. */
function allScoringEvals(score: 0 | 1 | 2 | 3): Evaluation[] {
  const evals: Evaluation[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC.scoring_rubric)) {
    for (const qId of Object.keys(questions)) {
      evals.push({ rubricId: `${cat}.${qId}`, score, notes: "", explicitEvidenceIds: [] });
    }
  }
  return evals;
}

/** Helper: build evaluations for every quality-gate question with the same result. */
function allGateEvals(result: "pass" | "fail" | "na"): Evaluation[] {
  const evals: Evaluation[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC.quality_gate)) {
    for (const qId of Object.keys(questions)) {
      evals.push({ rubricId: `${cat}.${qId}`, score: result, notes: "", explicitEvidenceIds: [] });
    }
  }
  return evals;
}

describe("principleAverage", () => {
  it("returns 3 (max) when all questions answered with score 3", () => {
    const evals = allScoringEvals(3);
    for (const catId of Object.keys(RUBRIC.scoring_rubric)) {
      expect(principleAverage(catId, evals, RUBRIC)).toBe(3);
    }
  });

  it("returns 0 when all questions answered with score 0", () => {
    const evals = allScoringEvals(0);
    for (const catId of Object.keys(RUBRIC.scoring_rubric)) {
      expect(principleAverage(catId, evals, RUBRIC)).toBe(0);
    }
  });

  it("computes correct weighted average with mixed scores", () => {
    const evals: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "", explicitEvidenceIds: [] },
      { rubricId: "TR.methodology_disclosure", score: 1, notes: "", explicitEvidenceIds: [] },
    ];
    expect(principleAverage("TR", evals, RUBRIC)).toBe(2);
  });

  it("computes average only among answered questions, not total possible", () => {
    const evals: Evaluation[] = [
      { rubricId: "SE.algorithmic_fairness", score: 3, notes: "", explicitEvidenceIds: [] },
    ];
    expect(principleAverage("SE", evals, RUBRIC)).toBe(3);
  });

  it("returns null when no evaluations exist", () => {
    expect(principleAverage("TR", [], RUBRIC)).toBeNull();
  });

  it("returns null for unknown category", () => {
    expect(principleAverage("NONEXISTENT", [], RUBRIC)).toBeNull();
  });

  it("ignores non-numeric scores (na, unsure, empty string)", () => {
    const evals: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: "na" as const,
        notes: "",
        explicitEvidenceIds: [],
      },
      { rubricId: "TR.methodology_disclosure", score: 2, notes: "", explicitEvidenceIds: [] },
    ];
    expect(principleAverage("TR", evals, RUBRIC)).toBe(2);
  });

  it("returns null when all answers are non-numeric", () => {
    const evals: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: "na" as const,
        notes: "",
        explicitEvidenceIds: [],
      },
      {
        rubricId: "TR.methodology_disclosure",
        score: "unsure" as const,
        notes: "",
        explicitEvidenceIds: [],
      },
    ];
    expect(principleAverage("TR", evals, RUBRIC)).toBeNull();
  });
});

describe("getCategoryScores", () => {
  it("returns empty array for unknown category", () => {
    expect(getCategoryScores("NONEXISTENT", [], RUBRIC)).toEqual([]);
  });

  it("returns undefined for unanswered questions", () => {
    const scores = getCategoryScores("TR", [], RUBRIC);
    expect(scores).toHaveLength(2);
    expect(scores).toEqual([undefined, undefined]);
  });

  it("returns numeric scores for answered questions", () => {
    const evals: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
      { rubricId: "TR.methodology_disclosure", score: 3, notes: "", explicitEvidenceIds: [] },
    ];
    expect(getCategoryScores("TR", evals, RUBRIC)).toEqual([2, 3]);
  });

  it("includes na/unsure/empty string scores", () => {
    const evals: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: "na" as const,
        notes: "",
        explicitEvidenceIds: [],
      },
      {
        rubricId: "TR.methodology_disclosure",
        score: "unsure" as const,
        notes: "",
        explicitEvidenceIds: [],
      },
    ];
    expect(getCategoryScores("TR", evals, RUBRIC)).toEqual(["na", "unsure"]);
  });
});

describe("qualityGateResults", () => {
  it("all pass → every result is pass", () => {
    const evals = allGateEvals("pass");
    const results = qualityGateResults(evals, RUBRIC);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.result).toBe("pass");
    }
  });

  it("any fail → that specific gate shows fail", () => {
    const evals = allGateEvals("pass");
    const failEntry = evals.find((e) => e.rubricId === "accessibility.compliance");
    if (!failEntry) return;
    failEntry.score = "fail";
    const results = qualityGateResults(evals, RUBRIC);
    const failed = results.find((r) => r.id === "accessibility.compliance");
    expect(failed?.result).toBe("fail");
    const others = results.filter((r) => r.id !== "accessibility.compliance");
    for (const r of others) {
      expect(r.result).toBe("pass");
    }
  });

  it("unanswered gate → result is null", () => {
    const results = qualityGateResults([], RUBRIC);
    for (const r of results) {
      expect(r.result).toBeNull();
    }
  });

  it("na gate → result is na", () => {
    const evals = allGateEvals("na");
    const results = qualityGateResults(evals, RUBRIC);
    for (const r of results) {
      expect(r.result).toBe("na");
    }
  });
});

describe("scoreColor", () => {
  it("returns red for 0", () => {
    expect(scoreColor(0)).toBe("#c60c30");
  });

  it("returns orange for 1", () => {
    expect(scoreColor(1)).toBe("#ea580c");
  });

  it("returns teal for 2", () => {
    expect(scoreColor(2)).toBe("#0e7490");
  });

  it("returns green for 3", () => {
    expect(scoreColor(3)).toBe("#4a8355");
  });

  it("returns gray for na", () => {
    expect(scoreColor("na")).toBe("#4c5e74");
  });

  it("returns gray for undefined", () => {
    expect(scoreColor(undefined)).toBe("#4c5e74");
  });

  it("returns gray for unsure", () => {
    expect(scoreColor("unsure")).toBe("#5a6e82");
  });
});

describe("distributionBar", () => {
  it("returns empty bar for no scores", () => {
    const html = distributionBar([]);
    expect(html).toContain("No scores");
  });

  it("returns empty bar when all scores are non-numeric", () => {
    const html = distributionBar(["na", "unsure", ""]);
    expect(html).toContain("No scores");
  });

  it("renders segments with correct colors", () => {
    const html = distributionBar([0, 1, 2, 3]);
    expect(html).toContain("#c60c30");
    expect(html).toContain("#ea580c");
    expect(html).toContain("#0e7490");
    expect(html).toContain("#4a8355");
  });

  it("ignores non-numeric scores in distribution", () => {
    const html = distributionBar([3, "na" as const, "unsure" as const]);
    expect(html).toContain("#4a8355");
    expect(html).not.toContain("No scores");
  });

  it("handles all same score", () => {
    const html = distributionBar([2, 2, 2]);
    expect(html).toContain("#0e7490");
    expect(html).toContain("width:100%");
  });
});

describe("principle minimum enforcement", () => {
  it("a category can have a low average even when others are high", () => {
    const evals: Evaluation[] = [
      ...Object.keys(RUBRIC.scoring_rubric.TR).map(
        (qId) =>
          ({
            rubricId: `TR.${qId}`,
            score: 0,
            notes: "",
            explicitEvidenceIds: [],
          }) satisfies Evaluation,
      ),
      ...Object.entries(RUBRIC.scoring_rubric)
        .filter(([cat]) => cat !== "TR")
        .flatMap(([, qs]) =>
          Object.keys(qs).map(
            (qId) =>
              ({
                rubricId: `${Object.entries(RUBRIC.scoring_rubric).find(([c]) => c !== "TR")?.[0]}.${qId}`,
                score: 3,
                notes: "",
                explicitEvidenceIds: [],
              }) satisfies Evaluation,
          ),
        ),
    ];
    expect(principleAverage("TR", evals, RUBRIC)).toBe(0);
  });
});
