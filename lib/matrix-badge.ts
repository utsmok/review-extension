import { TRUST_RUBRIC } from "./rubric";
import type { Evaluation, SessionMetadata } from "./types";

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

const SCORE_TINTS: Record<number, string> = {
  0: "#f9e3e7",
  1: "#fdf0e7",
  2: "#e6f3f6",
  3: "#eaf3ec",
};

const CELL_W = 56;
const CELL_H = 40;
const GAP = 1;
const STRIP_H = 3;

function getCategoryScore(categoryId: string, evaluations: Evaluation[]): number | null {
  const questions = TRUST_RUBRIC.scoring_rubric[categoryId];
  if (!questions) return null;

  let sum = 0;
  let any = false;
  for (const qId of Object.keys(questions)) {
    const ev = evaluations.find((e) => e.rubricId === `${categoryId}.${qId}`);
    if (ev && typeof ev.score === "number") {
      sum += ev.score as number;
      any = true;
    }
  }
  return any ? sum : null;
}

function qualityGateStatus(evaluations: Evaluation[]): "pass" | "fail" | "unknown" {
  let hasAny = false;
  for (const [, questions] of Object.entries(TRUST_RUBRIC.quality_gate)) {
    for (const qId of Object.keys(questions)) {
      const ev = evaluations.find((e) => e.rubricId.endsWith(`.${qId}`));
      if (ev?.score === "fail") return "fail";
      if (ev?.score === "pass") hasAny = true;
    }
  }
  return hasAny ? "pass" : "unknown";
}

export function generateMatrixBadgeSvg(evaluations: Evaluation[]): string {
  const totalW = PRINCIPLES.length * CELL_W + (PRINCIPLES.length - 1) * GAP;
  const fullH = STRIP_H + CELL_H;

  const gateStatus = qualityGateStatus(evaluations);
  const stripColor =
    gateStatus === "pass" ? "#4a8355" : gateStatus === "fail" ? "#c60c30" : "#bfc6cf";

  let cells = "";
  for (let i = 0; i < PRINCIPLES.length; i++) {
    const p = PRINCIPLES[i];
    const x = i * (CELL_W + GAP);
    const y = STRIP_H;
    const score = getCategoryScore(p.id, evaluations);
    const scoreColor = score !== null ? (SCORE_COLORS[score] ?? "#bfc6cf") : "#bfc6cf";
    const bgColor = score !== null ? (SCORE_TINTS[score] ?? "#f3f4f6") : "#f3f4f6";
    const scoreText = score !== null ? String(score) : "—";

    cells += `
      <rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${bgColor}" />
      <rect x="${x}" y="${y}" width="${CELL_W}" height="3" fill="${p.color}" />
      <text x="${x + CELL_W / 2}" y="${y + 16}" text-anchor="middle"
            font-family="monospace" font-size="11" font-weight="700"
            fill="${p.color}" letter-spacing="0.02em">${p.code}</text>
      <text x="${x + CELL_W / 2}" y="${y + 32}" text-anchor="middle"
            font-family="monospace" font-size="14" font-weight="700"
            fill="${scoreColor}">${scoreText}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg"
     width="${totalW}" height="${fullH}" viewBox="0 0 ${totalW} ${fullH}">
  <rect width="${totalW}" height="${fullH}" rx="2" fill="#fafbfc" stroke="#bfc6cf" stroke-width="1"/>
  <rect width="${totalW}" height="${STRIP_H}" rx="2" fill="${stripColor}"/>
  <rect y="${STRIP_H}" width="${totalW}" height="${fullH - STRIP_H}" fill="#fafbfc"/>
  ${cells}
</svg>`;
}

export function generateMatrixBadgeHtml(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
): string {
  const svg = generateMatrixBadgeSvg(evaluations);
  const date = new Date(metadata.startTime).toISOString().split("T")[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TRUST Matrix Badge — ${metadata.toolName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; background: #eef0f3; display: flex; justify-content: center; padding: 32px; }
  .card { background: #fafbfc; border: 1px solid #bfc6cf; border-radius: 2px; padding: 24px; max-width: 420px; width: 100%; }
  .card h1 { font-family: "Arial Narrow", Arial, sans-serif; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #002c5f; margin-bottom: 4px; }
  .card .meta { font-family: monospace; font-size: 0.6875rem; color: #576578; margin-bottom: 16px; }
  .badge-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
  .footer { font-family: monospace; font-size: 0.6875rem; color: #8b9bb0; text-align: center; }
</style>
</head>
<body>
<div class="card">
  <h1>TRUST Evaluation</h1>
  <div class="meta">${metadata.toolName} | ${date} | ${metadata.toolUrl}</div>
  <div class="badge-wrap">${svg}</div>
  <div class="footer">TRUST Framework v${TRUST_RUBRIC.version} — ${TRUST_RUBRIC.framework_name}</div>
</div>
</body>
</html>`;
}
