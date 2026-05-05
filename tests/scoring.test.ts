import { describe, expect, it } from "vitest";
import {
  distributionBar,
  getCategoryScores,
  principleAverage,
  qualityGateResults,
  scoreColor,
} from "@/lib/scoring";
import trustFull from "@/data/rubrics/trust-full.json";
import type { Evaluation, RubricData } from "@/lib/types";

const RUBRIC = trustFull as unknown as RubricData;

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

// ---------------------------------------------------------------------------
// principleAverage
// ---------------------------------------------------------------------------

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
    // TR has 2 questions: give one 3 and one 1 → average = 2
    const evals: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "", explicitEvidenceIds: [] },
      { rubricId: "TR.methodology_disclosure", score: 1, notes: "", explicitEvidenceIds: [] },
    ];
    expect(principleAverage("TR", evals, RUBRIC)).toBe(2);
  });

  it("computes average only among answered questions, not total possible", () => {
    // SE has 2 questions; answer only one with score 3 → average = 3
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
    // Only one numeric score (2) → average = 2
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

// ---------------------------------------------------------------------------
// getCategoryScores
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// qualityGateResults
// ---------------------------------------------------------------------------

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
    // Flip one gate to fail
    const failEntry = evals.find((e) => e.rubricId === "privacy_and_security.data_privacy")!;
    failEntry.score = "fail";

    const results = qualityGateResults(evals, RUBRIC);
    const failed = results.find((r) => r.id === "privacy_and_security.data_privacy");
    expect(failed?.result).toBe("fail");

    // Others should still pass
    const others = results.filter((r) => r.id !== "privacy_and_security.data_privacy");
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

// ---------------------------------------------------------------------------
// scoreColor
// ---------------------------------------------------------------------------

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
    expect(scoreColor("na")).toBe("#5f7088");
  });

  it("returns gray for undefined", () => {
    expect(scoreColor(undefined)).toBe("#5f7088");
  });

  it("returns gray for unsure", () => {
    expect(scoreColor("unsure")).toBe("#6b7f94");
  });
});

// ---------------------------------------------------------------------------
// distributionBar
// ---------------------------------------------------------------------------

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
    expect(html).toContain("#c60c30"); // 0
    expect(html).toContain("#ea580c"); // 1
    expect(html).toContain("#0e7490"); // 2
    expect(html).toContain("#4a8355"); // 3
  });

  it("ignores non-numeric scores in distribution", () => {
    const html = distributionBar([3, "na" as const, "unsure" as const]);
    // Only one numeric (3) → 100% green segment
    expect(html).toContain("#4a8355");
    expect(html).not.toContain("No scores");
  });

  it("handles all same score", () => {
    const html = distributionBar([2, 2, 2]);
    expect(html).toContain("#0e7490");
    // Should have 100% width for the single segment
    expect(html).toContain("width:100%");
  });
});

// ---------------------------------------------------------------------------
// Integration-style: principle below minimum with high score
// ---------------------------------------------------------------------------

describe("principle minimum enforcement", () => {
  it("a category can have a low average even when others are high", () => {
    const evals: Evaluation[] = [
      // All TR questions get 0
      ...Object.keys(RUBRIC.scoring_rubric["TR"]).map(
        (qId) =>
          ({
            rubricId: `TR.${qId}`,
            score: 0,
            notes: "",
            explicitEvidenceIds: [],
          }) satisfies Evaluation,
      ),
      // All other categories get 3
      ...Object.entries(RUBRIC.scoring_rubric)
        .filter(([cat]) => cat !== "TR")
        .flatMap(([, qs]) =>
          Object.keys(qs).map(
            (qId) =>
              ({
                rubricId: `${Object.entries(RUBRIC.scoring_rubric).find(([c]) => c !== "TR")![0]}.${qId}`,
                score: 3,
                notes: "",
                explicitEvidenceIds: [],
              }) satisfies Evaluation,
          ),
        ),
    ];

    // TR should average 0
    expect(principleAverage("TR", evals, RUBRIC)).toBe(0);
  });
});
