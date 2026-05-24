// @vitest-environment jsdom

import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { importSessionFromZip } from "@/lib/export";
import { makeMetadata } from "./fixtures";

async function buildZip(files: Record<string, string | object>): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, typeof content === "string" ? content : JSON.stringify(content));
  }
  return zip.generateAsync({ type: "blob" });
}

describe("annotated screenshot import (§3e)", () => {
  it("reassembles annotated screenshot from ZIP", async () => {
    const metadata = makeMetadata();
    const captureId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const sid = "aaaaaaaa";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
            hasAnnotatedScreenshot: true,
          },
        ],
        evaluations: [],
      },
      [`${sid}.jpg`]: "clean-jpeg",
      [`${sid}.html`]: "<html>clean</html>",
      [`${sid}_annotated.jpg`]: "annotated-jpeg",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toContain("data:image/jpeg;base64,");
    expect(result.captures[0].annotatedScreenshotBase64).toContain("data:image/jpeg;base64,");
  });

  it("reassembles annotated PNG from ZIP", async () => {
    const metadata = makeMetadata();
    const captureId = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
    const sid = "bbbbbbbb";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
            hasAnnotatedScreenshot: true,
          },
        ],
        evaluations: [],
      },
      [`${sid}.jpg`]: "clean-jpeg",
      [`${sid}.html`]: "<html>clean</html>",
      [`${sid}_annotated.png`]: "annotated-png",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].annotatedScreenshotBase64).toContain("data:image/png;base64,");
  });

  it("does not fail when hasAnnotatedScreenshot is set but file is missing", async () => {
    const metadata = makeMetadata();
    const captureId = "cccccccc-dddd-eeee-ffff-000000000000";
    const sid = "cccccccc";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
            hasAnnotatedScreenshot: true,
          },
        ],
        evaluations: [],
      },
      [`${sid}.jpg`]: "clean-jpeg",
      [`${sid}.html`]: "<html>clean</html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toContain("data:image/jpeg;base64,");
    expect(result.captures[0].annotatedScreenshotBase64).toBeUndefined();
  });
});
