// ── Pre-compiled regex patterns (avoid per-call RegExp allocation) ──
const HTML_COMMENT_OR_TAG =
  /<!--[\s\S]*?-->|<\/(?:li|dt|dd|p|tr|td|th|thead|tbody|tfoot|colgroup|option|optgroup)>/gi;
const HTML_WS_COLLAPSE = /\s+/g;
const HTML_SPACE_BEFORE_TAG = / (?=<|\/>)/g;

const CSS_COMMENTS = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
const CSS_VAR_DEF = /--([a-z-]+)\s*:\s*([^;{}]+)/g;
const CSS_VAR_REF = /var\(--([a-z-]+)\)/g;
const CSS_ROOT = /:root\s*\{[^}]*\}/g;
const CSS_DELIMITERS = /\s*([{}:;,])\s*/g;
const CSS_TRAILING_SEMI = /;\}/g;
const CSS_WS_COLLAPSE = /\s+/g;
// ────────────────────────────────────────────────────────────────────

/** Strip whitespace, comments, and optional closing tags from HTML output for smaller ZIP entries. */
export function minifyHtml(html: string): string {
  return html
    .replace(HTML_COMMENT_OR_TAG, "")
    .replace(HTML_WS_COLLAPSE, " ")
    .replace(HTML_SPACE_BEFORE_TAG, "")
    .trim();
}

/** Strip whitespace, comments, and resolve CSS variables for smaller ZIP entries.
 *  Keeps vars needed by HTML inline styles (--magenta, --muted, --text, --ff-heading)
 *  in a compact :root block; resolves all others inline. */
const CSS_KEEP_VARS = new Set(["--magenta", "--muted", "--text", "--ff-heading"]);
export function minifyCss(css: string): string {
  let result = css.replace(CSS_COMMENTS, "");

  // Extract all CSS variable definitions and build root keeps in one pass
  const vars = new Map<string, string>();
  const rootKeepParts: string[] = [];
  result = result.replace(CSS_VAR_DEF, (_, name, value) => {
    const trimmed = value.trim();
    vars.set(name, trimmed);
    if (CSS_KEEP_VARS.has(`--${name}`)) rootKeepParts.push(`--${name}:${trimmed}`);
    return "";
  });

  // Resolve all var() references in a single pass
  result = result.replace(CSS_VAR_REF, (_, name) => vars.get(name) ?? `var(--${name})`);

  // Remove :root block (now empty after var extraction) — handles leftover semicolons
  result = result.replace(CSS_ROOT, "");
  if (rootKeepParts.length > 0) result = `:root{${rootKeepParts.join(";")}}${result}`;

  return result
    .replace(CSS_DELIMITERS, "$1")
    .replace(CSS_TRAILING_SEMI, "}")
    .replace(CSS_WS_COLLAPSE, " ")
    .trim();
}
