import { describe, expect, it } from "vitest";
import { esc } from "../lib/html-report";

describe("esc() XSS payload corpus", () => {
  it("escapes script injection", () => {
    expect(esc("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });

  it("escapes double-quote attribute breakout", () => {
    expect(esc("\" onmouseover=\"alert('xss')")).toBe(
      "&quot; onmouseover=&quot;alert(&#39;xss&#39;)",
    );
  });

  it("escapes single-quote attribute breakout", () => {
    expect(esc("' onload='alert(\"xss\")")).toBe("&#39; onload=&#39;alert(&quot;xss&quot;)");
  });

  it("escapes javascript: protocol", () => {
    expect(esc("javascript:alert('xss')")).toBe("javascript:alert(&#39;xss&#39;)");
  });

  it("escapes img onerror injection", () => {
    expect(esc("<img src=x onerror=alert('xss')>")).toBe(
      "&lt;img src=x onerror=alert(&#39;xss&#39;)&gt;",
    );
  });

  it("escapes SVG script injection", () => {
    expect(esc("<svg onload=alert('xss')>")).toBe("&lt;svg onload=alert(&#39;xss&#39;)&gt;");
  });

  it("escapes HTML entity bypass attempts", () => {
    expect(esc("&#60;script&#62;alert('xss')&#60;/script&#62;")).toBe(
      "&amp;#60;script&amp;#62;alert(&#39;xss&#39;)&amp;#60;/script&amp;#62;",
    );
  });

  it("escapes null byte injection", () => {
    expect(esc("<scr\x00ipt>alert('xss')</script>")).toBe(
      "&lt;scr\x00ipt&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
    );
  });

  it("escapes template literal injection", () => {
    expect(esc("\x24{7*7}")).toBe("\x24{7*7}");
  });

  it("escapes backtick attribute injection", () => {
    expect(esc("` onmouseover=alert('xss')")).toBe("` onmouseover=alert(&#39;xss&#39;)");
  });

  it("escapes URL-encoded angle brackets", () => {
    expect(esc("%3Cscript%3Ealert('xss')%3C/script%3E")).toBe(
      "%3Cscript%3Ealert(&#39;xss&#39;)%3C/script%3E",
    );
  });

  it("escapes mixed case script tags", () => {
    expect(esc("<ScRiPt>alert('xss')</ScRiPt>")).toBe(
      "&lt;ScRiPt&gt;alert(&#39;xss&#39;)&lt;/ScRiPt&gt;",
    );
  });

  it("escapes event handler in img tag", () => {
    expect(esc('<img src="x" onerror="alert(1)">')).toBe(
      "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("escapes data:text/html URL", () => {
    expect(esc('data:text/html,<script>alert("xss")</script>')).toBe(
      "data:text/html,&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("escapes nested script tags", () => {
    expect(esc("<<script>script>alert('xss')<</script>/script>")).toBe(
      "&lt;&lt;script&gt;script&gt;alert(&#39;xss&#39;)&lt;&lt;/script&gt;/script&gt;",
    );
  });

  it("returns empty string unchanged", () => {
    expect(esc("")).toBe("");
  });

  it("returns safe text unchanged", () => {
    expect(esc("hello world 123")).toBe("hello world 123");
  });

  it("escapes all five special characters at once", () => {
    expect(esc("a&b<c>d'e\"f")).toBe("a&amp;b&lt;c&gt;d&#39;e&quot;f");
  });
});
