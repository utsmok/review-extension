import { PRINCIPLES } from "./principles";
import { computeReportScores, type ReportScores } from "./report/compute-scores";
import {
  distributionBar,
  getQGQuestionCode,
  getQuestionCode,
  principleAverage,
  qualityGateResults,
  scoreColor,
} from "./rubric";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

// Cached dynamic import for logos (used by buildHtmlReport and buildNutritionLabel)
let _logos: typeof import("./logos") | null = null;
// ── Constants ──────────────────────────────────────────────────────────

/** Darkened report-local colors for WCAG AA contrast with white text */
const REPORT_COLORS: Record<string, string> = Object.fromEntries(
  PRINCIPLES.map((p) => [p.id, p.reportColor]),
);

/** Principle full names for display */
const PRINCIPLE_NAMES: Record<string, string> = Object.fromEntries(
  PRINCIPLES.map((p) => [p.id, p.fullName]),
);

/** All CSS for the standalone HTML evaluation report. */
import reportCss from "./report.css?raw";
export const REPORT_CSS = reportCss;

// ── Utilities ──────────────────────────────────────────────────────────

/** HTML-escape a string for safe embedding in templates. */
const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const ESC_NEEDS_ESCAPE_RE = /[&<>'"]/;
function esc(s: string): string {
  if (!s || !ESC_NEEDS_ESCAPE_RE.test(s)) return s;
  return s.replace(/[&<>'"]/g, (c) => ESC_MAP[c]);
}

/** Validate URL starts with http:// or https:// */
const SAFE_URL_RE = /^https?:\/\//i;
function isSafeUrl(url: string): boolean {
  return SAFE_URL_RE.test(url.trim());
}

/** Render a URL as a link if valid, otherwise as plain text */
function safeLink(url: string, attrs: string = ""): string {
  const escaped = esc(url);
  if (isSafeUrl(url)) {
    return `<a href="${escaped}" rel="noopener noreferrer" target="_blank" ${attrs}>${escaped}</a>`;
  }
  return `<span class="url-plain">${escaped}</span>`;
}

/** Format date consistently as YYYY-MM-DD HH:mm */
function formatDate(isoString: string): string {
  if (!isoString || isoString.length < 16) return "—";
  // ISO 8601: "YYYY-MM-DDTHH:mm:..." — slice directly, no Date construction
  return `${isoString.slice(0, 10)} ${isoString.slice(11, 16)}`;
}

/** Resize and compress a base64 data-URL image. Returns original if resize fails. */
async function compressScreenshot(dataUrl: string, maxWidth = 800, quality = 0.8): Promise<string> {
  try {
    if (!dataUrl.startsWith("data:image/")) return dataUrl;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
    if (img.width <= maxWidth) return dataUrl;
    const scale = maxWidth / img.width;
    const canvas = document.createElement("canvas");
    canvas.width = maxWidth;
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}

const EMPTY_CIRCLE = '<span class="circle empty">&#9675;</span>';
const FILLED_CIRCLE = '<span class="circle filled">&#9679;</span>';
const ALL_EMPTY_CIRCLES = `<span class="circles">${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}</span><span class="circle-label">0/4</span>`;
const EXAMPLE_LEVELS = ["0", "1", "2", "3"] as const;

function scoreCircles(avg: number | null): string {
  if (avg === null) return ALL_EMPTY_CIRCLES;
  const filled = avg < 0.5 ? 0 : avg < 1.5 ? 1 : avg < 2.5 ? 2 : avg >= 3 ? 4 : 3;
  return `<span class="circles">${FILLED_CIRCLE.repeat(filled)}${EMPTY_CIRCLE.repeat(4 - filled)}</span><span class="circle-label">${filled}/4</span>`;
}

// ── Section builders ───────────────────────────────────────────────────

function buildCategorySections(
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  compressedScreenshots: Map<string, string>,
  scores: ReportScores,
  evalMap: Map<string, Evaluation>,
  usesAi: boolean,
): string {
  // Pre-compute capture ID → capture map for O(1) lookups
  const captureMap = new Map(captures.map((c) => [c.id, c]));
  // Pre-compute evidence count per principle: O(captures × evaluations) once instead of per principle
  const evidenceByPrinciple = new Map<string, Set<string>>();
  for (const e of evaluations) {
    const dot = e.rubricId.indexOf(".");
    const prefix = dot === -1 ? e.rubricId : e.rubricId.substring(0, dot);
    let captureSet = evidenceByPrinciple.get(prefix);
    if (!captureSet) {
      captureSet = new Set<string>();
      evidenceByPrinciple.set(prefix, captureSet);
    }
    for (const cid of e.explicitEvidenceIds) {
      captureSet.add(cid);
    }
  }

  return PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
    .map((p, sectionIdx) => {
      const reportColor = REPORT_COLORS[p.id] ?? p.color;
      const questions = rubric.scoring_rubric[p.id];
      const catScores = scores.catScores.get(p.id) ?? [];
      const evidenceCount = evidenceByPrinciple.get(p.id)?.size ?? 0;

      let numSum = 0;
      let numCount = 0;
      for (const s of catScores) {
        if (typeof s === "number") {
          numSum += s;
          numCount++;
        }
      }
      const avg = numCount > 0 ? (numSum / numCount).toFixed(1) : "—";
      const catTotal = numSum;
      const catMax = numCount * 3;

      const entries = Object.entries(questions).filter(
        ([, q]) => usesAi || !(q as { ai_only?: boolean }).ai_only,
      );
      const rows = entries
        .map(([qId, levels], qIdx) => {
          const rubricId = `${p.id}.${qId}`;
          const ev = evalMap.get(rubricId);
          const isNa = ev?.score === "na";
          const isUnsure = ev?.score === "unsure";
          const score = typeof ev?.score === "number" ? ev.score : -1;
          const code = getQuestionCode(p.id, qIdx);
          const customReasoning = ev?.customScore?.reasoning;
          const levelDesc = isNa
            ? "Not applicable"
            : isUnsure
              ? "Insufficient information"
              : customReasoning
                ? esc(customReasoning)
                : score >= 0
                  ? ((levels as unknown as Record<string, string>)[String(score)] ?? "—")
                  : "—";

          const isWeakEvidence = score >= 0 && score <= 1;
          const evidenceImgs = ev
            ? ev.explicitEvidenceIds
                .map((cid) => {
                  const c = captureMap.get(cid);
                  if (!c) return "";
                  return `
        <div class="evidence-item${isWeakEvidence ? " evidence-weak" : ""}">
          <img src="${compressedScreenshots.get(cid) ?? c.screenshotBase64}" alt="Evidence for ${code}: ${esc(c.pageTitle || "screenshot")}" loading="lazy" />
          <div class="evidence-meta">
            <strong>${esc(c.pageTitle || "Capture")}</strong>
            <span class="evidence-time">${formatDate(c.timestamp)}</span>
            ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
          </div>
        </div>
      `;
                })
                .join("")
            : "";

          const backgroundRow = levels.background
            ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Background</summary>
      <p>${esc(levels.background)}</p></details>
    </td></tr>
  `
            : "";

          const examplesRow = levels.examples
            ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Examples</summary>
      <table class="et">
        ${EXAMPLE_LEVELS.map((lvl) => {
          const ex = (levels as unknown as { examples?: Record<string, string> }).examples?.[lvl];
          return ex ? `<tr><td class="el">${lvl}</td><td>${esc(ex)}</td></tr>` : "";
        }).join("")}
      </table></details>
    </td></tr>
  `
            : "";

          const badgeColor = scoreColor(
            isNa ? "na" : isUnsure ? "unsure" : score >= 0 ? (score as 0 | 1 | 2 | 3) : undefined,
          );
          return `
    <tr class="score-row">
      <td class="code" style="color:${reportColor}">${code}</td>
      <td class="score-cell">
        <span class="score-badge" style="background:${badgeColor}20;color:${badgeColor}">
          ${isNa ? "N/A" : isUnsure ? "?" : score >= 0 ? score : "—"}${customReasoning ? "*" : ""}
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
          <h2>${esc(PRINCIPLE_NAMES[p.id] ?? "")}</h2>
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
          <caption class="sr-only">Scoring for ${esc(PRINCIPLE_NAMES[p.id] ?? p.id)}</caption>
          <thead>
            <tr><th scope="col">Code</th><th scope="col">Score</th><th scope="col">Level</th><th scope="col">Notes</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
    })
    .join("");
}

function buildGateRows(
  rubric: RubricData,
  evalMap: Map<string, Evaluation>,
  usesAi: boolean,
): string {
  return Object.entries(rubric.quality_gate)
    .map(([cat, questions]) =>
      Object.keys(questions)
        .map((qId, qIdx) => {
          const q = questions[qId];
          if (!usesAi && (q as { ai_only?: boolean }).ai_only) return "";

          const ev = evalMap.get(`${cat}.${qId}`);
          const result = ev?.score === "pass" ? "pass" : ev?.score === "fail" ? "fail" : null;
          const color = result === "pass" ? "#4a8355" : result === "fail" ? "#c60c30" : "#6b7f94";
          const label = result === "pass" ? "PASS" : result === "fail" ? "FAIL" : "—";

          const qgBackgroundRow = q.background
            ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Background</summary>
      <p>${esc(q.background)}</p></details>
    </td></tr>
  `
            : "";

          const qgExamplesRow = q.examples
            ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Examples</summary>
      <table class="et">
        ${Object.keys(q.examples)
          .map((key) => {
            const desc = (q.examples as Record<string, string>)[key];
            return `<tr><td class="el">${key === "pass" ? "Pass" : key === "fail" ? "Fail" : key === "na" ? "N/A" : esc(key)}</td><td>${esc(desc)}</td></tr>`;
          })
          .join("")}
      </table></details>
    </td></tr>
  `
            : "";

          return `
    <tr>
      <td class="code">${getQGQuestionCode(cat, qIdx)}</td>
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

function buildFinalizationSection(
  finalization: ReviewFinalization | null,
  verdict: string,
  verdictColor: string,
): string {
  if (!finalization) return "";

  const strengthsList = finalization.strengths.map((s) => `<li>${esc(s)}</li>`).join("");
  const weaknessesList = finalization.weaknesses.map((w) => `<li>${esc(w)}</li>`).join("");

  return `
    <section class="finalization-section">
      <div class="fin-bar" style="background:${verdictColor}"></div>
      <div class="fin-grade" style="color:${verdictColor};background:${verdictColor}10">
        ${verdict}
      </div>
      ${finalization.conclusion ? `<div class="fin-block"><h3>Conclusion</h3><p>${esc(finalization.conclusion)}</p></div>` : ""}
      ${
        strengthsList
          ? `
        <div class="fin-block">
          <h3 style="color:#4a8355">Strengths</h3>
          <ul>${strengthsList}</ul>
        </div>
      `
          : ""
      }
      ${
        weaknessesList
          ? `
        <div class="fin-block">
          <h3 style="color:#c60c30">Weaknesses</h3>
          <ul>${weaknessesList}</ul>
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

function buildUnlinkedSection(
  captures: Capture[],
  evaluations: Evaluation[],
  compressedScreenshots: Map<string, string>,
): string {
  // Pre-compute set of linked capture IDs: O(evaluations × evidenceIds) once
  const linkedIds = new Set<string>();
  for (const e of evaluations) {
    for (const cid of e.explicitEvidenceIds) {
      linkedIds.add(cid);
    }
  }
  const unlinkedHtml = captures
    .filter((c) => !linkedIds.has(c.id))
    .map(
      (c) => `
        <div class="unlinked-item">
          <img src="${compressedScreenshots.get(c.id) ?? c.screenshotBase64}" alt="Additional evidence: ${esc(c.pageTitle || "screenshot")}" loading="lazy" />
          <div class="unlinked-meta">
            <strong>${esc(c.pageTitle || "Capture")}</strong>
            ${safeLink(c.sourceUrl)}
            <span>${formatDate(c.timestamp)}</span>
            ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
          </div>
        </div>
      `,
    )
    .join("");

  if (!unlinkedHtml) return "";

  return `
    <section class="unlinked-section">
      <h2>Additional Evidence</h2>
      ${unlinkedHtml}
    </section>
  `;
}

function buildToc(rubric: RubricData): string {
  return PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
    .map((p) => {
      const reportColor = REPORT_COLORS[p.id] ?? p.color;
      return `<a href="#category-${p.id}" class="toc-item" style="color:${reportColor}"><span class="toc-code">${p.code}</span> ${esc(PRINCIPLE_NAMES[p.id] ?? "")}</a>`;
    })
    .join("");
}

// ── Main report ────────────────────────────────────────────────────────

function buildNutritionLabelHtml(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null,
  scores: ReportScores,
  TRUST_LOGO: string,
  LISA_EIS_LOGO: string,
  UT_LOGO: string,
  evalMap: Map<string, Evaluation>,
): string {
  const date = metadata.startTime.slice(0, 10);
  const toolUrl = esc(metadata.toolUrl);
  const toolName = esc(metadata.toolName);
  const toolLink = `<a href="${toolUrl}" target="_blank" rel="noopener noreferrer">`;
  const toolLinkClose = "</a>";
  const logo = metadata.toolLogoUrl || metadata.faviconUrl;

  // Strengths & weaknesses
  const strengthsHtml = finalization?.strengths?.length
    ? finalization.strengths.map((s) => `<li>${esc(s)}</li>`).join("")
    : "";
  const weaknessesHtml = finalization?.weaknesses?.length
    ? finalization.weaknesses.map((w) => `<li>${esc(w)}</li>`).join("")
    : "";
  const swRow =
    strengthsHtml || weaknessesHtml
      ? `<div class="nutrition-divider-thin"></div>
<div class="nutrition-sw">
  ${
    strengthsHtml
      ? `<div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Strengths</div>
    <ul class="nutrition-sw-list">${strengthsHtml}</ul>
  </div>`
      : ""
  }
  ${strengthsHtml && weaknessesHtml ? '<div class="nutrition-sw-divider"></div>' : ""}
  ${
    weaknessesHtml
      ? `<div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Weaknesses</div>
    <ul class="nutrition-sw-list">${weaknessesHtml}</ul>
  </div>`
      : ""
  }
</div>`
      : "";

  return `
<div class="nutrition-label">
  <div class="trust-branding">
    <img src="${TRUST_LOGO}" alt="TRUST" />
    <div class="trust-branding-tagline">Information Tool Reviews</div>
  </div>
  <div class="nutrition-divider"></div>

  <div class="nutrition-header">
    <div class="nutrition-header-center">
      <div class="nutrition-header-line">
        ${logo ? `${toolLink}<img class="nutrition-tool-logo" src="${esc(logo)}" alt="${toolName}" />${toolLinkClose}` : ""}
        ${logo ? '<span class="nutrition-sep">&middot;</span>' : ""}
        ${toolLink}<span class="nutrition-tool-name">${toolName}</span>${toolLinkClose}
        <span class="nutrition-sep">&middot;</span>
        <span class="nutrition-tool-url">${safeLink(metadata.toolUrl)}</span>
      </div>
      ${metadata.description ? `<div class="nutrition-description">${esc(metadata.description)}</div>` : ""}
    </div>
  </div>

  <div class="nutrition-divider"></div>

  <div class="nutrition-verdict">
    <div class="nutrition-verdict-stamp" style="color:${scores.verdictColor};border-color:${scores.verdictColor}">
      ${scores.verdict}
      <span class="nutrition-verdict-sub">
        <img src="${TRUST_LOGO}" alt="TRUST" style="height:0.9em;vertical-align:middle;margin-right:2px" />
        Framework Verdict
      </span>
    </div>
    ${!scores.noEvaluation ? `<div class="nutrition-score-number">${scores.totalActual}/${scores.totalMax} points</div>` : ""}
    ${!scores.noEvaluation && !scores.isComplete ? `<div class="nutrition-status">${scores.answeredQuestions}/${scores.totalQuestions} questions answered</div>` : ""}
  </div>

  ${(() => {
    const items = qualityGateResults(evaluations, rubric, evalMap)
      .filter((g) => g.result === "fail" || g.result === "unsure")
      .map(
        (g) =>
          '<div class="nutrition-gate-item">' +
          esc(g.label) +
          ': <span class="' +
          (g.result === "fail" ? "fail" : "unsure") +
          '">' +
          (g.result === "fail" ? "FAIL" : "UNSURE") +
          "</span></div>",
      )
      .join("");
    return items
      ? '<div class="nutrition-divider-thin"></div><div class="nutrition-gates"><div class="nutrition-gates-title">Quality Gate Notes</div>' +
          items +
          "</div>"
      : '<div class="nutrition-divider-thin"></div><div class="nutrition-gates"><div class="nutrition-gate-item" style="color:var(--muted)">All quality gates passed ✓</div></div>';
  })()}

  <div class="nutrition-divider-thin"></div>

  <div class="nutrition-principles">
    <table class="nutrition-principles-table" role="presentation" aria-label="Principle scores">
      <tr>
        ${PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
          .map((p) => {
            const reportColor = REPORT_COLORS[p.id] ?? p.color;
            const avg = principleAverage(p.id, evaluations, rubric, evalMap);
            return (
              '<td style="color:' +
              reportColor +
              '"><div class="nutrition-principle-code">' +
              p.code +
              '</div><div class="nutrition-principle-name">' +
              (PRINCIPLE_NAMES[p.id] ?? "") +
              "</div><div>" +
              scoreCircles(avg) +
              "</div>" +
              (avg !== null
                ? `<div class="nutrition-principle-fraction">${avg.toFixed(1)}</div>`
                : "") +
              "</td>"
            );
          })
          .join("")}
        <td class="nutrition-overall-cell" style="color:var(--magenta)">
          <div class="nutrition-overall-label">Overall</div>
          <div>${scoreCircles(scores.totalMax > 0 ? (scores.totalActual / scores.totalMax) * 3 : null)}</div>
        </td>
      </tr>
    </table>
    <div class="nutrition-circle-legend">● = threshold met &nbsp; ○ = below threshold</div>
  </div>

  ${swRow}

  <div class="nutrition-divider"></div>

  <div class="nutrition-footer">
    <img src="${LISA_EIS_LOGO}" alt="LISA-EIS" style="height:24px" />
    <a href="https://www.utwente.nl/library/" target="_blank" rel="noopener noreferrer">
      <span class="nutrition-footer-text">LISA-EIS / University of Twente / ${date}</span>
    </a>
    <img src="${UT_LOGO}" alt="University of Twente" style="height:22px" />
    <div class="nutrition-footer-ref">See the detailed Evaluation Report for full analysis.</div>
  </div>
</div>`;
}

export async function buildNutritionLabel(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<string> {
  if (!_logos) _logos = await import("./logos");
  const { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } = _logos;
  const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));
  const scores = computeReportScores(
    evaluations,
    rubric,
    finalization,
    evalMap,
    metadata.usesAi ?? true,
  );
  const labelHtml = buildNutritionLabelHtml(
    metadata,
    evaluations,
    rubric,
    finalization,
    scores,
    TRUST_LOGO,
    LISA_EIS_LOGO,
    UT_LOGO,
    evalMap,
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>TRUST Label: ${esc(metadata.toolName)}</title>
<link rel="stylesheet" href="report.css" />
</head>
<body>
${labelHtml}
</body>
</html>`;
}

export async function buildHtmlReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<string> {
  // Compress all screenshots in parallel
  if (!_logos) _logos = await import("./logos");
  const { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } = _logos;

  // Compress screenshots in parallel — prefer annotated version when available
  const compressedScreenshots = new Map<string, string>();
  await Promise.all(
    captures.map(async (c) => {
      const src = c.annotatedScreenshotBase64 ?? c.screenshotBase64;
      compressedScreenshots.set(c.id, await compressScreenshot(src));
    }),
  );

  const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));
  const scores = computeReportScores(
    evaluations,
    rubric,
    finalization,
    evalMap,
    metadata.usesAi ?? true,
  );

  // Build section parts
  const gateRows = buildGateRows(rubric, evalMap, metadata.usesAi ?? true);

  const categorySections = buildCategorySections(
    captures,
    evaluations,
    rubric,
    compressedScreenshots,
    scores,
    evalMap,
    metadata.usesAi ?? true,
  );
  const finalizationSection = buildFinalizationSection(
    finalization,
    scores.verdict,
    scores.verdictColor,
  );
  const unlinkedSection = buildUnlinkedSection(captures, evaluations, compressedScreenshots);
  const tocItems = buildToc(rubric);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>TRUST Review: ${esc(metadata.toolName)}</title>
<link rel="stylesheet" href="report.css" />
</head>
<body>



${buildNutritionLabelHtml(metadata, evaluations, rubric, finalization, scores, TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO, evalMap)}

<!-- Full Report -->

<div class="report-header">
  <div class="trust-branding" style="margin-bottom:12px">
    <img src="${TRUST_LOGO}" alt="TRUST" />
    <div class="trust-branding-tagline">Information Tool Reviews</div>
  </div>
  <h1>Detailed Report</h1>
  <div style="font-size:0.85rem;color:var(--muted)">
    ${esc(metadata.toolName)} &middot; ${safeLink(metadata.toolUrl, 'class="report-meta-url"')} &middot; Evaluated ${formatDate(metadata.startTime)}
  </div>
  ${metadata.description ? `<div style="font-size:0.85rem;color:var(--text);font-style:italic;margin-top:2px">${esc(metadata.description)}</div>` : ""}
  ${metadata.dataSources?.length ? `<div style="font-size:0.8rem;color:var(--muted)">Data sources: ${esc(metadata.dataSources.join(", "))}</div>` : ""}
  ${metadata.searchMethods?.length ? `<div style="font-size:0.8rem;color:var(--muted)">Search methods: ${esc(metadata.searchMethods.join(", "))}</div>` : ""}
  ${metadata.discipline?.length ? `<div style="font-size:0.8rem;color:var(--muted)">Discipline: ${esc(metadata.discipline.join(", "))}</div>` : ""}
${metadata.company ? `<div style="font-size:0.8rem;color:var(--muted)">Publisher: ${esc(metadata.company)}</div>` : ""}
${metadata.pricing ? `<div style="font-size:0.8rem;color:var(--muted)">Pricing: ${esc(metadata.pricing)}</div>` : ""}
${metadata.availability ? `<div style="font-size:0.8rem;color:var(--muted)">Availability: ${esc(metadata.availability)}</div>` : ""}
${metadata.authenticationMethod ? `<div style="font-size:0.8rem;color:var(--muted)">Authentication: ${esc(metadata.authenticationMethod)}</div>` : ""}
${metadata.termsConditionsUrl ? `<div style="font-size:0.8rem;color:var(--muted)">Terms: ${safeLink(metadata.termsConditionsUrl)}</div>` : ""}
<div style="font-size:0.8rem;color:var(--muted)">AI-powered: ${(metadata.usesAi ?? true) ? "Yes" : "No"}</div>
  ${metadata.notes ? `<div style="font-size:0.8rem;color:var(--muted);font-style:italic;margin-top:4px">${esc(metadata.notes)}</div>` : ""}
</div>

<nav class="toc">
  <span class="toc-label">Contents</span>
  ${tocItems}
</nav>

<h2 style="font-family:var(--ff-heading);text-transform:uppercase;letter-spacing:0.03em;color:var(--magenta);margin:0 0 8px;font-size:1rem">Quality Gates</h2>
<table class="qg-table">
  <caption class="sr-only">Quality gates</caption>
  <thead><tr><th scope="col">Code</th><th scope="col">Result</th><th scope="col">Requirement</th><th scope="col">Notes</th></tr></thead>
  <tbody>${gateRows}</tbody>
</table>

${categorySections}
${finalizationSection}
${unlinkedSection}
<div class="bottom-bar"></div>
<div class="footer">
  TRUST Framework v1.1 · ${esc(metadata.toolName)} · ${scores.totalQuestions} questions · Evaluated ${formatDate(metadata.startTime)}
</div>

</body>
</html>`;
}
