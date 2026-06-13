import { describe, expect, it } from "vitest";
import { computeReportScores } from "@/lib/report/compute-scores";
import type { Evaluation, QualityGateScore, ReviewFinalization, ScoringScore } from "@/lib/types";
import { makeEvaluation, makeFinalization, RUBRIC } from "@/tests/fixtures";

describe("computeReportScores — property invariants", () => {
  const scoringScores: ScoringScore[] = [0, 1, 2, 3, "na", "unsure", ""];
  const qgScores: QualityGateScore[] = ["pass", "fail", "na", "unsure", ""];

  // Simple seeded PRNG (mulberry32) for reproducibility
  function mulberry32(seed: number) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomChoice<T>(arr: T[], rng: () => number): T {
    return arr[Math.floor(rng() * arr.length)];
  }

  function generateRandomEvals(rng: () => number): Evaluation[] {
    const evals: Evaluation[] = [];

    for (const [catKey, questions] of Object.entries(RUBRIC.quality_gate)) {
      for (const qKey of Object.keys(questions)) {
        if (rng() > 0.3) {
          evals.push(
            makeEvaluation({
              rubricId: `${catKey}.${qKey}`,
              score: randomChoice(qgScores, rng),
            }),
          );
        }
      }
    }

    for (const [catKey, questions] of Object.entries(RUBRIC.scoring_rubric)) {
      for (const qKey of Object.keys(questions)) {
        if (rng() > 0.3) {
          evals.push(
            makeEvaluation({
              rubricId: `${catKey}.${qKey}`,
              score: randomChoice(scoringScores, rng),
            }),
          );
        }
      }
    }

    return evals;
  }

  const SEED = 42;
  const ITERATIONS = 500;

  it(`maintains invariants across ${ITERATIONS} random evaluation sets`, () => {
    const rng = mulberry32(SEED);

    for (let i = 0; i < ITERATIONS; i++) {
      const evals = generateRandomEvals(rng);
      const usesAi = rng() > 0.2;
      const scores = computeReportScores(evals, RUBRIC, null, undefined, usesAi);

      // Invariant 1: totals are non-negative
      expect(scores.totalActual, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.totalMax, `iter=${i}`).toBeGreaterThanOrEqual(0);

      // Invariant 2: max >= actual
      expect(scores.totalMax, `iter=${i}`).toBeGreaterThanOrEqual(scores.totalActual);

      // Invariant 3: ratio in [0, 1], or 0 when totalMax is 0
      expect(scores.ratio, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.ratio, `iter=${i}`).toBeLessThanOrEqual(1);
      if (scores.totalMax === 0) {
        expect(scores.ratio, `iter=${i}`).toBe(0);
      }

      // Invariant 4: question count decomposition
      expect(scores.totalQuestions, `iter=${i}`).toBe(
        scores.totalScoringQuestions + scores.totalQGQuestions,
      );
      expect(scores.answeredQuestions, `iter=${i}`).toBe(
        scores.answeredScoringQuestions + scores.answeredQGQuestions,
      );

      // Invariant 5: answered <= total
      expect(scores.answeredQuestions, `iter=${i}`).toBeLessThanOrEqual(scores.totalQuestions);

      // Invariant 6: isComplete ↔ answered >= total && total > 0
      if (scores.totalQuestions > 0) {
        expect(scores.isComplete, `iter=${i}`).toBe(
          scores.answeredQuestions >= scores.totalQuestions,
        );
      }

      // Invariant 7: verdict color is a hex color string
      expect(scores.verdictColor, `iter=${i}`).toMatch(/^#[0-9a-f]{6}$/);

      // Invariant 8: noEvaluation verdict constraints
      if (scores.noEvaluation) {
        expect(
          scores.verdict === "NOT EVALUATED" ||
            scores.verdict === "IN PROGRESS" ||
            scores.verdict === "RECOMMENDED" ||
            scores.verdict === "NOT RECOMMENDED",
          `iter=${i} noEvaluation verdict=${scores.verdict}`,
        ).toBe(true);
      }
    }
  });

  it("maintains invariants with random finalization overrides", () => {
    const rng = mulberry32(SEED + 1);
    const grades: ReviewFinalization["grade"][] = [
      "pass",
      "conditional",
      "fail",
      "recommended",
      "recommended_with_caveats",
      "needs_review",
      "pilot_only",
      "not_recommended",
      "out_of_scope",
    ];

    for (let i = 0; i < 200; i++) {
      const evals = generateRandomEvals(rng);
      const usesAi = rng() > 0.2;
      const finalization = makeFinalization({
        grade: randomChoice(grades, rng),
      });
      const scores = computeReportScores(evals, RUBRIC, finalization, undefined, usesAi);

      expect(scores.totalActual, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.totalMax, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.totalMax, `iter=${i}`).toBeGreaterThanOrEqual(scores.totalActual);
      expect(scores.ratio, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.ratio, `iter=${i}`).toBeLessThanOrEqual(1);
      expect(scores.totalQuestions, `iter=${i}`).toBe(
        scores.totalScoringQuestions + scores.totalQGQuestions,
      );
      expect(scores.answeredQuestions, `iter=${i}`).toBe(
        scores.answeredScoringQuestions + scores.answeredQGQuestions,
      );
      expect(scores.answeredQuestions, `iter=${i}`).toBeLessThanOrEqual(scores.totalQuestions);
      expect(scores.verdictColor, `iter=${i}`).toMatch(/^#[0-9a-f]{6}$/);

      // With finalization, verdict should reflect the grade
      const expectedLabels: Record<string, string> = {
        pass: "RECOMMENDED",
        conditional: "CAUTION",
        fail: "NOT RECOMMENDED",
        recommended: "RECOMMENDED",
        recommended_with_caveats: "RECOMMENDED WITH CAVEATS",
        needs_review: "NEEDS REVIEW",
        pilot_only: "PILOT ONLY",
        not_recommended: "NOT RECOMMENDED",
        out_of_scope: "OUT OF SCOPE",
      };
      expect(scores.verdict, `iter=${i}`).toBe(expectedLabels[finalization.grade]);
    }
  });

  it("maintains invariants with empty evaluations", () => {
    const scores = computeReportScores([], RUBRIC, null);

    expect(scores.totalActual).toBe(0);
    expect(scores.totalMax).toBeGreaterThanOrEqual(0);
    expect(scores.ratio).toBe(0);
    expect(scores.answeredQuestions).toBe(0);
    expect(scores.answeredScoringQuestions).toBe(0);
    expect(scores.answeredQGQuestions).toBe(0);
    expect(scores.isComplete).toBe(false);
    expect(scores.noEvaluation).toBe(true);
    expect(scores.verdict).toBe("NOT EVALUATED");
    expect(scores.verdictColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("maintains invariants with all questions answered as numeric scores", () => {
    const evals: Evaluation[] = [];
    for (const [catKey, questions] of Object.entries(RUBRIC.quality_gate)) {
      for (const qKey of Object.keys(questions)) {
        evals.push(makeEvaluation({ rubricId: `${catKey}.${qKey}`, score: "pass" }));
      }
    }
    for (const [catKey, questions] of Object.entries(RUBRIC.scoring_rubric)) {
      for (const qKey of Object.keys(questions)) {
        evals.push(makeEvaluation({ rubricId: `${catKey}.${qKey}`, score: 3 }));
      }
    }

    const scores = computeReportScores(evals, RUBRIC, null);

    expect(scores.totalActual).toBeGreaterThan(0);
    expect(scores.totalMax).toBeGreaterThan(0);
    expect(scores.isComplete).toBe(true);
    expect(scores.noEvaluation).toBe(false);
    expect(scores.ratio).toBe(1);
    expect(scores.answeredQuestions).toBe(scores.totalQuestions);
    expect(scores.verdictColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("maintains invariants with all questions answered as na/unsure", () => {
    const evals: Evaluation[] = [];
    for (const [catKey, questions] of Object.entries(RUBRIC.quality_gate)) {
      for (const qKey of Object.keys(questions)) {
        evals.push(makeEvaluation({ rubricId: `${catKey}.${qKey}`, score: "na" }));
      }
    }
    for (const [catKey, questions] of Object.entries(RUBRIC.scoring_rubric)) {
      for (const qKey of Object.keys(questions)) {
        evals.push(makeEvaluation({ rubricId: `${catKey}.${qKey}`, score: "na" }));
      }
    }

    const scores = computeReportScores(evals, RUBRIC, null);

    expect(scores.totalActual).toBe(0);
    expect(scores.totalMax).toBe(0);
    expect(scores.ratio).toBe(0);
    expect(scores.isComplete).toBe(true);
    expect(scores.answeredQuestions).toBe(scores.totalQuestions);
    expect(scores.noEvaluation).toBe(false);
    expect(scores.verdictColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("maintains invariants with usesAi=false (hides ai_only questions)", () => {
    const rng = mulberry32(SEED + 2);

    for (let i = 0; i < 200; i++) {
      const evals = generateRandomEvals(rng);
      const scores = computeReportScores(evals, RUBRIC, null, undefined, false);

      expect(scores.totalActual, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.totalMax, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.totalMax, `iter=${i}`).toBeGreaterThanOrEqual(scores.totalActual);
      expect(scores.ratio, `iter=${i}`).toBeGreaterThanOrEqual(0);
      expect(scores.ratio, `iter=${i}`).toBeLessThanOrEqual(1);
      expect(scores.totalQuestions, `iter=${i}`).toBe(
        scores.totalScoringQuestions + scores.totalQGQuestions,
      );
      expect(scores.answeredQuestions, `iter=${i}`).toBe(
        scores.answeredScoringQuestions + scores.answeredQGQuestions,
      );
      expect(scores.answeredQuestions, `iter=${i}`).toBeLessThanOrEqual(scores.totalQuestions);
      expect(scores.verdictColor, `iter=${i}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
