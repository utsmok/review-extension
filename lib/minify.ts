// ── Pre-compiled regex patterns (avoid per-call RegExp allocation) ──
const HTML_COMMENT_OR_TAG =
  /<!--[\s\S]*?-->|<\/(?:li|dt|dd|p|tr|td|th|thead|tbody|tfoot|colgroup|option|optgroup)>/gi;
const HTML_WS_COLLAPSE = /\s+/g;
const HTML_SPACE_BEFORE_TAG = / (?=<|\/>)/g;

// ────────────────────────────────────────────────────────────────────

/** Strip whitespace, comments, and optional closing tags from HTML output for smaller ZIP entries. */
export function minifyHtml(html: string): string {
  return html
    .replace(HTML_COMMENT_OR_TAG, "")
    .replace(HTML_WS_COLLAPSE, " ")
    .replace(HTML_SPACE_BEFORE_TAG, "")
    .trim();
}
