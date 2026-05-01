import { getCategoryLabel, TRUST_RUBRIC } from "./rubric";
import type {
  Capture,
  Evaluation,
  ReviewSummary,
  ReviewSummaryCategory,
  SessionMetadata,
} from "./types";
import { generateMatrixBadgeSvg } from "./matrix-badge";

const PRINCIPLES = [
  { id: "TR", code: "TR", color: "#2563eb", tint: "#e8effc" },
  { id: "RE", code: "RE", color: "#16a34a", tint: "#e6f5ec" },
  { id: "US", code: "US", color: "#9333ea", tint: "#f0e6fc" },
  { id: "SE", code: "SE", color: "#ea580c", tint: "#fdf0e7" },
  { id: "TC", code: "TC", color: "#0d9488", tint: "#e6f5f4" },
] as const;

const SCORE_COLORS: Record<number, string> = {
  0: "#c60c30",
  1: "#ea580c",
  2: "#0e7490",
  3: "#4a8355",
};
const SCORE_TINTS: Record<number, string> = {
  0: "#f9e3e7",
  1: "#fdf0e7",
  2: "#e6f3f6",
  3: "#eaf3ec",
};
const SCORE_BORDERS: Record<number, string> = {
  0: "#e8b0b8",
  1: "#eac8a8",
  2: "#b0cdd6",
  3: "#b8d4c0",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function reviewId(startTime: string): string {
  const d = new Date(startTime);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `REV-${yy}-${mm}`;
}

function getCategoryScore(categoryId: string, evaluations: Evaluation[]): number {
  const questions = TRUST_RUBRIC.scoring_rubric[categoryId];
  if (!questions) return 0;
  let sum = 0;
  for (const qId of Object.keys(questions)) {
    const ev = evaluations.find((e) => e.rubricId === `${categoryId}.${qId}`);
    if (ev && typeof ev.score === "number") sum += ev.score;
  }
  return sum;
}

function getCategoryMax(categoryId: string): number {
  const questions = TRUST_RUBRIC.scoring_rubric[categoryId];
  return questions ? Object.keys(questions).length * 3 : 0;
}

function totalMax(): number {
  let max = 0;
  for (const cat of Object.keys(TRUST_RUBRIC.scoring_rubric)) {
    max += getCategoryMax(cat);
  }
  return max;
}

function qualityGateResults(
  evaluations: Evaluation[],
): { id: string; label: string; result: "pass" | "fail" | null }[] {
  const results: { id: string; label: string; result: "pass" | "fail" | null }[] = [];
  for (const [cat, questions] of Object.entries(TRUST_RUBRIC.quality_gate)) {
    for (const [qId, q] of Object.entries(questions)) {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      const result =
        ev?.score === "pass" ? "pass" : ev?.score === "fail" ? "fail" : null;
      results.push({ id: `${cat}.${qId}`, label: q.title, result });
    }
  }
  return results;
}

export function generateReviewSummary(
  metadata: SessionMetadata,
  _captures: Capture[],
  evaluations: Evaluation[],
): ReviewSummary {
  const categories: Record<string, ReviewSummaryCategory> = {};
  let aggregate = 0;
  let maxPossible = 0;

  for (const [cat, questions] of Object.entries(TRUST_RUBRIC.scoring_rubric)) {
    const items = [];
    let actual = 0;
    const catMax = Object.keys(questions).length * 3;

    for (const [qId, levels] of Object.entries(questions)) {
      const rubricId = `${cat}.${qId}`;
      const ev = evaluations.find((e) => e.rubricId === rubricId);
      const score = ev && typeof ev.score === "number" ? (ev.score as number) : null;
      const level =
        score !== null ? (levels as unknown as Record<string, string>)[String(score)] ?? null : null;
      if (score !== null) actual += score;
      items.push({ id: rubricId, score, level });
    }

    categories[cat] = {
      id: cat,
      label: getCategoryLabel(cat),
      accentKey: cat,
      maxPossible: catMax,
      actual,
      items,
    };
    aggregate += actual;
    maxPossible += catMax;
  }

  const gateItems = qualityGateResults(evaluations);
  const allPassed = gateItems.length > 0 && gateItems.every((g) => g.result === "pass");

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    framework: { name: TRUST_RUBRIC.framework_name, version: TRUST_RUBRIC.version },
    session: {
      toolName: metadata.toolName,
      toolUrl: metadata.toolUrl,
      startTime: metadata.startTime,
    },
    qualityGates: {
      allPassed,
      items: gateItems.map((g) => ({
        id: g.id,
        requirement: g.label,
        result: g.result,
      })),
    },
    scores: { aggregate, maxPossible, categories },
  };
}

