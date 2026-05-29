import { compressCaptureScreenshot } from "../image-convert";
import type { Capture } from "../types";
import { archivePageHtml } from "./sanitize";
import { extractLogoFromPage } from "./extract";

const ALLOWED_SCHEMES = ["http:", "https:", "file:"];
const MAX_CAPTURE_SIZE = 25 * 1024 * 1024; // 25 MB total per capture

export async function captureActiveTab(): Promise<Capture> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab found");
  }

  // C9: URL scheme allowlist — block restricted browser-internal pages
  try {
    const url = new URL(tab.url);
    if (!ALLOWED_SCHEMES.includes(url.protocol)) {
      throw new Error(
        `Cannot capture this page — ${url.protocol} URLs are not accessible. Browser-internal pages cannot be captured.`,
      );
    }
  } catch (err) {
    if (err instanceof TypeError) {
      // Malformed URL
      throw new Error("Cannot capture this page — the URL is invalid.");
    }
    throw err;
  }

  const screenshotUri: string = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
  });

  const compressedScreenshot = await compressCaptureScreenshot(screenshotUri);

  const [result] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: archivePageHtml,
  });

  const scriptResult = result?.result as { html: string; title: string } | undefined;

  const htmlContent = scriptResult?.html ?? "";
  const capture: Capture = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    sourceUrl: tab.url,
    pageTitle: scriptResult?.title ?? "",
    screenshotBase64: compressedScreenshot,
    htmlContent,
    notes: "",
  };
  // I8: Size limit — truncate HTML if capture is too large
  const totalSize = capture.screenshotBase64.length + capture.htmlContent.length;
  if (totalSize > MAX_CAPTURE_SIZE) {
    const overhead = capture.screenshotBase64.length;
    const htmlBudget = Math.max(0, MAX_CAPTURE_SIZE - overhead);
    capture.htmlContent = `${htmlContent.slice(0, htmlBudget)}\n<!-- TRUNCATED: page content exceeded size limit -->`;
  }

  return capture;
}

export async function captureCurrentPageInfo(): Promise<{
  url: string;
  title: string;
  faviconUrl?: string;
}> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const rawUrl = tab.url ?? "";
  let url = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      url = "";
    }
  } catch {
    url = "";
  }
  return {
    url,
    title: tab.title ?? "",
    faviconUrl: tab.favIconUrl,
  };
}

/**
 * Capture the active tab and associate the result with a metadata field.
 * For "toolLogoUrl", also extracts the best logo image from the page.
 */
export async function captureForMetadataField(field: string): Promise<{
  capture: Capture;
  logoUrl?: string;
  logoDataUrl?: string;
}> {
  const capture = await captureActiveTab();
  capture.metadataField = field;

  let logoUrl: string | undefined;
  let logoDataUrl: string | undefined;
  if (field === "toolLogoUrl") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const logo = await extractLogoFromPage(tab.id);
      if (logo) {
        logoUrl = logo.url;
        logoDataUrl = logo.dataUrl;
      }
    }
  }

  return { capture, logoUrl, logoDataUrl };
}
