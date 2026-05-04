import type { ParseResult } from "papaparse";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { exportSession } from "@/lib/export";
import { buildHtmlReport } from "@/lib/html-report";
import trustFull from "@/data/rubrics/trust-full.json";
import type { Capture, Evaluation, RubricData, SessionMetadata } from "@/lib/types";

const RUBRIC = trustFull as unknown as RubricData;

type CsvRow = Record<string, string>;

function parseCsv(csv: string): CsvRow[] {
  return (Papa.parse(csv, { header: true }) as ParseResult<CsvRow>).data;
}

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "TestSearch",
    toolUrl: "https://testsearch.example.com",
    startTime: "2025-06-15T10:00:00.000Z",
    company: "TestCorp",
    pricing: "Free",
    status: "started",
    ...overrides,
  };
}

// Minimal 1x1 transparent PNG as base64
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: crypto.randomUUID(),
    timestamp: "2025-06-15T10:01:00.000Z",
    sourceUrl: "https://testsearch.example.com/results?q=test",
    pageTitle: "Test Page",
    screenshotBase64: TINY_PNG,
    htmlContent: "<html><body>Test page</body></html>",
    notes: "",
    ...overrides,
  };
}

async function unzipToFiles(blob: Blob): Promise<Map<string, string | Uint8Array>> {
  const JSZip = (await import("jszip")).default;
  const arrayBuffer = await blob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const files = new Map<string, string | Uint8Array>();

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (path.endsWith(".csv") || path.endsWith(".html") || path.endsWith(".json") || path.endsWith(".svg")) {
      files.set(path, await entry.async("string"));
    } else {
      files.set(path, await entry.async("uint8array"));
    }
  }

  return files;
}

