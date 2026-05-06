import { PRINCIPLES } from "../principles";
import { getCategoryLabel, getQuestionCode } from "../rubric";
import { distributionBar, scoreColor } from "../scoring";
import type { Capture, Evaluation, ReviewFinalization, RubricData } from "../types";
import { REPORT_COLORS, PRINCIPLE_NAMES } from "./constants";
import type { ReportScores } from "./compute-scores";
import { esc, formatDate, safeLink } from "./utils";

// ── Category sections (scoring rubric detail) ──────────────────────────

export function buildCategorySections(
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  compressedScreenshots: Map<string, string>,
  scores: ReportScores,
): string {
  return PRINCIPLES.map((p, sectionIdx) => {
    if (!(p.id in rubric.scoring_rubric)) return "";
    const reportColor = REPORT_COLORS[p.id] ?? p.color;
    const questions = rubric.scoring_rubric[p.id];
    const catScores = scores.catScores.get(p.id) ?? [];
    const catEvals = evaluations.filter((e) => e.rubricId.startsWith(`${p.id}.`));
    const evidenceCount = captures.filter((c) =>
      catEvals.some((e) => e.explicitEvidenceIds.includes(c.id)),
    ).length;

    const numeric = catScores.filter((s): s is number => typeof s === "number");
    const avg =
      numeric.length > 0 ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(1) : "—";
    const catTotal = numeric.reduce((a, b) => a + b, 0);
    const catMax = numeric.length * 3;

    const rows = Object.entries(questions)
      .map(([qId, levels], idx) => {
        const rubricId = `${p.id}.${qId}`;
        const ev = evaluations.find((e) => e.rubricId === rubricId);
        const isNa = ev?.score === "na";
        const isUnsure = ev?.score === "unsure";
        const score = typeof ev?.score === "number" ? ev.score : -1;
        const code = getQuestionCode(p.id, idx);
        const levelDesc = isNa
          ? "Not applicable"
          : isUnsure
            ? "Insufficient information"
            : score >= 0
              ? ((levels as unknown as Record<string, string>)[String(score)] ?? "—")
              : "—";

        const isWeakEvidence = score >= 0 && score <= 1;
        const evidenceImgs = captures
          .filter((c) => ev?.explicitEvidenceIds.includes(c.id))
          .map(
            (c) => `
          <div class="evidence-item${isWeakEvidence ? " evidence-weak" : ""}">
            <img src="${compressedScreenshots.get(c.id) ?? c.screenshotBase64}" alt="${esc(c.pageTitle || "Evidence screenshot")}" loading="lazy" />
            <div class="evidence-meta">
              <strong>${esc(c.pageTitle || "Capture")}</strong>
              <span class="evidence-time">${formatDate(c.timestamp)}</span>
              ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
            </div>
          </div>
        `,
          )
          .join("");

        const backgroundRow = levels.background
          ? `
        <tr class="supplementary-row"><td colspan="4" class="supplementary-cell">
          <details><summary class="supplementary-summary">Background</summary>
          <p>${esc(levels.background)}</p></details>
        </td></tr>
      `
          : "";

        const examplesRow = levels.examples
          ? `
        <tr class="supplementary-row"><td colspan="4" class="supplementary-cell">
          <details><summary class="supplementary-summary">Examples</summary>
          <table class="examples-table">
            ${(["0", "1", "2", "3"] as const)
              .map((lvl) => {
                const ex = (levels as unknown as { examples?: Record<string, string> }).examples?.[
                  lvl
                ];
                return ex ? `<tr><td class="ex-level">${lvl}</td><td>${esc(ex)}</td></tr>` : "";
              })
              .join("")}
          </table></details>
        </td></tr>
      `
          : "";

        return `
        <tr class="score-row">
          <td class="code" style="color:${reportColor}">${code}</td>
          <td class="score-cell">
            <span class="score-badge" style="background:${scoreColor(isNa ? "na" : isUnsure ? "unsure" : score >= 0 ? (score as 0 | 1 | 2 | 3) : undefined)}20;color:${scoreColor(isNa ? "na" : isUnsure ? "unsure" : score >= 0 ? (score as 0 | 1 | 2 | 3) : undefined)}">
              ${isNa ? "N/A" : isUnsure ? "?" : score >= 0 ? score : "—"}
            </span>
          </td>
          <td class="level">${esc(levelDesc)}</td>
          <td class="notes">${esc(ev?.notes ?? "")}</td>
        </tr>
        ${backgroundRow}${examplesRow}
        ${evidenceImgs ? `<tr class="evidence-row"><td colspan="4"><div class="evidence-list">${evidenceImgs}</div></td></tr>` : ""}
      `;
      })
      .join("");

    return `
      <section id="category-${p.id}" class="category-section${sectionIdx % 2 === 1 ? " category-alt" : ""}" style="--accent:${reportColor}">
        <div class="category-header">
          <div class="category-letter-block">
            <div class="category-letter">${p.code}</div>
            <div class="category-letter-name">${PRINCIPLE_NAMES[p.id] ?? ""}</div>
          </div>
          <div class="category-info">
            <h2>${esc(getCategoryLabel(p.id).replace(/^.*?— /, ""))}</h2>
            <div class="category-meta">
              <span class="cat-score">${catTotal} / ${catMax}</span>
              <span class="cat-avg">avg ${avg}</span>
              <span class="cat-evidence">${evidenceCount} evidence</span>
            </div>
            ${distributionBar(catScores)}
          </div>
        </div>
        <div class="category-table-wrap">
          <table>
            <thead>
              <tr><th>Code</th><th>Score</th><th>Level</th><th>Notes</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    `;
  }).join("");
}

// ── Quality gate rows ──────────────────────────────────────────────────

