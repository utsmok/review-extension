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

export function getQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${categoryKey}${questionIndex + 1}`;
}

/** Map quality gate category keys to short display codes */
const QG_CATEGORY_CODES: Record<string, string> = {
  privacy_and_security: "PS",
  traceability: "QT",
  accessibility: "AC",
};

export function getQGCategoryCode(categoryKey: string): string {
  return QG_CATEGORY_CODES[categoryKey] ?? categoryKey.toUpperCase().slice(0, 2);
}

export function getQGQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${getQGCategoryCode(categoryKey)}${questionIndex + 1}`;
}

export function getQuestionIndex(
  rubric: RubricData,
  categoryKey: string,
  questionId: string,
): number {
  const questions = rubric.scoring_rubric[categoryKey] ?? rubric.quality_gate[categoryKey];
  if (!questions) return 0;
  return Object.keys(questions).indexOf(questionId);
}

export function getAccentKey(categoryId: string): string {
  const map: Record<string, string> = {
    TR: "tr",
    RE: "re",
    US: "uc",
    SE: "se",
    TC: "tc",
  };
  return map[categoryId] ?? "control";
}

export function getCategoryLabel(categoryId: string): string {
  const labels: Record<string, string> = {
    privacy_and_security: "Privacy & Security",
    traceability: "Traceability",
    accessibility: "Accessibility",
    TR: "TR — Transparent",
    RE: "RE — Reliable",
    US: "US — User-Centric",
    SE: "SE — Sound",
    TC: "TC — Traceable",
  };
  return labels[categoryId] ?? categoryId;
}

export function computeCompletion(evaluations: Evaluation[], rubric: RubricData): number {
  const totalQuestions = getRubricQuestionIds(rubric).length;
  const scored = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;
  return totalQuestions > 0 ? Math.round((scored / totalQuestions) * 100) : 0;
}

export function getLinkedRubricIdsForCapture(
  captureId: string,
  evaluations: Evaluation[],
): string[] {
  return evaluations
    .filter((e) => e.explicitEvidenceIds.includes(captureId))
    .map((e) => e.rubricId);
}

// ── Scoring functions (merged from scoring.ts) ─────────────────────────

export function qualityGateResults(
  evaluations: Evaluation[],
  rubric: RubricData,
): { id: string; label: string; result: "pass" | "fail" | "na" | "unsure" | null }[] {
  const results: { id: string; label: string; result: "pass" | "fail" | "na" | "unsure" | null }[] =
    [];
  for (const [cat, questions] of Object.entries(rubric.quality_gate)) {
    for (const [qId, q] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
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
): (number | "na" | "unsure" | "" | undefined)[] {
  const questions = rubric.scoring_rubric[categoryId];
  if (!questions) return [];
  const scores: (number | "na" | "unsure" | "" | undefined)[] = [];
  for (const qId of Object.keys(questions)) {
    const ev = evaluations.find((e) => e.rubricId === `${categoryId}.${qId}`);
    const s = ev?.score;
    scores.push(typeof s === "number" || s === "na" || s === "unsure" || s === "" ? s : undefined);
  }
  return scores;
}

export function scoreColor(s: number | "na" | "unsure" | undefined): string {
  if (s === "na" || s === undefined) return "#4c5e74";
  if (s === "unsure") return "#5a6e82";
  const colors: Record<number, string> = { 0: "#c60c30", 1: "#ea580c", 2: "#0e7490", 3: "#4a8355" };
  return colors[s] ?? "#4c5e74";
}

export function distributionBar(scores: (number | "na" | "unsure" | "" | undefined)[]): string {
  const numeric = scores.filter((s): s is number => typeof s === "number");
  if (numeric.length === 0)
    return '<div class="dist-bar"><div class="dist-empty">No scores</div></div>';
  const counts = [0, 0, 0, 0];
  for (const s of numeric) counts[s]++;
  const segments = counts
    .map((c, i) => {
      const pct = (c / numeric.length) * 100;
      return `<div class="dist-seg" style="width:${pct}%;background:${scoreColor(i as 0 | 1 | 2 | 3)}"></div>`;
    })
    .join("");
  return `<div class="dist-bar" style="height:10px;border:1px solid rgba(0,0,0,0.12);border-radius:2px">${segments}</div>`;
}

export function principleAverage(
  categoryId: string,
  evaluations: Evaluation[],
  rubric: RubricData,
): number | null {
  const scores = getCategoryScores(categoryId, evaluations, rubric);
  const numeric = scores.filter((s): s is number => typeof s === "number");
  if (numeric.length === 0) return null;
  return numeric.reduce((a, b) => a + b, 0) / numeric.length;
}
