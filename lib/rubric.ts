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

export function getQuestionIndex(
  rubric: RubricData,
  categoryKey: string,
  questionId: string,
): number {
  const questions =
    rubric.scoring_rubric[categoryKey] ?? rubric.quality_gate[categoryKey];
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

export function getLinkedRubricIdsForCapture(captureId: string, evaluations: Evaluation[]): string[] {
  return evaluations
    .filter((e) => e.explicitEvidenceIds.includes(captureId))
    .map((e) => e.rubricId);
}
