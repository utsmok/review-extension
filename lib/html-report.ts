import { getCategoryLabel, getQuestionCode } from "./rubric";
import { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } from "./logos";
import { PRINCIPLES } from "./principles";
import { qualityGateResults, getCategoryScores, scoreColor, distributionBar } from "./scoring";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildHtmlReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): string {
  const date = new Date(metadata.startTime).toISOString().split("T")[0];
  const gates = qualityGateResults(evaluations, rubric);
  const allPassed = gates.length > 0 && gates.every((g) => g.result === "pass");
  const anyFail = gates.some((g) => g.result === "fail");

  let totalActual = 0;
  let totalMax = 0;
  const catScores: Map<string, (number | "na" | "unsure" | "" | undefined)[]> = new Map();
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

  const ratio = totalMax > 0 ? totalActual / totalMax : 0;
  const principleFail = PRINCIPLES.some((p) => {
    if (!(p.id in rubric.scoring_rubric)) return false;
    const scores = catScores.get(p.id) ?? [];
    const numeric = scores.filter((s): s is number => typeof s === "number");
    if (numeric.length === 0) return false;
    const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
    return avg < 1.0;
  });
  const computedFailed = anyFail || ratio < 0.6 || principleFail;
  let verdict: string;
  let verdictColor: string;
  if (finalization) {
    const gc: Record<string, string> = { pass: "#4a8355", conditional: "#ea580c", fail: "#c60c30" };
    const gl: Record<string, string> = { pass: "PASSED", conditional: "CONDITIONAL", fail: "FAILED" };
    verdict = gl[finalization.grade] ?? finalization.grade.toUpperCase();
    verdictColor = gc[finalization.grade] ?? "#576578";
  } else {
    verdict = computedFailed ? "FAILED" : "PASSED";
    verdictColor = computedFailed ? "#c60c30" : "#4a8355";
  }

  const principleLetters = PRINCIPLES.map((p) =>
    `<span style="color:${p.color};font-weight:800">${p.code[0]}</span>`
  ).join("");

  // Build category sections
  const categorySections = PRINCIPLES.map((p) => {
    if (!(p.id in rubric.scoring_rubric)) return "";
    const questions = rubric.scoring_rubric[p.id];
    const scores = catScores.get(p.id) ?? [];
    const catEvals = evaluations.filter((e) => e.rubricId.startsWith(`${p.id}.`));
    const evidenceCount = captures.filter((c) =>
      catEvals.some((e) => e.explicitEvidenceIds.includes(c.id)),
    ).length;

    const numeric = scores.filter((s): s is number => typeof s === "number");
    const avg = numeric.length > 0 ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(1) : "—";
    const catTotal = numeric.reduce((a, b) => a + b, 0);
    const catMax = numeric.length * 3;

    const rows = Object.entries(questions).map(([qId, levels], idx) => {
      const rubricId = `${p.id}.${qId}`;
      const ev = evaluations.find((e) => e.rubricId === rubricId);
      const isNa = ev?.score === "na";
      const isUnsure = ev?.score === "unsure";
      const score = typeof ev?.score === "number" ? ev.score : -1;
      const code = getQuestionCode(p.id, idx);
      const levelDesc = isNa ? "Not applicable" : isUnsure ? "Insufficient information" : score >= 0
        ? (levels as unknown as Record<string, string>)[String(score)] ?? "—"
        : "—";

      const evidenceImgs = captures
        .filter((c) => ev?.explicitEvidenceIds.includes(c.id))
        .map((c) => `
          <div class="evidence-item">
            <img src="${c.screenshotBase64}" alt="${esc(c.pageTitle)}" loading="lazy" />
            <div class="evidence-meta">
              <strong>${esc(c.pageTitle || "Capture")}</strong>
              <span class="evidence-time">${new Date(c.timestamp).toLocaleString()}</span>
              ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
            </div>
          </div>
        `).join("");

      return `
        <tr class="score-row">
          <td class="code" style="color:${p.color}">${code}</td>
          <td class="score-cell">
            <span class="score-badge" style="background:${scoreColor(isNa ? "na" : isUnsure ? "unsure" : score >= 0 ? score as 0|1|2|3 : undefined)}20;color:${scoreColor(isNa ? "na" : isUnsure ? "unsure" : score >= 0 ? score as 0|1|2|3 : undefined)}">
              ${isNa ? "N/A" : isUnsure ? "?" : score >= 0 ? score : "—"}
            </span>
          </td>
          <td class="level">${esc(levelDesc)}</td>
          <td class="notes">${esc(ev?.notes ?? "")}</td>
        </tr>
        ${evidenceImgs ? `<tr class="evidence-row"><td colspan="4"><div class="evidence-list">${evidenceImgs}</div></td></tr>` : ""}
      `;
    }).join("");

    return `
      <section class="category-section" style="--accent:${p.color}">
        <div class="category-header">
          <div class="category-letter">${p.code[0]}</div>
          <div class="category-info">
            <h2>${esc(getCategoryLabel(p.id).replace(/^.*?— /, ""))}</h2>
            <div class="category-meta">
              <span class="cat-score">${catTotal} / ${catMax}</span>
              <span class="cat-avg">avg ${avg}</span>
              <span class="cat-evidence">${evidenceCount} evidence</span>
            </div>
            ${distributionBar(scores)}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Code</th><th>Score</th><th>Level</th><th>Notes</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }).join("");

  // Quality gate rows
  const gateRows = Object.entries(rubric.quality_gate).map(([cat, questions]) =>
    Object.entries(questions).map(([qId, q]) => {
      const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
      const result = ev?.score === "pass" ? "pass" : ev?.score === "fail" ? "fail" : null;
      const color = result === "pass" ? "#4a8355" : result === "fail" ? "#c60c30" : "#8b9bb0";
      const label = result === "pass" ? "PASS" : result === "fail" ? "FAIL" : "—";
      return `
        <tr>
          <td class="code">${cat.toUpperCase()}${Object.keys(questions).indexOf(qId) + 1}</td>
          <td><span class="gate-badge" style="background:${color}18;color:${color}">${label}</span></td>
          <td>${esc(q.requirement)}</td>
          <td class="notes">${esc(ev?.notes ?? "")}</td>
        </tr>
      `;
    }).join("")
  ).join("");

  // Finalization section
  const finalizationSection = finalization ? `
    <section class="finalization-section">
      <div class="fin-bar" style="background:${verdictColor}"></div>
      <div class="fin-grade" style="color:${verdictColor};background:${verdictColor}10">
        ${verdict}
      </div>
      ${finalization.conclusion ? `<div class="fin-block"><h3>Conclusion</h3><p>${esc(finalization.conclusion)}</p></div>` : ""}
      ${finalization.strengths.length > 0 ? `
        <div class="fin-block">
          <h3 style="color:#4a8355">Strengths</h3>
          <ul>${finalization.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        </div>
      ` : ""}
      ${finalization.weaknesses.length > 0 ? `
        <div class="fin-block">
          <h3 style="color:#c60c30">Weaknesses</h3>
          <ul>${finalization.weaknesses.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        </div>
      ` : ""}
      ${finalization.recommendations ? `
        <div class="fin-block">
          <h3>Recommendations</h3>
          <p>${esc(finalization.recommendations)}</p>
        </div>
      ` : ""}
      <div class="fin-timestamp">Finalized ${new Date(finalization.finalizedAt).toLocaleString()}</div>
    </section>
  ` : "";

  // Unlinked evidence
  const unlinked = captures.filter(
    (c) => !evaluations.some((e) => e.explicitEvidenceIds.includes(c.id)),
  );
  const unlinkedSection = unlinked.length > 0 ? `
    <section class="unlinked-section">
      <h2>Additional Evidence</h2>
      ${unlinked.map((c) => `
        <div class="unlinked-item">
          <img src="${c.screenshotBase64}" alt="${esc(c.pageTitle)}" loading="lazy" />
          <div class="unlinked-meta">
            <strong>${esc(c.pageTitle || "Capture")}</strong>
            <a href="${esc(c.sourceUrl)}">${esc(c.sourceUrl)}</a>
            <span>${new Date(c.timestamp).toLocaleString()}</span>
            ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
          </div>
        </div>
      `).join("")}
    </section>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>TRUST Review: ${esc(metadata.toolName)}</title>
<style>
  :root {
    --magenta: #8e036c;
    --navy: #002c5f;
    --text: #172033;
    --muted: #576578;
    --slate: #8b9bb0;
    --border: #bfc6cf;
    --canvas: #eef0f3;
    --panel: #f3f4f6;
    --white: #fafbfc;
    --ff-body: "Inter", system-ui, sans-serif;
    --ff-heading: "Arial Narrow", Arial, sans-serif;
    --ff-mono: "JetBrains Mono", monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 15px; }
  body {
    font-family: var(--ff-body);
    color: var(--text);
    background: var(--canvas);
    line-height: 1.55;
    max-width: 900px;
    margin: 0 auto;
    padding: 24px;
  }

  /* Top bar */
  .top-bar { height: 6px; background: var(--magenta); margin: 0 -24px 24px; }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .header-tool {
    font-family: var(--ff-heading);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--magenta);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .header-meta {
    text-align: right;
    font-size: 0.8rem;
    color: var(--muted);
  }

  .divider { height: 4px; background: var(--text); margin: 0 0 16px; }

  /* TRUST letterform */
  .letterform {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 16px;
  }
  .letterform-letter {
    font-family: var(--ff-heading);
    font-size: 3rem;
    font-weight: 800;
    line-height: 1;
  }
  .letterform-score {
    margin-left: auto;
    text-align: right;
  }
  .letterform-score .total {
    font-family: var(--ff-heading);
    font-size: 1.8rem;
    font-weight: 700;
  }
  .letterform-score .pct {
    font-size: 0.75rem;
    color: var(--muted);
  }

  /* Gate summary */
  .gate-summary {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 4px solid var(--text);
    margin-bottom: 12px;
    font-family: var(--ff-heading);
    font-weight: 700;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .accent-bar { height: 3px; background: var(--text); margin: 8px 0; }

  /* Category table (nutrition label style) */
  .cat-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }
  .cat-table td { padding: 6px 8px; vertical-align: middle; }
  .cat-table .cat-code {
    font-family: var(--ff-heading);
    font-size: 1.3rem;
    font-weight: 800;
    width: 40px;
  }
  .cat-table .cat-label {
    font-weight: 700;
    font-size: 0.95rem;
  }
  .cat-table .cat-indicators { width: 100px; }
  .cat-table .cat-evidence {
    width: 50px;
    text-align: center;
    font-family: var(--ff-mono);
  }
  .cat-table .cat-evidence .count {
    font-size: 1.1rem;
    font-weight: 700;
  }
  .cat-table .cat-evidence .label {
    font-size: 0.55rem;
    color: var(--muted);
    text-transform: uppercase;
  }
  .cat-table tr + tr { border-top: 1px solid var(--border); }

  /* Distribution bar */
  .dist-bar {
    display: flex;
    height: 6px;
    background: var(--panel);
    border-radius: 1px;
    overflow: hidden;
    margin-top: 4px;
  }
  .dist-seg { min-width: 2px; }
  .dist-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    font-size: 0.6rem;
    color: var(--slate);
  }

  /* Verdict */
  .verdict-bar { height: 6px; margin-top: 12px; }
  .verdict-block {
    text-align: center;
    padding: 16px 0;
  }
  .verdict-label {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
  .verdict-text {
    font-family: var(--ff-heading);
    font-size: 2.2rem;
    font-weight: 700;
  }
  .verdict-reason {
    font-size: 0.8rem;
    color: var(--muted);
    margin-top: 4px;
  }

  .bottom-bar { height: 4px; background: var(--magenta); margin: 16px 0 8px; }

  /* Footer */
  .footer {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 0.7rem;
    color: var(--slate);
    margin-bottom: 32px;
  }

  /* Full report section */
  .report-header {
    padding-top: 24px;
    border-top: 2px solid var(--magenta);
    margin-top: 32px;
  }
  .report-header h1 {
    font-family: var(--ff-heading);
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--magenta);
    margin-bottom: 4px;
  }

  /* Quality gates table */
  .qg-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
    font-size: 0.85rem;
  }
  .qg-table th {
    background: var(--navy);
    color: #fff;
    font-family: var(--ff-heading);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 6px 8px;
    text-align: left;
  }
  .qg-table td { padding: 5px 8px; border-bottom: 1px solid var(--panel); }
  .qg-table .code {
    font-family: var(--ff-mono);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--muted);
    width: 40px;
  }
  .qg-table .notes { color: var(--muted); font-size: 0.8rem; }

  .gate-badge {
    display: inline-block;
    padding: 1px 8px;
    font-family: var(--ff-mono);
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 1px;
  }

  /* Category section */
  .category-section {
    margin-bottom: 32px;
    border-top: 3px solid var(--accent);
  }
  .category-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: color-mix(in srgb, var(--accent) 6%, var(--white));
  }
  .category-letter {
    font-family: var(--ff-heading);
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .category-info h2 {
    font-family: var(--ff-heading);
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 4px;
  }
  .category-meta {
    display: flex;
    gap: 12px;
    font-size: 0.75rem;
    color: var(--muted);
    font-family: var(--ff-mono);
    margin-bottom: 6px;
  }
  .category-section table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  .category-section th {
    background: var(--accent);
    color: #fff;
    font-family: var(--ff-heading);
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 5px 8px;
    text-align: left;
  }
  .category-section td { padding: 5px 8px; border-bottom: 1px solid var(--panel); vertical-align: top; }
  .category-section .code {
    font-family: var(--ff-mono);
    font-size: 0.75rem;
    font-weight: 700;
    width: 36px;
  }
  .category-section .score-cell { width: 44px; }
  .category-section .level { width: 180px; color: var(--muted); font-size: 0.78rem; }
  .category-section .notes { font-size: 0.78rem; }

  .score-badge {
    display: inline-block;
    padding: 1px 8px;
    font-family: var(--ff-mono);
    font-size: 0.7rem;
    font-weight: 700;
    border-radius: 1px;
  }

  .evidence-row td { padding: 0 8px 8px 52px !important; border-bottom: none !important; }
  .evidence-list { display: flex; flex-direction: column; gap: 8px; }
  .evidence-item {
    display: flex;
    gap: 12px;
    padding: 8px;
    background: var(--panel);
    border-radius: 2px;
  }
  .evidence-item img {
    max-width: 300px;
    border: 1px solid var(--border);
    border-radius: 1px;
  }
  .evidence-meta { font-size: 0.75rem; }
  .evidence-meta strong { display: block; margin-bottom: 2px; }
  .evidence-time { color: var(--muted); font-family: var(--ff-mono); font-size: 0.7rem; }

  /* Finalization */
  .finalization-section {
    border-top: 4px solid var(--magenta);
    padding-top: 16px;
    margin-bottom: 32px;
  }
  .fin-bar { height: 4px; margin-bottom: 12px; }
  .fin-grade {
    text-align: center;
    font-family: var(--ff-heading);
    font-size: 1.8rem;
    font-weight: 700;
    padding: 12px 0;
    margin-bottom: 16px;
    letter-spacing: 0.03em;
  }
  .fin-block { margin-bottom: 16px; }
  .fin-block h3 {
    font-family: var(--ff-heading);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 6px;
  }
  .fin-block p, .fin-block li { font-size: 0.85rem; line-height: 1.5; }
  .fin-block ul { padding-left: 20px; }
  .fin-timestamp { font-size: 0.7rem; color: var(--slate); text-align: right; }

  /* Unlinked evidence */
  .unlinked-section {
    border-top: 2px solid var(--magenta);
    padding-top: 16px;
    margin-bottom: 32px;
  }
  .unlinked-section h2 {
    font-family: var(--ff-heading);
    font-size: 1rem;
    text-transform: uppercase;
    color: var(--magenta);
    margin-bottom: 12px;
  }
  .unlinked-item {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--panel);
  }
  .unlinked-item img {
    max-width: 350px;
    border: 1px solid var(--border);
    border-radius: 1px;
  }
  .unlinked-meta { font-size: 0.8rem; }
  .unlinked-meta strong { display: block; margin-bottom: 4px; }
  .unlinked-meta a { color: #2563eb; font-size: 0.75rem; }
  .unlinked-meta span { display: block; color: var(--muted); font-family: var(--ff-mono); font-size: 0.7rem; }

  @media print {
    html { font-size: 12px; }
    body { max-width: none; padding: 0; background: #fff; }
    .top-bar, .divider, .accent-bar, .bottom-bar, .verdict-bar, .fin-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .category-header, .gate-badge, .score-badge, .fin-grade { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table th, .category-section th, .qg-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .report-header { page-break-before: always; border-top: none; padding-top: 0; margin-top: 0; }
    .category-section { page-break-inside: avoid; }
    .finalization-section { page-break-inside: avoid; }
    .unlinked-item { page-break-inside: avoid; }
    .evidence-item { page-break-inside: avoid; }
    .evidence-item img { max-width: 250px; }
    .unlinked-item img { max-width: 280px; }
  }
</style>
</head>
<body>

<div class="top-bar"></div>

<div class="header">
  <div>
    <img src="${TRUST_LOGO}" alt="TRUST" style="height:32px;margin-bottom:4px" />
    <div class="header-tool">${esc(metadata.toolName)}</div>
  </div>
  <div class="header-meta">
    Review ID: REV-${date.slice(2, 4)}-${date.slice(5, 7)}<br />
    Date: ${date}
  </div>
</div>

<div class="divider"></div>

<div class="letterform">
  <div>
    ${PRINCIPLES.map((p) => `<span class="letterform-letter" style="color:${p.color}">${p.code}</span>`).join("")}
  </div>
  <div class="letterform-score">
    <div class="total">${totalActual} / ${totalMax}</div>
    <div class="pct">${Math.round(ratio * 100)}% overall</div>
  </div>
</div>

<div class="gate-summary">
  <span>Quality Gate Status</span>
  <span style="color:${allPassed ? "#4a8355" : anyFail ? "#c60c30" : "#8b9bb0"}">
    ${allPassed ? "PASSED" : anyFail ? "FAILED" : "INCOMPLETE"}
  </span>
</div>

<div class="accent-bar"></div>

<table class="cat-table">
  ${PRINCIPLES.map((p) => {
    if (!(p.id in rubric.scoring_rubric)) return "";
    const scores = catScores.get(p.id) ?? [];
    const numeric = scores.filter((s): s is number => typeof s === "number");
    const avg = numeric.length > 0 ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(1) : "—";
    const catTotal = numeric.reduce((a, b) => a + b, 0);
    const catMax = numeric.length * 3;
    const catEvals = evaluations.filter((e) => e.rubricId.startsWith(`${p.id}.`));
    const evidenceCount = captures.filter((c) =>
      catEvals.some((e) => e.explicitEvidenceIds.includes(c.id)),
    ).length;
    return `
      <tr>
        <td class="cat-code" style="color:${p.color}">${p.code}</td>
        <td class="cat-label">${esc(getCategoryLabel(p.id).replace(/^.*?— /, ""))}<br />
          <span style="font-size:0.7rem;color:var(--muted);font-family:var(--ff-mono)">${catTotal}/${catMax} avg ${avg}</span>
        </td>
        <td class="cat-indicators">
          ${distributionBar(scores)}
        </td>
        <td class="cat-evidence">
          <div class="count" style="color:${evidenceCount > 0 ? "var(--text)" : "var(--border)"}">${evidenceCount}</div>
          <div class="label">evidence</div>
        </td>
      </tr>
    `;
  }).join("")}
</table>

<div class="verdict-bar" style="background:${verdictColor}"></div>
<div class="verdict-block">
  <div class="verdict-label">Verdict</div>
  <div class="verdict-text" style="color:${verdictColor}">${verdict}</div>
  <div class="verdict-reason">${finalization?.conclusion
    ? esc(finalization.conclusion.length > 120 ? `${finalization.conclusion.slice(0, 120)}...` : finalization.conclusion)
    : anyFail
      ? "Quality gate failure"
      : `Score ${Math.round(ratio * 100)}%${computedFailed ? " — " + (anyFail ? "quality gate failure" : principleFail ? "principle below minimum" : "below threshold") : " meets threshold"}`}</div>
</div>

<div class="bottom-bar"></div>
<div class="footer">
  <img src="${LISA_EIS_LOGO}" alt="LISA-EIS" style="height:28px" />
  <img src="${UT_LOGO}" alt="University of Twente" style="height:20px;margin-top:4px" />
</div>

<!-- Full Report -->

<div class="report-header">
  <h1>Detailed Report</h1>
  <div style="font-size:0.85rem;color:var(--muted)">
    ${esc(metadata.toolName)} &middot; ${esc(metadata.toolUrl)} &middot; Evaluated ${new Date(metadata.startTime).toLocaleString()}
  </div>
  ${metadata.notes ? `<div style="font-size:0.8rem;color:var(--muted);font-style:italic;margin-top:4px">${esc(metadata.notes)}</div>` : ""}
</div>

<h2 style="font-family:var(--ff-heading);text-transform:uppercase;letter-spacing:0.03em;color:var(--magenta);margin:0 0 8px;font-size:1rem">Quality Gates</h2>
<table class="qg-table">
  <thead><tr><th>Code</th><th>Result</th><th>Requirement</th><th>Notes</th></tr></thead>
  <tbody>${gateRows}</tbody>
</table>

${categorySections}
${finalizationSection}
${unlinkedSection}

</body>
</html>`;
}
