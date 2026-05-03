import { getCategoryLabel } from "./rubric";
import type { Evaluation, RubricData, SessionMetadata } from "./types";

const PRINCIPLES = [
  { id: "TR", code: "TR", color: "#2563eb" },
  { id: "RE", code: "RE", color: "#16a34a" },
  { id: "US", code: "US", color: "#9333ea" },
  { id: "SE", code: "SE", color: "#ea580c" },
  { id: "TC", code: "TC", color: "#0d9488" },
] as const;

const SCORE_COLORS: Record<number, string> = {
  0: "#c60c30",
  1: "#ea580c",
  2: "#0e7490",
  3: "#4a8355",
};

function reviewId(startTime: string): string {
  const d = new Date(startTime);
  return `REV-${String(d.getFullYear()).slice(-2)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCategoryScore(categoryId: string, evaluations: Evaluation[], rubric: RubricData): number {
  const questions = rubric.scoring_rubric[categoryId];
  if (!questions) return 0;
  let sum = 0;
  for (const qId of Object.keys(questions)) {
    const ev = evaluations.find((e) => e.rubricId === `${categoryId}.${qId}`);
    if (ev && typeof ev.score === "number") sum += ev.score;
  }
  return sum;
}

function getCategoryMax(categoryId: string, rubric: RubricData): number {
  const questions = rubric.scoring_rubric[categoryId];
  return questions ? Object.keys(questions).length * 3 : 0;
}

function totalMax(rubric: RubricData): number {
  let max = 0;
  for (const cat of Object.keys(rubric.scoring_rubric)) max += getCategoryMax(cat, rubric);
  return max;
}

function qualityGateResults(
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
      results.push({
        id: `${cat}.${qId}`,
        label: q.title,
        result,
      });
    }
  }
  return results;
}

export function buildPdfSummaryPage(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs are untyped
): any[] {
  const date = new Date(metadata.startTime).toISOString().split("T")[0];
  const rid = reviewId(metadata.startTime);
  const tMax = totalMax(rubric);
  let tActual = 0;

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const content: any[] = [];

  // Heavy Black Nutrition Label Header
  content.push({
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: "TRUST FACTS",
            fontSize: 28,
            bold: true,
            color: "#172033",
            margin: [0, 0, 0, -4],
            font: "Roboto",
          },
        ],
        [
          {
            text: `${metadata.toolName.toUpperCase()}`,
            fontSize: 16,
            bold: true,
            color: "#172033",
            margin: [0, 0, 0, 4],
          },
        ],
        [
          {
            text: `Review ID: ${rid}   |   Date: ${date}`,
            fontSize: 10,
            color: "#172033",
            margin: [0, 0, 0, 2],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) =>
        i === node.table.body.length ? 8 : i === 2 ? 1 : 0,
      hLineColor: () => "#172033",
      vLineWidth: () => 0,
    },
    margin: [0, 0, 0, 8],
  });

  // Quality gates Row (Heavy border underneath)
  const gates = qualityGateResults(evaluations, rubric);
  const allPassed = gates.length > 0 && gates.every((g) => g.result === "pass");
  const anyFail = gates.some((g) => g.result === "fail");

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const gateBody: any[][] = [
    [
      {
        text: "QUALITY GATE STATUS",
        fontSize: 12,
        bold: true,
        color: "#172033",
        margin: [0, 4, 0, 4],
      },
      {
        text: allPassed ? "PASSED" : anyFail ? "FAILED" : "INCOMPLETE",
        fontSize: 12,
        bold: true,
        color: allPassed ? "#4a8355" : anyFail ? "#c60c30" : "#576578",
        alignment: "right",
        margin: [0, 4, 0, 4],
      },
    ],
  ];
  content.push({
    table: { widths: ["*", 100], body: gateBody },
    layout: {
      hLineWidth: (i: number, node: any) => (i === node.table.body.length ? 4 : 0),
      hLineColor: () => "#172033",
      vLineWidth: () => 0,
    },
    margin: [0, 0, 0, 8],
  });

  // Category rows
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const catBody: any[][] = [];
  for (const p of PRINCIPLES) {
    if (!(p.id in rubric.scoring_rubric)) continue;
    const catMax = getCategoryMax(p.id, rubric);
    const catActual = getCategoryScore(p.id, evaluations, rubric);
    const ratio = catMax > 0 ? catActual / catMax : 0;
    tActual += catActual;

    catBody.push([
      {
        text: p.code,
        fontSize: 14,
        bold: true,
        color: p.color,
        margin: [0, 4, 0, 4],
      },
      {
        text: getCategoryLabel(p.id).replace(/^.*?— /, ""),
        fontSize: 11,
        bold: true,
        color: "#172033",
        margin: [0, 6, 0, 4],
      },
      {
        text: `${catActual}/${catMax}`,
        fontSize: 12,
        bold: true,
        color: SCORE_COLORS[Math.round(ratio * 3) as 0 | 1 | 2 | 3] ?? "#172033",
        alignment: "right",
        margin: [0, 5, 0, 4],
      },
    ]);
  }

  content.push({
    table: { widths: [30, "*", 60], body: catBody },
    layout: {
      hLineWidth: () => 1,
      hLineColor: () => "#172033",
      vLineWidth: () => 0,
    },
    margin: [0, 0, 0, 4],
  });

  // Aggregate row (Thick borders)
  const aggR = tMax > 0 ? tActual / tMax : 0;
  content.push({
    table: {
      widths: ["*", 100],
      body: [
        [
          {
            text: "TOTAL SCORE",
            fontSize: 18,
            bold: true,
            color: "#172033",
            margin: [0, 6, 0, 6],
          },
          {
            text: `${tActual}/${tMax}`,
            fontSize: 18,
            bold: true,
            color: SCORE_COLORS[Math.round(aggR * 3) as 0 | 1 | 2 | 3] ?? "#172033",
            alignment: "right",
            margin: [0, 6, 0, 6],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => (i === 0 ? 8 : i === node.table.body.length ? 1 : 0),
      hLineColor: () => "#172033",
      vLineWidth: () => 0,
    },
    margin: [0, 4, 0, 10],
  });

  // Provenance
  content.push({
    text: `* Evaluated systematically against the TRUST framework v${rubric.version}. Scores map to Traceable, Reliable, User-centric, Secure, and Transparent dimensions.`,
    fontSize: 8,
    color: "#576578",
    margin: [0, 0, 0, 0],
  });

  content.push({ text: "", pageBreak: "before" });
  return content;
}
