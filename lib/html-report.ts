import { PRINCIPLES } from "./principles";
import type { ReportScores } from "./report/compute-scores";
import { buildReportModel } from "./report-model";
import type { CaptureInfo, PrincipleScoreRow, QualityGateRow } from "./report-model";
import { principleAverage, qualityGateResults } from "./rubric";
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

const EMPTY_CIRCLE = '<span class="circle empty">&#9675;</span>';
const FILLED_CIRCLE = '<span class="circle filled">&#9679;</span>';
const ALL_EMPTY_CIRCLES = `<span class="circles">${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}</span><span class="circle-label">0/4</span>`;
const EXAMPLE_LEVELS = ["0", "1", "2", "3"] as const;

function scoreCircles(avg: number | null): string {
  if (avg === null) return ALL_EMPTY_CIRCLES;
  const filled = avg < 0.5 ? 0 : avg < 1.5 ? 1 : avg < 2.5 ? 2 : avg >= 3 ? 4 : 3;
  return `<span class="circles">${FILLED_CIRCLE.repeat(filled)}${EMPTY_CIRCLE.repeat(4 - filled)}</span><span class="circle-label">${filled}/4</span>`;
}

// ── Section builders (render from ReportModel slices) ──────────────────

function renderCategorySections(principles: PrincipleScoreRow[], captures: CaptureInfo[]): string {
  // Pre-compute capture ID → capture map for O(1) lookups
  const captureMap = new Map(captures.map((c) => [c.id, c]));

  return principles
    .map((p, sectionIdx) => {
      const rows = p.questions
        .map((q) => {
          const evidenceImgs =
            q.evidenceIds.length > 0
              ? q.evidenceIds
                  .map((cid) => {
                    const c = captureMap.get(cid);
                    if (!c) return "";
                    return `
        <div class="evidence-item${q.isWeakEvidence ? " evidence-weak" : ""}">
          <img src="${c.compressedScreenshot ?? c.screenshotBase64}" alt="Evidence for ${q.code}: ${esc(c.pageTitle || "screenshot")}" loading="lazy" />
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

          const backgroundRow = q.background
            ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Background</summary>
      <p>${esc(q.background)}</p></details>
    </td></tr>
  `
            : "";

          const examplesRow = q.examples
            ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Examples</summary>
      <table class="et">
        ${EXAMPLE_LEVELS.map((lvl) => {
          const ex = q.examples?.[lvl];
          return ex ? `<tr><td class="el">${lvl}</td><td>${esc(ex)}</td></tr>` : "";
        }).join("")}
      </table></details>
    </td></tr>
  `
            : "";

          return `
    <tr class="score-row">
      <td class="code" style="color:${p.reportColor}">${q.code}</td>
      <td class="score-cell">
        <span class="score-badge" style="background:${q.badgeColor}20;color:${q.badgeColor}">
          ${q.isNa ? "N/A" : q.isUnsure ? "?" : q.score >= 0 ? q.score : "—"}${q.customReasoning ? "*" : ""}
        </span>
      </td>
      <td class="level">${esc(q.levelDescription)}</td>
      <td class="notes">${esc(q.notes)}</td>
    </tr>
    ${backgroundRow}${examplesRow}
    ${evidenceImgs ? `<tr class="evidence-row"><td colspan="4"><div class="evidence-list">${evidenceImgs}</div></td></tr>` : ""}
  `;
        })
        .join("");

      return `
    <section id="category-${p.id}" class="category-section${sectionIdx % 2 === 1 ? " category-alt" : ""}" style="--accent:${p.reportColor}" aria-labelledby="heading-${p.id}">
      <div class="category-header">
        <div class="category-letter-block">
          <div class="category-letter">${p.code}</div>
          <div class="category-letter-name">${p.fullName}</div>
        </div>
        <div class="category-info">
          <h2 id="heading-${p.id}">${esc(p.fullName)}</h2>
          <div class="category-meta">
            <span class="cat-score">${p.total} / ${p.max}</span>
            <span class="cat-avg">avg ${p.avg}</span>
            <span class="cat-evidence">${p.evidenceCount} evidence</span>
          </div>
          ${p.distributionBarHtml}
        </div>
      </div>
      <div class="category-table-wrap">
        <table>
          <caption class="sr-only">Scoring for ${esc(p.fullName)}</caption>
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

function renderGateRows(gates: QualityGateRow[]): string {
  return gates
    .map((g) => {
      const qgBackgroundRow = g.background
        ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Background</summary>
      <p>${esc(g.background)}</p></details>
    </td></tr>
  `
        : "";

      const qgExamplesRow = g.examples
        ? `
    <tr class="sr"><td colspan="4" class="sc">
      <details><summary class="ss">Examples</summary>
      <table class="et">
        ${Object.keys(g.examples)
          .map((key) => {
            const desc = g.examples?.[key];
            return `<tr><td class="el">${key === "pass" ? "Pass" : key === "fail" ? "Fail" : key === "na" ? "N/A" : esc(key)}</td><td>${esc(desc ?? "")}</td></tr>`;
          })
          .join("")}
      </table></details>
    </td></tr>
  `
        : "";

      return `
    <tr>
      <td class="code">${g.code}</td>
      <td><span class="gate-badge" style="background:${g.color}18;color:${g.color}">${g.label}</span></td>
      <td>${esc(g.requirement)}</td>
      <td class="notes">${esc(g.notes)}</td>
    </tr>
    ${qgBackgroundRow}${qgExamplesRow}
  `;
    })
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

function buildUnlinkedSection(captures: CaptureInfo[], linkedCaptureIds: Set<string>): string {
  const unlinkedHtml = captures
    .filter((c) => !linkedCaptureIds.has(c.id))
    .map(
      (c) => `
        <div class="unlinked-item">
          <img src="${c.compressedScreenshot ?? c.screenshotBase64}" alt="Additional evidence: ${esc(c.pageTitle || "screenshot")}" loading="lazy" />
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

function buildToc(principles: PrincipleScoreRow[]): string {
  return principles
    .map((p) => {
      return `<a href="#category-${p.id}" class="toc-item" style="color:${p.reportColor}"><span class="toc-code">${p.code}</span> ${esc(p.fullName)}</a>`;
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
      : `<div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Strengths</div>
    <div class="nutrition-sw-empty">Not specified</div>
  </div>`
  }
  <div class="nutrition-sw-divider"></div>
  ${
    weaknessesHtml
      ? `<div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Weaknesses</div>
    <ul class="nutrition-sw-list">${weaknessesHtml}</ul>
  </div>`
      : `<div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Weaknesses</div>
    <div class="nutrition-sw-empty">Not specified</div>
  </div>`
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
    <table class="nutrition-principles-table" aria-label="Principle scores">
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
  // Build the report model (pure data transformation — no captures needed)
  const model = buildReportModel(metadata, [], evaluations, rubric, finalization, new Map());
  const labelHtml = buildNutritionLabelHtml(
    metadata,
    evaluations,
    rubric,
    finalization,
    model.scores,
    TRUST_LOGO,
    LISA_EIS_LOGO,
    UT_LOGO,
    model.evalMap,
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;">
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>TRUST Label: ${esc(metadata.toolName)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<main id="report-content">
${labelHtml}
</main>
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

  // Screenshots — prefer annotated version when available (lossless PNG, no compression)
  const screenshots = new Map<string, string>(
    captures.map((c) => [c.id, c.annotatedScreenshotBase64 ?? c.screenshotBase64]),
  );

  // Build the report model (pure data transformation)
  const model = buildReportModel(
    metadata,
    captures,
    evaluations,
    rubric,
    finalization,
    screenshots,
  );

  const gateRows = renderGateRows(model.qualityGateRows);
  const categorySections = renderCategorySections(model.principleScores, model.captures);
  const finalizationSection = buildFinalizationSection(
    finalization,
    model.verdict.label,
    model.verdict.color,
  );
  const unlinkedSection = buildUnlinkedSection(model.captures, model.linkedCaptureIds);
  const tocItems = buildToc(model.principleScores);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;">
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>TRUST Review: ${esc(metadata.toolName)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>

<main id="report-content">

${buildNutritionLabelHtml(metadata, evaluations, rubric, finalization, model.scores, TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO, model.evalMap)}

<!-- Full Report -->

<div class="report-header">
  <div class="trust-branding">
    <img src="${TRUST_LOGO}" alt="TRUST" />
    <div class="trust-branding-tagline">Information Tool Reviews</div>
  </div>
  <h1>Detailed Report</h1>
  <div class="report-meta-value report-meta-value--muted">
    ${esc(metadata.toolName)} &middot; ${safeLink(metadata.toolUrl, 'class="report-meta-url"')} &middot; Evaluated ${formatDate(metadata.startTime)}
  </div>
  <dl class="report-meta">
    ${metadata.description ? `<dt class="report-meta-label">Description</dt><dd class="report-meta-value report-meta-value--italic">${esc(metadata.description)}</dd>` : ""}
    ${metadata.dataSources?.length ? `<dt class="report-meta-label">Data sources</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.dataSources.join(", "))}</dd>` : ""}
    ${metadata.searchMethods?.length ? `<dt class="report-meta-label">Search methods</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.searchMethods.join(", "))}</dd>` : ""}
    ${metadata.discipline?.length ? `<dt class="report-meta-label">Discipline</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.discipline.join(", "))}</dd>` : ""}
    ${metadata.company ? `<dt class="report-meta-label">Publisher</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.company)}</dd>` : ""}
    ${metadata.pricing ? `<dt class="report-meta-label">Pricing</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.pricing)}</dd>` : ""}
    ${metadata.availability ? `<dt class="report-meta-label">Availability</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.availability)}</dd>` : ""}
    ${metadata.authenticationMethod ? `<dt class="report-meta-label">Authentication</dt><dd class="report-meta-value report-meta-value--muted">${esc(metadata.authenticationMethod)}</dd>` : ""}
    ${metadata.termsConditionsUrl ? `<dt class="report-meta-label">Terms</dt><dd class="report-meta-value report-meta-value--muted">${safeLink(metadata.termsConditionsUrl)}</dd>` : ""}
    <dt class="report-meta-label">AI-powered</dt><dd class="report-meta-value report-meta-value--muted">${(metadata.usesAi ?? true) ? "Yes" : "No"}</dd>
    ${metadata.notes ? `<dt class="report-meta-label">Notes</dt><dd class="report-meta-value report-meta-value--muted report-meta-value--italic">${esc(metadata.notes)}</dd>` : ""}
  </dl>
</div>

<nav class="toc">
  <span class="toc-label">Contents</span>
  ${tocItems}
</nav>

<h2 class="section-heading">Quality Gates</h2>
<table class="qg-table">
  <caption class="sr-only">Quality gates</caption>
  <thead><tr><th scope="col">Code</th><th scope="col">Result</th><th scope="col">Requirement</th><th scope="col">Notes</th></tr></thead>
  <tbody>${gateRows}</tbody>
</table>

${categorySections}
${finalizationSection}
${unlinkedSection}
</main>
<div class="bottom-bar"></div>
<div class="footer">
  TRUST Framework v1.1 · ${esc(metadata.toolName)} · ${model.scores.totalQuestions} questions · Evaluated ${formatDate(metadata.startTime)}
</div>

</body>
</html>`;
}
