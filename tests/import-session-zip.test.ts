// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importSessionFromZip } from "@/lib/export";
import { makeMetadata, makeCapture, makeEvaluation, makeFinalization } from "./fixtures";

// ---------------------------------------------------------------------------
// Helper — build a ZIP blob from a flat record of name → content
// ---------------------------------------------------------------------------
async function buildZip(files: Record<string, string | object>): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, typeof content === "string" ? content : JSON.stringify(content));
  }
  return zip.generateAsync({ type: "blob" });
}

// ---------------------------------------------------------------------------
// importSessionFromZip
// ---------------------------------------------------------------------------
describe("importSessionFromZip", () => {
  // 1. Valid import with all fields populated
  it("returns session data from a valid ZIP", async () => {
    const metadata = makeMetadata();
    const captures = [makeCapture()];
    const evaluations = [makeEvaluation({ rubricId: "TR-1", score: "pass" })];
    const finalization = makeFinalization();

    const blob = await buildZip({
      "session.json": { metadata, captures, evaluations, finalization },
    });

    const result = await importSessionFromZip(blob);
    expect(result.metadata).toEqual(metadata);
    expect(result.captures).toEqual(captures);
    expect(result.evaluations).toEqual(evaluations);
    expect(result.finalization).toEqual(finalization);
  });

  // 2. Minimal valid import — empty arrays
  it("succeeds with empty captures and evaluations", async () => {
    const metadata = makeMetadata();

    const blob = await buildZip({
      "session.json": { metadata, captures: [], evaluations: [] },
    });

    const result = await importSessionFromZip(blob);
    expect(result.metadata).toEqual(metadata);
    expect(result.captures).toEqual([]);
    expect(result.evaluations).toEqual([]);
  });

  // 3. Missing session.json
  it("throws when session.json is absent", async () => {
    const blob = await buildZip({ "readme.txt": "hello" });

    await expect(importSessionFromZip(blob)).rejects.toThrow("No session.json found in archive");
  });

  // 4. Malformed JSON inside session.json
  it("throws when session.json contains invalid JSON", async () => {
    const blob = await buildZip({ "session.json": "{bad json" });

    await expect(importSessionFromZip(blob)).rejects.toThrow();
  });

  // 5. Missing metadata field
  it("throws when metadata is missing", async () => {
    const blob = await buildZip({
      "session.json": {
        captures: [],
        evaluations: [],
      },
    });

    await expect(importSessionFromZip(blob)).rejects.toThrow("missing required fields");
  });

  // 6. Missing captures field
  it("throws when captures is missing", async () => {
    const blob = await buildZip({
      "session.json": {
        metadata: makeMetadata(),
        evaluations: [],
      },
    });

    await expect(importSessionFromZip(blob)).rejects.toThrow("missing required fields");
  });

  // 7. Missing evaluations field
  it("throws when evaluations is missing", async () => {
    const blob = await buildZip({
      "session.json": {
        metadata: makeMetadata(),
        captures: [],
      },
    });

    await expect(importSessionFromZip(blob)).rejects.toThrow("missing required fields");
  });

  // 8. Extra top-level fields are preserved
  it("returns successfully when extra fields are present", async () => {
    const metadata = makeMetadata();

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [],
        evaluations: [],
        extraField: "should be fine",
        nested: { a: 1 },
      },
    });

    const result = await importSessionFromZip(blob);
    expect(result.metadata).toEqual(metadata);
    expect((result as unknown as { extraField: unknown }).extraField).toBe("should be fine");
  });

  // 9. Round-trip: verify data survives JSON serialization in the same shape
  //    that exportSession uses when embedding session.json inside the ZIP.
  it("reads back data structured like exportSession output", async () => {
    const metadata = makeMetadata();
    const captures = [makeCapture()];
    const evaluations = [makeEvaluation({ rubricId: "TR-1", score: "pass", notes: "looks good" })];
    const finalization = makeFinalization();

    // Replicate the session.json that exportSession embeds in the ZIP.
    // (We build the ZIP manually to avoid the DOM-heavy html-report pipeline
    // that hangs in jsdom.)
    const sessionData = { metadata, captures, evaluations, finalization };
    const blob = await buildZip({
      "session.json": sessionData,
      "session_metadata.csv": "Tool_Name\nTestSearch",
      "rubric_scores.csv": "Question_ID\nTR-1",
    });

    const imported = await importSessionFromZip(blob);
    expect(imported.metadata).toEqual(metadata);
    expect(imported.captures).toEqual(captures);
    expect(imported.evaluations).toEqual(evaluations);
    expect(imported.finalization).toEqual(finalization);
  });

  // --- Evidence reassembly cascade tests ---

  // 10. Reassembly: captures without blobs are populated from root-level evidence files
  it("reassembles screenshot and HTML from root-level evidence files", async () => {
    const metadata = makeMetadata();
    const captureId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const sid = "aaaaaaaa"; // first 8 hex chars of UUID

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
          },
        ],
        evaluations: [],
      },
      [`${sid}.jpg`]: "fake-jpeg-data",
      [`${sid}.html`]: "<html><body>Captured page</body></html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toBe("data:image/jpeg;base64,ZmFrZS1qcGVnLWRhdGE=");
    expect(result.captures[0].htmlContent).toBe("<html><body>Captured page</body></html>");
  });

  // 11. Reassembly cascade: tries e/ folder when root files missing
  it("falls back to e/ folder when root evidence files absent", async () => {
    const metadata = makeMetadata();
    const captureId = "12345678-abcd-efgh-ijkl-mnopqrstuvwx";
    const sid = "12345678";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
          },
        ],
        evaluations: [],
      },
      [`e/${sid}.jpg`]: "fake-jpeg",
      [`e/${sid}.html`]: "<html>e-folder</html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toContain("data:image/jpeg;base64,");
    expect(result.captures[0].htmlContent).toBe("<html>e-folder</html>");
  });

  // 12. Reassembly cascade: tries evidence/ folder
  it("falls back to evidence/ folder with short ID", async () => {
    const metadata = makeMetadata();
    const captureId = "abcdef01-2345-6789-abcd-ef0123456789";
    const sid = "abcdef01";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
          },
        ],
        evaluations: [],
      },
      [`evidence/${sid}.jpg`]: "ev-jpeg",
      [`evidence/${sid}.html`]: "<html>evidence-folder</html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toContain("data:image/jpeg;base64,");
    expect(result.captures[0].htmlContent).toBe("<html>evidence-folder</html>");
  });

  // 13. Reassembly cascade: tries evidence/ with full UUID
  it("falls back to evidence/ with full UUID when short ID not found", async () => {
    const metadata = makeMetadata();
    const captureId = "deadbeef-0000-0000-0000-000000000000";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
          },
        ],
        evaluations: [],
      },
      [`evidence/${captureId}.jpg`]: "full-uuid-jpeg",
      [`evidence/${captureId}.html`]: "<html>full-uuid</html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toContain("data:image/jpeg;base64,");
    expect(result.captures[0].htmlContent).toBe("<html>full-uuid</html>");
  });

  // 14. Reassembly cascade: tries legacy capture_ prefix
  it("falls back to evidence/capture_ prefix for oldest exports", async () => {
    const metadata = makeMetadata();
    const captureId = "cafecafe-1111-2222-3333-444444444444";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
          },
        ],
        evaluations: [],
      },
      [`evidence/capture_${captureId}.jpg`]: "legacy-jpeg",
      [`evidence/capture_${captureId}.html`]: "<html>legacy</html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toContain("data:image/jpeg;base64,");
    expect(result.captures[0].htmlContent).toBe("<html>legacy</html>");
  });

  // 15. Reassembly cascade: tries PNG when JPG not found
  it("falls back to PNG when JPG files not found", async () => {
    const metadata = makeMetadata();
    const captureId = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
    const sid = "bbbbbbb" + "b"; // 8 chars

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
          },
        ],
        evaluations: [],
      },
      [`${sid}.png`]: "fake-png-data",
      [`${sid}.html`]: "<html>png-page</html>",
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toBe("data:image/png;base64,ZmFrZS1wbmctZGF0YQ==");
    expect(result.captures[0].htmlContent).toBe("<html>png-page</html>");
  });

  // 16. Captures with existing blobs are left untouched
  it("skips reassembly when capture already has screenshotBase64", async () => {
    const metadata = makeMetadata();
    const captureId = "11111111-2222-3333-4444-555555555555";

    const blob = await buildZip({
      "session.json": {
        metadata,
        captures: [
          {
            id: captureId,
            timestamp: "2025-01-01",
            sourceUrl: "https://example.com",
            pageTitle: "Test",
            screenshotBase64: "data:image/png;base64,EXISTING",
            htmlContent: "<html>existing</html>",
          },
        ],
        evaluations: [],
      },
    });

    const result = await importSessionFromZip(blob);
    expect(result.captures[0].screenshotBase64).toBe("data:image/png;base64,EXISTING");
    expect(result.captures[0].htmlContent).toBe("<html>existing</html>");
  });

  // --- ZIP bomb protection ---

  it("rejects oversized input blob (>200 MB)", async () => {
    const blob = new Blob(["x"]);
    Object.defineProperty(blob, "size", { value: 201 * 1024 * 1024 });
    await expect(importSessionFromZip(blob)).rejects.toThrow(/too large/i);
  });

  it("rejects input blob at exactly 200 MB plus one byte", async () => {
    const blob = new Blob(["x"]);
    Object.defineProperty(blob, "size", { value: 200 * 1024 * 1024 + 1 });
    await expect(importSessionFromZip(blob)).rejects.toThrow(/too large/i);
  });

  it("accepts input blob at exactly 200 MB", async () => {
    const metadata = makeMetadata();
    const zip = new JSZip();
    zip.file("session.json", JSON.stringify({ metadata, captures: [], evaluations: [] }));
    const blob = await zip.generateAsync({ type: "blob" });
    Object.defineProperty(blob, "size", { value: 200 * 1024 * 1024 });
    const result = await importSessionFromZip(blob);
    expect(result.metadata).toEqual(metadata);
  });
});
