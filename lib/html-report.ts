import { PRINCIPLES } from "./principles";
import type { ReportScores } from "./report/compute-scores";
import type { CaptureInfo, PrincipleScoreRow, QualityGateRow } from "./report-model";
import { buildReportModel } from "./report-model";
import {
  getVisibleRubricQuestionIds,
  principleAverage,
  qualityGateResults,
  reportScoreColor,
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
import reportHeadingFontFace from "./report-heading-font.txt?raw";

export const REPORT_CSS = reportCss;
/** Standalone-report stylesheet: REPORT_CSS with the embedded condensed-heading @font-face prepended (keeps the heading identity without Arial Narrow installed). */
const REPORT_STYLE = reportHeadingFontFace + reportCss;

import { ensureArray } from "./metadata-utils";

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
export function esc(s: string): string {
  if (!s || !ESC_NEEDS_ESCAPE_RE.test(s)) return s;
  return s.replace(/[&<>'"]/g, (c) => ESC_MAP[c]);
}

/** Validate URL starts with http:// or https:// */
const SAFE_URL_RE = /^https?:\/\//i;
function isSafeUrl(url: string): boolean {
  return SAFE_URL_RE.test(url.trim());
}

/** Render a URL as a link if valid, otherwise as plain text.
 *  @param className Optional CSS class for the anchor element. */
function safeLink(url: string, className: string = ""): string {
  const escaped = esc(url);
  if (isSafeUrl(url)) {
    const cls = className ? ` class="${esc(className)}"` : "";
    return `<a href="${escaped}" rel="noopener noreferrer" target="_blank"${cls}>${escaped}</a>`;
  }
  return `<span class="url-plain">${escaped}</span>`;
}

/** Format date consistently as YYYY-MM-DD HH:mm */
function formatDate(isoString: string): string {
  // Guard: ISO 8601 datetime strings are at least 16 chars ("YYYY-MM-DDTHH:mm").
  // Shorter strings cannot contain a valid date+time, so return em-dash intentionally.
  if (!isoString || isoString.length < 16) return "—";
  // ISO 8601: "YYYY-MM-DDTHH:mm:..." — slice directly, no Date construction
  return `${isoString.slice(0, 10)} ${isoString.slice(11, 16)}`;
}

const EMPTY_CIRCLE = '<span class="circle empty">&#9675;</span>';
const FILLED_CIRCLE = '<span class="circle filled">&#9679;</span>';
const ALL_EMPTY_CIRCLES = `<span class="circles">${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}</span><span class="circle-label">0/3</span>`;

function scoreCircles(avg: number | null): string {
  if (avg === null) return ALL_EMPTY_CIRCLES;
  const filled = Math.min(3, Math.floor(avg));
  const label = avg % 1 === 0 ? `${filled}/3` : `${avg.toFixed(1)}/3`;
  return `<span class="circles">${FILLED_CIRCLE.repeat(filled)}${EMPTY_CIRCLE.repeat(3 - filled)}</span><span class="circle-label">${label}</span>`;
}

/** Per-category average indicator for subsection headings: 3 circles coloured
 *  to the average grade + an "N/3" label (mirrors the nutrition label, without
 *  the extra number underneath). Empty when the category is unscored. */
function categoryAvgIndicator(p: PrincipleScoreRow): string {
  const avgNum = p.avg?.trim() ? Number.parseFloat(p.avg) : null;
  if (avgNum === null || Number.isNaN(avgNum)) {
    return `<span class="cat-score" aria-label="No average score"><span class="circles">${EMPTY_CIRCLE.repeat(3)}</span></span>`;
  }
  const filled = Math.min(3, Math.floor(avgNum));
  const color = reportScoreColor(Math.round(avgNum));
  const label = avgNum % 1 === 0 ? `${filled}/3` : `${avgNum.toFixed(1)}/3`;
  return `<span class="cat-score" style="color:${color}" title="Average ${avgNum.toFixed(1)} / 3"><span class="circles">${FILLED_CIRCLE.repeat(filled)}${EMPTY_CIRCLE.repeat(3 - filled)}</span><span class="cat-score-label">${label}</span></span>`;
}

// ── Popover builders (rubric + evidence) ───────────────────────────────
// Native `popover` elements: light-dismiss + Esc for free, render in the
// top layer (no page reflow → no "snap"). One open at a time (popover=auto).

/** Build a rubric popover (requirement/level + background + examples). Empty if nothing to show. */
function rubricPopover(
  code: string,
  main: { label: string; text: string } | null,
  background?: string,
  examples?: Record<string, string>,
): string {
  const exEntries = examples ? Object.entries(examples) : [];
  if (!main?.text && !background && exEntries.length === 0) return "";
  const mainBlock = main?.text
    ? `<section class="rb-sec"><h4 class="rb-label">${esc(main.label)}</h4><p>${esc(main.text)}</p></section>`
    : "";
  const bgBlock = background
    ? `<section class="rb-sec"><h4 class="rb-label">Background</h4><p>${esc(background)}</p></section>`
    : "";
  const exBlock = exEntries.length
    ? `<section class="rb-sec"><h4 class="rb-label">Examples</h4><dl class="rb-ex">${exEntries
        .map(([k, v]) => `<div class="rb-ex-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
        .join("")}</dl></section>`
    : "";
  return `<div popover="auto" id="rb-${esc(code)}" class="qpop" aria-label="Rubric: ${esc(code)}"><div class="qpop-head"><strong>${esc(code)}</strong><span class="qpop-head-sub">Rubric</span></div><div class="qpop-body">${mainBlock}${bgBlock}${exBlock}</div></div>`;
}

/** Build an evidence popover from resolved capture items. Reuses .evidence-item so the lightbox still zooms on click. */
function evidencePopover(
  code: string,
  items: {
    img: string;
    alt: string;
    title: string;
    time: string;
    notes?: string;
    weak?: boolean;
  }[],
): string {
  if (!items.length) return "";
  const figs = items
    .map(
      (it) => `
        <figure class="evidence-item${it.weak ? " evidence-weak" : ""}">
          ${it.img ? `<img src="${it.img}" alt="${esc(it.alt)}" loading="lazy" />` : `<div class="evidence-placeholder">No evidence captured</div>`}
          <figcaption class="evidence-meta"><strong>${esc(it.title)}</strong><span class="evidence-time">${esc(it.time)}</span>${it.notes ? `<p>${esc(it.notes)}</p>` : ""}</figcaption>
        </figure>`,
    )
    .join("");
  return `<div popover="auto" id="ev-${esc(code)}" class="qpop qpop-ev" aria-label="Evidence: ${esc(code)}"><div class="qpop-head"><strong>${esc(code)}</strong><span class="qpop-head-sub">Evidence (${items.length})</span></div><div class="qpop-body evidence-list">${figs}</div></div>`;
}

// ── Section builders (render from ReportModel slices) ──────────────────
function renderCategorySections(principles: PrincipleScoreRow[], captures: CaptureInfo[]): string {
  const captureMap = new Map(captures.map((c) => [c.id, c]));

  return principles
    .map((p, sectionIdx) => {
      const rows = p.questions
        .map((q) => {
          const scoreText = q.isNa
            ? "N/A"
            : q.isUnsure
              ? "?"
              : q.score >= 0
                ? String(q.score)
                : "—";
          const scoreVal = q.isNa
            ? "na"
            : q.isUnsure
              ? "unsure"
              : q.score >= 0
                ? String(q.score)
                : "";
          const hasScore = q.score >= 0 || q.isNa || q.isUnsure;
          const lead = hasScore ? q.levelDescription || "" : "";
          const rubric = rubricPopover(
            q.code,
            hasScore && q.levelDescription
              ? { label: `Level ${scoreText}`, text: q.levelDescription }
              : null,
            q.background,
            q.examples,
          );
          const evItems: {
            img: string;
            alt: string;
            title: string;
            time: string;
            notes?: string;
            weak?: boolean;
          }[] = [];
          for (const cid of q.evidenceIds) {
            const c = captureMap.get(cid);
            if (!c) continue;
            evItems.push({
              img: c.compressedScreenshot ?? c.screenshotBase64,
              alt: `Evidence for ${q.code}: ${c.pageTitle || "screenshot"}`,
              title: c.pageTitle || "Capture",
              time: formatDate(c.timestamp),
              notes: c.notes,
              weak: q.isWeakEvidence,
            });
          }
          const evidence = evidencePopover(q.code, evItems);
          const actions =
            (rubric
              ? `<button type="button" class="qpop-btn" popovertarget="rb-${esc(q.code)}" aria-haspopup="true">Rubric</button>`
              : "") +
            (evItems.length
              ? `<button type="button" class="qpop-btn qpop-btn-ev" popovertarget="ev-${esc(q.code)}" aria-haspopup="true">Evidence (${evItems.length})</button>`
              : "");

          return `
    <li class="qrow" id="q-${esc(q.code)}" style="--pc:${esc(q.badgeColor)}">
      <div class="qrow-main">
        <span class="qrow-code">${esc(q.code)}</span>
        <span class="qrow-chip" data-score="${scoreVal}">${scoreText}${q.customReasoning ? "*" : ""}</span>
        <p class="qrow-lead">${esc(lead)}</p>
        <div class="qrow-actions">${actions}</div>
      </div>
      <p class="qrow-note">${q.notes ? esc(q.notes) : `<em class="qrow-note-empty">No reviewer note</em>`}</p>
      ${rubric}${evidence}
    </li>`;
        })
        .join("");

      return `
    <section id="category-${p.id}" class="category-section${sectionIdx % 2 === 1 ? " category-alt" : ""}" style="--accent:${p.reportColor}" aria-labelledby="heading-${p.id}">
      <div class="category-header">
        <div class="category-letter-block">
          <div class="category-letter">${p.code}</div>
        </div>
        <div class="category-info">
          <h3 id="heading-${p.id}"><span class="category-title">${esc(p.fullName)}</span>${categoryAvgIndicator(p)}</h3>
          <div class="principle-chips" role="list" aria-label="Question status overview">
            ${p.questions
              .map((q) => {
                const ev = q.evidenceIds.length;
                const answered = q.score >= 0 || q.isNa || q.isUnsure;
                const state = answered ? (ev > 0 ? "complete" : "partial") : "empty";
                const indicator =
                  state === "complete" ? "\u2713" : state === "partial" ? "\u25cf" : "\u25cb";
                const scoreVal = q.isNa
                  ? "na"
                  : q.isUnsure
                    ? "unsure"
                    : q.score >= 0
                      ? String(q.score)
                      : "";
                const statusText =
                  state === "complete"
                    ? "answered with evidence"
                    : state === "partial"
                      ? "answered"
                      : "unanswered";
                return `<span class="pchip" role="listitem" data-state="${state}" data-score="${scoreVal}" style="--pc:${q.badgeColor}" title="${esc(q.code)}: ${statusText}"><span class="pchip-code">${q.code}</span><span class="pchip-indicator" aria-hidden="true">${indicator}</span>${ev > 0 ? `<span class="pchip-ev">${ev}</span>` : ""}</span>`;
              })
              .join("")}
          </div>
        </div>
      </div>
      <ul class="qlist">${rows}</ul>
    </section>`;
    })
    .join("");
}

function renderGateRows(gates: QualityGateRow[]): string {
  return gates
    .map((g) => {
      const resultLabel = g.result === "pass" ? "PASS" : g.result === "fail" ? "FAIL" : "—";
      const lead = g.requirement || g.label;
      const rubric = rubricPopover(
        g.code,
        g.requirement ? { label: "Requirement", text: g.requirement } : null,
        g.background,
        g.examples,
      );
      return `
    <li class="qrow" id="qg-${esc(g.code)}" style="--pc:${esc(g.color)}">
      <div class="qrow-main">
        <span class="qrow-code">${esc(g.code)}</span>
        <span class="qrow-chip" data-result="${esc(g.result ?? "")}">${resultLabel}</span>
        <p class="qrow-lead">${esc(lead)}</p>
        <div class="qrow-actions">${rubric ? `<button type="button" class="qpop-btn" popovertarget="rb-${esc(g.code)}" aria-haspopup="true">Rubric</button>` : ""}</div>
      </div>
      <p class="qrow-note">${g.notes ? esc(g.notes) : `<em class="qrow-note-empty">No reviewer note</em>`}</p>
      ${rubric}
    </li>`;
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
      <div class="fin-grade" style="color:${verdictColor};background:color-mix(in srgb, ${verdictColor} 8%, var(--white))">
        ${verdict}
      </div>
      ${finalization.conclusion ? `<div class="fin-block fin-block--conclusion" style="--fin-accent:${verdictColor}"><h3>Conclusion</h3><p>${esc(finalization.conclusion)}</p></div>` : ""}
      ${
        strengthsList
          ? `
        <div class="fin-block">
          <h3 style="color:var(--score-3)">Strengths</h3>
          <ul>${strengthsList}</ul>
        </div>
      `
          : ""
      }
      ${
        weaknessesList
          ? `
        <div class="fin-block">
          <h3 style="color:var(--score-0)">Weaknesses</h3>
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
    .map((c) => {
      const imgSrc = c.compressedScreenshot ?? c.screenshotBase64;
      const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="Additional evidence: ${esc(c.pageTitle || "screenshot")}" loading="lazy" />`
        : `<div class="evidence-placeholder">No evidence captured</div>`;
      return `
        <div class="unlinked-item">
          ${imgHtml}
          <div class="unlinked-meta">
            <strong>${esc(c.pageTitle || "Capture")}</strong>
            ${safeLink(c.sourceUrl)}
            <span>${formatDate(c.timestamp)}</span>
            ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  if (!unlinkedHtml) return "";

  return `
    <section class="unlinked-section">
      <h2>Additional Evidence</h2>
      ${unlinkedHtml}
    </section>
  `;
}

function buildOverviewBar(gates: QualityGateRow[], principles: PrincipleScoreRow[]): string {
  const gateBadges = gates
    .map((g) => {
      const answered = g.result === "pass" || g.result === "fail";
      const state = answered ? "complete" : "empty";
      const indicator = g.result === "pass" ? "\u2713" : g.result === "fail" ? "\u2717" : "\u25cb";
      const statusText =
        g.result === "pass" ? "pass" : g.result === "fail" ? "fail" : "not evaluated";
      return `<a class="ro-badge" data-state="${state}" data-score="${g.result ?? ""}" style="--pc:${g.color}" href="#qg-${esc(g.code)}" title="${esc(g.code)}: ${esc(g.label)} \u2014 ${statusText}"><span class="ro-badge-code">${g.code}</span><span class="ro-badge-indicator" aria-hidden="true">${indicator}</span></a>`;
    })
    .join("");
  const principleGroups = principles
    .map((p) => {
      const badges = p.questions
        .map((q) => {
          const ev = q.evidenceIds.length;
          const answered = q.score >= 0 || q.isNa || q.isUnsure;
          const state = answered ? (ev > 0 ? "complete" : "partial") : "empty";
          const indicator =
            state === "complete" ? "\u2713" : state === "partial" ? "\u25cf" : "\u25cb";
          const scoreVal = q.isNa
            ? "na"
            : q.isUnsure
              ? "unsure"
              : q.score >= 0
                ? String(q.score)
                : "";
          const statusText =
            state === "complete"
              ? "answered with evidence"
              : state === "partial"
                ? "answered"
                : "unanswered";
          return `<a class="ro-badge" data-state="${state}" data-score="${scoreVal}" style="--pc:${q.badgeColor}" href="#q-${esc(q.code)}" title="${esc(q.code)}: ${statusText}${ev > 0 ? ` \u00b7 ${ev} evidence` : ""}"><span class="ro-badge-code">${q.code}</span><span class="ro-badge-indicator" aria-hidden="true">${indicator}</span>${ev > 0 ? `<span class="ro-badge-ev">${ev}</span>` : ""}</a>`;
        })
        .join("");
      return `<span class="ro-group"><a class="ro-cat" href="#category-${p.id}" style="--pc:${p.reportColor}" title="${esc(p.fullName)}">${p.code}</a>${badges}</span>`;
    })
    .join("");
  const allQuestions = principles.flatMap((p) => p.questions);
  const total = gates.length + allQuestions.length;
  const scored =
    gates.filter((g) => g.result === "pass" || g.result === "fail").length +
    allQuestions.filter((q) => q.score >= 0 || q.isNa || q.isUnsure).length;
  const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
  return `<span class="ro-fraction"><span class="ro-scored">${scored}</span><span class="ro-div">/</span><span class="ro-total">${total}</span></span><span class="ro-track" role="progressbar" aria-label="Questions answered" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span class="ro-fill" style="width:${pct}%"></span></span><span class="ro-sep" aria-hidden="true"></span>${gateBadges ? `<span class="ro-group">${gateBadges}</span>` : ""}${principleGroups}`;
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

  const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, metadata.usesAi ?? true));
  const gates = qualityGateResults(evaluations, rubric, evalMap).filter((g) =>
    visibleIds.has(g.id),
  );
  const gateGrid =
    gates.length > 0
      ? `<div class="nutrition-gate-grid">${gates
          .map((g) => {
            const icon =
              g.result === "pass"
                ? "\u2713"
                : g.result === "fail"
                  ? "\u2715"
                  : g.result === "unsure"
                    ? "?"
                    : g.result === "na"
                      ? "\u2013"
                      : "\u25CB";
            return `<div class="nutrition-gate" data-result="${g.result ?? "none"}" title="${esc(g.label)}"><span class="nutrition-gate-icon" aria-hidden="true">${icon}</span><span class="nutrition-gate-name">${esc(g.label)}</span></div>`;
          })
          .join("")}</div>`
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

  // Conclusion + recommendation (peer to strengths/weaknesses)
  const conclusion = finalization?.conclusion?.trim() ?? "";
  const recommendation = finalization?.recommendations?.trim() ?? "";
  const conclRecRow =
    conclusion || recommendation
      ? `<div class="nutrition-divider-thin"></div>
<div class="nutrition-cr">
  <div class="nutrition-cr-col">
    <div class="nutrition-sw-title">Conclusion</div>
    ${conclusion ? `<p>${esc(conclusion)}</p>` : `<div class="nutrition-sw-empty">Not specified</div>`}
  </div>
  <div class="nutrition-sw-divider"></div>
  <div class="nutrition-cr-col">
    <div class="nutrition-sw-title">Recommendation</div>
    ${recommendation ? `<p>${esc(recommendation)}</p>` : `<div class="nutrition-sw-empty">Not specified</div>`}
  </div>
</div>`
      : "";

  // In-progress indicator (finalized reports show no status line)
  const statusLine =
    !scores.noEvaluation && !scores.isComplete
      ? `<div class="nutrition-status">${scores.answeredQuestions}/${scores.totalQuestions} questions answered</div>`
      : "";

  return `
<div class="nutrition-label">
  <div class="nutrition-top">
    <div class="nutrition-top-row">
      <div class="nutrition-top-id">
        <img src="${TRUST_LOGO}" alt="TRUST" class="nl-brand-logo" />
        <span class="nl-title">Information Tool Reviews</span>
      </div>
      <div class="nutrition-tool-lockup">
        ${logo ? `${toolLink}<img class="nutrition-tool-logo" src="${esc(logo)}" alt="${toolName}" />${toolLinkClose}` : ""}
        <div class="nutrition-tool-id">
          ${toolLink}<span class="nutrition-tool-name">${toolName}</span>${toolLinkClose}
          <span class="nutrition-tool-url">${safeLink(metadata.toolUrl)}</span>
        </div>
      </div>
    </div>
    ${metadata.description ? `<div class="nutrition-description">${esc(metadata.description)}</div>` : ""}
  </div>
  ${statusLine}

  <div class="nutrition-verdict">
    <div class="nutrition-verdict-stamp" style="color:${scores.verdictColor};border-color:${scores.verdictColor}">
      ${scores.verdict}
      <span class="nutrition-verdict-sub">
        <img src="${TRUST_LOGO}" alt="TRUST" style="height:0.9em;vertical-align:middle;margin-right:2px" />
        Framework Verdict
      </span>
    </div>
  </div>

  <div class="nutrition-divider-thin"></div>

  <div class="nutrition-scores">
    ${
      gateGrid
        ? `<div class="nutrition-score-block nutrition-score-block--gates"><div class="nutrition-overall-label">Quality Gates</div>${gateGrid}</div>`
        : ""
    }
    <div class="nutrition-score-block nutrition-score-block--subjects">
      <table class="nutrition-principles-table" aria-label="Principle scores">
        <tr>
          ${PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
            .map((p) => {
              const reportColor = REPORT_COLORS[p.id] ?? p.color;
              const avg = principleAverage(p.id, evaluations, rubric, evalMap);
              return (
                '<th scope="col" style="color:' +
                reportColor +
                '"><div class="nutrition-principle-code">' +
                p.code +
                '</div><div class="nutrition-principle-name">' +
                (PRINCIPLE_NAMES[p.id] ?? "") +
                "</div><div>" +
                scoreCircles(avg) +
                "</div></th>"
              );
            })
            .join("")}
          <th scope="col" class="nutrition-overall-cell" style="color:var(--magenta)">
            <div class="nutrition-overall-spacer" aria-hidden="true"></div>
            <div class="nutrition-overall-label">Overall</div>
            <div>${scoreCircles(scores.totalMax > 0 ? (scores.totalActual / scores.totalMax) * 3 : null)}</div>
          </th>
        </tr>
      </table>
    </div>
  </div>

  ${conclRecRow}

  ${swRow}

  <div class="nutrition-footer">
    <img src="${LISA_EIS_LOGO}" alt="LISA-EIS" style="height:24px" />
    <a href="https://www.utwente.nl/library/" target="_blank" rel="noopener noreferrer">
      <span class="nutrition-footer-text">LISA-EIS / University of Twente / ${date}</span>
    </a>
    <img src="${UT_LOGO}" alt="University of Twente" style="height:22px" />
  </div>
</div>`;
}

/** Build the standalone TRUST "nutrition label" HTML — a compact summary card. */
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
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>TRUST Label: ${esc(metadata.toolName)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body class="report">
<main id="report-content">
${labelHtml}
</main>
</body>
</html>`;
}

// ── Business Card Label ────────────────────────────────────────────────

function buildBusinessCardLabelHtml(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  _finalization: ReviewFinalization | null,
  scores: ReportScores,
  TRUST_LOGO: string,
  evalMap: Map<string, Evaluation>,
): string {
  const date = metadata.startTime.slice(0, 10);
  const toolUrl = esc(metadata.toolUrl);
  const toolName = esc(metadata.toolName);
  const toolLink = `<a href="${toolUrl}" target="_blank" rel="noopener noreferrer">`;
  const toolLinkClose = "</a>";

  // Quality gate failures only
  const gateFailures = qualityGateResults(evaluations, rubric, evalMap).filter(
    (g) => g.result === "fail" || g.result === "unsure",
  );

  const gateHtml = gateFailures.length
    ? gateFailures
        .map(
          (g) =>
            `<div class="bc-gate-fail">${esc(g.label)}: <span class="bc-gate-${g.result}">${g.result === "fail" ? "FAIL" : "UNSURE"}</span></div>`,
        )
        .join("")
    : "";

  // Principle indicators — just code + filled/empty circle
  const principleHtml = PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
    .map((p) => {
      const avg = principleAverage(p.id, evaluations, rubric, evalMap);
      const passed = avg !== null && avg >= 1.5;
      const color = REPORT_COLORS[p.id] ?? p.color;
      return `<span class="bc-principle" style="--bc-pcolor:${color}">
        <span class="bc-pcode">${p.code}</span>
        <span class="bc-pindicator${passed ? " bc-pass" : ""}">${passed ? "●" : "○"}</span>
      </span>`;
    })
    .join("");

  const scoreText = !scores.noEvaluation ? `${scores.totalActual}/${scores.totalMax}` : "—";

  return `
<div class="bc-card">
  <div class="bc-header">
    <img class="bc-logo" src="${TRUST_LOGO}" alt="TRUST" />
    <span class="bc-tagline">Information Tool Reviews</span>
  </div>

  <div class="bc-tool-row">
    ${toolLink}<span class="bc-tool-name">${toolName}</span>${toolLinkClose}
    <span class="bc-tool-url">${toolUrl}</span>
  </div>

  <div class="bc-divider"></div>

  <div class="bc-verdict-row">
    <span class="bc-verdict-stamp" style="color:${scores.verdictColor};border-color:${scores.verdictColor}">${esc(scores.verdict)}</span>
    <span class="bc-score">${scoreText}</span>
  </div>

  ${gateHtml ? `<div class="bc-gates">${gateHtml}</div>` : ""}

  <div class="bc-divider"></div>

  <div class="bc-principles">${principleHtml}</div>

  <div class="bc-footer">
    <span>${date}</span>
    <span>TRUST Framework v1.1</span>
  </div>
</div>`;
}

/** Build a compact business-card-sized TRUST label HTML (credit-card aspect ratio). */
export async function buildBusinessCardLabel(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<string> {
  if (!_logos) _logos = await import("./logos");
  const { TRUST_LOGO } = _logos;
  const model = buildReportModel(metadata, [], evaluations, rubric, finalization, new Map());
  const cardHtml = buildBusinessCardLabelHtml(
    metadata,
    evaluations,
    rubric,
    finalization,
    model.scores,
    TRUST_LOGO,
    model.evalMap,
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>TRUST Card: ${esc(metadata.toolName)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body>
<main id="report-content">
${cardHtml}
</main>
</body>
</html>`;
}

/** Build the full standalone HTML evaluation report with all sections, scores, and embedded screenshots. */
export async function buildHtmlReport(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
  reviewer?: { name?: string; email?: string },
  quickNotes: { id: string; text: string; timestamp: string }[] = [],
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
  const overviewBar = buildOverviewBar(model.qualityGateRows, model.principleScores);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>TRUST Review: ${esc(metadata.toolName)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body class="report">

<main id="report-content">
<h1 class="sr-only">TRUST Review: ${esc(metadata.toolName)}</h1>
<nav class="part-nav" aria-label="Report sections">
  <a class="part-nav-btn" data-part="summary" href="#part-summary">Summary</a>
  <a class="part-nav-btn" data-part="scores" href="#part-scores">Detailed Scores</a>
  <a class="part-nav-btn" data-part="verdict" href="#part-verdict">Verdict</a>
</nav>

<section class="report-part" id="part-summary" data-part="summary">
  <header class="part-band"><h2 class="part-title">Summary</h2></header>
    ${buildNutritionLabelHtml(metadata, evaluations, rubric, finalization, model.scores, TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO, model.evalMap)}
  </div>
</section>

<section class="report-part" id="part-scores" data-part="scores">
  <header class="part-band"><h2 class="part-title">Detailed Scores</h2></header>
  <header class="scores-head"><div class="scores-head-tool"><a href="${esc(metadata.toolUrl)}" target="_blank" rel="noopener noreferrer"><span class="scores-head-name">${esc(metadata.toolName)}</span></a><span class="scores-head-url">${safeLink(metadata.toolUrl)}</span></div><div class="scores-head-meta">Detailed Evaluation Report &middot; ${formatDate(metadata.startTime)} &middot; ${model.scores.totalQuestions} questions</div></header>
  <div class="part-body">
    <div class="report-meta-groups">
    ${(() => {
      const groups: string[] = [];
      const profile: string[] = [];
      if (metadata.description)
        profile.push(`<dt>Description</dt><dd>${esc(metadata.description)}</dd>`);
      if (metadata.company) profile.push(`<dt>Publisher</dt><dd>${esc(metadata.company)}</dd>`);
      const disc = ensureArray(metadata.discipline);
      if (disc.length) profile.push(`<dt>Discipline</dt><dd>${esc(disc.join(", "))}</dd>`);
      const coverage: string[] = [];
      const ds = ensureArray(metadata.dataSources);
      if (ds.length) coverage.push(`<dt>Data sources</dt><dd>${esc(ds.join(", "))}</dd>`);
      const sm = ensureArray(metadata.searchMethods);
      if (sm.length) coverage.push(`<dt>Search methods</dt><dd>${esc(sm.join(", "))}</dd>`);
      const access: string[] = [];
      if (metadata.pricing) access.push(`<dt>Pricing</dt><dd>${esc(metadata.pricing)}</dd>`);
      if (metadata.availability)
        access.push(`<dt>Availability</dt><dd>${esc(metadata.availability)}</dd>`);
      if (metadata.authenticationMethod)
        access.push(`<dt>Authentication</dt><dd>${esc(metadata.authenticationMethod)}</dd>`);
      if (metadata.termsConditionsUrl)
        access.push(`<dt>Terms</dt><dd>${safeLink(metadata.termsConditionsUrl)}</dd>`);
      access.push(`<dt>AI-powered</dt><dd>${(metadata.usesAi ?? true) ? "Yes" : "No"}</dd>`);
      if (profile.length)
        groups.push(
          `<section class="report-meta-group"><h3>Profile</h3><dl>${profile.join("")}</dl></section>`,
        );
      if (access.length)
        groups.push(
          `<section class="report-meta-group"><h3>Access</h3><dl>${access.join("")}</dl></section>`,
        );
      if (coverage.length)
        groups.push(
          `<section class="report-meta-group"><h3>Coverage</h3><dl>${coverage.join("")}</dl></section>`,
        );
      return groups.join("");
    })()}
  </div>
  ${metadata.notes ? `<p class="report-meta-foot">${esc(metadata.notes)}</p>` : ""}
  ${quickNotes.length > 0 ? `<section class="report-quick-notes"><h3>Quick Notes</h3><ul>${quickNotes.map((n) => `<li class="quick-note"><time class="quick-note-time" datetime="${esc(n.timestamp)}">${esc(formatDate(n.timestamp))}</time><span class="quick-note-text">${esc(n.text)}</span></li>`).join("")}</ul></section>` : ""}
    <nav class="report-overview" aria-label="Report overview">
      ${overviewBar}
    </nav>
    <h3 class="block-heading">Quality Gates</h3>
    <ul class="qlist qg-list">${gateRows}</ul>
    <div class="categories">
${categorySections}
</div>
  </div>
</section>

<section class="report-part" id="part-verdict" data-part="verdict">
  <header class="part-band"><h2 class="part-title">Verdict</h2></header>
  <div class="part-body part-body--narrow">
    ${finalizationSection}
  </div>
</section>
${unlinkedSection}
</main>
<div class="bottom-bar"></div>
<footer class="footer">
  <span class="footer-wordmark">TRUST Framework<span class="footer-edition">v1.1</span></span>
  <span class="footer-meta">${esc(metadata.toolName)} · ${model.scores.totalQuestions} questions · ${finalization?.finalizedAt ? "Finalized" : "Evaluated"} ${formatDate(finalization?.finalizedAt ?? metadata.startTime)}${
    reviewer?.name || reviewer?.email
      ? ` · Reviewed by ${[reviewer?.name, reviewer?.email]
          .filter((s): s is string => Boolean(s))
          .map(esc)
          .join(" &middot; ")}`
      : ""
  }</span>
</footer>

<script>
(function () {
  var box = document.createElement("div");
  box.id = "trust-lightbox";
  box.setAttribute("popover", "manual");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Full-size screenshot");
  box.setAttribute("tabindex", "-1");
  box.innerHTML = '<img alt="" />';
  document.body.appendChild(box);
  var boxImg = box.querySelector("img");
  var lastFocus = null;
  function open(src, alt) {
    lastFocus = document.activeElement;
    boxImg.src = src;
    boxImg.alt = alt || "";
    // Top-layer popover so the lightbox renders above any open evidence
    // popover (native popovers sit above normal fixed elements). Class fallback
    // for browsers without the Popover API.
    if (typeof box.showPopover === "function") {
      try { box.showPopover(); } catch (e) { box.classList.add("open"); }
    } else {
      box.classList.add("open");
    }
    box.focus();
  }
  function close() {
    if (typeof box.hidePopover === "function") {
      try { box.hidePopover(); } catch (e) {}
    }
    box.classList.remove("open");
    boxImg.src = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  box.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });
  // Event delegation: click any evidence/unlinked screenshot to view it full-size.
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== "function") return;
    var img = t.closest(".evidence-item img, .unlinked-item img");
    if (!img) return;
    e.preventDefault();
    open(img.getAttribute("src") || "", img.getAttribute("alt") || "");
  });
  // Highlight the active part in the segmented nav.
  var navBtns = document.querySelectorAll(".part-nav-btn");
  var parts = document.querySelectorAll(".report-part");
  if (navBtns.length && parts.length && "IntersectionObserver" in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute("data-part");
          navBtns.forEach(function (btn) {
            var isActive = btn.getAttribute("data-part") === id;
            btn.classList.toggle("is-active", isActive);
            if (isActive) btn.setAttribute("aria-current", "true");
            else btn.removeAttribute("aria-current");
          });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    parts.forEach(function (p) { navObserver.observe(p); });
  }
  // Popover API fallback for browsers without native popover support
  if (typeof document.createElement('div').showPopover !== 'function') {
    var openPop = null;
    document.querySelectorAll('.qpop-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var id = btn.getAttribute('popovertarget');
        var pop = id ? document.getElementById(id) : null;
        if (!pop) return;
        if (openPop && openPop !== pop) { openPop.classList.remove('is-open'); }
        pop.classList.toggle('is-open');
        openPop = pop.classList.contains('is-open') ? pop : null;
      });
    });
    document.addEventListener('click', function(e) {
      if (openPop && !openPop.contains(e.target) && !e.target.closest('.qpop-btn')) {
        openPop.classList.remove('is-open');
        openPop = null;
      }
    });
  }
})();
</script>
</body>
</html>`;
}
