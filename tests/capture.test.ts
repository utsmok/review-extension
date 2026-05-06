import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing";
import { captureActiveTab, captureCurrentPageInfo } from "@/lib/capture";

// Use vi.spyOn to replace fakeBrowser methods with vitest mocks
// so we can control return values per test.

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

describe("captureActiveTab", () => {
  it("happy path: returns a well-formed Capture object", async () => {
    spyTabsQuery.mockResolvedValue([
      { id: 42, url: "https://example.com", windowId: 1 },
    ]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc");
    spyExecuteScript.mockResolvedValue([
      { result: { html: "<html></html>", title: "Test" } },
    ]);

    const capture = await captureActiveTab();

    expect(capture).toMatchObject({
      sourceUrl: "https://example.com",
      pageTitle: "Test",
      screenshotBase64: "data:image/png;base64,abc",
      htmlContent: "<html></html>",
      notes: "",
    });
    expect(capture.id).toBeTypeOf("string");
    expect(capture.timestamp).toBeTypeOf("string");
    expect(new Date(capture.timestamp).getTime()).not.toBeNaN();

    expect(spyTabsQuery).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(spyCaptureVisibleTab).toHaveBeenCalledWith(1, { format: "png" });
    expect(spyExecuteScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 42 } }),
    );
  });

  it("throws when no active tab is found", async () => {
    spyTabsQuery.mockResolvedValue([]);

    await expect(captureActiveTab()).rejects.toThrow("No active tab found");
  });

  it("throws for restricted URL schemes (chrome://)", async () => {
    spyTabsQuery.mockResolvedValue([
      { id: 1, url: "chrome://extensions", windowId: 1 },
    ]);

    await expect(captureActiveTab()).rejects.toThrow("not accessible");
  });

  it("succeeds for file:// URLs", async () => {
    spyTabsQuery.mockResolvedValue([
      { id: 7, url: "file:///home/user/doc.html", windowId: 2 },
    ]);
    spyCaptureVisibleTab.mockResolvedValue("data:image/png;base64,filecap");
    spyExecuteScript.mockResolvedValue([
      { result: { html: "<html>file</html>", title: "Doc" } },
    ]);

    const capture = await captureActiveTab();

    expect(capture.sourceUrl).toBe("file:///home/user/doc.html");
    expect(capture.pageTitle).toBe("Doc");
    expect(capture.screenshotBase64).toBe("data:image/png;base64,filecap");
    expect(capture.htmlContent).toBe("<html>file</html>");
  });
});

describe("captureCurrentPageInfo", () => {
  it("happy path: returns url, title, and faviconUrl", async () => {
    spyTabsQuery.mockResolvedValue([
      {
        url: "https://example.com",
        title: "Example",
        favIconUrl: "https://example.com/favicon.ico",
      },
    ]);

    const info = await captureCurrentPageInfo();

    expect(info).toEqual({
      url: "https://example.com",
      title: "Example",
      faviconUrl: "https://example.com/favicon.ico",
    });
  });

  it("returns empty strings when tab has no url/title", async () => {
    spyTabsQuery.mockResolvedValue([{ url: "", title: "" }]);

    const info = await captureCurrentPageInfo();

    expect(info.url).toBe("");
    expect(info.title).toBe("");
    expect(info.faviconUrl).toBeUndefined();
  });
});
