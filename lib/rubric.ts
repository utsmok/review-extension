// ── Rubric query helpers ─────────────────────────────────────────────────

import type { Evaluation, HexColor, PrincipleSummary, RubricData, ScoringQuestion } from "./types";

/** Collect all rubric question IDs (quality gate + scoring) as "category.questionKey" strings. */
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

/** Like getRubricQuestionIds, but filters out ai_only questions when usesAi is false. */
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

/** Build a short display code like "TR1", "PS2" from category key + 0-based index. */
export function getQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${categoryKey}${questionIndex + 1}`;
}

/** Map quality gate category keys to short display codes */
const QG_CATEGORY_CODES: Record<string, string> = {
  privacy_and_security: "PS",
  intellectual_property: "IP",
  accessibility: "AC",
};

/** Map quality gate category keys to short display codes (e.g. "transparency" → "TR"). */
export function getQGCategoryCode(categoryKey: string): string {
  return QG_CATEGORY_CODES[categoryKey] ?? categoryKey.toUpperCase().slice(0, 2);
}

/** Build a quality-gate question code like "TR1" using the category code mapping. */
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

/** Resolve the accent color key for a category, defaulting to "control". */
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

/** Human-readable label for a category ID (e.g. "transparency" → "Transparency"). */
export function getCategoryLabel(categoryId: string): string {
  return CATEGORY_LABELS[categoryId] ?? categoryId;
}

/** Percentage (0–100) of visible questions that have been scored. */
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

/** Return rubric IDs whose evaluations explicitly link to the given capture. */
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

/** Evaluate all quality-gate questions and return pass/fail/na/unsure/null results. */
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

/** Raw score values for every question in a scoring category, in rubric order. */
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

// ── Score colors and rendering ───────────────────────────────────────────
const SCORE_COLORS: Record<number, HexColor> = {
  0: "#c60c30",
  1: "#c2410c",
  2: "#0e7490",
  3: "#4a8355",
};

/** Darkened report-local score colors for WCAG AA contrast on light backgrounds */
export const REPORT_SCORE_COLORS: Record<number, HexColor> = {
  0: SCORE_COLORS[0],
  1: SCORE_COLORS[1],
  2: SCORE_COLORS[2],
  3: "#3d7249",
};

/** Score color for report context (darkens score-3 green for AA compliance). */
export function reportScoreColor(s: number | "na" | "unsure" | undefined): HexColor {
  if (s === "na" || s === undefined) return "#4c5e74";
  if (s === "unsure") return "#5a6e82";
  return REPORT_SCORE_COLORS[s] ?? "#4c5e74";
}
/** Score color for the main UI (slightly lighter greens than the report variant). */
export function scoreColor(s: number | "na" | "unsure" | undefined): HexColor {
  if (s === "na" || s === undefined) return "#4c5e74";
  if (s === "unsure") return "#5a6e82";
  return SCORE_COLORS[s] ?? "#4c5e74";
}

/** Build an inline HTML distribution bar showing score counts by color. */
export function distributionBar(
  scores: (number | "na" | "unsure" | "" | undefined)[],
  colorFn: (s: number | "na" | "unsure" | undefined) => HexColor = scoreColor,
): string {
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
    segments += `<div class="dist-seg" style="width:${pct}%;background:${colorFn(i as 0 | 1 | 2 | 3)}"></div>`;
    if (counts[i] > 0)
      labels.push(`<span style="color:${colorFn(i as 0 | 1 | 2 | 3)}">${i}:${counts[i]}</span>`);
  }
  return `<div class="dist-bar" style="height:10px;border:1px solid rgba(0,0,0,0.12);border-radius:2px">${segments}</div><div class="dist-labels">${labels.join(" ")}</div>`;
}

/** Mean numeric score for a principle category, or null if no numeric scores. */
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

/** Count "unsure" answers in a scoring category (respects ai_only visibility). */
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

/** Auto-generate per-principle summaries from current evaluations and rubric data. */
export function generatePrincipleSummaries(
  evaluations: Evaluation[],
  rubric: RubricData,
  usesAi: boolean = true,
): PrincipleSummary[] {
  const evalMap = buildEvalMap(evaluations);
  const summaries: PrincipleSummary[] = [];

  for (const [categoryId, questions] of Object.entries(rubric.scoring_rubric)) {
    const questionEntries = Object.entries(questions as Record<string, ScoringQuestion>);
    const visibleQuestions = usesAi
      ? questionEntries
      : questionEntries.filter(([, q]) => !q.ai_only);

    if (visibleQuestions.length === 0) continue;

    const scoredQuestions: Array<{ code: string; score: number | string; notes: string }> = [];

    for (const [qId, _q] of visibleQuestions) {
      const rubricId = `${categoryId}.${qId}`;
      const ev = evalMap.get(rubricId);
      const idx = questionEntries.findIndex(([k]) => k === qId);
      const code = getQuestionCode(categoryId, idx);

      if (ev && ev.score !== "" && ev.score !== undefined) {
        scoredQuestions.push({ code, score: ev.score, notes: ev.notes ?? "" });
      }
    }

    if (scoredQuestions.length === 0) {
      summaries.push({ categoryId, observations: "No questions scored yet." });
      continue;
    }

    const parts: string[] = [];
    const numericScores = scoredQuestions
      .map((q) => (typeof q.score === "number" ? q.score : null))
      .filter((s): s is number => s !== null);
    const avg =
      numericScores.length > 0
        ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1)
        : "N/A";

    parts.push(`${getCategoryLabel(categoryId)}: average score ${avg}/3.`);

    const strengths = scoredQuestions.filter((q) => q.score === 3);
    const weaknesses = scoredQuestions.filter(
      (q) => typeof q.score === "number" && q.score <= 1,
    );

    if (strengths.length > 0) {
      parts.push(`Strengths: ${strengths.map((q) => q.code).join(", ")} scored 3/3.`);
    }
    if (weaknesses.length > 0) {
      parts.push(
        `Concerns: ${weaknesses.map((q) => q.code).join(", ")} scored ${weaknesses.map((q) => `${q.score}/3`).join(", ")}.`,
      );
    }

    const notesWithContent = scoredQuestions.filter((q) => q.notes.trim().length > 0);
    if (notesWithContent.length > 0) {
      parts.push(`Reviewer notes on ${notesWithContent.map((q) => q.code).join(", ")}.`);
    }

    summaries.push({ categoryId, observations: parts.join(" ") });
  }

  return summaries;
}
