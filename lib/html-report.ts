import { PRINCIPLES } from "./principles";
import {
  getQuestionCode,
  getQGQuestionCode,
  distributionBar,
  scoreColor,
  qualityGateResults,
  principleAverage,
} from "./rubric";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";
import { computeReportScores, type ReportScores } from "./report/compute-scores";

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
export const REPORT_CSS = `
  :root {
    --magenta: #8e036c;
    --navy: #002c5f;
    --text: #172033;
    --muted: #4f5e73;
    --slate: #4c5e74;
    --border: #bfc6cf;
    --canvas: #eef0f3;
    --panel: #f3f4f6;
    --white: #fafbfc;
    --link: #2563eb;
    --ff-body: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    --ff-heading: "Arial Narrow", Arial, Helvetica, sans-serif;
    --ff-mono: "JetBrains Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace;
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

  .divider { height: 4px; background: var(--navy); margin: 0 0 16px; }

  /* TRUST letterform */
  .letterform {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 16px;
  }
  .letterform-letter {
    font-family: var(--ff-heading);
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.08em;
  }
  .letterform-letters {
    display: flex;
    gap: 2px;
    padding: 6px 12px;
    border: 2px solid var(--navy);
    border-radius: 2px;
    background: var(--white);
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
    border-bottom: 4px solid var(--navy);
    margin-bottom: 12px;
    font-family: var(--ff-heading);
    font-weight: 700;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .accent-bar { height: 3px; background: var(--navy); margin: 8px 0; }

  /* Table of Contents */
  .toc {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    padding: 10px 12px;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 2px;
  }
  .toc-label {
    font-family: var(--ff-heading);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-right: 4px;
    align-self: center;
  }
  .toc-item {
    font-size: 0.8rem;
    text-decoration: none;
    font-weight: 600;
  }
  .toc-item:hover { text-decoration: underline; }
  .toc-code {
    font-family: var(--ff-mono);
    font-weight: 700;
  }

  /* Score legend */
  .score-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 16px;
    font-size: 0.78rem;
  }
  .legend-label {
    font-family: var(--ff-heading);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    margin-right: 2px;
  }

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
    height: 10px;
    background: var(--panel);
    border-radius: 1px;
    border: 1px solid rgba(0,0,0,0.12);
    overflow: hidden;
    margin-top: 4px;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .dist-seg { min-width: 2px; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .dist-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    font-size: 0.7rem;
    color: var(--slate);
  }

  /* Verdict */
  .verdict-bar { height: 6px; margin-top: 12px; }
  .verdict-block {
    text-align: center;
    padding: 24px 0;
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
    font-size: clamp(2rem, 6vw, 3.5rem);
    font-weight: 700;
  }
  .verdict-reason {
    font-size: 0.9rem;
    color: var(--muted);
    margin-top: 8px;
  }

  .bottom-bar { height: 4px; background: var(--magenta); margin: 16px 0 8px; }

  /* Footer */
  .footer {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 0.75rem;
    color: var(--slate);
    margin-bottom: 32px;
  }

  /* Full report section */
  .report-header {
    padding-top: 32px;
    border-top: 4px solid var(--magenta);
    margin-top: 48px;
  }
  .report-header h1 {
    font-family: var(--ff-heading);
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--magenta);
    margin-bottom: 4px;
  }
  .report-meta-url { color: var(--link); }

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
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 6px 8px;
    text-align: left;
    border-bottom: 2px solid #001a3a;
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
    font-size: 0.75rem;
    font-weight: 700;
    border-radius: 1px;
  }

  /* Category section */
  .category-section {
    margin-bottom: 32px;
    border-top: 3px solid var(--accent);
  }
  .category-section.category-alt {
    background: #fafafa;
  }
  .category-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: color-mix(in srgb, var(--accent) 6%, var(--white));
  }
  .category-letter-block { text-align: center; min-width: 48px; }
  .category-letter {
    font-family: var(--ff-heading);
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }
  .category-letter-name {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    margin-top: 2px;
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
  .category-table-wrap { overflow-x: auto; }
  .category-section table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  .category-section th {
    background: var(--accent);
    color: #fff;
    font-family: var(--ff-heading);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    padding: 5px 8px;
    text-align: left;
    border-bottom: 2px solid color-mix(in srgb, var(--accent) 70%, black);
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
    font-size: 0.75rem;
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
  .evidence-item.evidence-weak {
    border-left: 3px solid #c60c30;
    background: #fef2f2;
  }
  .evidence-item img {
    max-width: 100%;
    height: auto;
    border: 1px solid var(--border);
    border-radius: 1px;
  }
  .evidence-meta { font-size: 0.75rem; }
  .evidence-meta strong { display: block; margin-bottom: 2px; }
  .evidence-time { color: var(--muted); font-family: var(--ff-mono); font-size: 0.75rem; }

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
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    padding: 16px 0;
    margin-bottom: 16px;
    letter-spacing: 0.03em;
    border: 2px solid currentColor;
    border-radius: 2px;
    opacity: 0.95;
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
  .fin-timestamp { font-size: 0.75rem; color: var(--slate); text-align: right; }

  .sr td { border-bottom: none !important; }
  .sc { padding: 2px 8px 2px 52px !important; }
  .sc details { font-size: 0.75rem; }
  .ss {
    font-family: var(--ff-mono);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--slate);
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ss::-webkit-details-marker { display: none; }
  .ss::before { content: "▸"; font-size: 8px; }
  .sc details[open] .ss::before { content: "▾"; }
  .sc p { color: var(--muted); line-height: 1.5; margin-top: 4px; }
  .et { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .et td { padding: 3px 6px; font-size: 0.78rem; border-bottom: 1px solid var(--panel); }
  .el {
    font-family: var(--ff-mono);
    font-weight: 700;
    color: var(--slate);
    width: 36px;
    vertical-align: top;
  }

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
    max-width: 100%;
    height: auto;
    border: 1px solid var(--border);
    border-radius: 1px;
  }
  .unlinked-meta { font-size: 0.8rem; }
  .unlinked-meta strong { display: block; margin-bottom: 4px; }
  .unlinked-meta a { color: var(--link); font-size: 0.75rem; }
  .unlinked-meta span { display: block; color: var(--muted); font-family: var(--ff-mono); font-size: 0.75rem; }

  .url-plain { color: var(--muted); font-size: 0.75rem; word-break: break-all; }


  /* Nutrition label */
  .nutrition-label { border: 3px solid var(--text); padding: 0; margin-bottom: 24px; }
  .trust-branding { text-align: center; padding: 20px 20px 12px; }
  .trust-branding img { height: 28px; }
  .trust-branding-tagline { font-family: var(--ff-heading); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--magenta); margin-top: 4px; }
  .nutrition-header { display: flex; justify-content: center; align-items: center; padding: 16px 20px 12px; }
  .nutrition-header-center { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .nutrition-header-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; }
  .nutrition-header a { color: inherit; text-decoration: none; }
  .nutrition-header a:hover { text-decoration: underline; }
  .nutrition-tool-name { font-family: var(--ff-heading); font-size: 1.3rem; font-weight: 700; color: var(--magenta); text-transform: uppercase; letter-spacing: 0.03em; }
  .nutrition-tool-url { font-size: 0.8rem; color: var(--muted); }
  .nutrition-tool-url a { color: var(--muted); }
  .nutrition-sep { color: var(--muted); font-size: 1rem; }
  .nutrition-tool-logo { width: 40px; height: 40px; object-fit: contain; border-radius: 4px; flex-shrink: 0; }
  .nutrition-description { font-size: 0.85rem; color: var(--muted); line-height: 1.45; font-style: italic; text-align: center; max-width: 400px; }
  .nutrition-status { font-size: 0.72rem; color: var(--slate); text-align: center; margin-top: 2px; font-style: italic; }
  .nutrition-divider { height: 2px; background: var(--text); margin: 0; }
  .nutrition-divider-thin { height: 1px; background: var(--border); margin: 0; }
  .nutrition-verdict { padding: 20px; text-align: center; }
  .nutrition-verdict-stamp {
    display: inline-block;
    border: 3px solid;
    border-radius: 6px;
    padding: 8px 24px;
    transform: rotate(-2deg);
    font-family: var(--ff-heading);
    font-size: clamp(1.4rem, 3.5vw, 2.2rem);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.1;
  }
  .nutrition-verdict-stamp span { display: block; font-size: 0.55em; font-weight: 600; letter-spacing: 0.04em; opacity: 0.75; margin-top: 2px; }
  .nutrition-verdict-sub img { vertical-align: middle; }
  .nutrition-gates { padding: 8px 20px 12px; }
  .nutrition-gates-title { font-family: var(--ff-heading); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text); margin-bottom: 4px; }
  .nutrition-gate-item { font-size: 0.8rem; color: var(--muted); margin-bottom: 2px; padding-left: 12px; }
  .nutrition-gate-item .fail { color: #c60c30; font-weight: 700; }
  .nutrition-gate-item .unsure { color: #5a6e82; font-weight: 700; }
  .nutrition-principles { padding: 16px 20px; }
  .nutrition-principles-table { width: 100%; border-collapse: collapse; }
  .nutrition-principles-table td { padding: 4px 8px; vertical-align: middle; text-align: center; }
  .nutrition-principle-code { font-family: var(--ff-heading); font-size: 1.1rem; font-weight: 800; }
  .nutrition-principle-name { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
  .nutrition-overall-cell { text-align: center; vertical-align: middle; padding-left: 16px; border-left: 1px solid var(--border); }
  .nutrition-overall-label { font-family: var(--ff-heading); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-bottom: 4px; }
  .circles { display: inline-flex; gap: 3px; }
  .circle { font-size: 1.1rem; line-height: 1; }
  .circle.filled { color: inherit; }
  .circle.empty { color: var(--border); }
  .nutrition-sw { display: flex; padding: 12px 20px; gap: 0; }
  .nutrition-sw-col { flex: 1; min-width: 0; }
  .nutrition-sw-title { font-family: var(--ff-heading); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text); margin-bottom: 6px; }
  .nutrition-sw-list { margin: 0; padding-left: 28px; font-size: 0.82rem; color: var(--muted); line-height: 1.55; }
  .nutrition-sw-divider { width: 1px; background: var(--border); margin: 0 16px; flex-shrink: 0; }
  .nutrition-footer { padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; border-top: 2px solid var(--text); }
  .nutrition-footer-text { font-size: 0.75rem; color: var(--slate); }
  .nutrition-footer a { color: inherit; text-decoration: none; }
  .nutrition-footer a:hover { text-decoration: underline; }

  @media (max-width: 640px) {
    body { padding: 12px; }
    .header { flex-direction: column; gap: 8px; }
    .header-meta { text-align: left; }
    .letterform { flex-wrap: wrap; }
    .letterform-score { margin-left: 0; width: 100%; }
    .gate-summary { flex-wrap: wrap; }
    .cat-table, .qg-table, .category-section table { display: block; overflow-x: auto; }
    .category-header { flex-wrap: wrap; }
    .unlinked-item { flex-wrap: wrap; }
    .evidence-item { flex-wrap: wrap; }
    .evidence-item img { max-width: 100%; }
    .toc { flex-wrap: wrap; }
  }

  @media print {
    html { font-size: 12px; }
    body { max-width: none; padding: 0; background: #fff; }
    .top-bar, .divider, .accent-bar, .bottom-bar, .verdict-bar, .fin-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .category-header, .gate-badge, .score-badge, .fin-grade { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table th, .category-section th, .qg-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .dist-bar, .dist-seg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .report-header { page-break-before: always; border-top: none; padding-top: 0; margin-top: 0; }
    .category-section { page-break-inside: avoid; }
    .finalization-section { page-break-inside: avoid; }
    .unlinked-item { page-break-inside: avoid; }
    .evidence-item { page-break-inside: avoid; }
    .evidence-item img { max-width: 250px; }
    .unlinked-item img { max-width: 280px; }

    /* Print footer with page numbering */
    @page {
      margin-bottom: 2cm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages) · "TRUST Framework Evaluation Report · " "Confidential";
        font-size: 8px;
        color: #6b7f94;
      }
    }
  }
`;

