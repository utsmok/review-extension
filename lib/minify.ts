// ── Pre-compiled regex patterns (avoid per-call RegExp allocation) ──
const HTML_COMMENT_OR_TAG =
  /<!--[\s\S]*?-->|<\/(?:li|dt|dd|p|tr|td|th|thead|tbody|tfoot|colgroup|option|optgroup)>/gi;
const HTML_WS_COLLAPSE = /\s+/g;
const HTML_SPACE_BEFORE_TAG = / (?=<|\/>)/g;

/**
 * Raw-text / escapable-raw-text elements whose inner content must survive
 * minification unchanged. `<script>` carries JS whose line comments (`//`)
 * and automatic-semicolon-insertion depend on real newlines; `<pre>` renders
 * whitespace literally; `<textarea>` whitespace is part of its value.
 *
 * The markup *between* these blocks is minified; the blocks themselves pass
 * through verbatim. (`<style>` is intentionally NOT preserved — CSS is
 * whitespace-insensitive, so collapsing it is safe and keeps output smaller.)
 *
 * Why this matters: previously the whitespace collapse ran over `<script>`
 * too, deleting newlines so the report's first `//` line-comment ran to
 * end-of-input — a SyntaxError that silently disabled the entire inline
 * lightbox script.
 */
const PRESERVE_BLOCKS = /<(script|pre|textarea)\b[\s\S]*?<\/\1>/gi;

/** Apply the comment/whitespace/closing-tag stripping to a markup-only chunk. */
function minifyChunk(chunk: string): string {
  return chunk
    .replace(HTML_COMMENT_OR_TAG, "")
    .replace(HTML_WS_COLLAPSE, " ")
    .replace(HTML_SPACE_BEFORE_TAG, "");
}

/** Strip whitespace, comments, and optional closing tags from HTML output for smaller ZIP entries. */
export function minifyHtml(html: string): string {
  PRESERVE_BLOCKS.lastIndex = 0;
  const out: string[] = [];
  let last = 0;
  let m = PRESERVE_BLOCKS.exec(html);
  while (m !== null) {
    out.push(minifyChunk(html.slice(last, m.index)));
    out.push(m[0]);
    last = m.index + m[0].length;
    m = PRESERVE_BLOCKS.exec(html);
  }
  out.push(minifyChunk(html.slice(last)));
  // No global space-before-tag pass here: it would also run over the verbatim
  // preserved blocks and corrupt rendered whitespace inside <pre>/<textarea>
  // (e.g. a code snippet `if (i < len)` would lose the space). minifyChunk
  // already strips markup spaces per chunk; boundary spaces are insignificant.
  return out.join("").trim();
}
