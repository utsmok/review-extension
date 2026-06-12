/**
 * Web replacement for lib/capture/browser.ts.
 * Provides the same exports but without Chrome/WXT browser API dependencies.
 * Used via Vite alias: @/lib/capture → this file.
 */

import type { Capture } from "@/lib/types";


/** No-op: cannot capture tabs in web mode. */
export async function captureActiveTab(): Promise<Capture> {
  throw new Error("Screenshot capture is available in the browser extension. Install the TRUST Review extension to capture screenshots.");
}

/** Returns a placeholder page info for web trial. */
export async function captureCurrentPageInfo(): Promise<{
  url: string;
  title: string;
  faviconUrl?: string;
}> {
  return {
    url: "",
    title: "",
    faviconUrl: undefined,
  };
}

/** No-op: cannot capture for metadata fields in web mode. */
export async function captureForMetadataField(_field: string): Promise<{
  capture: Capture;
  logoUrl?: string;
  logoDataUrl?: string;
}> {
  throw new Error("Screenshot capture is available in the browser extension.");
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
