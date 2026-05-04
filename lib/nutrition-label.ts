import { getCategoryLabel } from "./rubric";
import { averageScoreIndicatorUrl } from "./pdf-score-indicator";
import { PRINCIPLES } from "./principles";
import type { Evaluation, RubricData, SessionMetadata } from "./types";

function reviewId(startTime: string): string {
  const d = new Date(startTime);
  return `REV-${String(d.getFullYear()).slice(-2)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getCategoryScores(categoryId: string, evaluations: Evaluation[], rubric: RubricData): (number | "na" | "" | undefined)[] {
  const questions = rubric.scoring_rubric[categoryId];
  if (!questions) return [];
  const scores: (number | "na" | "" | undefined)[] = [];
  for (const qId of Object.keys(questions)) {
    const ev = evaluations.find((e) => e.rubricId === `${categoryId}.${qId}`);
    const s = ev?.score;
    scores.push(typeof s === "number" || s === "na" || s === "" ? s : undefined);
  }
  return scores;
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
      results.push({ id: `${cat}.${qId}`, label: q.title, result });
    }
  }
  return results;
}

export async function buildPdfSummaryPage(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs are untyped
): Promise<any[]> {
  const { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } = await import("./pdf-logos");
  const date = new Date(metadata.startTime).toISOString().split("T")[0];
  const rid = reviewId(metadata.startTime);

  const gates = qualityGateResults(evaluations, rubric);
  const allPassed = gates.length > 0 && gates.every((g) => g.result === "pass");
  const anyFail = gates.some((g) => g.result === "fail");

  // Compute totals (excluding N/A)
  let totalActual = 0;
  let totalMax = 0;
  const catScores: Map<string, (number | "na" | "" | undefined)[]> = new Map();
  for (const p of PRINCIPLES) {
    if (!(p.id in rubric.scoring_rubric)) continue;
    const scores = getCategoryScores(p.id, evaluations, rubric);
    catScores.set(p.id, scores);
    for (const s of scores) {
      if (typeof s === "number") {
        totalActual += s;
        totalMax += 3;
      }
    }
  }

  // Verdict
  const ratio = totalMax > 0 ? totalActual / totalMax : 0;
  const failed = anyFail || ratio < 0.5;
  const verdict = failed ? "FAILED" : "PASSED";
  const verdictColor = failed ? "#c60c30" : "#4a8355";
  const verdictReason = anyFail
    ? "Quality gate failure"
    : ratio < 0.5
      ? `Score below threshold (${Math.round(ratio * 100)}%)`
      : `Score ${Math.round(ratio * 100)}% — meets threshold`;

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const content: any[] = [];

  // Top magenta rule
  content.push({
    canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, color: "#8e036c" }],
    margin: [0, 0, 0, 12],
  });

  // TRUST logo + tool name header
  content.push({
    columns: [
      { image: TRUST_LOGO, width: 180, margin: [0, 4, 0, 0] },
      {
        stack: [
          {
            text: metadata.toolName.toUpperCase(),
            fontSize: 16,
            bold: true,
            color: "#8e036c",
            alignment: "right",
            margin: [0, 8, 0, 2],
          },
          {
            text: `Review ID: ${rid}   |   Date: ${date}`,
            fontSize: 9,
            color: "#576578",
            alignment: "right",
            margin: [0, 0, 0, 2],
          },
        ],
        width: "*",
      },
    ],
    margin: [0, 0, 0, 8],
  });

  // Heavy bottom border under header
  content.push({
    canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, color: "#172033" }],
    margin: [0, 0, 0, 10],
  });

  // Quality gate status
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

  // Accent bar above category table
  content.push({
    canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 3, color: "#172033" }],
    margin: [0, 6, 0, 2],
  });

  // Category rows with traffic-light indicators
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const catBody: any[][] = [];
  for (const p of PRINCIPLES) {
    if (!(p.id in rubric.scoring_rubric)) continue;
    const scores = catScores.get(p.id) ?? [];
    const indicator = averageScoreIndicatorUrl(scores);

    catBody.push([
      {
        text: p.code,
        fontSize: 18,
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
        image: indicator,
        width: 80,
        margin: [0, 6, 0, 4],
      },
    ]);
  }

  content.push({
    table: { widths: [30, "*", 90], body: catBody },
    layout: {
      hLineWidth: (i: number, node: any) =>
        i === 0 ? 0 : i === node.table.body.length ? 4 : 1,
      hLineColor: (i: number) => (i === 0 ? "transparent" : "#172033"),
      vLineWidth: () => 0,
    },
    margin: [0, 0, 0, 4],
  });

  // Verdict section — full-width color bar
  content.push({
    canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 6, color: verdictColor }],
    margin: [0, 6, 0, 0],
  });

  const verdictTint = failed ? "#fdf0f2" : "#f0f7f1";
  content.push({
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: "VERDICT",
            fontSize: 11,
            color: "#576578",
            alignment: "center",
            margin: [0, 10, 0, 2],
          },
        ],
        [
          {
            text: verdict,
            fontSize: 28,
            bold: true,
            color: verdictColor,
            alignment: "center",
            margin: [0, 2, 0, 4],
          },
        ],
        [
          {
            text: verdictReason,
            fontSize: 9,
            color: "#576578",
            alignment: "center",
            margin: [0, 0, 0, 10],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      fillColor: (row: number) => (row === 1 ? verdictTint : null),
    },
    margin: [0, 0, 0, 10],
  });

  // Bottom magenta rule
  content.push({
    canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 4, color: "#8e036c" }],
    margin: [0, 8, 0, 6],
  });

  // Footer logos
  content.push({
    columns: [
      { image: LISA_EIS_LOGO, width: 60, margin: [0, 0, 8, 0] },
      { image: UT_LOGO, width: 40, margin: [0, 4, 0, 0] },
    ],
    margin: [0, 0, 0, 0],
  });

  content.push({ text: "", pageBreak: "before" });
  return content;
}
