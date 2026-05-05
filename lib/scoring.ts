import type { Evaluation, RubricData } from "./types";

export function qualityGateResults(
  evaluations: Evaluation[],
  rubric: RubricData,
): { id: string; label: string; result: "pass" | "fail" | "na" | null }[] {
  const results: { id: string; label: string; result: "pass" | "fail" | "na" | null }[] = [];
  for (const [cat, questions] of Object.entries(rubric.quality_gate)) {
    for (const [qId, q] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      const score = ev?.score;
      const result: "pass" | "fail" | "na" | null =
        score === "pass" ? "pass" : score === "fail" ? "fail" : score === "na" ? "na" : null;
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
  if (s === "na" || s === undefined) return "#8b9bb0";
  if (s === "unsure") return "#6b7280";
  const colors: Record<number, string> = { 0: "#c60c30", 1: "#ea580c", 2: "#0e7490", 3: "#4a8355" };
  return colors[s] ?? "#8b9bb0";
}

export function distributionBar(scores: (number | "na" | "unsure" | "" | undefined)[]): string {
  const numeric = scores.filter((s): s is number => typeof s === "number");
  if (numeric.length === 0) return '<div class="dist-bar"><div class="dist-empty">No scores</div></div>';
  const counts = [0, 0, 0, 0];
  for (const s of numeric) counts[s]++;
  const segments = counts.map((c, i) => {
    const pct = (c / numeric.length) * 100;
    return `<div class="dist-seg" style="width:${pct}%;background:${scoreColor(i as 0|1|2|3)}"></div>`;
  }).join("");
  return `<div class="dist-bar">${segments}</div>`;
}
