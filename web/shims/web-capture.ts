/**
 * Web replacement for lib/capture/browser.ts.
 * Generates mock screenshots so the trial version can exercise the
 * capture → annotate → link workflow without real browser tabs.
 */

import type { Capture } from "@/lib/types";

/** Create a mock screenshot data-URL with "TEST" rendered over a placeholder page. */
function generateMockScreenshot(): string {
  const W = 800;
  const H = 600;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, W, H);

  // Fake browser chrome
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, W, 40);
  // Address bar
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(80, 8, W - 160, 24);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "13px Inter, sans-serif";
  ctx.fillText("example-tool.edu", 90, 25);

  // Toolbar dots
  ctx.fillStyle = "#d1d5db";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(20 + i * 16, 20, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // "TEST" watermark
  ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
  ctx.font = "bold 160px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TEST", W / 2, H / 2);

  // "Trial screenshot" subtitle
  ctx.fillStyle = "rgba(107, 114, 128, 0.4)";
  ctx.font = "18px Inter, sans-serif";
  ctx.fillText("Trial screenshot — install the extension for real captures", W / 2, H / 2 + 100);

  // Fake content blocks
  ctx.fillStyle = "#d1d5db";
  ctx.fillRect(40, 70, 300, 16);
  ctx.fillRect(40, 96, 240, 16);
  ctx.fillRect(40, 140, 500, 120);
  ctx.fillRect(40, 280, 500, 120);
  ctx.fillRect(560, 70, 200, 330);

  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";

  return canvas.toDataURL("image/png");
}

/** Returns a mock capture with a generated placeholder screenshot. */
export async function captureActiveTab(): Promise<Capture> {
  return {
    id: crypto.randomUUID(),
    sourceUrl: "https://example-tool.edu/search",
    pageTitle: "Example Tool — Trial Screenshot",
    timestamp: new Date().toISOString(),
    screenshotBase64: generateMockScreenshot(),
    htmlContent: "",
    notes: "",
  };
}

/** Returns a placeholder page info for web trial. */
export async function captureCurrentPageInfo(): Promise<{
  url: string;
  title: string;
  faviconUrl?: string;
}> {
  return {
    url: "https://example-tool.edu",
    title: "Example Tool (Web Trial)",
    faviconUrl: undefined,
  };
}

/** Returns a mock capture for metadata fields. */
export async function captureForMetadataField(_field: string): Promise<{
  capture: Capture;
  logoUrl?: string;
  logoDataUrl?: string;
}> {
  return {
    capture: await captureActiveTab(),
  };
}

/** No-op: cannot extract logos from pages in web mode. */
export async function extractLogoFromPage(
  _tabId: number,
): Promise<{ url: string; dataUrl?: string } | null> {
  return null;
}

/** No-op: HTML archiving not available in web mode. */
export function archivePageHtml(): string {
  return "";
}
