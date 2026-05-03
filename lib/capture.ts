import { v4 as uuidv4 } from "uuid";
import type { Capture } from "./types";

export async function captureActiveTab(): Promise<Capture> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found");
  }

  const screenshotUri: string = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
  });

  const [result] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      html: document.documentElement.outerHTML,
      title: document.title,
    }),
  });

  const scriptResult = result?.result as { html: string; title: string } | undefined;

  return {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    sourceUrl: tab.url,
    pageTitle: scriptResult?.title ?? "",
    screenshotBase64: screenshotUri,
    htmlContent: scriptResult?.html ?? "",
    notes: "",
  };
}

export async function captureCurrentPageInfo(): Promise<{
  url: string;
  title: string;
  faviconUrl?: string;
}> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return {
    url: tab.url ?? "",
    title: tab.title ?? "",
    faviconUrl: tab.favIconUrl,
  };
}
