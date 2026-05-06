import { PRINCIPLES } from "../principles";
import { getCategoryScores, qualityGateResults } from "../rubric";
import type { Evaluation, ReviewFinalization, RubricData } from "../types";

const GRADE_COLORS: Record<string, string> = {
  pass: "#4a8355",
  conditional: "#ea580c",
  fail: "#c60c30",
};
const GRADE_LABELS: Record<string, string> = {
  pass: "PASSED",
  conditional: "CONDITIONAL",
  fail: "FAILED",
};
const MUTED_COLOR = "#6b7f94";

export interface ReportScores {
  totalActual: number;
  totalMax: number;
  totalScoringQuestions: number;
  answeredScoringQuestions: number;
  totalQGQuestions: number;
  answeredQGQuestions: number;
  totalQuestions: number;
  answeredQuestions: number;
  isComplete: boolean;
  ratio: number;
  catScores: Map<string, (number | "na" | "unsure" | "" | undefined)[]>;
  allPassed: boolean;
  anyFail: boolean;
  principleFail: boolean;
  computedFailed: boolean;
  noEvaluation: boolean;
  verdict: string;
  verdictColor: string;
}

export function computeReportScores(
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null,
): ReportScores {
  const gates = qualityGateResults(evaluations, rubric);
  const allPassed = gates.length > 0 && gates.every((g) => g.result === "pass");
  const anyFail = gates.some((g) => g.result === "fail");

  let totalActual = 0;
  let totalMax = 0;
  let totalScoringQuestions = 0;
  let answeredScoringQuestions = 0;
  const catScores: Map<string, (number | "na" | "unsure" | "" | undefined)[]> = new Map();

  for (const p of PRINCIPLES) {
    if (!(p.id in rubric.scoring_rubric)) continue;
    const scores = getCategoryScores(p.id, evaluations, rubric);
    catScores.set(p.id, scores);
    for (const s of scores) {
      totalScoringQuestions++;
      if (typeof s === "number" || s === "na" || s === "unsure") {
        answeredScoringQuestions++;
        if (typeof s === "number") {
          totalActual += s;
          totalMax += 3;
        }
      }
    }
  }

  const totalQGQuestions = gates.length;
  const answeredQGQuestions = gates.filter((g) => g.result !== null).length;
  const totalQuestions = totalScoringQuestions + totalQGQuestions;
  const answeredQuestions = answeredScoringQuestions + answeredQGQuestions;
  const isComplete = totalQuestions > 0 && answeredQuestions >= totalQuestions;

  const ratio = totalMax > 0 ? totalActual / totalMax : 0;
  const principleFail = PRINCIPLES.some((p) => {
    if (!(p.id in rubric.scoring_rubric)) return false;
    const scores = catScores.get(p.id) ?? [];
    const numeric = scores.filter((s): s is number => typeof s === "number");
    if (numeric.length === 0) return false;
    const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
    return avg < 1.0;
  });
  const computedFailed = anyFail || ratio < 0.6 || principleFail;
  const noEvaluation = answeredScoringQuestions === 0 && answeredQGQuestions === 0;

  let verdict: string;
  let verdictColor: string;
  if (finalization) {
    verdict = GRADE_LABELS[finalization.grade] ?? finalization.grade.toUpperCase();
    verdictColor = GRADE_COLORS[finalization.grade] ?? "#4f5e73";
  } else if (noEvaluation) {
    verdict = "NOT EVALUATED";
    verdictColor = MUTED_COLOR;
  } else if (!isComplete) {
    verdict = "INCOMPLETE";
    verdictColor = MUTED_COLOR;
  } else {
    verdict = computedFailed ? "FAILED" : "PASSED";
    verdictColor = computedFailed ? "#c60c30" : "#4a8355";
  }

  return {
    totalActual,
    totalMax,
    totalScoringQuestions,
    answeredScoringQuestions,
    totalQGQuestions,
    answeredQGQuestions,
    totalQuestions,
    answeredQuestions,
    isComplete,
    ratio,
    catScores,
    allPassed,
    anyFail,
    principleFail,
    computedFailed,
    noEvaluation,
    verdict,
    verdictColor,
  };
}
