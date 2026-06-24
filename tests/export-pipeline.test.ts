// @vitest-environment jsdom
import type { ParseResult } from "papaparse";
import Papa from "papaparse";
import { describe, expect, it, vi } from "vitest";
import { prepareExportArtifacts, sanitizeFilename, shortId } from "@/lib/export-pipeline";
import { makeCapture, makeFinalization, makeMetadata, RUBRIC } from "./fixtures";

vi.mock("@/lib/html-report", () => ({
  buildHtmlReport: vi.fn().mockResolvedValue("<html>report</html>"),
  buildNutritionLabel: vi.fn().mockResolvedValue("<html>label</html>"),
  buildBusinessCardLabel: vi.fn().mockResolvedValue("<html>card</html>"),
  buildBusinessCardSheet: vi
    .fn()
    .mockResolvedValue({ front: "<html>sheet-front</html>", back: "<html>sheet-back</html>" }),
}));

vi.mock("@/lib/screenshot-store", () => ({
  loadAllScreenshots: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock("@/lib/image-convert", () => ({
  pngToJpeg: vi.fn().mockResolvedValue({ dataUrl: "data:image/jpeg;base64,AAA=" }),
}));

vi.mock("@/lib/logos", () => ({
  TRUST_LOGO: "data:image/png;base64,LOGO1",
  LISA_EIS_LOGO: "data:image/png;base64,LOGO2",
  UT_LOGO: "data:image/png;base64,LOGO3",
}));

vi.mock("@/lib/minify", () => ({
  minifyHtml: vi.fn((h: string) => h),
}));

type CsvRow = Record<string, string>;
function parseCsv(csv: string): CsvRow[] {
  return (Papa.parse(csv, { header: true }) as ParseResult<CsvRow>).data;
}

describe("sanitizeFilename", () => {
  it("replaces invalid characters with underscore", () => {
    expect(sanitizeFilename("a<b>c:d/e\\f|g?h*i")).toBe("a_b_c_d_e_f_g_h_i");
  });

  it("normalizes multiple dots", () => {
    expect(sanitizeFilename("foo...bar")).toBe("foo.bar");
  });

  it("replaces path traversal segments", () => {
    const result = sanitizeFilename("../../../etc/passwd");
    expect(result).not.toContain("..");
    expect(result).not.toMatch(/^\./);
  });

  it("returns 'review' for empty string", () => {
    expect(sanitizeFilename("")).toBe("review");
  });

  it("returns 'review' for whitespace-only string", () => {
    expect(sanitizeFilename("   ")).toBe("review");
  });
});

describe("shortId", () => {
  it("returns 8-char hex from UUID", () => {
    const id = "12345678-1234-1234-1234-123456789abc";
    expect(shortId(id)).toBe("12345678");
  });

  it("strips dashes before extracting", () => {
    expect(shortId("a1b2c3d4-e5f6-0000-0000-000000000000")).toBe("a1b2c3d4");
  });
});

describe("prepareExportArtifacts", () => {
  const metadata = makeMetadata();

  it("with empty captures and evaluations returns valid artifacts", async () => {
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, null);
    expect(result.metadataCsv).toBeTruthy();
    expect(result.scoresCsv).toBeTruthy();
    expect(result.captureLogCsv).toBeTruthy();
    expect(result.sessionJson).toBeTruthy();
    expect(result.htmlReport).toBeTruthy();
    expect(result.imageFiles).toBeInstanceOf(Map);
    expect(result.reportFilename).toContain("Evaluation_Report_");
  });

  it("metadata CSV has expected columns", async () => {
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, null);
    const rows = parseCsv(result.metadataCsv);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const row = rows[0];
    expect(row.Tool_Name).toBe(metadata.toolName);
    expect(row.Tool_URL).toBe(metadata.toolUrl);
    expect(row.Status).toBe("started");
  });

  it("scores CSV has expected columns", async () => {
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, null);
    const rows = parseCsv(result.scoresCsv);
    expect(rows.length).toBeGreaterThan(0);
    const row = rows[0];
    expect("Code" in row).toBe(true);
    expect("Category" in row).toBe(true);
    expect("Score" in row).toBe(true);
    expect("Type" in row).toBe(true);
  });

  it("capture log CSV has expected columns", async () => {
    const capture = makeCapture();
    const result = await prepareExportArtifacts(metadata, [capture], [], RUBRIC, null);
    const rows = parseCsv(result.captureLogCsv);
    expect(rows.length).toBe(1);
    expect(rows[0].Capture_ID).toBe(capture.id);
    expect(rows[0].Page_Title).toBe("Test Page");
  });

  it("session.json is valid JSON with correct structure", async () => {
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, null);
    const parsed = JSON.parse(result.sessionJson);
    expect(parsed.metadata.id).toBe(metadata.id);
    expect(parsed.captures).toEqual([]);
    expect(parsed.evaluations).toEqual([]);
    expect(parsed.finalization).toBeNull();
  });

  it("conclusions CSV is null when no finalization", async () => {
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, null);
    expect(result.conclusionsCsv).toBeNull();
  });

  it("conclusions CSV has data when finalization provided", async () => {
    const fin = makeFinalization();
    const result = await prepareExportArtifacts(metadata, [], [], RUBRIC, fin);
    expect(result.conclusionsCsv).not.toBeNull();
    const rows = parseCsv(result.conclusionsCsv!);
    expect(rows[0].Grade).toBe("pass");
    expect(rows[0].Conclusion).toBe("Test conclusion");
  });
});
