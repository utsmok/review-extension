import type { Evaluation, RubricData } from "./types";

export function getRubricQuestionIds(rubric: RubricData): string[] {
  const ids: string[] = [];
  for (const [category, questions] of Object.entries(rubric.quality_gate)) {
    for (const questionId of Object.keys(questions)) {
      ids.push(`${category}.${questionId}`);
    }
  }
  for (const [category, questions] of Object.entries(rubric.scoring_rubric)) {
    for (const questionId of Object.keys(questions)) {
      ids.push(`${category}.${questionId}`);
    }
  }
  return ids;
}

export function getVisibleRubricQuestionIds(rubric: RubricData, usesAi: boolean): string[] {
  const ids: string[] = [];
  for (const [category, questions] of Object.entries(rubric.quality_gate)) {
    for (const [questionId, question] of Object.entries(questions)) {
      if (usesAi || !question.ai_only) {
        ids.push(`${category}.${questionId}`);
      }
    }
  }
  for (const [category, questions] of Object.entries(rubric.scoring_rubric)) {
    for (const [questionId, question] of Object.entries(questions)) {
      if (usesAi || !question.ai_only) {
        ids.push(`${category}.${questionId}`);
      }
    }
  }
  return ids;
}

export function getQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${categoryKey}${questionIndex + 1}`;
}

/** Map quality gate category keys to short display codes */
const QG_CATEGORY_CODES: Record<string, string> = {
  privacy_and_security: "PS",
  intellectual_property: "IP",
  accessibility: "AC",
};

export function getQGCategoryCode(categoryKey: string): string {
  return QG_CATEGORY_CODES[categoryKey] ?? categoryKey.toUpperCase().slice(0, 2);
}

export function getQGQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${getQGCategoryCode(categoryKey)}${questionIndex + 1}`;
}

const ACCENT_KEYS: Record<string, string> = {
  TR: "tr",
  RE: "re",
  US: "uc",
  SE: "se",
  TC: "tc",
};

export function getAccentKey(categoryId: string): string {
  return ACCENT_KEYS[categoryId] ?? "control";
}

const CATEGORY_LABELS: Record<string, string> = {
  privacy_and_security: "Privacy & Security",
  intellectual_property: "Intellectual Property",
  accessibility: "Accessibility",
  TR: "TR — Transparent",
  RE: "RE — Reliable",
  US: "US — User-Centric",
  SE: "SE — Sound",
  TC: "TC — Traceable",
};

export function getCategoryLabel(categoryId: string): string {
  return CATEGORY_LABELS[categoryId] ?? categoryId;
}

export function computeCompletion(
  evaluations: Evaluation[],
  rubric: RubricData,
  usesAi: boolean = true,
): number {
  const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, usesAi));
  let scored = 0;
  for (const e of evaluations) {
    if (e.score !== "" && e.score !== undefined && visibleIds.has(e.rubricId)) scored++;
  }
  return visibleIds.size > 0 ? Math.round((scored / visibleIds.size) * 100) : 0;
}

export function getLinkedRubricIdsForCapture(
  captureId: string,
  evaluations: Evaluation[],
): string[] {
  const result: string[] = [];
  for (const e of evaluations) {
    if (e.explicitEvidenceIds.includes(captureId)) result.push(e.rubricId);
  }
  return result;
}

// ── Scoring functions (merged from scoring.ts) ─────────────────────────

type EvalMap = Map<string, Evaluation>;
function buildEvalMap(evaluations: Evaluation[]): EvalMap {
  return new Map(evaluations.map((e) => [e.rubricId, e]));
}

