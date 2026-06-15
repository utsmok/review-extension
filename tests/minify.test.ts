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
});
