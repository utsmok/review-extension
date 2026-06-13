import { describe, expect, it } from "vitest";
import { computeReportScores } from "@/lib/report/compute-scores";
import type { Evaluation, EvaluationScore } from "@/lib/types";
import { makeEvaluation, makeFinalization, RUBRIC } from "@/tests/fixtures";

// ── Rubric question IDs (trust-full) ──────────────────────────────────────

const QG_IDS = [
  "privacy_and_security.data_privacy",
  "privacy_and_security.training_policy",
  "accessibility.compliance",
  "intellectual_property.ip_preservation",
] as const;

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
] as const;

// ── Helper factories ──────────────────────────────────────────────────────

function qgEval(id: string, score: EvaluationScore): Evaluation {
  return makeEvaluation({ rubricId: id, score });
}

function scoringEval(id: string, score: EvaluationScore): Evaluation {
  return makeEvaluation({ rubricId: id, score });
}

/** All QG pass, all scoring = 3 */
function allPassEvals(): Evaluation[] {
  return [
    ...QG_IDS.map((id) => qgEval(id, "pass")),
    ...SCORING_IDS.map((id) => scoringEval(id, 3)),
  ];
}

/** All QG fail, all scoring = 0 */
function allFailEvals(): Evaluation[] {
  return [
    ...QG_IDS.map((id) => qgEval(id, "fail")),
    ...SCORING_IDS.map((id) => scoringEval(id, 0)),
  ];
}

/** Mixed: some QG pass / some fail, mixed scoring */
function mixedEvals(): Evaluation[] {
  return [
    qgEval("privacy_and_security.data_privacy", "fail"),
    qgEval("privacy_and_security.training_policy", "fail"),
    qgEval("accessibility.compliance", "pass"),
    qgEval("intellectual_property.ip_preservation", "pass"),
    scoringEval("TR.data_source_clarity", 3),
    scoringEval("TR.methodology_disclosure", 2),
    scoringEval("RE.accuracy_and_hallucination", 1),
    scoringEval("RE.variance_consistency", 0),
    scoringEval("US.workflow_integration", 3),
    scoringEval("US.cognitive_guardrails", 2),
    scoringEval("SE.algorithmic_fairness", 1),
    scoringEval("SE.data_handling", 0),
    scoringEval("TC.source_attribution_depth", 3),
    scoringEval("TC.bibliometric_credibility", 2),
  ];
}

