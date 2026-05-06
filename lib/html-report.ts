import { PRINCIPLES } from "./principles";
import { getCategoryLabel } from "./rubric";
import { distributionBar } from "./scoring";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";
import { computeReportScores } from "./report/compute-scores";
import { REPORT_COLORS } from "./report/constants";
import { REPORT_CSS } from "./report/styles";
import {
  buildCategorySections,
  buildFinalizationSection,
  buildGateRows,
  buildScoreLegend,
  buildToc,
  buildUnlinkedSection,
} from "./report/sections";
import { compressScreenshot, esc, formatDate, safeLink } from "./report/utils";

export async function buildHtmlReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<string> {
  // Compress all screenshots in parallel
  const { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } = await import("./logos");
  const compressedScreenshots = new Map<string, string>();
  await Promise.all(
    captures.map(async (c) => {
      compressedScreenshots.set(c.id, await compressScreenshot(c.screenshotBase64));
    }),
  );

  const date = new Date(metadata.startTime).toISOString().split("T")[0];
  const scores = computeReportScores(evaluations, rubric, finalization);

  // Build section parts
  const scoreLegend = buildScoreLegend();
  const gateRows = buildGateRows(evaluations, rubric);
  const categorySections = buildCategorySections(
    captures,
    evaluations,
    rubric,
    compressedScreenshots,
    scores,
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
<meta name="description" content="TRUST Framework Evaluation Report" />
<meta property="og:title" content="TRUST Review: ${esc(metadata.toolName)}" />
<meta property="og:description" content="TRUST Framework Evaluation Report" />
<meta property="og:type" content="article" />
<title>TRUST Review: ${esc(metadata.toolName)}</title>
<style>${REPORT_CSS}</style>
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
  <div class="letterform-letters">
    ${PRINCIPLES.map((p) => {
      const reportColor = REPORT_COLORS[p.id] ?? p.color;
      return `<span class="letterform-letter" style="color:${reportColor}">${p.code}</span>`;
    }).join("")}
  </div>
  <div class="letterform-score">
    <div class="total">${scores.totalActual} / ${scores.totalMax}</div>
    <div class="pct">${Math.round(scores.ratio * 100)}% score · ${scores.answeredQuestions}/${scores.totalQuestions} answered</div>
  </div>
</div>

${scoreLegend}

<div class="gate-summary">
  <span>Quality Gate Status</span>
  <span style="color:${scores.allPassed ? "#4a8355" : scores.anyFail ? "#c60c30" : "#6b7f94"}">
    ${scores.allPassed ? "PASSED" : scores.anyFail ? "FAILED" : "INCOMPLETE"}
  </span>
</div>

<div class="accent-bar"></div>

<table class="cat-table">
  ${PRINCIPLES.map((p) => {
    if (!(p.id in rubric.scoring_rubric)) return "";
    const reportColor = REPORT_COLORS[p.id] ?? p.color;
    const catScores = scores.catScores.get(p.id) ?? [];
    const numeric = catScores.filter((s): s is number => typeof s === "number");
    const avg =
      numeric.length > 0 ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(1) : "—";
    const catTotal = numeric.reduce((a, b) => a + b, 0);
    const catMax = numeric.length * 3;
    const catEvals = evaluations.filter((e) => e.rubricId.startsWith(`${p.id}.`));
    const evidenceCount = captures.filter((c) =>
      catEvals.some((e) => e.explicitEvidenceIds.includes(c.id)),
    ).length;
    return `
      <tr>
        <td class="cat-code" style="color:${reportColor}">${p.code}</td>
        <td class="cat-label">${esc(getCategoryLabel(p.id).replace(/^.*?— /, ""))}<br />
          <span style="font-size:0.7rem;color:var(--muted);font-family:var(--ff-mono)">${catTotal}/${catMax} avg ${avg}</span>
        </td>
        <td class="cat-indicators">
          ${distributionBar(catScores)}
        </td>
        <td class="cat-evidence">
          <div class="count" style="color:${evidenceCount > 0 ? "var(--text)" : "var(--border)"}">${evidenceCount}</div>
          <div class="label">evidence</div>
        </td>
      </tr>
    `;
  }).join("")}
</table>

<div class="verdict-bar" style="background:${scores.verdictColor}"></div>
<div class="verdict-block">
  <div class="verdict-label">Verdict</div>
  <div class="verdict-text" style="color:${scores.verdictColor}">${scores.verdict}</div>
  <div class="verdict-reason">${
    scores.noEvaluation
      ? "No questions have been answered — review not started"
      : finalization?.conclusion
        ? esc(
            finalization.conclusion.length > 120
              ? `${finalization.conclusion.slice(0, 120)}...`
              : finalization.conclusion,
          )
        : !scores.isComplete
          ? `${scores.answeredQuestions}/${scores.totalQuestions} questions answered — evaluation incomplete`
          : scores.anyFail
            ? "Quality gate failure (one or more required checks did not pass)"
            : `Score ${Math.round(scores.ratio * 100)}%${scores.computedFailed ? ` — ${scores.anyFail ? "quality gate failure (required check did not pass)" : scores.principleFail ? "principle below minimum (at least one principle scored too low)" : "below threshold (overall score too low to pass)"}` : " meets threshold"}`
  }</div>
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
    ${esc(metadata.toolName)} &middot; ${safeLink(metadata.toolUrl, 'class="report-meta-url"')} &middot; Evaluated ${formatDate(metadata.startTime)}
  </div>
  ${metadata.notes ? `<div style="font-size:0.8rem;color:var(--muted);font-style:italic;margin-top:4px">${esc(metadata.notes)}</div>` : ""}
</div>

<nav class="toc">
  <span class="toc-label">Contents</span>
  ${tocItems}
</nav>

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
