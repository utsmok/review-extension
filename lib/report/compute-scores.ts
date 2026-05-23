import { PRINCIPLES } from "../principles";
import { getCategoryScores, qualityGateResults } from "../rubric";
import type { Evaluation, ReviewFinalization, RubricData } from "../types";

const GRADE_COLORS: Record<string, string> = {
  pass: "#4a8355",
  conditional: "#ea580c",
  fail: "#c60c30",
};
const GRADE_LABELS: Record<string, string> = {
  pass: "RECOMMENDED",
  conditional: "CAUTION",
  fail: "NOT RECOMMENDED",
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
  evalMap?: Map<string, Evaluation>,
): ReportScores {
  const em = evalMap ?? new Map(evaluations.map((e) => [e.rubricId, e]));
  const gates = qualityGateResults(evaluations, rubric, em);
  let allPassed = gates.length > 0;
  let anyFail = false;
  let answeredQGQuestions = 0;
  for (const g of gates) {
    if (g.result !== "pass") allPassed = false;
    if (g.result === "fail") anyFail = true;
    if (g.result !== null) answeredQGQuestions++;
  }

  let totalActual = 0;
  let totalMax = 0;
  let totalScoringQuestions = 0;
  let answeredScoringQuestions = 0;
  let principleFail = false;
  const catScores: Map<string, (number | "na" | "unsure" | "" | undefined)[]> = new Map();

  for (const p of PRINCIPLES) {
    if (!(p.id in rubric.scoring_rubric)) continue;
    const scores = getCategoryScores(p.id, evaluations, rubric, em);
    catScores.set(p.id, scores);
    let numSum = 0;
    let numCount = 0;
    for (const s of scores) {
      totalScoringQuestions++;
      if (typeof s === "number" || s === "na" || s === "unsure") {
        answeredScoringQuestions++;
        if (typeof s === "number") {
          totalActual += s;
          totalMax += 3;
          numSum += s;
          numCount++;
        }
      }
    }
    if (numCount > 0 && numSum / numCount < 1.0) principleFail = true;
  }

  const totalQGQuestions = gates.length;
  const totalQuestions = totalScoringQuestions + totalQGQuestions;
  const answeredQuestions = answeredScoringQuestions + answeredQGQuestions;
  const isComplete = totalQuestions > 0 && answeredQuestions >= totalQuestions;

  const ratio = totalMax > 0 ? totalActual / totalMax : 0;
  const computedFailed = anyFail || (totalMax > 0 && ratio < 0.6) || principleFail;
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
    verdict = computedFailed ? "NOT RECOMMENDED" : "RECOMMENDED";
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