/** Only some questions answered (not all QG, not all scoring) */
function partialEvals(): Evaluation[] {
  return [
    qgEval("privacy_and_security.data_privacy", "pass"),
    qgEval("privacy_and_security.training_policy", "pass"),
    // missing: compliance, ip_preservation
    scoringEval("TR.data_source_clarity", 3),
    scoringEval("TR.methodology_disclosure", 2),
    // missing: all RE, US, SE, TC scoring
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("computeReportScores", () => {
  // ── 1. NOT EVALUATED ──────────────────────────────────────────────────

  it("returns NOT EVALUATED when no evaluations and no finalization", () => {
    const r = computeReportScores([], RUBRIC, null);
    expect(r.verdict).toBe("NOT EVALUATED");
    expect(r.verdictColor).toBe("#4c5e74");
    expect(r.noEvaluation).toBe(true);
    expect(r.isComplete).toBe(false);
    expect(r.totalActual).toBe(0);
    expect(r.totalMax).toBe(0);
  });

  // ── 2. INCOMPLETE ────────────────────────────────────────────────────

  it("returns INCOMPLETE when some but not all evaluations answered", () => {
    const r = computeReportScores(partialEvals(), RUBRIC, null);
    expect(r.verdict).toBe("IN PROGRESS");
    expect(r.verdictColor).toBe("#4c5e74");
    expect(r.isComplete).toBe(false);
    expect(r.noEvaluation).toBe(false);
    // We answered 2 QG + 2 scoring = 4 questions out of 4+10=14
    expect(r.answeredQuestions).toBe(4);
    expect(r.totalQuestions).toBe(14);
  });

  // ── 3. RECOMMENDED (all pass, ratio >= 0.6, no principleFail) ────────

  it("returns RECOMMENDED when all pass, ratio >= 0.6, no principle fail", () => {
    const r = computeReportScores(allPassEvals(), RUBRIC, null);
    expect(r.verdict).toBe("RECOMMENDED");
    expect(r.verdictColor).toBe("#3d7249");
    expect(r.allPassed).toBe(true);
    expect(r.anyFail).toBe(false);
    expect(r.principleFail).toBe(false);
    expect(r.computedFailed).toBe(false);
    expect(r.isComplete).toBe(true);
    // All scoring = 3, 10 questions → totalActual=30, totalMax=30
    expect(r.totalActual).toBe(30);
    expect(r.totalMax).toBe(30);
    expect(r.ratio).toBe(1.0);
  });

  // ── 4. NOT RECOMMENDED via anyFail ──────────────────────────────────

  it("returns NOT RECOMMENDED when any QG gate = fail", () => {
    const evals = allPassEvals();
    // Flip one QG to fail
    evals[0] = qgEval("privacy_and_security.data_privacy", "fail");
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.verdict).toBe("NOT RECOMMENDED");
    expect(r.verdictColor).toBe("#c20c2f");
    expect(r.anyFail).toBe(true);
    expect(r.computedFailed).toBe(true);
    // Scoring is still all 3 → ratio is fine, principles ok
    expect(r.ratio).toBe(1.0);
    expect(r.principleFail).toBe(false);
  });

  // ── 5. NOT RECOMMENDED via ratio < 0.6 ─────────────────────────────

  it("returns NOT RECOMMENDED via low ratio even when all QG pass", () => {
    // All QG pass but all scoring = 0 → ratio = 0
    const evals = [
      ...QG_IDS.map((id) => qgEval(id, "pass")),
      ...SCORING_IDS.map((id) => scoringEval(id, 0)),
    ];
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.verdict).toBe("NOT RECOMMENDED");
    expect(r.anyFail).toBe(false);
    expect(r.ratio).toBe(0);
    expect(r.principleFail).toBe(true); // avg = 0 < 1.0
    expect(r.computedFailed).toBe(true);
  });

  // ── 6. NOT RECOMMENDED via principleFail ────────────────────────────

  it("returns NOT RECOMMENDED when one category avg < 1.0", () => {
    // All QG pass, scoring 1 on TR (avg 1.0 exactly), scoring 3 elsewhere
    // avg = 1.0 is NOT < 1.0, so no principleFail. Use 0s for one category.
    const evals = [
      ...QG_IDS.map((id) => qgEval(id, "pass")),
      // TR category: both scores = 0 → avg = 0 < 1.0
      scoringEval("TR.data_source_clarity", 0),
      scoringEval("TR.methodology_disclosure", 0),
      // All other scoring = 3
      ...SCORING_IDS.filter((id) => !id.startsWith("TR")).map((id) => scoringEval(id, 3)),
    ];
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.verdict).toBe("NOT RECOMMENDED");
    expect(r.anyFail).toBe(false);
    expect(r.principleFail).toBe(true);
    expect(r.computedFailed).toBe(true);
    // Ratio = (0+0 + 8*3) / 30 = 24/30 = 0.8 ≥ 0.6 → fails only by principle
    expect(r.ratio).toBe(0.8);
  });

  // ── 7. Finalization override: grade 'pass' → RECOMMENDED ──────────

  it("finalization grade 'pass' overrides computed to RECOMMENDED", () => {
    const r = computeReportScores(allFailEvals(), RUBRIC, makeFinalization({ grade: "pass" }));
    expect(r.verdict).toBe("RECOMMENDED");
    expect(r.verdictColor).toBe("#3d7249");
    // Underlying data still shows failure
    expect(r.anyFail).toBe(true);
    expect(r.computedFailed).toBe(true);
  });

  // ── 8. Finalization override: grade 'conditional' → CAUTION ───────

  it("finalization grade 'conditional' overrides computed to CAUTION", () => {
    const r = computeReportScores(
      allFailEvals(),
      RUBRIC,
      makeFinalization({ grade: "conditional" }),
    );
    expect(r.verdict).toBe("CAUTION");
    expect(r.verdictColor).toBe("#b23c0b");
  });

  // ── 9. Finalization override: grade 'fail' → NOT RECOMMENDED ──────

  it("finalization grade 'fail' overrides computed to NOT RECOMMENDED", () => {
    const r = computeReportScores(allPassEvals(), RUBRIC, makeFinalization({ grade: "fail" }));
    expect(r.verdict).toBe("NOT RECOMMENDED");
    expect(r.verdictColor).toBe("#c20c2f");
    // Underlying data was fine
    expect(r.computedFailed).toBe(false);
  });

  // ── 10. Combination matrix ─────────────────────────────────────────

  describe("combination matrix (no finalization)", () => {
    const cases: Array<{
      name: string;
      anyFail: boolean;
      ratioBelow: boolean;
      principleFail: boolean;
      expectedVerdict: string;
    }> = [
      {
        name: "all pass",
        anyFail: false,
        ratioBelow: false,
        principleFail: false,
        expectedVerdict: "RECOMMENDED",
      },
      {
        name: "anyFail only",
        anyFail: true,
        ratioBelow: false,
        principleFail: false,
        expectedVerdict: "NOT RECOMMENDED",
      },
      {
        name: "ratio only",
        anyFail: false,
        ratioBelow: true,
        principleFail: false,
        expectedVerdict: "NOT RECOMMENDED",
      },
      {
        name: "principleFail only",
        anyFail: false,
        ratioBelow: false,
        principleFail: true,
        expectedVerdict: "NOT RECOMMENDED",
      },
      {
        name: "all three fail",
        anyFail: true,
        ratioBelow: true,
        principleFail: true,
        expectedVerdict: "NOT RECOMMENDED",
      },
      {
        name: "anyFail + ratio",
        anyFail: true,
        ratioBelow: true,
        principleFail: false,
        expectedVerdict: "NOT RECOMMENDED",
      },
      {
        name: "anyFail + principleFail",
        anyFail: true,
        ratioBelow: false,
        principleFail: true,
        expectedVerdict: "NOT RECOMMENDED",
      },
      {
        name: "ratio + principleFail",
        anyFail: false,
        ratioBelow: true,
        principleFail: true,
        expectedVerdict: "NOT RECOMMENDED",
      },
    ];

    for (const c of cases) {
      it(`${c.name} → ${c.expectedVerdict}`, () => {
        // Construct evals to produce the desired failure signature:
        // - anyFail: flip one QG to fail
        // - ratioBelow: set enough scoring to 0 to get ratio < 0.6
        //   ratio = totalActual/totalMax. totalMax = 30. Need < 18.
        // - principleFail: set one category (2 questions) avg < 1.0 → both 0
        //
        // We set ALL scoring to 3 by default then selectively zero out.
        const evals: Evaluation[] = [];

        if (c.anyFail) {
          evals.push(qgEval("privacy_and_security.data_privacy", "fail"));
          evals.push(qgEval("privacy_and_security.training_policy", "pass"));
          evals.push(qgEval("accessibility.compliance", "pass"));
          evals.push(qgEval("intellectual_property.ip_preservation", "pass"));
        } else {
          evals.push(...QG_IDS.map((id) => qgEval(id, "pass")));
        }

        // Start all scoring at 3
        const scores: Record<string, EvaluationScore> = {};
        for (const id of SCORING_IDS) scores[id] = 3;

        // To get ratio < 0.6 with totalMax=30: need totalActual < 18
        // Setting 5 questions to 0 reduces actual by 15 → 15/30 = 0.5
        if (c.ratioBelow) {
          for (const id of SCORING_IDS) {
            if (scores[id] === 3) {
              scores[id] = 0;
              // Check if we've reduced enough: need actual < 18
              const actual = Object.values(scores).reduce(
                (a, v) => a + (typeof v === "number" ? (v as number) : 0),
                0 as number,
              );
              if ((actual as number) < 18) break;
            }
          }
        }

        // To cause principleFail: one category avg < 1.0
        // TC has 2 questions. Set both to 0 → avg = 0
        // Only if we haven't already zeroed them for ratio
        if (c.principleFail) {
          scores["TC.source_attribution_depth"] = 0;
          scores["TC.bibliometric_credibility"] = 0;
        }

        for (const [id, score] of Object.entries(scores)) {
          evals.push(scoringEval(id, score));
        }

        const r = computeReportScores(evals, RUBRIC, null);
        expect(r.anyFail).toBe(c.anyFail);
        expect(r.computedFailed).toBe(c.anyFail || c.ratioBelow || c.principleFail);
        expect(r.verdict).toBe(c.expectedVerdict);
      });
    }
  });

  describe("combination matrix (with finalization)", () => {
    const grades = ["pass", "conditional", "fail"] as const;
    const expectedForGrade: Record<string, string> = {
      pass: "RECOMMENDED",
      conditional: "CAUTION",
      fail: "NOT RECOMMENDED",
    };

    for (const grade of grades) {
      it(`finalization grade '${grade}' overrides all-fail evals to ${expectedForGrade[grade]}`, () => {
        const r = computeReportScores(allFailEvals(), RUBRIC, makeFinalization({ grade }));
        expect(r.verdict).toBe(expectedForGrade[grade]);
      });

      it(`finalization grade '${grade}' overrides all-pass evals to ${expectedForGrade[grade]}`, () => {
        const r = computeReportScores(allPassEvals(), RUBRIC, makeFinalization({ grade }));
        expect(r.verdict).toBe(expectedForGrade[grade]);
      });
    }
  });

  // ── 11. Edge: ratio = 0.6 exactly ──────────────────────────────────

  it("ratio = 0.6 exactly (with numeric 0s that cause principleFail)", () => {
    // totalMax = 30, totalActual = 18 → ratio = 0.6
    // 6 questions scored 3, 4 questions scored 0
    // SE has 2 questions → both 0 → avg = 0 < 1.0 → principleFail
    const evals: Evaluation[] = [
      ...QG_IDS.map((id) => qgEval(id, "pass")),
      scoringEval("TR.data_source_clarity", 3),
      scoringEval("TR.methodology_disclosure", 3),
      scoringEval("RE.accuracy_and_hallucination", 3),
      scoringEval("RE.variance_consistency", 3),
      scoringEval("US.workflow_integration", 3),
      scoringEval("US.cognitive_guardrails", 3),
      scoringEval("SE.algorithmic_fairness", 0),
      scoringEval("SE.data_handling", 0),
      scoringEval("TC.source_attribution_depth", 0),
      scoringEval("TC.bibliometric_credibility", 0),
    ];
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.ratio).toBe(0.6);
    // Fails by principleFail, not by ratio
    expect(r.anyFail).toBe(false);
    expect(r.principleFail).toBe(true);
    expect(r.computedFailed).toBe(true);
    expect(r.verdict).toBe("NOT RECOMMENDED");
  });

  it("ratio = 0.6 exactly, no principleFail, no anyFail → RECOMMENDED", () => {
    // Need: ratio=0.6, all category avgs ≥ 1.0, all QG pass
    // totalMax = 30, need totalActual = 18. Each cat (2 q's) needs avg ≥ 1.0 → sum ≥ 2.
    // Distribution: TR=(3,1)=4 RE=(3,1)=4 US=(3,1)=4 SE=(3,1)=4 TC=(1,1)=2 → total=18
    // Avgs: TR=2 RE=2 US=2 SE=2 TC=1 — all ≥ 1.0 ✓
    const evals: Evaluation[] = [
      ...QG_IDS.map((id) => qgEval(id, "pass")),
      scoringEval("TR.data_source_clarity", 3),
      scoringEval("TR.methodology_disclosure", 1),
      scoringEval("RE.accuracy_and_hallucination", 3),
      scoringEval("RE.variance_consistency", 1),
      scoringEval("US.workflow_integration", 3),
      scoringEval("US.cognitive_guardrails", 1),
      scoringEval("SE.algorithmic_fairness", 3),
      scoringEval("SE.data_handling", 1),
      scoringEval("TC.source_attribution_depth", 1),
      scoringEval("TC.bibliometric_credibility", 1),
    ];
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.ratio).toBeCloseTo(0.6);
    expect(r.anyFail).toBe(false);
    expect(r.principleFail).toBe(false);
    expect(r.computedFailed).toBe(false);
    expect(r.verdict).toBe("RECOMMENDED");
  });

  // ── 12. Edge: totalMax = 0 (ratio defaults to 0) ────────────────────

  it("totalMax = 0 defaults ratio to 0", () => {
    // All evaluations answered as 'na' or 'unsure' — no numeric scores
    const evals: Evaluation[] = [
      ...QG_IDS.map((id) => qgEval(id, "na" as EvaluationScore)),
      ...SCORING_IDS.map((id) => scoringEval(id, "na" as EvaluationScore)),
    ];
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.totalMax).toBe(0);
    expect(r.totalActual).toBe(0);
    expect(r.ratio).toBe(0);
    expect(r.isComplete).toBe(true);
    // noEvaluation: answeredScoring=10 (all 'na') + answeredQG=4 (all 'na') → not 0
    expect(r.noEvaluation).toBe(false);
    expect(r.anyFail).toBe(false);
    expect(r.principleFail).toBe(false);
    // complete but no numeric scores (all N/A) → nothing to recommend
    expect(r.computedFailed).toBe(false);
    expect(r.verdict).toBe("NOT EVALUATED");
  });

  // ── Additional edge cases ───────────────────────────────────────────

  it("noEvaluation is false when only QG questions are answered", () => {
    const evals = QG_IDS.map((id) => qgEval(id, "pass"));
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.noEvaluation).toBe(false);
    expect(r.answeredScoringQuestions).toBe(0);
    expect(r.answeredQGQuestions).toBe(4);
    // Not complete (no scoring answered)
    expect(r.isComplete).toBe(false);
    expect(r.verdict).toBe("IN PROGRESS");
  });

  it("noEvaluation is false when only scoring questions are answered", () => {
    const evals = SCORING_IDS.map((id) => scoringEval(id, 3));
    const r = computeReportScores(evals, RUBRIC, null);
    expect(r.noEvaluation).toBe(false);
    expect(r.answeredScoringQuestions).toBe(10);
    expect(r.answeredQGQuestions).toBe(0);
    expect(r.isComplete).toBe(false);
    expect(r.verdict).toBe("IN PROGRESS");
  });

  it("computes correct totals for mixed evals", () => {
    const r = computeReportScores(mixedEvals(), RUBRIC, null);
    // 4 QG + 10 scoring = 14 total
    expect(r.totalQuestions).toBe(14);
    expect(r.totalQGQuestions).toBe(4);
    expect(r.totalScoringQuestions).toBe(10);
    // All 14 answered
    expect(r.answeredQuestions).toBe(14);
    expect(r.isComplete).toBe(true);
    // Scoring: 3+2+1+0+3+2+1+0+3+2 = 17 actual, 10×3=30 max
    expect(r.totalActual).toBe(17);
    expect(r.totalMax).toBe(30);
    expect(r.ratio).toBeCloseTo(17 / 30);
    // Has a fail QG
    expect(r.anyFail).toBe(true);
    expect(r.verdict).toBe("NOT RECOMMENDED");
  });

  it("handles evaluations with empty string scores (unanswered)", () => {
    const evals = SCORING_IDS.map((id) => scoringEval(id, "" as EvaluationScore));
    const r = computeReportScores(evals, RUBRIC, null);
    // Empty strings are not counted as answered for scoring
    expect(r.answeredScoringQuestions).toBe(0);
    expect(r.noEvaluation).toBe(true);
    expect(r.verdict).toBe("NOT EVALUATED");
  });

  it("computes category scores correctly", () => {
    const r = computeReportScores(allPassEvals(), RUBRIC, null);
    // Each category should have 2 scores, all 3
    for (const catId of ["TR", "RE", "US", "SE", "TC"]) {
      const scores = r.catScores.get(catId);
      expect(scores).toBeDefined();
      expect(scores?.length).toBe(2);
      expect(scores?.every((s) => s === 3)).toBe(true);
    }
  });

  it("unknown finalization grade uses grade.toUpperCase()", () => {
    const r = computeReportScores(
      allPassEvals(),
      RUBRIC,
      makeFinalization({ grade: "custom" as never }),
    );
    expect(r.verdict).toBe("CUSTOM");
    expect(r.verdictColor).toBe("#4f5e73");
  });

  // ── Enhanced grades ──────────────────────────────────────────────────

  describe("enhanced finalization grades", () => {
    const enhancedCases: Array<{ grade: string; label: string; color: string }> = [
      { grade: "recommended", label: "RECOMMENDED", color: "#3d7249" },
      { grade: "recommended_with_caveats", label: "RECOMMENDED WITH CAVEATS", color: "#0d6d87" },
      { grade: "needs_review", label: "NEEDS REVIEW", color: "#b23c0b" },
      { grade: "pilot_only", label: "PILOT ONLY", color: "#b45309" },
      { grade: "not_recommended", label: "NOT RECOMMENDED", color: "#c20c2f" },
      { grade: "out_of_scope", label: "OUT OF SCOPE", color: "#4c5e74" },
    ];

    for (const { grade, label, color } of enhancedCases) {
      it(`grade '${grade}' → verdict '${label}'`, () => {
        const r = computeReportScores(
          allPassEvals(),
          RUBRIC,
          makeFinalization({ grade: grade as never }),
        );
        expect(r.verdict).toBe(label);
        expect(r.verdictColor).toBe(color);
      });
    }
  });
});
