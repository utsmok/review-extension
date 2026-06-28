import { encode as encodeQR } from "uqr";
import { getActiveBranding, getReportBranding } from "./framework-config";
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
import type {
  Capture,
  Evaluation,
  FrameworkBranding,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "./types";

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

const EMPTY_CIRCLE = '<span class="circle empty" aria-hidden="true"></span>';
const FILLED_CIRCLE = '<span class="circle filled" aria-hidden="true"></span>';
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

// ── Popover builders (Details: rubric + evidence, merged) ─────────────
// Native `popover` elements: light-dismiss + Esc for free, render in the
// top layer (no page reflow → no "snap"). One open at a time (popover=auto).
// Each finding has a single "Details" popover that mirrors the extension's
// question view: the full option list (0–3 + N/A + Unsure, selected
// highlighted), background, examples, the reviewer note, and evidence.

type EvidenceItem = {
  img: string;
  alt: string;
  title: string;
  time: string;
  notes?: string;
  weak?: boolean;
};

/** Thumbnails for an evidence set — reuses .evidence-item so the lightbox zooms on click. */
function evidenceThumbnailsHtml(items: EvidenceItem[]): string {
  return items
    .map(
      (it) => `
        <figure class="evidence-item${it.weak ? " evidence-weak" : ""}">
          ${it.img ? `<img src="${it.img}" alt="${esc(it.alt)}" loading="lazy" />` : `<div class="evidence-placeholder">No evidence captured</div>`}
          <figcaption class="evidence-meta"><strong>${esc(it.title)}</strong><span class="evidence-time">${esc(it.time)}</span>${it.notes ? `<p>${esc(it.notes)}</p>` : ""}</figcaption>
        </figure>`,
    )
    .join("");
}

/** Build the merged Details popover for a scoring question: the full option
 *  list (0–3 + N/A + Unsure, selected highlighted — mirrors the tool), the
 *  rubric background/examples, the reviewer note, and linked evidence. */
function detailsPopover(
  code: string,
  title: string,
  selected: { score: number; isNa: boolean; isUnsure: boolean },
  levels: {
    readonly "0": string;
    readonly "1": string;
    readonly "2": string;
    readonly "3": string;
  },
  background: string | undefined,
  examples: Record<string, string> | undefined,
  notes: string | undefined,
  evidenceItems: EvidenceItem[],
): string {
  const optionRow = (val: 0 | 1 | 2 | 3) => {
    const isSel = !selected.isNa && !selected.isUnsure && selected.score === val;
    const color = reportScoreColor(val);
    return `<li class="det-option" data-score="${val}"${isSel ? ' data-selected="true"' : ""} style="--opt-color:${color}"><span class="det-option-num">${val}</span><span class="det-option-desc">${esc((levels as Record<string, string>)[val])}</span></li>`;
  };
  const metaRow = (score: "na" | "unsure", num: string, desc: string, isSel: boolean) =>
    `<li class="det-option det-option--meta" data-score="${score}"${isSel ? ' data-selected="true"' : ""}><span class="det-option-num">${num}</span><span class="det-option-desc">${esc(desc)}</span></li>`;
  const options = `<ul class="det-options" role="list">${optionRow(0)}${optionRow(1)}${optionRow(2)}${optionRow(3)}${metaRow("na", "N/A", "Not applicable", selected.isNa)}${metaRow("unsure", "?", "Insufficient information", selected.isUnsure)}</ul>`;

  const bgBlock = background
    ? `<section class="rb-sec"><h4 class="rb-label">Background</h4><p>${esc(background)}</p></section>`
    : "";
  const exEntries = examples ? Object.entries(examples) : [];
  const exBlock = exEntries.length
    ? `<section class="rb-sec"><h4 class="rb-label">Examples</h4><dl class="rb-ex">${exEntries.map(([k, v]) => `<div class="rb-ex-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></section>`
    : "";
  const noteBlock = notes
    ? `<section class="rb-sec"><h4 class="rb-label">Reviewer note</h4><p>${esc(notes)}</p></section>`
    : "";
  const evBlock = evidenceItems.length
    ? `<section class="rb-sec"><h4 class="rb-label">Evidence (${evidenceItems.length})</h4><div class="evidence-list">${evidenceThumbnailsHtml(evidenceItems)}</div></section>`
    : "";

  return `<div popover="auto" id="dt-${esc(code)}" class="qpop qpop-det" aria-label="Details: ${esc(code)}"><div class="qpop-head"><strong>${esc(code)}</strong><span class="qpop-head-sub">Details</span></div><div class="qpop-body">${title ? `<p class="det-title">${esc(title)}</p>` : ""}${evBlock}${noteBlock}${options}${bgBlock}${exBlock}</div></div>`;
}

/** Build the Details popover for a quality-gate question: requirement +
 *  background + examples + reviewer note (gates have no 0–3 scale). */
function gateDetailsPopover(
  code: string,
  requirement: string | undefined,
  background: string | undefined,
  examples: Record<string, string> | undefined,
  notes: string | undefined,
): string {
  if (!requirement && !background && !examples && !notes) return "";
  const reqBlock = requirement
    ? `<section class="rb-sec"><h4 class="rb-label">Requirement</h4><p>${esc(requirement)}</p></section>`
    : "";
  const bgBlock = background
    ? `<section class="rb-sec"><h4 class="rb-label">Background</h4><p>${esc(background)}</p></section>`
    : "";
  const exEntries = examples ? Object.entries(examples) : [];
  const exBlock = exEntries.length
    ? `<section class="rb-sec"><h4 class="rb-label">Examples</h4><dl class="rb-ex">${exEntries.map(([k, v]) => `<div class="rb-ex-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></section>`
    : "";
  const noteBlock = notes
    ? `<section class="rb-sec"><h4 class="rb-label">Reviewer note</h4><p>${esc(notes)}</p></section>`
    : "";
  return `<div popover="auto" id="dt-${esc(code)}" class="qpop qpop-det" aria-label="Details: ${esc(code)}"><div class="qpop-head"><strong>${esc(code)}</strong><span class="qpop-head-sub">Details</span></div><div class="qpop-body">${reqBlock}${bgBlock}${exBlock}${noteBlock}</div></div>`;
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
          const evItems: EvidenceItem[] = [];
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
          const details = detailsPopover(
            q.code,
            q.title,
            { score: q.score, isNa: q.isNa, isUnsure: q.isUnsure },
            q.levels,
            q.background,
            q.examples,
            q.notes || undefined,
            evItems,
          );
          const actions = `<button type="button" class="qpop-btn" popovertarget="dt-${esc(q.code)}" aria-haspopup="true">Details</button>`;

          return `
    <li class="qrow" id="q-${esc(q.code)}" style="--pc:${esc(q.badgeColor)}">
      <div class="qrow-main">
        <span class="qrow-code">${esc(q.code)}</span>
        <span class="qrow-chip" data-score="${scoreVal}">${scoreText}${q.customReasoning ? "*" : ""}</span>
        <p class="qrow-lead">${esc(lead)}</p>
        <div class="qrow-actions"><button type="button" class="qrow-ev" popovertarget="dt-${esc(q.code)}" aria-haspopup="true" title="${evItems.length} evidence item${evItems.length === 1 ? "" : "s"} tagged"><span class="qrow-ev-ic" aria-hidden="true">${evItems.length > 0 ? "\u{1F4CE}" : "\u2014"}</span>${evItems.length}</button>${actions}</div>
      </div>
      <p class="qrow-note">${q.notes ? esc(q.notes) : `<em class="qrow-note-empty">No reviewer note</em>`}</p>
      ${details}
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
      const details = gateDetailsPopover(
        g.code,
        g.requirement,
        g.background,
        g.examples,
        g.notes || undefined,
      );
      return `
    <li class="qrow" id="qg-${esc(g.code)}" style="--pc:${esc(g.color)}">
      <div class="qrow-main">
        <span class="qrow-code">${esc(g.code)}</span>
        <span class="qrow-chip" data-result="${esc(g.result ?? "")}">${resultLabel}</span>
        <p class="qrow-lead">${esc(lead)}</p>
        <div class="qrow-actions">${details ? `<button type="button" class="qpop-btn" popovertarget="dt-${esc(g.code)}" aria-haspopup="true">Details</button>` : ""}</div>
      </div>
      <p class="qrow-note">${g.notes ? esc(g.notes) : `<em class="qrow-note-empty">No reviewer note</em>`}</p>
      ${details}
    </li>`;
    })
    .join("");
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
  logos: FrameworkBranding["logos"],
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
  const gateIcon = (g: { result?: string | null }) =>
    g.result === "pass"
      ? "\u2713"
      : g.result === "fail"
        ? "\u2715"
        : g.result === "unsure"
          ? "?"
          : g.result === "na"
            ? "\u2013"
            : "\u25CB";

  const swRow =
    strengthsHtml || weaknessesHtml
      ? `<div class="nutrition-sw">
  ${
    strengthsHtml
      ? `<div class="nutrition-sw-col nutrition-sw-col--strength">
    <div class="nutrition-sw-title">Strengths</div>
    <ul class="nutrition-sw-list">${strengthsHtml}</ul>
  </div>`
      : `<div class="nutrition-sw-col nutrition-sw-col--strength">
    <div class="nutrition-sw-title">Strengths</div>
    <div class="nutrition-sw-empty">Not specified</div>
  </div>`
  }
  ${
    weaknessesHtml
      ? `<div class="nutrition-sw-col nutrition-sw-col--weakness">
    <div class="nutrition-sw-title">Weaknesses</div>
    <ul class="nutrition-sw-list">${weaknessesHtml}</ul>
  </div>`
      : `<div class="nutrition-sw-col nutrition-sw-col--weakness">
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
      ? `<div class="nutrition-cr">
  <div class="nutrition-cr-col nutrition-cr-col--conclusion">
    <div class="nutrition-sw-title">Conclusion</div>
    ${conclusion ? `<p>${esc(conclusion)}</p>` : `<div class="nutrition-sw-empty">Not specified</div>`}
  </div>
  <div class="nutrition-cr-col nutrition-cr-col--recommendation">
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
      <span class="nl-title">Information Tool Reviews</span>
      <div class="nutrition-tool-lockup">
        ${logo ? `${toolLink}<img class="nutrition-tool-logo" src="${esc(logo)}" alt="${toolName}" />${toolLinkClose}` : ""}
        <div class="nutrition-tool-id">
          ${toolLink}<span class="nutrition-tool-name">${toolName}</span>${toolLinkClose}
          <span class="nutrition-tool-url">${safeLink(metadata.toolUrl)}</span>
        </div>
      </div>
      <img src="${logos.framework}" alt="${esc(getReportBranding().frameworkName)}" class="nl-brand-logo" />
    </div>
    ${metadata.description ? `<div class="nutrition-description">${esc(metadata.description)}</div>` : ""}
  </div>
  ${statusLine}

  <div class="nutrition-verdict">
    <div class="nutrition-verdict-stamp" style="color:${scores.verdictColor};border-color:${scores.verdictColor}">
      ${scores.verdict}
      <span class="nutrition-verdict-sub">
        <img src="${logos.framework}" alt="${esc(getReportBranding().frameworkName)}" style="height:0.9em;vertical-align:middle;margin-right:2px" />
        Framework Verdict
      </span>
    </div>
  </div>

  <div class="nutrition-divider-thin"></div>

  <div class="nutrition-scores nl-rows" style="--vc:${scores.verdictColor}">
    ${
      gates.length > 0
        ? `<div class="nl-gates">${gates
            .map(
              (g) =>
                `<div class="nl-gate" data-result="${g.result ?? "none"}"><span class="nl-gate-ic" aria-hidden="true">${gateIcon(g)}</span><span class="nl-gate-name">${esc(g.label)}</span></div>`,
            )
            .join("")}</div>`
        : ""
    }
    <div class="nl-prows">
      ${PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
        .map((p) => {
          const avg = principleAverage(p.id, evaluations, rubric, evalMap);
          const color = REPORT_COLORS[p.id] ?? p.color;
          const circlesHtml =
            avg === null
              ? `<span class="circles">${EMPTY_CIRCLE.repeat(3)}</span>`
              : circlesOnly(scoreCircles(avg));
          return `<div class="nl-prow" style="--pc:${color}"><span class="nl-pcode">${p.code}</span><span class="nl-pname">${esc(PRINCIPLE_NAMES[p.id] ?? "")}</span>${circlesHtml}<span class="nl-pval">${avg === null ? "\u2013" : avg.toFixed(1)}</span></div>`;
        })
        .join("")}
      ${(() => {
        const fsAvg = scores.totalMax > 0 ? (scores.totalActual / scores.totalMax) * 3 : null;
        return `<div class="nl-prow nl-fs" style="--pc:${scores.verdictColor}"><span class="nl-pcode" aria-hidden="true"></span><span class="nl-pname">Final score</span><span class="circles" style="color:${scores.verdictColor}">${circlesOnly(scoreCircles(fsAvg))}</span><span class="nl-pval">${fsAvg === null ? "\u2013" : fsAvg.toFixed(1)}</span></div>`;
      })()}
    </div>
  </div>

  ${conclRecRow}

  ${swRow}

  <div class="nutrition-footer">
    <img src="${logos.secondary}" alt="LISA-EIS" style="height:24px" />
    <a href="https://www.utwente.nl/library/" target="_blank" rel="noopener noreferrer">
      <span class="nutrition-footer-text">LISA-EIS / University of Twente / ${date}</span>
    </a>
    <img src="${logos.institution}" alt="University of Twente" style="height:22px" />
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
  const { logos } = getActiveBranding();
  // Build the report model (pure data transformation — no captures needed)
  const model = buildReportModel(metadata, [], evaluations, rubric, finalization, new Map());
  const b = getReportBranding();
  const labelHtml = buildNutritionLabelHtml(
    metadata,
    evaluations,
    rubric,
    finalization,
    model.scores,
    logos,
    model.evalMap,
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${esc(b.title)}: ${esc(metadata.toolName)}</title>
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

/** Month names for the card date label (UTC, to avoid TZ drift across reviewers). */
const CARD_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Format a session start time as "Month YYYY" for the card footer. */
function cardDateLabel(startTime: string): string {
  const d = new Date(startTime);
  return Number.isNaN(d.getTime())
    ? startTime.slice(0, 10) || "—"
    : `${CARD_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Extract the bare host (no www.) from a URL for compact display. */
function cardHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

/** Strip the trailing "/3" circle-label so only the circles remain (card + summary). */
function circlesOnly(html: string): string {
  return html.split('<span class="circle-label">')[0];
}

/** Shortened quality-gate labels for the narrow card columns. */
const CARD_GATE_LABELS: Record<string, string> = {
  "Data privacy policy": "Data privacy",
  "AI model training policy": "AI training",
  "Intellectual property preservation": "IP preservation",
};

function cardGateLabel(label: string): string {
  return CARD_GATE_LABELS[label] ?? label;
}

/** Inline QR code as an SVG (vector — stays crisp at print resolution). */
function cardQrSvg(url: string, color = "#172033"): string {
  let matrix: ReturnType<typeof encodeQR>;
  try {
    matrix = encodeQR(url);
  } catch {
    return "";
  }
  const { size, data } = matrix;
  const dim = size + 4;
  let rects = "";
  for (let r = 0; r < size; r++) {
    const row = data[r];
    for (let c = 0; c < size; c++) {
      if (row[c]) rects += `<rect x="${c + 2}" y="${r + 2}" width="1.02" height="1.02"/>`;
    }
  }
  return `<svg class="bc-qr" viewBox="0 0 ${dim} ${dim}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code"><rect width="${dim}" height="${dim}" fill="#ffffff"/><g fill="${color}">${rects}</g></svg>`;
}

/** Cap a conclusion to a char budget for the card front, breaking at the
 *  nearest sentence end (". ") when possible so it reads as a clean sentence;
 *  otherwise hard-cut with an ellipsis. */
function cardConclusion(text: string, max = 120): string {
  const t = (text ?? "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastStop = cut.lastIndexOf(". ");
  return lastStop >= max * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}\u2026`;
}
/** Truncate text at a word boundary with ellipsis if it exceeds max chars. */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace >= max * 0.4 ? cut.slice(0, lastSpace) : cut.trimEnd()}\u2026`;
}

/** Join items with bullet separators, fitting as many as possible within max chars.
 *  Returns the joined text and the count of items that didn't fit. */
function joinFindings(items: string[], max: number): { text: string; omitted: number } {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  if (clean.length === 0) return { text: "", omitted: 0 };
  const sep = " \u2022 ";
  let result = "";
  let fitCount = 0;
  for (let i = 0; i < clean.length; i++) {
    const candidate = result ? result + sep + clean[i] : clean[i];
    if (candidate.length > max) break;
    result = candidate;
    fitCount++;
  }
  return { text: result, omitted: clean.length - fitCount };
}

/** Build the two-sided TRUST business-card HTML (front + back, "The Seal").
 *  Returns both faces; the async wrapper wraps them in a document. */
function buildBusinessCardLabelHtml(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null,
  scores: ReportScores,
  frameworkLogo: string,
  evalMap: Map<string, Evaluation>,
): { front: string; back: string } {
  const vc = scores.verdictColor;
  const toolName = esc(metadata.toolName);
  const toolHost = esc(cardHost(metadata.toolUrl));
  const sealLogo = metadata.toolLogoUrl || metadata.faviconUrl;
  const sealLogoHtml = sealLogo ? `<img class="bc-seal-logo" src="${esc(sealLogo)}" alt="" />` : "";
  const dateLabel = esc(cardDateLabel(metadata.startTime));
  const conclusion = cardConclusion(finalization?.conclusion ?? "");

  // Visible quality gates (mirrors the nutrition label's filter).
  const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, metadata.usesAi ?? true));
  const gates = qualityGateResults(evaluations, rubric, evalMap).filter((g) =>
    visibleIds.has(g.id),
  );
  const gatesHtml = gates
    .map((g) => {
      const pass = g.result === "pass";
      const fail = g.result === "fail";
      const cls = pass ? "pass" : fail ? "fail" : "other";
      const ic = pass
        ? "\u2713"
        : fail
          ? "\u2717"
          : g.result === "unsure"
            ? "?"
            : g.result === "na"
              ? "\u2013"
              : "\u25CB";
      return `<span class="bc-gate" data-result="${cls}"><span class="bc-g-ic ${cls}">${ic}</span>${esc(cardGateLabel(g.label))}</span>`;
    })
    .join("");

  // Principle rows — first letter colored + name + score circles + numeric.
  const principleRowsHtml = PRINCIPLES.filter((p) => p.id in rubric.scoring_rubric)
    .map((p) => {
      const avg = principleAverage(p.id, evaluations, rubric, evalMap);
      const color = REPORT_COLORS[p.id] ?? p.color;
      const circles =
        avg === null
          ? `<span class="circles">${EMPTY_CIRCLE.repeat(3)}</span>`
          : circlesOnly(scoreCircles(avg));
      const val = avg === null ? "\u2013" : avg.toFixed(1);
      return `<div class="bc-prow" style="--cc:${color}"><span class="bc-pname"><span class="bc-pinit">${esc((PRINCIPLE_NAMES[p.id] ?? "").charAt(0))}</span>${esc((PRINCIPLE_NAMES[p.id] ?? "").slice(1))}</span>${circles}<span class="bc-pval">${val}</span></div>`;
    })
    .join("");
  // Findings — all strengths in one box, all weaknesses in another.
  const strengths = (finalization?.strengths ?? []).map((s) => s.trim()).filter(Boolean);
  const weaknesses = (finalization?.weaknesses ?? []).map((w) => w.trim()).filter(Boolean);
  const strengthsJoin = joinFindings(strengths, 500);
  const weaknessesJoin = joinFindings(weaknesses, 500);
  const overflowTag = (n: number) =>
    n > 0 ? `<span class="bc-overflow">+${n} more in full report</span>` : "";
  const findingsHtml = [
    strengthsJoin.text
      ? `        <div class="bc-find-box up"><span class="bc-find-mk">+</span><p class="bc-find-text">${esc(strengthsJoin.text)}${overflowTag(strengthsJoin.omitted)}</p></div>`
      : "",
    weaknessesJoin.text
      ? `        <div class="bc-find-box dn"><span class="bc-find-mk">!</span><p class="bc-find-text">${esc(weaknessesJoin.text)}${overflowTag(weaknessesJoin.omitted)}</p></div>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // QR → site hub (per-tool hub URL not yet wired).
  const qrHtml = cardQrSvg("https://trust.samuelmok.cc");

  // ── FRONT ──
  const front = `
<div class="bc-card">
  <div class="bc-face bc-front">
    <div class="bc-brand-row">
      <img class="bc-brand-logo" src="${frameworkLogo}" alt="${esc(getReportBranding().frameworkName)}" />
      <span class="bc-brand-tag">Information Tool Reviews</span>
    </div>
    <div class="bc-hero">
      <div class="bc-seal" style="--vc:${vc}">
        <div class="bc-seal-tool">
          ${sealLogoHtml}
          <div class="bc-seal-id">
            <span class="bc-seal-name">${toolName}</span>
            <span class="bc-seal-url">${toolHost}</span>
          </div>
        </div>
        <div class="bc-seal-verdict">${esc(scores.verdict)}</div>
      </div>
      ${metadata.description || conclusion ? `<div class="bc-front-blocks">${metadata.description ? `<div class="bc-block"><div class="bc-block-inner"><span class="bc-pill">what?</span><p class="bc-block-text">${esc(truncateAtWord(metadata.description, 130))}</p></div></div>` : ""}${conclusion ? `<div class="bc-block bc-block--why" style="--vc:${vc}"><div class="bc-block-inner"><span class="bc-pill">conclusion</span><p class="bc-block-text">${esc(conclusion)}</p></div></div>` : ""}</div>` : ""}
    </div>
    <div class="bc-front-foot">
      <div class="bc-qrwrap">${qrHtml}</div>
      <span class="bc-foot-sep">•</span>
      <span class="bc-foot-item bc-ru">trust.samuelmok.cc</span>
      <span class="bc-foot-sep">•</span>
      <span class="bc-foot-item">Reviewed by UTwente librarians</span>
      <span class="bc-foot-sep">•</span>
      <span class="bc-foot-item bc-ru">utwente.nl/library</span>
    </div>
  </div>
</div>`;

  // ── BACK ──
  const back = `
<div class="bc-card">
  <div class="bc-face bc-back">
    <div class="bc-back-top">
      <img class="bc-brand-logo" src="${frameworkLogo}" alt="${esc(getReportBranding().frameworkName)}" />
      <span class="bc-back-label">Report Card</span>
      <span class="bc-back-tool">${toolName}</span>
    </div>
    ${gates.length ? `<div class="bc-mid"><div class="bc-prows">${principleRowsHtml}</div><div class="bc-gates bc-gates--col">${gatesHtml}</div></div>` : `<div class="bc-prows">${principleRowsHtml}</div>`}
    ${findingsHtml ? `    <div class="bc-findings">\n${findingsHtml}\n    </div>` : ""}
    <div class="bc-back-foot">
      <span>${dateLabel}</span>
      <span>trust.samuelmok.cc</span>
    </div>
  </div>
</div>`;

  return { front, back };
}

/** Build a compact business-card-sized TRUST label HTML (credit-card aspect ratio). */
export async function buildBusinessCardLabel(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<string> {
  const { logos } = getActiveBranding();
  const model = buildReportModel(metadata, [], evaluations, rubric, finalization, new Map());
  const { front, back } = buildBusinessCardLabelHtml(
    metadata,
    evaluations,
    rubric,
    finalization,
    model.scores,
    logos.framework,
    model.evalMap,
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(getReportBranding().frameworkName)} Card: ${esc(metadata.toolName)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body>
<main id="report-content">
${front}
${back}
</main>
</body>
</html>`;
}

/** Build a standalone A3 sheet (297×420mm) tiling one card face 3×7 = 21 times.
 *  Card outlines double as cut guides; no pre-mirroring — the printer handles
 *  duplex placement. Each doc is a single A3 page. */
function buildCardSheetDoc(face: "front" | "back", cardHtml: string, toolName: string): string {
  const b = getReportBranding();
  const label = face === "front" ? "Front" : "Back";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(b.frameworkName)} Card — A3 ${label} Sheet: ${esc(toolName)}</title>
<style>${REPORT_STYLE}
/* ── A3 imposition (84×52.5mm cards, 3 cols × 7 rows = 21) ── */
@page { size: 297mm 420mm; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
* { box-sizing: border-box; }
.a3-sheet { position: relative; width: 297mm; height: 420mm; background: #fff; overflow: hidden; }
.a3-label { position: absolute; top: 2.5mm; left: 0; right: 0; text-align: center; font: 700 2.6mm/1 var(--ff-mono); text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); z-index: 2; }
.a3-grid { position: absolute; top: 8.25mm; left: 16.5mm; right: 16.5mm; bottom: 8.25mm; display: grid; grid-template-columns: repeat(3, minmax(0, 84mm)); grid-template-rows: repeat(7, minmax(0, 52.5mm)); gap: 6mm; }
.a3-grid .bc-card { width: 100%; height: 100%; }
@media screen {
  body { background: var(--canvas); padding: 24px; }
  .a3-sheet { box-shadow: 0 2px 18px rgba(20,32,51,.18); margin: 24px auto; }
}
</style>
</head>
<body>
<div class="a3-sheet">
  <div class="a3-label">${label} &middot; ${esc(b.cardTitle)} &middot; ${esc(toolName)}</div>
  <div class="a3-grid">${cardHtml.repeat(21)}</div>
</div>
</body>
</html>`;
}

/** Build standalone A3 front + back sheets (each a single A3 page, 21 cards). */
export async function buildBusinessCardSheet(
  metadata: SessionMetadata,
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<{ front: string; back: string }> {
  const { logos } = getActiveBranding();
  const model = buildReportModel(metadata, [], evaluations, rubric, finalization, new Map());
  const { front, back } = buildBusinessCardLabelHtml(
    metadata,
    evaluations,
    rubric,
    finalization,
    model.scores,
    logos.framework,
    model.evalMap,
  );
  return {
    front: buildCardSheetDoc("front", front, metadata.toolName),
    back: buildCardSheetDoc("back", back, metadata.toolName),
  };
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
  // Branding
  const branding = getActiveBranding();
  const b = getReportBranding();

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
  const unlinkedSection = buildUnlinkedSection(model.captures, model.linkedCaptureIds);
  const overviewBar = buildOverviewBar(model.qualityGateRows, model.principleScores);
  const toolLogo = metadata.toolLogoUrl || metadata.faviconUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${esc(b.frameworkName)} Review: ${esc(metadata.toolName)}</title>
<style>${REPORT_STYLE}</style>
</head>
<body class="report">

<main id="report-content">
<h1 class="sr-only">${esc(b.frameworkName)} Review: ${esc(metadata.toolName)}</h1>

<section class="report-part" id="part-summary" data-part="summary">
  ${buildNutritionLabelHtml(metadata, evaluations, rubric, finalization, model.scores, branding.logos, model.evalMap)}
</section>

<section class="report-part" id="part-scores" data-part="scores">
  <header class="part-band"><h2 class="part-title">Detailed Scores</h2></header>
  <header class="scores-head"><div class="scores-head-tool">${toolLogo ? `<img class="scores-head-logo" src="${esc(toolLogo)}" alt="" />` : ""}<a href="${esc(metadata.toolUrl)}" target="_blank" rel="noopener noreferrer"><span class="scores-head-name">${esc(metadata.toolName)}</span></a><span class="scores-head-url">${safeLink(metadata.toolUrl)}</span></div><div class="scores-head-meta">Detailed Evaluation Report &middot; ${formatDate(metadata.startTime)} &middot; ${model.scores.totalQuestions} questions</div></header>
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

${unlinkedSection}
</main>
<div class="bottom-bar"></div>
<footer class="footer">
  <span class="footer-wordmark">${esc(b.footerFramework)}<span class="footer-edition">v1.1</span></span>
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
  // Event delegation (capture phase): click any evidence/unlinked screenshot
  // to view it full-size. Capture + stopPropagation lets us run before the
  // native popover light-dismiss consumes the gesture; deferring showPopover
  // to the next frame avoids the re-entrancy that cancels a synchronous show
  // when the image lives inside an open popover=auto.
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || typeof t.closest !== "function") return;
    var img = t.closest(".evidence-item img, .unlinked-item img");
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    // Close any open Details popover so the lightbox is unobstructed.
    document.querySelectorAll(".qpop").forEach(function (p) {
      try { if (p.matches(":popover-open")) p.hidePopover(); } catch (x) {}
      p.classList.remove("is-open");
    });
    var src = img.getAttribute("src") || "";
    var alt = img.getAttribute("alt") || "";
    requestAnimationFrame(function () { open(src, alt); });
  }, true);
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