export function buildGateRows(evaluations: Evaluation[], rubric: RubricData): string {
  return Object.entries(rubric.quality_gate)
    .map(([cat, questions]) =>
      Object.entries(questions)
        .map(([qId, q]) => {
          const ev = evaluations.find((e) => e.rubricId === `${cat}.${qId}`);
          const result = ev?.score === "pass" ? "pass" : ev?.score === "fail" ? "fail" : null;
          const color = result === "pass" ? "#4a8355" : result === "fail" ? "#c60c30" : "#6b7f94";
          const label = result === "pass" ? "PASS" : result === "fail" ? "FAIL" : "—";

          const qgBackgroundRow = q.background
            ? `
        <tr class="supplementary-row"><td colspan="4" class="supplementary-cell">
          <details><summary class="supplementary-summary">Background</summary>
          <p>${esc(q.background)}</p></details>
        </td></tr>
      `
            : "";

          const qgExamplesRow = q.examples
            ? `
        <tr class="supplementary-row"><td colspan="4" class="supplementary-cell">
          <details><summary class="supplementary-summary">Examples</summary>
          <table class="examples-table">
            ${(Object.entries(q.examples) as [string, string][])
              .map(
                ([key, desc]) => `
              <tr><td class="ex-level">${key === "pass" ? "Pass" : key === "fail" ? "Fail" : key === "na" ? "N/A" : esc(key)}</td><td>${esc(desc)}</td></tr>
            `,
              )
              .join("")}
          </table></details>
        </td></tr>
      `
            : "";

          return `
        <tr>
          <td class="code">${cat.toUpperCase()}${Object.keys(questions).indexOf(qId) + 1}</td>
          <td><span class="gate-badge" style="background:${color}18;color:${color}">${label}</span></td>
          <td>${esc(q.requirement)}</td>
          <td class="notes">${esc(ev?.notes ?? "")}</td>
        </tr>
        ${qgBackgroundRow}${qgExamplesRow}
      `;
        })
        .join(""),
    )
    .join("");
}

// ── Finalization section ───────────────────────────────────────────────

export function buildFinalizationSection(
  finalization: ReviewFinalization | null,
  verdict: string,
  verdictColor: string,
): string {
  if (!finalization) return "";

  return `
    <section class="finalization-section">
      <div class="fin-bar" style="background:${verdictColor}"></div>
      <div class="fin-grade" style="color:${verdictColor};background:${verdictColor}10">
        ${verdict}
      </div>
      ${finalization.conclusion ? `<div class="fin-block"><h3>Conclusion</h3><p>${esc(finalization.conclusion)}</p></div>` : ""}
      ${
        finalization.strengths.length > 0
          ? `
        <div class="fin-block">
          <h3 style="color:#4a8355">Strengths</h3>
          <ul>${finalization.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        </div>
      `
          : ""
      }
      ${
        finalization.weaknesses.length > 0
          ? `
        <div class="fin-block">
          <h3 style="color:#c60c30">Weaknesses</h3>
          <ul>${finalization.weaknesses.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        </div>
      `
          : ""
      }
      ${
        finalization.recommendations
          ? `
        <div class="fin-block">
          <h3>Recommendations</h3>
          <p>${esc(finalization.recommendations)}</p>
        </div>
      `
          : ""
      }
      <div class="fin-timestamp">Finalized ${formatDate(finalization.finalizedAt)}</div>
    </section>
  `;
}

// ── Unlinked evidence section ──────────────────────────────────────────

export function buildUnlinkedSection(
  captures: Capture[],
  evaluations: Evaluation[],
  compressedScreenshots: Map<string, string>,
): string {
  const unlinked = captures.filter(
    (c) => !evaluations.some((e) => e.explicitEvidenceIds.includes(c.id)),
  );

  if (unlinked.length === 0) return "";

  return `
    <section class="unlinked-section">
      <h2>Additional Evidence</h2>
      ${unlinked
        .map(
          (c) => `
        <div class="unlinked-item">
          <img src="${compressedScreenshots.get(c.id) ?? c.screenshotBase64}" alt="${esc(c.pageTitle || "Evidence screenshot")}" loading="lazy" />
          <div class="unlinked-meta">
            <strong>${esc(c.pageTitle || "Capture")}</strong>
            ${safeLink(c.sourceUrl)}
            <span>${formatDate(c.timestamp)}</span>
            ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
          </div>
        </div>
      `,
        )
        .join("")}
    </section>
  `;
}

// ── Table of contents ──────────────────────────────────────────────────

export function buildToc(rubric: RubricData): string {
  return PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
    .map((p) => {
      const reportColor = REPORT_COLORS[p.id] ?? p.color;
      return `<a href="#category-${p.id}" class="toc-item" style="color:${reportColor}"><span class="toc-code">${p.code}</span> ${esc(PRINCIPLE_NAMES[p.id] ?? getCategoryLabel(p.id).replace(/^.*?— /, ""))}</a>`;
    })
    .join("");
}

// ── Score legend ───────────────────────────────────────────────────────

export function buildScoreLegend(): string {
  return `
    <div class="score-legend">
      <span class="legend-label">Score Legend:</span>
      <span class="score-badge" style="background:#c60c3020;color:#c60c30">0 = No</span>
      <span class="score-badge" style="background:#ea580c20;color:#ea580c">1 = Partially</span>
      <span class="score-badge" style="background:#0e749020;color:#0e7490">2 = Mostly</span>
      <span class="score-badge" style="background:#4a835520;color:#4a8355">3 = Yes</span>
      <span class="score-badge" style="background:#6b7f9420;color:#6b7f94">N/A</span>
      <span class="score-badge" style="background:#5a6e8220;color:#5a6e82">? = Unsure</span>
    </div>
  `;
}
