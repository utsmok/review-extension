import { describe, expect, it } from "vitest";
import { minifyHtml } from "@/lib/minify";

// ── minifyHtml ─────────────────────────────────────────────────────────────

describe("minifyHtml", () => {
  it("removes HTML comments", () => {
    const input = "<div><!-- a comment -->Hello</div>";
    const result = minifyHtml(input);
    expect(result).not.toContain("<!--");
    expect(result).not.toContain("-->");
    expect(result).toContain("Hello");
  });

  it("removes closing tags for void/self-closing elements", () => {
    const tags = [
      "li",
      "dt",
      "dd",
      "p",
      "tr",
      "td",
      "th",
      "thead",
      "tbody",
      "tfoot",
      "colgroup",
      "option",
      "optgroup",
    ];
    for (const tag of tags) {
      const input = `<${tag}>content</${tag}>`;
      const result = minifyHtml(input);
      expect(result).not.toContain(`</${tag}>`);
      expect(result).toContain(`<${tag}>`);
    }
  });

  it("collapses excessive whitespace and newlines", () => {
    const input = "<div>\n\n\n  \n<p>text</p>\n\n</div>";
    const result = minifyHtml(input);
    // Should not contain multiple consecutive newlines
    expect(result).not.toMatch(/\n\s*\n/);
  });

  it("tightens >  < gaps to ><", () => {
    const input = "<div> <span>hello</span> </div>";
    const result = minifyHtml(input);
    expect(result).not.toMatch(/>\s+</);
  });

  it("returns empty string for empty input", () => {
    expect(minifyHtml("")).toBe("");
  });

  it("preserves already-minified HTML", () => {
    const minified = "<div><p>hello</p><span>world</span></div>";
    // Note: </p> gets stripped by the closing-tag rule
    const result = minifyHtml(minified);
    expect(result).toContain("hello");
    expect(result).toContain("world");
    // Should not introduce new whitespace
    expect(result).toBe(result.trim());
  });

  it("removes multiple consecutive newlines into single newline", () => {
    const input = "line1\n\n\nline2\n\n\n\nline3";
    const result = minifyHtml(input);
    expect(result).not.toMatch(/\n\s*\n/);
  });

  it("trims the output", () => {
    const input = "  <div>content</div>  ";
    const result = minifyHtml(input);
    expect(result).toBe(result.trim());
  });

  it("preserves <script> content — a // line comment must not swallow following code", () => {
    // Reproduces the production lightbox bug: newline collapse turned the
    // first `//` into a run-to-end comment, causing a SyntaxError.
    const input = [
      "<html><body>",
      "<script>",
      "var x = 1; // a comment",
      "var y = x + 1;",
      "window.__result = y;",
      "</script>",
      "</body></html>",
    ].join("\n");
    const result = minifyHtml(input);
    // The statement after the line comment survives on its own line.
    expect(result).toMatch(/\/\/ a comment\n/);
    expect(result).toContain("var y = x + 1;");
    // The full script body must still parse without a SyntaxError.
    const body = result.slice(
      result.indexOf("<script>") + "<script>".length,
      result.indexOf("</script>"),
    );
    expect(() => new Function(body)).not.toThrow();
  });

  it("preserves <pre> rendered whitespace", () => {
    const input = "<div>text</div><pre>line1\n   indented\nline3</pre>";
    const result = minifyHtml(input);
    expect(result).toContain("<pre>line1\n   indented\nline3</pre>");
    // Surrounding markup is still collapsed.
    expect(result).toContain("<div>text</div>");
  });

  it("preserves a space before '<' inside <pre> (no global space-strip on preserved blocks)", () => {
    // A code snippet like `if (i < len)` must keep the space before `<`.
    const input = "<pre>if (i &lt; len)\n  return x;</pre>";
    const result = minifyHtml(input);
    expect(result).toContain("<pre>if (i &lt; len)\n  return x;</pre>");
  });

  it("still collapses whitespace in surrounding markup around a preserved <script>", () => {
    const input = "<div>\n\n  <p>hi</p>\n\n<script>var a = 1;\nvar b = 2;</script>\n\n</div>";
    const result = minifyHtml(input);
    expect(result).not.toMatch(/\n\s*\n/);
    expect(result).toContain("var a = 1;\nvar b = 2;");
  });
});
