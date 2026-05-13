import { describe, expect, it } from "vitest";
import { minifyCss, minifyHtml } from "@/lib/export";

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
    const tags = ["li", "dt", "dd", "p", "tr", "td", "th", "thead", "tbody", "tfoot", "colgroup", "option", "optgroup"];
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

// ── minifyCss ──────────────────────────────────────────────────────────────

describe("minifyCss", () => {
  it("removes block comments", () => {
    const input = "/* header styles */ h1 { color: red; }";
    const result = minifyCss(input);
    expect(result).not.toContain("/*");
    expect(result).toContain("color:red");
  });

  it("removes line comments", () => {
    const input = "h1 {\n  color: red; // inline note\n}";
    const result = minifyCss(input);
    expect(result).not.toContain("//");
    expect(result).toContain("color:red");
  });

  it("resolves CSS variables inline and keeps keepVars in :root", () => {
    const input = `
      :root {
        --magenta: #8e036c;
        --muted: #6c757d;
        --text: #212529;
        --ff-heading: "Inter", sans-serif;
        --spacing: 16px;
      }
      .title { color: var(--magenta); margin: var(--spacing); }
    `;
    const result = minifyCss(input);
    // var(--magenta) resolved inline
    expect(result).toContain("#8e036c");
    // var(--spacing) resolved inline (not in keepVars)
    expect(result).toContain("16px");
    // :root block should only contain keepVars
    expect(result).toContain(":root{");
    expect(result).toContain("--magenta:#8e036c");
    expect(result).toContain("--muted:#6c757d");
    expect(result).toContain("--text:#212529");
    expect(result).toContain('--ff-heading:"Inter",sans-serif');
    // --spacing should NOT be in :root
    expect(result).not.toContain("--spacing:");
  });

  it("resolves var() references to their values", () => {
    const input = `
      :root {
        --main-color: blue;
      }
      .box { color: var(--main-color); }
    `;
    const result = minifyCss(input);
    expect(result).not.toContain("var(--main-color)");
    expect(result).toContain("color:blue");
  });

  it("handles CSS with no variables — only whitespace/comment removal", () => {
    const input = `
      /* simple styles */
      h1 {
        color: red;
        font-size: 14px;
      }
    `;
    const result = minifyCss(input);
    expect(result).not.toContain("/*");
    expect(result).toContain("color:red");
    expect(result).toContain("font-size:14px");
  });

  it("returns empty string for empty input", () => {
    expect(minifyCss("")).toBe("");
  });

  it("strips whitespace around delimiters", () => {
    const input = "h1 { color : red ; font-size : 14px }";
    const result = minifyCss(input);
    expect(result).toContain("h1{color:red;font-size:14px}");
  });

  it("removes trailing semicolons before closing braces", () => {
    const input = "h1 { color: red; }";
    const result = minifyCss(input);
    expect(result).not.toMatch(/;\}/);
  });

  it("handles CSS with only comments and whitespace", () => {
    const input = "/* nothing here */\n\n// also nothing\n";
    const result = minifyCss(input);
    expect(result).toBe("");
  });

  it("does not nest-resolve vars referencing other vars (single-pass resolution)", () => {
    // The implementation does a single pass: it collects all var definitions,
    // then replaces var() references with the raw values. If a var's value
    // contains another var(), it won't be resolved — the raw value is substituted.
    const input = `
      :root {
        --base: #8e036c;
        --accent: var(--base);
      }
      .box { color: var(--accent); }
    `;
    const result = minifyCss(input);
    // --accent resolves to "var(--base)" literally (not recursively)
    expect(result).toContain("var(--base)");
  });
});
