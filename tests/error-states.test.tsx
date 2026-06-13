// @vitest-environment jsdom

import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock IDB — loadAllScreenshots hangs in jsdom
vi.mock("@/lib/screenshot-store", () => ({
  loadAllScreenshots: async () => new Map(),
  saveScreenshot: async () => {},
}));

// Mock image conversion — canvas unavailable in jsdom
vi.mock("@/lib/image-convert", () => ({
  pngToJpeg: async (dataUrl: string) => ({ dataUrl, extension: "jpg" as const }),
  base64ToUint8Array: (b64: string) => Buffer.from(b64, "base64"),
  uint8ArrayToBase64: (arr: Uint8Array) => Buffer.from(arr).toString("base64"),
}));

import { importSessionFromZip, sanitizeFilename } from "@/lib/export";
import { prepareExportArtifacts, shortId } from "@/lib/export-pipeline";
import { makeCapture, makeFinalization, makeMetadata, RUBRIC, TINY_PNG } from "@/tests/fixtures";

// Silence expected error output
const _origError = console.error;
afterEach(() => {
  console.error = _origError;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildZip(files: Record<string, string | object>): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, typeof content === "string" ? content : JSON.stringify(content));
  }
  return zip.generateAsync({ type: "blob" });
}

// ---------------------------------------------------------------------------
// importSessionFromZip — corrupt / invalid inputs
// ---------------------------------------------------------------------------
describe("importSessionFromZip error states", () => {
  it("rejects a non-ZIP blob", async () => {
    console.error = vi.fn();
    const badBlob = new Blob(["this is not a zip"], { type: "application/zip" });
    await expect(importSessionFromZip(badBlob)).rejects.toThrow();
  });

  it("rejects an archive missing session.json", async () => {
    console.error = vi.fn();
    const blob = await buildZip({ "readme.txt": "hello" });
    await expect(importSessionFromZip(blob)).rejects.toThrow("No session.json found in archive");
  });

  it("rejects malformed JSON in session.json", async () => {
    console.error = vi.fn();
    const blob = await buildZip({ "session.json": "{invalid" });
    await expect(importSessionFromZip(blob)).rejects.toThrow();
  });

  it("rejects session.json missing required metadata fields", async () => {
    console.error = vi.fn();
    const blob = await buildZip({
      "session.json": { captures: [], evaluations: [] },
    });
    await expect(importSessionFromZip(blob)).rejects.toThrow("missing required fields");
  });

  it("rejects session.json with empty metadata.id", async () => {
    console.error = vi.fn();
    const metadata = makeMetadata({ id: "" });
    const blob = await buildZip({
      "session.json": { metadata, captures: [], evaluations: [] },
    });
    await expect(importSessionFromZip(blob)).rejects.toThrow(
      "metadata.id must be a non-empty string",
    );
  });

  it("rejects session.json with non-array captures", async () => {
    console.error = vi.fn();
    const metadata = makeMetadata();
    const blob = await buildZip({
      "session.json": { metadata, captures: "not-array", evaluations: [] },
    });
    await expect(importSessionFromZip(blob)).rejects.toThrow("missing required fields");
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename — dangerous inputs
// ---------------------------------------------------------------------------
describe("sanitizeFilename edge cases", () => {
  it("strips path traversal sequences", () => {
    expect(sanitizeFilename("../../../etc/passwd")).not.toContain("..");
  });

  it("replaces control characters", () => {
    const result = sanitizeFilename("file\x00name\x1Ftest");
    for (let i = 0; i < result.length; i++) {
      expect(result.charCodeAt(i)).toBeGreaterThan(31);
    }
  });

  it("returns fallback for empty string", () => {
    expect(sanitizeFilename("")).toBe("review");
  });

  it("replaces invalid characters with underscores", () => {
    expect(sanitizeFilename("a<b>c:d\\e/f|g?h*i")).not.toMatch(/[<>:"/\\|?*]/);
  });
});

// ---------------------------------------------------------------------------
// shortId
// ---------------------------------------------------------------------------
describe("shortId", () => {
  it("returns an 8-character hex string", () => {
    const id = crypto.randomUUID();
    const result = shortId(id);
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[0-9a-f]{8}$/);
  });

  it("produces consistent results for the same input", () => {
    const id = "12345678-1234-1234-1234-123456789abc";
    expect(shortId(id)).toBe(shortId(id));
  });
});

// ---------------------------------------------------------------------------
// prepareExportArtifacts — empty collections
// ---------------------------------------------------------------------------
describe("prepareExportArtifacts with empty data", () => {
  it("succeeds with empty captures and evaluations", async () => {
    console.error = vi.fn();
    const metadata = makeMetadata();
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, null);
    expect(result.metadataCsv).toContain("Tool_Name");
    expect(result.scoresCsv).toContain("Question_ID");
    expect(result.captureLogCsv.length).toBeGreaterThan(0);
    expect(result.htmlReport).toContain("<html");
    // Logo files are always included
    expect(result.captureHtmlFiles.size).toBe(0);
    expect(result.conclusionsCsv).toBeNull();
  });

  it("includes conclusions CSV when finalization is provided", async () => {
    console.error = vi.fn();
    const metadata = makeMetadata();
    const finalization = makeFinalization();
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, finalization);
    expect(result.conclusionsCsv).toContain("Grade");
    expect(result.conclusionsCsv).toContain("Test conclusion");
  });

  it("produces image entries for captures with screenshots", async () => {
    console.error = vi.fn();
    const metadata = makeMetadata();
    const capture = makeCapture({ screenshotBase64: TINY_PNG });
    const result = await prepareExportArtifacts(metadata, [capture], [], RUBRIC, null);
    // At least the capture screenshot + logo files
    expect(result.imageFiles.size).toBeGreaterThanOrEqual(2);
  });
});