// ── Utilities ──────────────────────────────────────────────────────────

/** HTML-escape a string for safe embedding in templates. */
const ESC_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function esc(s: string): string {
  if (!s || (s.indexOf("&") < 0 && s.indexOf("<") < 0 && s.indexOf(">") < 0 && s.indexOf('"') < 0))
    return s;
  return s.replace(/[&<>"]/g, (c) => ESC_MAP[c]);
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
const ALL_EMPTY_CIRCLES = `<span class="circles">${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}${EMPTY_CIRCLE}</span>`;

function scoreCircles(avg: number | null): string {
  if (avg === null) return ALL_EMPTY_CIRCLES;
  const filled = avg < 1 ? 1 : avg < 2 ? 2 : avg < 3 ? 3 : 4;
  return `<span class="circles">${FILLED_CIRCLE.repeat(filled)}${EMPTY_CIRCLE.repeat(4 - filled)}</span>`;
}

// ── Section builders ───────────────────────────────────────────────────

function buildCategorySections(
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  compressedScreenshots: Map<string, string>,
  scores: ReportScores,
  evalMap: Map<string, Evaluation>,
): string {
  // evalMap pre-built by caller
  return PRINCIPLES.map((p, sectionIdx) => {
    if (!(p.id in rubric.scoring_rubric)) return "";
    const reportColor = REPORT_COLORS[p.id] ?? p.color;
    const questions = rubric.scoring_rubric[p.id];
    const catScores = scores.catScores.get(p.id) ?? [];
    let evidenceCount = 0;
    for (const c of captures) {
      for (const e of evaluations) {
        if (e.rubricId.startsWith(`${p.id}.`) && e.explicitEvidenceIds.includes(c.id)) {
          evidenceCount++;
          break;
        }
      }
    }

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

    const rows = Object.entries(questions)
      .map(([qId, levels], idx) => {
        const rubricId = `${p.id}.${qId}`;
        const ev = evalMap.get(rubricId);
        const isNa = ev?.score === "na";
        const isUnsure = ev?.score === "unsure";
        const score = typeof ev?.score === "number" ? ev.score : -1;
        const code = getQuestionCode(p.id, idx);
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
        let evidenceImgs = "";
        for (const c of captures) {
          if (!ev?.explicitEvidenceIds.includes(c.id)) continue;
          evidenceImgs += `
          <div class="evidence-item${isWeakEvidence ? " evidence-weak" : ""}">
            <img src="${compressedScreenshots.get(c.id) ?? c.screenshotBase64}" alt="${esc(c.pageTitle || "Evidence screenshot")}" loading="lazy" />
            <div class="evidence-meta">
              <strong>${esc(c.pageTitle || "Capture")}</strong>
              <span class="evidence-time">${formatDate(c.timestamp)}</span>
              ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
            </div>
          </div>
        `;
        }

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
            ${(["0", "1", "2", "3"] as const)
              .map((lvl) => {
                const ex = (levels as unknown as { examples?: Record<string, string> }).examples?.[
                  lvl
                ];
                return ex ? `<tr><td class="el">${lvl}</td><td>${esc(ex)}</td></tr>` : "";
              })
              .join("")}
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
            <h2>${esc(PRINCIPLE_NAMES[p.id]!)}</h2>
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

function buildGateRows(
  evaluations: Evaluation[],
  rubric: RubricData,
  evalMap: Map<string, Evaluation>,
): string {
  // evalMap pre-built by caller
  return Object.entries(rubric.quality_gate)
    .map(([cat, questions]) =>
      Object.entries(questions)
        .map(([qId, q]) => {
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
            ${(Object.entries(q.examples) as [string, string][])
              .map(
                ([key, desc]) => `
              <tr><td class="el">${key === "pass" ? "Pass" : key === "fail" ? "Fail" : key === "na" ? "N/A" : esc(key)}</td><td>${esc(desc)}</td></tr>
            `,
              )
              .join("")}
          </table></details>
        </td></tr>
      `
            : "";

          return `
        <tr>
          <td class="code">${getQGQuestionCode(cat, Object.keys(questions).indexOf(qId))}</td>
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

function buildUnlinkedSection(
  captures: Capture[],
  evaluations: Evaluation[],
  compressedScreenshots: Map<string, string>,
): string {
  let unlinkedHtml = "";
  for (const c of captures) {
    let linked = false;
    for (const e of evaluations) {
      if (e.explicitEvidenceIds.includes(c.id)) {
        linked = true;
        break;
      }
    }
    if (linked) continue;
    unlinkedHtml += `
        <div class="unlinked-item">
          <img src="${compressedScreenshots.get(c.id) ?? c.screenshotBase64}" alt="${esc(c.pageTitle || "Evidence screenshot")}" loading="lazy" />
          <div class="unlinked-meta">
            <strong>${esc(c.pageTitle || "Capture")}</strong>
            ${safeLink(c.sourceUrl)}
            <span>${formatDate(c.timestamp)}</span>
            ${c.notes ? `<p>${esc(c.notes)}</p>` : ""}
          </div>
        </div>
      `;
  }

  if (unlinkedHtml.length === 0) return "";

  return `
    <section class="unlinked-section">
      <h2>Additional Evidence</h2>
      ${unlinkedHtml}
    </section>
  `;
}

function buildToc(rubric: RubricData): string {
  let html = "";
  for (const p of PRINCIPLES) {
    if (!(p.id in rubric.scoring_rubric)) continue;
    const reportColor = REPORT_COLORS[p.id] ?? p.color;
    html += `<a href="#category-${p.id}" class="toc-item" style="color:${reportColor}"><span class="toc-code">${p.code}</span> ${esc(PRINCIPLE_NAMES[p.id]!)}</a>`;
  }
  return html;
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
  const date = new Date(metadata.startTime).toISOString().split("T")[0];
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
  <div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Strengths</div>
    <ul class="nutrition-sw-list">${strengthsHtml}</ul>
  </div>
  <div class="nutrition-sw-divider"></div>
  <div class="nutrition-sw-col">
    <div class="nutrition-sw-title">Weaknesses</div>
    <ul class="nutrition-sw-list">${weaknessesHtml}</ul>
  </div>
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
        ${toolLink}<span class="nutrition-tool-url">${safeLink(metadata.toolUrl)}</span>${toolLinkClose}
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
    ${!scores.noEvaluation && !scores.isComplete ? `<div class="nutrition-status">${scores.answeredQuestions}/${scores.totalQuestions} questions answered</div>` : ""}
  </div>

  ${(() => {
    const gr = qualityGateResults(evaluations, rubric, evalMap);
    let items = "";
    for (const g of gr) {
      if (g.result !== "fail" && g.result !== "unsure") continue;
      items +=
        '<div class="nutrition-gate-item">' +
        esc(g.label) +
        ': <span class="' +
        (g.result === "fail" ? "fail" : "unsure") +
        '">' +
        (g.result === "fail" ? "FAIL" : "UNSURE") +
        "</span></div>";
    }
    if (items.length === 0) return "";
    return (
      '<div class="nutrition-divider-thin"></div><div class="nutrition-gates"><div class="nutrition-gates-title">Quality Gate Issues</div>' +
      items +
      "</div>"
    );
  })()}

  <div class="nutrition-divider-thin"></div>

  <div class="nutrition-principles">
    <table class="nutrition-principles-table">
      <tr>
        ${(() => {
          let cells = "";
          for (const p of PRINCIPLES) {
            if (!(p.id in rubric.scoring_rubric)) continue;
            const reportColor = REPORT_COLORS[p.id] ?? p.color;
            const avg = principleAverage(p.id, evaluations, rubric, evalMap);
            cells +=
              '<td style="color:' +
              reportColor +
              '"><div class="nutrition-principle-code">' +
              p.code +
              '</div><div class="nutrition-principle-name">' +
              (PRINCIPLE_NAMES[p.id] ?? "") +
              "</div><div>" +
              scoreCircles(avg) +
              "</div></td>";
          }
          return cells;
        })()}
        <td class="nutrition-overall-cell" style="color:var(--magenta)">
          <div class="nutrition-overall-label">Overall</div>
          <div>${scoreCircles(scores.totalMax > 0 ? (scores.totalActual / scores.totalMax) * 3 : null)}</div>
        </td>
      </tr>
    </table>
  </div>

  ${swRow}

  <div class="nutrition-divider"></div>

  <div class="nutrition-footer">
    <img src="${LISA_EIS_LOGO}" alt="LISA-EIS" style="height:24px" />
    <a href="https://www.utwente.nl/library/" target="_blank" rel="noopener noreferrer">
      <span class="nutrition-footer-text">LISA-EIS / University of Twente / ${date}</span>
    </a>
    <img src="${UT_LOGO}" alt="University of Twente" style="height:22px" />
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
  const scores = computeReportScores(evaluations, rubric, finalization);
  const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));
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
  const compressedScreenshots = new Map<string, string>();
  await Promise.all(
    captures.map(async (c) => {
      compressedScreenshots.set(c.id, await compressScreenshot(c.screenshotBase64));
    }),
  );

  const scores = computeReportScores(evaluations, rubric, finalization);
  const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));

  // Build section parts
  const gateRows = buildGateRows(evaluations, rubric, evalMap);
  const categorySections = buildCategorySections(
    captures,
    evaluations,
    rubric,
    compressedScreenshots,
    scores,
    evalMap,
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
  ${metadata.discipline ? `<div style="font-size:0.8rem;color:var(--muted)">Discipline: ${esc(metadata.discipline)}</div>` : ""}
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