export function generateNutritionLabelHtml(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
): string {
  const svg = generateMatrixBadgeSvg(evaluations);
  const date = new Date(metadata.startTime).toISOString().split("T")[0];
  const rid = reviewId(metadata.startTime);
  const tMax = totalMax();
  let tActual = 0;

  const gates = qualityGateResults(evaluations);
  const allGatesPass = gates.length > 0 && gates.every((g) => g.result === "pass");
  const gateIndicatorColor = allGatesPass ? "#4a8355" : gates.some((g) => g.result === "fail") ? "#c60c30" : "#bfc6cf";

  let gateHtml = "";
  for (const g of gates) {
    const icon = g.result === "pass" ? "✓" : g.result === "fail" ? "✗" : "○";
    const color = g.result === "pass" ? "#4a8355" : g.result === "fail" ? "#c60c30" : "#8b9bb0";
    const text = g.result === "pass" ? "PASS" : g.result === "fail" ? "FAIL" : "—";
    gateHtml += `<div class="gate-row">
      <span class="gate-icon" style="color:${color}">${icon}</span>
      <span class="gate-label">${esc(g.label)}</span>
      <span class="gate-result" style="color:${color}">${text}</span>
    </div>`;
  }

  let categoriesHtml = "";
  for (const p of PRINCIPLES) {
    const questions = TRUST_RUBRIC.scoring_rubric[p.id];
    if (!questions) continue;

    const catMax = getCategoryMax(p.id);
    const catActual = getCategoryScore(p.id, evaluations);
    tActual += catActual;

    let itemsHtml = "";
    for (const [qId, levels] of Object.entries(questions)) {
      const rubricId = `${p.id}.${qId}`;
      const ev = evaluations.find((e) => e.rubricId === rubricId);
      const score = ev && typeof ev.score === "number" ? (ev.score as number) : null;
      const level =
        score !== null
          ? (levels as unknown as Record<string, string>)[String(score)] ?? ""
          : "";
      const scoreColor = score !== null ? SCORE_COLORS[score] : "#8b9bb0";
      const scoreTint = score !== null ? SCORE_TINTS[score] : "#f3f4f6";
      const scoreBorder = score !== null ? SCORE_BORDERS[score] : "#bfc6cf";
      const scoreText = score !== null ? `${score}/3` : "—";

      itemsHtml += `<div class="item-row">
        <span class="item-id">${esc(qId.replace(/_/g, " "))}</span>
        <span class="score-box" style="background:${scoreTint};color:${scoreColor};border-color:${scoreBorder}">${scoreText}</span>
        <span class="item-level">${esc(level)}</span>
      </div>`;
    }

    categoriesHtml += `<div class="cat-block" data-accent="${p.code}">
      <div class="cat-header" style="border-left-color:${p.color};background:${p.tint}">
        <span class="cat-code" style="color:${p.color}">${p.code}</span>
        <span class="cat-name">${esc(getCategoryLabel(p.id).replace(/^[A-Z] — /, ""))}</span>
        <span class="cat-score">${catActual}/${catMax}</span>
      </div>
      ${itemsHtml}
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TRUST Nutrition Label — ${esc(metadata.toolName)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;background:#eef0f3;color:#172033;line-height:1.55;padding:24px}
  .label{max-width:480px;margin:0 auto;background:#fafbfc;border:1px solid #bfc6cf;border-radius:2px;overflow:hidden}
  .top-bar{height:5px;background:#002c5f}
  .badge-wrap{padding:12px 16px 8px;display:flex;justify-content:center;background:#f3f4f6}
  .header{background:#002c5f;padding:12px 16px}
  .header h1{font-family:"Arial Narrow",Arial,sans-serif;font-size:0.875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#fff;margin-bottom:4px}
  .header .meta{font-family:monospace;font-size:0.6875rem;color:#bfc6cf;letter-spacing:0.02em}
  .gate-block{padding:12px 16px;border-bottom:1px solid #bfc6cf}
  .gate-title{font-family:"Arial Narrow",Arial,sans-serif;font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#002c5f;margin-bottom:8px}
  .gate-indicator{display:inline-block;font-family:monospace;font-size:0.6875rem;font-weight:700;padding:2px 8px;border-radius:1px;margin-bottom:8px;letter-spacing:0.02em}
  .gate-row{display:flex;align-items:center;padding:3px 0;gap:8px}
  .gate-icon{font-family:monospace;font-size:0.75rem;font-weight:700;width:16px;text-align:center}
  .gate-label{font-size:0.75rem;color:#172033;flex:1}
  .gate-result{font-family:monospace;font-size:0.6875rem;font-weight:700;letter-spacing:0.02em}
  .cat-block{border-bottom:1px solid #bfc6cf}
  .cat-header{display:flex;align-items:center;padding:8px 16px;gap:8px;border-left:6px solid}
  .cat-code{font-family:monospace;font-size:0.6875rem;font-weight:700;letter-spacing:0.02em}
  .cat-name{font-family:"Arial Narrow",Arial,sans-serif;font-size:0.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#172033;flex:1}
  .cat-score{font-family:monospace;font-size:0.75rem;font-weight:700;color:#172033}
  .item-row{display:flex;align-items:baseline;padding:4px 16px 4px 30px;gap:8px}
  .item-id{font-family:monospace;font-size:0.6875rem;color:#576578;min-width:140px}
  .score-box{font-family:monospace;font-size:0.6875rem;font-weight:700;padding:1px 6px;border:1px solid;border-radius:2px;min-width:36px;text-align:center;letter-spacing:0.02em}
  .item-level{font-size:0.6875rem;color:#576578;flex:1}
  .footer{padding:12px 16px;background:#f3f4f6;display:flex;justify-content:space-between;align-items:center}
  .footer-left{font-family:"Arial Narrow",Arial,sans-serif;font-size:0.875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#002c5f}
  .footer-right{font-family:monospace;font-size:0.625rem;color:#8b9bb0;text-align:right}
  .footer-right a{color:#007d9c;text-decoration:none}
  .provenance{padding:8px 16px;border-top:1px solid #bfc6cf;font-family:monospace;font-size:0.625rem;color:#8b9bb0;display:flex;justify-content:space-between}
</style>
</head>
<body>
<div class="label">
  <div class="top-bar"></div>
  <div class="badge-wrap">${svg}</div>
  <div class="header">
    <h1>Trust Evaluation Data</h1>
    <div class="meta">TOOL: ${esc(metadata.toolName)} | ID: ${rid} | DATE: ${date}</div>
  </div>
  <div class="gate-block">
    <div class="gate-title">Quality Gate</div>
    <span class="gate-indicator" style="background:${gateIndicatorColor}16;color:${gateIndicatorColor}">${allGatesPass ? "ALL PASSED" : gates.some((g) => g.result === "fail") ? "GATE FAILED" : "INCOMPLETE"}</span>
    ${gateHtml}
  </div>
  ${categoriesHtml}
  <div class="footer">
    <span class="footer-left">Aggregate: ${tActual}/${tMax}</span>
    <span class="footer-right">Reviewed ${date}<br/>Framework v${TRUST_RUBRIC.version}</span>
  </div>
  <div class="provenance">
    <span>${esc(metadata.toolUrl)}</span>
    <span>${TRUST_RUBRIC.framework_name}</span>
  </div>
</div>
</body>
</html>`;
}

export function buildPdfSummaryPage(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs are untyped
): any[] {
  const date = new Date(metadata.startTime).toISOString().split("T")[0];
  const rid = reviewId(metadata.startTime);
  const tMax = totalMax();
  let tActual = 0;

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const content: any[] = [];

  // Header
  content.push({
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              { text: "TRUST EVALUATION DATA", fontSize: 11, bold: true, color: "#ffffff", font: "Roboto" },
              {
                text: `TOOL: ${metadata.toolName} | ID: ${rid} | DATE: ${date}`,
                fontSize: 7,
                color: "#bfc6cf",
                margin: [0, 2, 0, 0],
              },
            ],
            fillColor: "#002c5f",
            margin: [10, 8, 10, 8],
          },
        ],
      ],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
    margin: [0, 0, 0, 10],
  });

  // Matrix badge as colored table
  const badgeCells = PRINCIPLES.map((p) => {
    const catMax = getCategoryMax(p.id);
    const catActual = getCategoryScore(p.id, evaluations);
    const scoreRatio = catMax > 0 ? catActual / catMax : 0;
    const scoreIdx = Math.round(scoreRatio * 3) as 0 | 1 | 2 | 3;
    const bgColor = SCORE_TINTS[scoreIdx] ?? "#f3f4f6";
    tActual += catActual;

    return {
      stack: [
        {
          text: p.code,
          fontSize: 8,
          bold: true,
          color: p.color,
          alignment: "center",
          margin: [0, 2, 0, 0],
        },
        {
          text: `${catActual}/${catMax}`,
          fontSize: 10,
          bold: true,
          color: SCORE_COLORS[scoreIdx] ?? "#8b9bb0",
          alignment: "center",
          margin: [0, 2, 0, 2],
        },
      ],
      fillColor: bgColor,
      margin: [4, 4, 4, 4],
    };
  });

  content.push({
    table: {
      widths: Array(PRINCIPLES.length).fill("*"),
      body: [badgeCells],
    },
    layout: {
      hLineColor: () => "#bfc6cf",
      hLineWidth: () => 0.5,
      vLineColor: () => "#bfc6cf",
      vLineWidth: () => 0.5,
    },
    margin: [0, 0, 0, 10],
  });

  // Quality gates
  const gates = qualityGateResults(evaluations);
  const allPassed = gates.length > 0 && gates.every((g) => g.result === "pass");

  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const gateBody: any[][] = [
    [
      { text: "QUALITY GATE", fontSize: 7, bold: true, color: "#ffffff", fillColor: "#002c5f" },
      {
        text: allPassed ? "ALL PASSED" : "REVIEW REQUIRED",
        fontSize: 7,
        bold: true,
        color: allPassed ? "#4a8355" : "#c60c30",
        fillColor: "#002c5f",
        alignment: "right",
      },
    ],
  ];

  for (const g of gates) {
    const resultText = g.result === "pass" ? "PASS" : g.result === "fail" ? "FAIL" : "—";
    const resultColor = g.result === "pass" ? "#4a8355" : g.result === "fail" ? "#c60c30" : "#8b9bb0";
    gateBody.push([
      { text: g.label, fontSize: 7, color: "#172033" },
      { text: resultText, fontSize: 7, bold: true, color: resultColor, alignment: "right" },
    ]);
  }

  content.push({
    table: { widths: ["*", 60], body: gateBody },
    layout: {
      hLineColor: () => "#e5e7eb",
      hLineWidth: () => 0.5,
      fillColor: (row: number) => (row === 0 ? "#002c5f" : null),
    },
    margin: [0, 0, 0, 10],
  });

  // Category aggregates
  // biome-ignore lint/suspicious/noExplicitAny: pdfmake defs
  const catBody: any[][] = [
    [
      { text: "CATEGORY", fontSize: 7, bold: true, color: "#ffffff", fillColor: "#002c5f" },
      { text: "SCORE", fontSize: 7, bold: true, color: "#ffffff", fillColor: "#002c5f", alignment: "center" },
      { text: "RATING", fontSize: 7, bold: true, color: "#ffffff", fillColor: "#002c5f", alignment: "center" },
    ],
  ];

  for (const p of PRINCIPLES) {
    const catMax = getCategoryMax(p.id);
    const catActual = getCategoryScore(p.id, evaluations);
    const scoreRatio = catMax > 0 ? catActual / catMax : 0;
    const scoreIdx = Math.round(scoreRatio * 3) as 0 | 1 | 2 | 3;
    const label = getCategoryLabel(p.id);

    catBody.push([
      { text: label, fontSize: 8, color: "#172033" },
      {
        text: `${catActual}/${catMax}`,
        fontSize: 9,
        bold: true,
        color: SCORE_COLORS[scoreIdx] ?? "#8b9bb0",
        alignment: "center",
      },
      {
        text: scoreIdx >= 2 ? "●" : scoreIdx === 1 ? "◐" : "○",
        fontSize: 10,
        color: SCORE_COLORS[scoreIdx] ?? "#8b9bb0",
        alignment: "center",
      },
    ]);
  }

  // Aggregate row
  const aggRatio = tMax > 0 ? tActual / tMax : 0;
  const aggIdx = Math.round(aggRatio * 3) as 0 | 1 | 2 | 3;
  catBody.push([
    { text: "AGGREGATE", fontSize: 8, bold: true, color: "#002c5f", fillColor: "#f3f4f6" },
    {
      text: `${tActual}/${tMax}`,
      fontSize: 10,
      bold: true,
      color: SCORE_COLORS[aggIdx] ?? "#8b9bb0",
      fillColor: "#f3f4f6",
      alignment: "center",
    },
    { text: "", fillColor: "#f3f4f6" },
  ]);

  content.push({
    table: { widths: ["*", 50, 40], body: catBody },
    layout: {
      hLineColor: () => "#e5e7eb",
      hLineWidth: () => 0.5,
      fillColor: (row: number, col: number) => {
        if (row === 0) return "#002c5f";
        if (row === catBody.length - 1) return "#f3f4f6";
        return col === 0 ? null : null;
      },
    },
    margin: [0, 0, 0, 8],
  });

  // Provenance
  content.push({
    columns: [
      {
        text: `Framework: ${TRUST_RUBRIC.framework_name} v${TRUST_RUBRIC.version}`,
        fontSize: 6,
        color: "#8b9bb0",
      },
      {
        text: `Generated: ${new Date().toISOString().split("T")[0]}`,
        fontSize: 6,
        color: "#8b9bb0",
        alignment: "right",
      },
    ],
    margin: [0, 4, 0, 0],
  });

  // Page break before detail pages
  content.push({ text: "", pageBreak: "before" });

  return content;
}
