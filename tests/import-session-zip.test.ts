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
    expect((result as unknown as Record<string, unknown>)["extraField"]).toBe("should be fine");
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
});
