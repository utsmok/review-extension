import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { Evaluation } from "@/lib/types";
import { exportSession } from "@/lib/export";
import { buildHtmlReport } from "@/lib/html-report";
import { TINY_PNG, RUBRIC, makeMetadata, makeCapture } from "./fixtures";

async function unzipToFiles(blob: Blob): Promise<Map<string, string | Uint8Array>> {
  const arrayBuffer = await blob.arrayBuffer();
  const loaded = await JSZip.loadAsync(arrayBuffer);
  const files = new Map<string, string | Uint8Array>();

  for (const [path, entry] of Object.entries(loaded.files)) {
    if (entry.dir) continue;
    if (
      path.endsWith(".csv") ||
      path.endsWith(".html") ||
      path.endsWith(".json") ||
      path.endsWith(".svg")
    ) {
      files.set(path, await entry.async("string"));
    } else {
      files.set(path, await entry.async("uint8array"));
    }
  }

  return files;
}

// Valid 1x1 PNG (red pixel) to simulate an annotated version
const TINY_PNG_ANNOTATED =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==";

describe("annotated screenshot export (§3e)", () => {
  it("exports annotated screenshot alongside clean version", async () => {
    const capture = makeCapture({
      id: "cap-0001-abcd",
      screenshotBase64: TINY_PNG,
      annotatedScreenshotBase64: TINY_PNG_ANNOTATED,
    });

    const blob = await exportSession(makeMetadata(), [capture], [], RUBRIC);
    const files = await unzipToFiles(blob);

    // Clean version
    expect(files.has("cap0001a.jpg")).toBe(true);
    expect(files.has("cap0001a.html")).toBe(true);
    // Annotated version (extension from pngToJpeg — may be .png if jpeg conversion fails)
    const hasAnnotated =
      files.has("cap0001a_annotated.jpg") || files.has("cap0001a_annotated.png");
    expect(hasAnnotated).toBe(true);
  });

  it("does not export annotated file when capture has no annotated version", async () => {
    const capture = makeCapture({
      id: "cap-0001-abcd",
      screenshotBase64: TINY_PNG,
    });

    const blob = await exportSession(makeMetadata(), [capture], [], RUBRIC);
    const files = await unzipToFiles(blob);

    expect(files.has("cap0001a.jpg")).toBe(true);
    expect(files.has("cap0001a_annotated.jpg")).toBe(false);
    expect(files.has("cap0001a_annotated.png")).toBe(false);
  });

  it("includes hasAnnotatedScreenshot flag in session.json", async () => {
    const capture = makeCapture({
      id: "cap-0001-abcd",
      screenshotBase64: TINY_PNG,
      annotatedScreenshotBase64: TINY_PNG_ANNOTATED,
    });

    const blob = await exportSession(makeMetadata(), [capture], [], RUBRIC);
    const files = await unzipToFiles(blob);
    const sessionJson = JSON.parse(files.get("session.json") as string);

    expect(sessionJson.captures[0].hasAnnotatedScreenshot).toBe(true);
  });

  it("omits hasAnnotatedScreenshot when no annotated version", async () => {
    const capture = makeCapture({
      id: "cap-0001-abcd",
      screenshotBase64: TINY_PNG,
    });

    const blob = await exportSession(makeMetadata(), [capture], [], RUBRIC);
    const files = await unzipToFiles(blob);
    const sessionJson = JSON.parse(files.get("session.json") as string);

    expect(sessionJson.captures[0].hasAnnotatedScreenshot).toBeUndefined();
  });
});

describe("HTML report uses annotated images (§3e)", () => {
  it("prefers annotated screenshot in evidence images when available", async () => {
    const capture = makeCapture({
      id: "cap-001",
      screenshotBase64: TINY_PNG,
      annotatedScreenshotBase64: TINY_PNG_ANNOTATED,
      pageTitle: "Annotated Page",
    });
    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: 2,
        notes: "",
        explicitEvidenceIds: ["cap-001"],
      },
    ];

    const html = await buildHtmlReport(makeMetadata(), [capture], evaluations, RUBRIC);

    expect(html).toContain("Annotated Page");
    expect(html).toContain("evidence-item");
    // compressScreenshot catches errors in node (no canvas), falls back to original data URL
    expect(html).toContain(TINY_PNG_ANNOTATED);
  });

  it("uses clean screenshot when no annotated version exists", async () => {
    const capture = makeCapture({
      id: "cap-001",
      screenshotBase64: TINY_PNG,
      pageTitle: "Clean Page",
    });
    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: 2,
        notes: "",
        explicitEvidenceIds: ["cap-001"],
      },
    ];

    const html = await buildHtmlReport(makeMetadata(), [capture], evaluations, RUBRIC);

    expect(html).toContain("Clean Page");
    expect(html).toContain("evidence-item");
  });

  it("prefers annotated screenshot in unlinked evidence section", async () => {
    const capture = makeCapture({
      id: "cap-001",
      screenshotBase64: TINY_PNG,
      annotatedScreenshotBase64: TINY_PNG_ANNOTATED,
      pageTitle: "Unlinked Annotated",
    });

    const html = await buildHtmlReport(makeMetadata(), [capture], [], RUBRIC);

    expect(html).toContain("Additional Evidence");
    expect(html).toContain("Unlinked Annotated");
    expect(html).toContain(TINY_PNG_ANNOTATED);
  });
});
