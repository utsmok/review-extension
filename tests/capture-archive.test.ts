// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing";
import { captureActiveTab } from "@/lib/capture";

const MAX_CAPTURE_SIZE = 25 * 1024 * 1024; // must match lib/capture.ts

let spyTabsQuery: ReturnType<typeof vi.spyOn>;
let spyCaptureVisibleTab: ReturnType<typeof vi.spyOn>;
let spyExecuteScript: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fakeBrowser.tabs.resetState();
  spyTabsQuery = vi.spyOn(fakeBrowser.tabs, "query");
  spyCaptureVisibleTab = vi.spyOn(fakeBrowser.tabs, "captureVisibleTab");
  spyExecuteScript = vi.spyOn(fakeBrowser.scripting, "executeScript");
});

afterEach(() => {
  spyTabsQuery.mockRestore();
  spyCaptureVisibleTab.mockRestore();
  spyExecuteScript.mockRestore();
});

describe("captureActiveTab scheme rejection", () => {
  const restrictedUrls = [
    ["chrome://settings", "chrome:"],
    ["about:blank", "about:"],
    ["edge://extensions", "edge:"],
    ["data:text/html,<h1>hi</h1>", "data:"],
  ] as const;

  it.each(restrictedUrls)("rejects %s URL scheme", async (url) => {
    spyTabsQuery.mockResolvedValue([{ id: 1, url, windowId: 1 }]);

    await expect(captureActiveTab()).rejects.toThrow("Cannot capture this page");
  });
});

describe("captureActiveTab size truncation", () => {
  it("truncates htmlContent when total exceeds 25 MB", async () => {
    // Screenshot is 1 MB, html is >24 MB so combined exceeds 25 MB
    const screenshotSize = 1 * 1024 * 1024;
    const htmlSize = 25 * 1024 * 1024; // 25 MB html alone
    const screenshotBase64 = "x".repeat(screenshotSize);
    const htmlContent = "a".repeat(htmlSize);

    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com/big-page", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue(screenshotBase64);
    spyExecuteScript.mockResolvedValue([{ result: { html: htmlContent, title: "Big Page" } }]);

    const capture = await captureActiveTab();

    // Must contain truncation marker
    expect(capture.htmlContent).toContain("TRUNCATED");

    // Verify correct budget: MAX_CAPTURE_SIZE minus screenshot length
    const expectedBudget = Math.max(0, MAX_CAPTURE_SIZE - screenshotSize);
    // The truncated content is the original sliced to budget + the comment line
    const lines = capture.htmlContent.split("\n");
    const commentLine = lines[lines.length - 1];
    const contentPart = lines.slice(0, -1).join("\n");
    expect(commentLine).toContain("TRUNCATED");
    expect(contentPart.length).toBe(expectedBudget);
  });

  it("does not truncate when total is under 25 MB", async () => {
    const smallScreenshot = "data:image/png;base64,abc";
    const smallHtml = "<html><body>hello</body></html>";

    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com/small", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue(smallScreenshot);
    spyExecuteScript.mockResolvedValue([{ result: { html: smallHtml, title: "Small" } }]);

    const capture = await captureActiveTab();

    expect(capture.htmlContent).toBe(smallHtml);
    expect(capture.htmlContent).not.toContain("TRUNCATED");
  });
});

describe("captureActiveTab with executeScript returning undefined", () => {
  it("creates capture with empty htmlContent and empty pageTitle", async () => {
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com/no-script", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    spyExecuteScript.mockResolvedValue([{ result: undefined }]);

    const capture = await captureActiveTab();

    expect(capture.htmlContent).toBe("");
    expect(capture.pageTitle).toBe("");
    expect(capture.sourceUrl).toBe("https://example.com/no-script");
    expect(capture.screenshotBase64).toBe("data:image/png;base64,abc");
    expect(capture.notes).toBe("");
    expect(capture.id).toBeTypeOf("string");
  });
});

describe("captureActiveTab malformed URL", () => {
  it("throws for a malformed URL", async () => {
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "::invalid", windowId: 1 }]);

    await expect(captureActiveTab()).rejects.toThrow("invalid");
  });
});

/**
 * XSS hardening tests for archivePageHtml().
 * We mock executeScript to actually invoke the passed func against the jsdom
 * document, so the sanitization logic runs for real.
 */
describe("captureActiveTab XSS hardening", () => {
  /** Helper: mock executeScript to run the injected func against jsdom document */
  function mockExecuteScriptRunsFunc() {
    spyExecuteScript.mockImplementation(async ({ func }: { func: () => Promise<unknown> }) => {
      const result = await func();
      return [{ result }];
    });
  }

  it("strips iframe elements", async () => {
    document.body.innerHTML = '<p>Safe</p><iframe src="https://evil.com"></iframe>';
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    mockExecuteScriptRunsFunc();

    const capture = await captureActiveTab();

    expect(capture.htmlContent).not.toContain("<iframe");
    expect(capture.htmlContent).toContain("Safe");
  });

  it("strips on* event handler attributes", async () => {
    document.body.innerHTML =
      '<div onclick="alert(1)" onmouseover="alert(2)" class="ok">Text</div>';
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    mockExecuteScriptRunsFunc();

    const capture = await captureActiveTab();

    expect(capture.htmlContent).not.toContain("onclick");
    expect(capture.htmlContent).not.toContain("onmouseover");
    expect(capture.htmlContent).toContain("Text");
  });

  it("strips javascript: URLs from href", async () => {
    document.body.innerHTML =
      '<a href="javascript:alert(1)">Click</a><a href="https://safe.com">OK</a>';
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    mockExecuteScriptRunsFunc();

    const capture = await captureActiveTab();

    expect(capture.htmlContent).not.toContain("javascript:");
    expect(capture.htmlContent).toContain("Click");
    expect(capture.htmlContent).toContain("https://safe.com");
  });

  it("strips meta http-equiv refresh tags", async () => {
    document.head.innerHTML =
      '<meta charset="utf-8"><meta http-equiv="refresh" content="0;url=javascript:alert(1)">';
    document.body.innerHTML = "<p>Content</p>";
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    mockExecuteScriptRunsFunc();

    const capture = await captureActiveTab();

    expect(capture.htmlContent).not.toContain("http-equiv");
    expect(capture.htmlContent).toContain("Content");
  });

  it("strips object and embed elements", async () => {
    document.body.innerHTML =
      '<p>Safe</p><object data="https://evil.com"><embed src="https://evil.com"></object>';
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    mockExecuteScriptRunsFunc();

    const capture = await captureActiveTab();

    expect(capture.htmlContent).not.toContain("<object");
    expect(capture.htmlContent).not.toContain("<embed");
    expect(capture.htmlContent).toContain("Safe");
  });

  it("strips vbscript: and data:text/html URLs", async () => {
    document.body.innerHTML =
      '<a href="vbscript:msgbox(1)">VB</a><img src="data:text/html,<script>alert(1)</script>">';
    spyTabsQuery.mockResolvedValue([{ id: 1, url: "https://example.com", windowId: 1 }]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    mockExecuteScriptRunsFunc();

    const capture = await captureActiveTab();

    expect(capture.htmlContent).not.toContain("vbscript:");
    expect(capture.htmlContent).not.toContain("data:text/html");
  });
});