export function qualityGateResults(
  evaluations: Evaluation[],
  rubric: RubricData,
  evalMap?: EvalMap,
): { id: string; label: string; result: "pass" | "fail" | "na" | "unsure" | null }[] {
  const results: { id: string; label: string; result: "pass" | "fail" | "na" | "unsure" | null }[] =
    [];
  const em = evalMap ?? buildEvalMap(evaluations);
  for (const cat of Object.keys(rubric.quality_gate)) {
    const questions = rubric.quality_gate[cat];
    for (const qId of Object.keys(questions)) {
      const q = questions[qId];
      const ev = em.get(`${cat}.${qId}`);
      const score = ev?.score;
      const result: "pass" | "fail" | "na" | "unsure" | null =
        score === "pass"
          ? "pass"
          : score === "fail"
            ? "fail"
            : score === "na"
              ? "na"
              : score === "unsure"
                ? "unsure"
                : null;
      results.push({ id: `${cat}.${qId}`, label: q.title, result });
    }
  }
  return results;
}

export function getCategoryScores(
  categoryId: string,
  evaluations: Evaluation[],
  rubric: RubricData,
  evalMap?: EvalMap,
): (number | "na" | "unsure" | "" | undefined)[] {
  const questions = rubric.scoring_rubric[categoryId];
  if (!questions) return [];
  const scores: (number | "na" | "unsure" | "" | undefined)[] = [];
  const em = evalMap ?? buildEvalMap(evaluations);
  for (const qId of Object.keys(questions)) {
    const ev = em.get(`${categoryId}.${qId}`);
    const s = ev?.score;
    scores.push(typeof s === "number" || s === "na" || s === "unsure" || s === "" ? s : undefined);
  }
  return scores;
}

const SCORE_COLORS: Record<number, string> = {
  0: "#c60c30",
  1: "#c2410c",
  2: "#0e7490",
  3: "#4a8355",
};
export function scoreColor(s: number | "na" | "unsure" | undefined): string {
  if (s === "na" || s === undefined) return "#4c5e74";
  if (s === "unsure") return "#5a6e82";
  return SCORE_COLORS[s] ?? "#4c5e74";
}

export function distributionBar(scores: (number | "na" | "unsure" | "" | undefined)[]): string {
  let numCount = 0;
  const counts = [0, 0, 0, 0];
  for (const s of scores) {
    if (typeof s === "number") {
      counts[s]++;
      numCount++;
    }
  }
  if (numCount === 0) return '<div class="dist-bar"><div class="dist-empty">No scores</div></div>';
  let segments = "";
  const labels: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pct = (counts[i] / numCount) * 100;
    segments += `<div class="dist-seg" style="width:${pct}%;background:${scoreColor(i as 0 | 1 | 2 | 3)}"></div>`;
    if (counts[i] > 0)
      labels.push(`<span style="color:${scoreColor(i as 0 | 1 | 2 | 3)}">${i}:${counts[i]}</span>`);
  }
  return `<div class="dist-bar" style="height:10px;border:1px solid rgba(0,0,0,0.12);border-radius:2px">${segments}</div><div class="dist-labels">${labels.join(" ")}</div>`;

export function principleAverage(
  categoryId: string,
  evaluations: Evaluation[],
  rubric: RubricData,
  evalMap?: EvalMap,
): number | null {
  const questions = rubric.scoring_rubric[categoryId];
  if (!questions) return null;
  let sum = 0;
  let count = 0;
  const em = evalMap ?? buildEvalMap(evaluations);
  for (const qId of Object.keys(questions)) {
    const ev = em.get(`${categoryId}.${qId}`);
    if (typeof ev?.score === "number") {
      sum += ev.score;
      count++;
    }
  }
  return count > 0 ? sum / count : null;
}

export function countUnsure(
  categoryId: string,
  evaluations: Evaluation[],
  rubric: RubricData,
  evalMap?: EvalMap,
  usesAi: boolean = true,
): number {
  const em = evalMap ?? buildEvalMap(evaluations);
  const questions = rubric.scoring_rubric[categoryId];
  if (!questions) return 0;
  let count = 0;
  for (const [qId, question] of Object.entries(questions)) {
    if (!usesAi && question.ai_only) continue;
    if (em.get(`${categoryId}.${qId}`)?.score === "unsure") count++;
  }
  return count;
}
