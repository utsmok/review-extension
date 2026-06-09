import { PRINCIPLES } from "../principles";
import {
  getCategoryScores,
  getVisibleRubricQuestionIds,
  qualityGateResults,
  REPORT_SCORE_COLORS,
} from "../rubric";
import type { Evaluation, ReviewFinalization, RubricData } from "../types";

const GRADE_COLORS: Record<string, string> = {
  pass: REPORT_SCORE_COLORS[3],
  conditional: REPORT_SCORE_COLORS[1],
  fail: REPORT_SCORE_COLORS[0],
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

/** Compute all scoring and verdict data needed for the HTML report and nutrition label. */
export function computeReportScores(
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null,
  evalMap?: Map<string, Evaluation>,
  usesAi: boolean = true,
): ReportScores {
  const em = evalMap ?? new Map(evaluations.map((e) => [e.rubricId, e]));
  const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, usesAi));
  const gates = qualityGateResults(evaluations, rubric, em);
  const visibleGates = gates.filter((g) => visibleIds.has(g.id));
  let allPassed = visibleGates.length > 0;
  let anyFail = false;
  let answeredQGQuestions = 0;
  for (const g of visibleGates) {
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
    const allScores = getCategoryScores(p.id, evaluations, rubric, em);
    const questionIds = Object.keys(rubric.scoring_rubric[p.id]);
    const scores = allScores.filter((_, i) => visibleIds.has(`${p.id}.${questionIds[i]}`));
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

  const totalQGQuestions = visibleGates.length;
  const totalQuestions = totalScoringQuestions + totalQGQuestions;
  // Cap answered count — imported reviews from older rubrics may have more answers than current questions
  const answeredQuestions = Math.min(
    answeredScoringQuestions + answeredQGQuestions,
    totalQuestions,
  );
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
    verdictColor = computedFailed ? REPORT_SCORE_COLORS[0] : REPORT_SCORE_COLORS[3];
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
