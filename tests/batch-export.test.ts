// @vitest-environment jsdom
import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportArtifacts } from "@/lib/export-pipeline";
import { assembleBatchZip } from "@/lib/export-pipeline";

// JSZip is statically imported in the source, no module mock needed.

function makeArtifacts(overrides?: Partial<ExportArtifacts>): ExportArtifacts {
  return {
    metadataCsv: "id,toolName\n1,TestTool",
    scoresCsv: "rubricId,score\nTR-1,3",
    captureLogCsv: "captureId,url\nc1,https://example.com",
    conclusionsCsv: null,
    sessionJson: JSON.stringify({ id: "test" }),
    htmlReport: "<html>report</html>",
    nutritionLabel: "<html>label</html>",
    imageFiles: new Map(),
    captureHtmlFiles: new Map(),
    reportFilename: "Evaluation_Report_Test.html",
    labelFilename: "TRUST_Label_Test.html",
    ...overrides,
  };
}

describe("assembleBatchZip", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00.000Z"));
  });

  it("creates folder per session and root manifest", async () => {
    const sessions = [
      { artifacts: makeArtifacts(), toolName: "Tool A", grade: "pass" as string | undefined },
      { artifacts: makeArtifacts(), toolName: "Tool B" },
    ];

    const blob = await assembleBatchZip(sessions);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    // Root manifest
    const manifestRaw = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.version).toBe(1);
    expect(manifest.sessionCount).toBe(2);
    expect(manifest.exportDate).toBe("2025-06-15T12:00:00.000Z");
    expect(manifest.sessions).toHaveLength(2);
    expect(manifest.sessions[0]).toEqual({ toolName: "Tool A", grade: "pass" });
    expect(manifest.sessions[1]).toEqual({ toolName: "Tool B", grade: "not finalized" });

    // Folder structure
    expect(zip.folder("Tool_A")).toBeTruthy();
    expect(zip.folder("Tool_B")).toBeTruthy();

    // Files inside each folder
    const folderA = zip.folder("Tool_A")!;
    expect(folderA.file("session_metadata.csv")).toBeTruthy();
    expect(folderA.file("rubric_scores.csv")).toBeTruthy();
    expect(folderA.file("capture_log.csv")).toBeTruthy();
    expect(folderA.file("session.json")).toBeTruthy();
    expect(folderA.file("Evaluation_Report_Test.html")).toBeTruthy();
    expect(folderA.file("TRUST_Label_Test.html")).toBeTruthy();
    // No conclusions CSV when null
    expect(folderA.file("review_conclusions.csv")).toBeNull();
  });

  it("includes conclusions CSV when present", async () => {
    const artifacts = makeArtifacts({
      conclusionsCsv: "strengths,weaknesses\nGood,Bad",
    });
    const sessions = [{ artifacts, toolName: "Concluded Tool", grade: "pass" as string | undefined }];

    const blob = await assembleBatchZip(sessions);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const folder = zip.folder("Concluded_Tool")!;
    expect(folder.file("review_conclusions.csv")).toBeTruthy();
  });

  it("includes image files inside session folder", async () => {
    const imageFiles = new Map<string, string>();
    imageFiles.set("img/screenshot.jpg", "base64data");
    const artifacts = makeArtifacts({ imageFiles });
    const sessions = [{ artifacts, toolName: "WithImages", grade: undefined }];

    const blob = await assembleBatchZip(sessions);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const folder = zip.folder("WithImages")!;
    expect(folder.file("img/screenshot.jpg")).toBeTruthy();
  });
});
