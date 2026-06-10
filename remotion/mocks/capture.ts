import type { Capture } from "@/lib/types";

const FAKE_CAPTURE: Capture = {
  id: "mock-capture-1",
  timestamp: new Date().toISOString(),
  sourceUrl: "https://consensus.app",
  pageTitle: "Consensus AI Search",
  screenshotBase64:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  htmlContent: "<html><body></body></html>",
  notes: "",
};

export async function captureActiveTab(): Promise<Capture> {
  return { ...FAKE_CAPTURE, id: `cap-${Date.now()}` };
}

export async function captureForMetadataField(
  _field: string,
): Promise<{ capture: Capture; logoDataUrl?: string; logoUrl?: string }> {
  return {
    capture: { ...FAKE_CAPTURE, id: `cap-${Date.now()}` },
    logoDataUrl: "",
    logoUrl: "",
  };
}

export async function captureCurrentPageInfo(): Promise<{
  title: string;
  url: string;
  faviconUrl: string;
}> {
  return {
    title: "Mock Page",
    url: "https://example.com",
    faviconUrl: "",
  };
}

export async function extractLogoFromPage(): Promise<{
  logoDataUrl?: string;
  logoUrl?: string;
}> {
  return { logoDataUrl: "", logoUrl: "" };
}

export async function archivePageHtml(): Promise<string> {
  return "<html><body></body></html>";
}
