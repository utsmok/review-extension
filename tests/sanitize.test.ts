// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { archivePageHtml, sanitizeArchiveHtml } from "@/lib/capture/sanitize";

describe("archivePageHtml", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    document.title = "Test Page";
  });

  it("strips script elements", async () => {
    document.body.innerHTML = `<div>Content</div><script>alert('xss')</script>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });

  it("strips iframe, object, embed, base elements", async () => {
    document.body.innerHTML = `
      <iframe src="https://evil.com"></iframe>
      <object data="evil.swf"></object>
      <embed src="evil.swf">
      <base href="https://evil.com/">
    `;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<object");
    expect(html).not.toContain("<embed");
    // The <base> added by sanitize itself should exist, but the user-injected one must not.
    // Count base tags — there should be exactly one (the injected one).
    const baseCount = (html.match(/<base\b/g) || []).length;
    expect(baseCount).toBe(1);
  });

  it("strips on* event handler attributes", async () => {
    document.body.innerHTML = `<div onclick="alert(1)" onmouseover="alert(2)" class="safe">Text</div>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onmouseover");
    expect(html).toContain("safe");
  });

  it("strips javascript: URLs", async () => {
    document.body.innerHTML = `<a href="javascript:alert(1)">Click</a>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("javascript:");
  });

  it("strips vbscript: URLs", async () => {
    document.body.innerHTML = `<a href="vbscript:msgbox">Click</a>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("vbscript:");
  });

  it("strips data:text/html URLs", async () => {
    document.body.innerHTML = `<a href="data:text/html,<script>alert(1)</script>">Click</a>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("data:text/html");
  });

  it("preserves safe http/https URLs", async () => {
    document.body.innerHTML = `<a href="https://example.com">Link</a><img src="http://example.com/img.png">`;
    const { html } = await archivePageHtml();
    // jsdom may normalize URLs (e.g. add trailing slash)
    expect(html).toMatch(/href="https:\/\/example\.com\/?"/);
    expect(html).toContain('src="http://example.com/img.png"');
  });

  it("strips meta http-equiv refresh", async () => {
    document.head.innerHTML = `<meta http-equiv="refresh" content="0;url=javascript:alert(1)">`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("http-equiv");
  });

  it("strips external url() in style tags", async () => {
    document.head.innerHTML = `<style>body { background: url('https://evil.com/track.gif') }</style>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("evil.com");
    expect(html).toContain("/* stripped external URL */");
  });

  it("makes relative URLs absolute", async () => {
    document.body.innerHTML = `<img src="/img/photo.png">`;
    const { html } = await archivePageHtml();
    // jsdom baseURI will be something like http://localhost/...
    // The src should be resolved against that base
    expect(html).not.toContain('src="/img/photo.png"');
    expect(html).toMatch(/src="http[^"]*\/img\/photo\.png"/);
  });

  it("preserves data: URLs", async () => {
    document.body.innerHTML = `<img src="data:image/png;base64,abc123">`;
    const { html } = await archivePageHtml();
    expect(html).toContain('src="data:image/png;base64,abc123"');
  });

  it("injects a base tag in head", async () => {
    document.head.innerHTML = "";
    const { html } = await archivePageHtml();
    // The injected <base> should contain the document's baseURI as href
    expect(html).toMatch(/<base\b[^>]*href="[^"]+"/);
  });

  it("adds archive metadata comment", async () => {
    const { html } = await archivePageHtml();
    expect(html).toContain("Archived by TRUST Review Extension");
  });

  it("returns document title", async () => {
    document.title = "My Custom Title";
    const { title } = await archivePageHtml();
    expect(title).toBe("My Custom Title");
  });

  it("strips noscript elements", async () => {
    document.body.innerHTML = `<noscript><meta http-equiv="refresh" content="0;url=evil"></noscript>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("<noscript");
  });

  it("strips frame and applet elements", async () => {
    document.body.innerHTML = `<frame src="evil.html"><applet code="Evil.class"></applet>`;
    const { html } = await archivePageHtml();
    expect(html).not.toContain("<frame");
    expect(html).not.toContain("<applet");
  });

  it("preserves class attribute while stripping on* handlers", async () => {
    document.body.innerHTML = `<div class="keep-me" id="stay" data-value="1" onfocus="bad()">Hi</div>`;
    const { html } = await archivePageHtml();
    expect(html).toContain('class="keep-me"');
    expect(html).toContain('id="stay"');
    expect(html).toContain('data-value="1"');
    expect(html).not.toContain("onfocus");
  });

  it("handles empty document body", async () => {
    document.body.innerHTML = "";
    document.head.innerHTML = `<title>Test Page</title>`;
    const { html, title } = await archivePageHtml();
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
    expect(title).toBe("Test Page");
  });
});

describe("sanitizeArchiveHtml", () => {
  it("strips <script> elements", () => {
    const out = sanitizeArchiveHtml(
      `<html><body><script>alert(1)</script><p>safe</p></body></html>`,
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert");
    expect(out).toContain("<p>safe</p>");
  });

  it("strips on* event handler attributes", () => {
    const out = sanitizeArchiveHtml(
      `<html><body><div onclick="evil()" onmouseover="steal()">ok</div></body></html>`,
    );
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onmouseover");
    expect(out).toContain("<div");
  });

  it("strips javascript:, vbscript:, and data:text/html URLs", () => {
    const out = sanitizeArchiveHtml(
      `<html><body><a href="javascript:alert(1)">x</a><a href="vbscript:run()">y</a><a href="data:text/html,<script>alert(1)</script>">z</a></body></html>`,
    );
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("vbscript:");
    expect(out).not.toContain("data:text/html");
  });

  it("strips iframe, object, embed, base, frame, applet, noscript", () => {
    const html = [
      "<html><body>",
      '<iframe src="evil.html"></iframe>',
      '<object data="evil.swf"></object>',
      '<embed src="evil.swf">',
      '<base href="http://evil.com">',
      '<frame src="evil.html">',
      '<applet code="Evil.class"></applet>',
      "<noscript>hidden</noscript>",
      "<p>safe</p></body></html>",
    ].join("");
    const out = sanitizeArchiveHtml(html);
    expect(out).not.toContain("<iframe");
    expect(out).not.toContain("<object");
    expect(out).not.toContain("<embed");
    expect(out).not.toContain("<base");
    expect(out).not.toContain("<frame");
    expect(out).not.toContain("<applet");
    expect(out).not.toContain("<noscript");
    expect(out).toContain("<p>safe</p>");
  });

  it("strips meta http-equiv refresh", () => {
    const out = sanitizeArchiveHtml(
      `<html><head><meta http-equiv="refresh" content="0;url=javascript:alert(1)"></head><body>ok</body></html>`,
    );
    expect(out).not.toContain("refresh");
    expect(out).toContain("<body>ok</body>");
  });

  it("preserves safe http/https URLs", () => {
    const out = sanitizeArchiveHtml(
      `<html><body><a href="https://example.com" class="link">ok</a></body></html>`,
    );
    expect(out).toContain("https://example.com");
    expect(out).toContain('class="link"');
  });
});
