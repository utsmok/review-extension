// @vitest-environment jsdom
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { ExportArtifacts } from "@/lib/export-pipeline";
import { assembleBatchZip } from "@/lib/export-pipeline";

function makeArtifacts(overrides?: Partial<ExportArtifacts>): ExportArtifacts {
  return {
    metadataCsv: "id,toolName\n1,TestTool",
    scoresCsv: "rubricId,score\nTR-1,3",
    captureLogCsv: "captureId,url\nc1,https://example.com",
    conclusionsCsv: null,
    sessionJson: JSON.stringify({ id: "test" }),
    htmlReport: "<html>report</html>",
    nutritionLabel: "<html>label</html>",
    businessCardLabel: "<html>card</html>",
    businessCardSheetFront: "<html>sheet-front</html>",
    businessCardSheetBack: "<html>sheet-back</html>",
    imageFiles: new Map(),
    captureHtmlFiles: new Map(),
    reportFilename: "Evaluation_Report_Test.html",
    labelFilename: "TRUST_Label_Test.html",
    cardFilename: "Test-card.html",
    cardSheetFrontFilename: "Test-card-front-A3.html",
    cardSheetBackFilename: "Test-card-back-A3.html",
    ...overrides,
  };
}

describe("assembleBatchZip", () => {
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
    expect(manifest.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(manifest.sessions).toHaveLength(2);
    expect(manifest.sessions[0]).toEqual({ toolName: "Tool A", grade: "pass" });
    expect(manifest.sessions[1]).toEqual({ toolName: "Tool B", grade: "not finalized" });

    // Folder structure — spaces preserved by sanitizeFilename
    expect(zip.folder("Tool A")).toBeDefined();
    expect(zip.folder("Tool B")).toBeDefined();

    // Files inside each folder
    const folderA = zip.folder("Tool A")!;
    expect(folderA.file("session_metadata.csv")).not.toBeNull();
    expect(folderA.file("rubric_scores.csv")).not.toBeNull();
    expect(folderA.file("capture_log.csv")).not.toBeNull();
    expect(folderA.file("session.json")).not.toBeNull();
    expect(folderA.file("Evaluation_Report_Test.html")).not.toBeNull();
    expect(folderA.file("TRUST_Label_Test.html")).not.toBeNull();
    // No conclusions CSV when null
    expect(folderA.file("review_conclusions.csv")).toBeNull();
  });

  it("includes conclusions CSV when present", async () => {
    const artifacts = makeArtifacts({
      conclusionsCsv: "strengths,weaknesses\nGood,Bad",
    });
    const sessions = [
      { artifacts, toolName: "Concluded Tool", grade: "pass" as string | undefined },
    ];

    const blob = await assembleBatchZip(sessions);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const folder = zip.folder("Concluded Tool")!;
    expect(folder.file("review_conclusions.csv")).not.toBeNull();
  });

  it("includes capture HTML files inside session folder", async () => {
    const captureHtmlFiles = new Map<string, string>();
    captureHtmlFiles.set("abc12345.html", "<html>capture</html>");
    const artifacts = makeArtifacts({ captureHtmlFiles });
    const sessions = [{ artifacts, toolName: "WithCaptures", grade: undefined }];

    const blob = await assembleBatchZip(sessions);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const folder = zip.folder("WithCaptures")!;
    expect(folder.file("abc12345.html")).not.toBeNull();
  });
});
