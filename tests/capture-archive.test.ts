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

    spyTabsQuery.mockResolvedValue([
      { id: 1, url: "https://example.com/big-page", windowId: 1 },
    ]);
    spyCaptureVisibleTab.mockResolvedValue(screenshotBase64);
    spyExecuteScript.mockResolvedValue([
      { result: { html: htmlContent, title: "Big Page" } },
    ]);

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

    spyTabsQuery.mockResolvedValue([
      { id: 1, url: "https://example.com/small", windowId: 1 },
    ]);
    spyCaptureVisibleTab.mockResolvedValue(smallScreenshot);
    spyExecuteScript.mockResolvedValue([
      { result: { html: smallHtml, title: "Small" } },
    ]);

    const capture = await captureActiveTab();

    expect(capture.htmlContent).toBe(smallHtml);
    expect(capture.htmlContent).not.toContain("TRUNCATED");
  });
});

describe("captureActiveTab with executeScript returning undefined", () => {
  it("creates capture with empty htmlContent and empty pageTitle", async () => {
    spyTabsQuery.mockResolvedValue([
      { id: 1, url: "https://example.com/no-script", windowId: 1 },
    ]);
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
    spyTabsQuery.mockResolvedValue([
      { id: 1, url: "::invalid", windowId: 1 },
    ]);

    await expect(captureActiveTab()).rejects.toThrow("invalid");
  });
});