describe("exportSession", () => {
  it("produces a valid zip blob", async () => {
    const blob = await exportSession(makeMetadata(), [], [], RUBRIC);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(["", "application/zip"]).toContain(blob.type);
  });

  it("includes session_metadata.csv with tool info", async () => {
    const blob = await exportSession(makeMetadata({ company: "TestCorp" }), [], [], RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("session_metadata.csv") as string;
    expect(csv).toBeDefined();

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].Tool_Name).toBe("TestSearch");
    expect(rows[0].Tool_URL).toBe("https://testsearch.example.com");
    expect(rows[0].Company).toBe("TestCorp");
  });

  it("includes evidence files for each capture", async () => {
    const c1 = makeCapture({ id: "cap-001" });
    const c2 = makeCapture({ id: "cap-002" });

    const blob = await exportSession(makeMetadata(), [c1, c2], [], RUBRIC);
    const files = await unzipToFiles(blob);

    expect(files.has("evidence/capture_cap-001.png")).toBe(true);
    expect(files.has("evidence/capture_cap-001.html")).toBe(true);
    expect(files.has("evidence/capture_cap-002.png")).toBe(true);
    expect(files.has("evidence/capture_cap-002.html")).toBe(true);

    const html = files.get("evidence/capture_cap-001.html") as string;
    expect(html).toContain("<html>");
  });

  it("includes rubric_scores.csv with evaluations", async () => {
    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: 2,
        notes: "Good coverage",
        explicitEvidenceIds: [],
      },
      {
        rubricId: "privacy_and_security.data_privacy",
        score: "pass",
        notes: "",
        explicitEvidenceIds: [],
      },
    ];

    const blob = await exportSession(makeMetadata(), [], evaluations, RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("rubric_scores.csv") as string;

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);

    const row1 = rows.find((r) => r.Question_ID === "TR.data_source_clarity");
    expect(row1!.Score).toBe("2");
    expect(row1!.Notes).toBe("Good coverage");
    expect(row1!.Rubric_Category).toBe("TR — Transparent");
  });

  it("populates Linked_Capture_IDs from explicitEvidenceIds", async () => {
    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: 3,
        notes: "",
        explicitEvidenceIds: ["cap-001", "cap-002"],
      },
    ];

    const blob = await exportSession(makeMetadata(), [], evaluations, RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("rubric_scores.csv") as string;

    const rows = parseCsv(csv);
    expect(rows[0].Linked_Capture_IDs).toBe("cap-001; cap-002");
  });

  it("populates Linked_Capture_IDs from explicitEvidenceIds only", async () => {
    const c1 = makeCapture({ id: "cap-001" });

    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: 2,
        notes: "",
        explicitEvidenceIds: ["cap-001"],
      },
    ];

    const blob = await exportSession(makeMetadata(), [c1], evaluations, RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("rubric_scores.csv") as string;

    const rows = parseCsv(csv);
    expect(rows[0].Linked_Capture_IDs).toBe("cap-001");
  });

  it("includes capture_log.csv with capture details", async () => {
    const c = makeCapture({
      id: "cap-001",
      notes: "Homepage screenshot",
    });

    const blob = await exportSession(makeMetadata(), [c], [], RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("capture_log.csv") as string;

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].Capture_ID).toBe("cap-001");
    expect(rows[0].User_Notes).toBe("Homepage screenshot");
  });

  it("includes an HTML report", async () => {
    const blob = await exportSession(makeMetadata(), [], [], RUBRIC);
    const files = await unzipToFiles(blob);

    const htmlPath = "Evaluation_Report_TestSearch.html";
    expect(files.has(htmlPath)).toBe(true);

    const html = files.get(htmlPath) as string;
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("TestSearch");
    expect(html).toContain("TRUST");
    expect(html).toContain("@media print");
  });

  it("handles empty session (no captures, no evaluations)", async () => {
    const blob = await exportSession(makeMetadata(), [], [], RUBRIC);
    const files = await unzipToFiles(blob);

    expect(files.has("session_metadata.csv")).toBe(true);
    expect(files.has("rubric_scores.csv")).toBe(true);
    expect(files.has("capture_log.csv")).toBe(true);
    expect(files.has("Evaluation_Report_TestSearch.html")).toBe(true);

    const captureCsv = files.get("capture_log.csv") as string;
    const rows = parseCsv(captureCsv);
    expect(rows).toHaveLength(0);
  });

  it("handles N/A scores in CSV and HTML report", async () => {
    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.methodology_disclosure",
        score: "na",
        notes: "Non-AI tool",
        explicitEvidenceIds: [],
      },
    ];

    const blob = await exportSession(makeMetadata({ usesAi: false }), [], evaluations, RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("rubric_scores.csv") as string;

    const rows = parseCsv(csv);
    const row = rows.find((r) => r.Question_ID === "TR.methodology_disclosure");
    expect(row!.Score).toBe("na");

    const html = files.get("Evaluation_Report_TestSearch.html") as string;
    expect(html).toContain("N/A");
  });

  it("includes review_conclusions.csv when finalization is provided", async () => {
    const finalization = {
      grade: "pass" as const,
      conclusion: "Solid tool overall",
      strengths: ["Transparent methodology", "Good documentation"],
      weaknesses: ["Slow response times"],
      recommendations: "Improve performance",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };

    const blob = await exportSession(makeMetadata(), [], [], RUBRIC, finalization);
    const files = await unzipToFiles(blob);
    const csv = files.get("review_conclusions.csv") as string;
    expect(csv).toBeDefined();

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].Grade).toBe("pass");
    expect(rows[0].Conclusion).toBe("Solid tool overall");
    expect(rows[0].Strengths).toBe("Transparent methodology; Good documentation");
    expect(rows[0].Weaknesses).toBe("Slow response times");
  });

  it("does not include review_conclusions.csv when no finalization", async () => {
    const blob = await exportSession(makeMetadata(), [], [], RUBRIC);
    const files = await unzipToFiles(blob);
    expect(files.has("review_conclusions.csv")).toBe(false);
  });

  it("includes finalization grade in HTML report", async () => {
    const finalization = {
      grade: "conditional" as const,
      conclusion: "Needs improvement",
      strengths: [],
      weaknesses: ["Limited docs"],
      recommendations: "Add documentation",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };

    const blob = await exportSession(makeMetadata(), [], [], RUBRIC, finalization);
    const files = await unzipToFiles(blob);
    const html = files.get("Evaluation_Report_TestSearch.html") as string;
    expect(html).toContain("CONDITIONAL");
    expect(html).toContain("Needs improvement");
    expect(html).toContain("Limited docs");
  });

});

describe("buildHtmlReport", () => {
  it("produces valid HTML with tool name", () => {
    const html = buildHtmlReport(makeMetadata(), [], [], RUBRIC);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("TestSearch");
    expect(html).toContain("Quality Gate Status");
    expect(html).toContain("</html>");
  });

  it("includes evaluation scores with color coding", () => {
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "Excellent", explicitEvidenceIds: [] },
      { rubricId: "RE.result_accuracy", score: 1, notes: "Needs work", explicitEvidenceIds: [] },
    ];
    const html = buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC);
    expect(html).toContain("#4a8355");
    expect(html).toContain("#ea580c");
  });

  it("renders finalization verdict", () => {
    const finalization = {
      grade: "pass" as const,
      conclusion: "Solid tool",
      strengths: ["Good docs"],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };
    const html = buildHtmlReport(makeMetadata(), [], [], RUBRIC, finalization);
    expect(html).toContain("PASSED");
    expect(html).toContain("Solid tool");
    expect(html).toContain("Good docs");
  });

  it("renders evidence images linked to evaluations", () => {
    const c = makeCapture({ id: "cap-001", pageTitle: "Results Page" });
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: ["cap-001"] },
    ];
    const html = buildHtmlReport(makeMetadata(), [c], evaluations, RUBRIC);
    expect(html).toContain("Results Page");
    expect(html).toContain("evidence-item");
  });

  it("escapes HTML in user-generated content", () => {
    const html = buildHtmlReport(
      makeMetadata({ notes: '<script>alert("xss")</script>' }),
      [],
      [],
      RUBRIC,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
