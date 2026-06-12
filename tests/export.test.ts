import type { ParseResult } from "papaparse";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import trustFull from "@/data/rubrics/trust-full.json";
import { exportSession } from "@/lib/export";
import { buildHtmlReport } from "@/lib/html-report";
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

/** Unzip a Blob into a Map<path, string|Uint8Array>. */
async function unzipToMap(blob: Blob): Promise<Map<string, string | Uint8Array>> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const files = new Map<string, string | Uint8Array>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const data = await entry.async("uint8array");
    // Heuristic: treat non-binary-looking content as text
    const isText = /\.(html?|csv|json|txt|md)$/i.test(path);
    files.set(path, isText ? new TextDecoder().decode(data) : data);
  }
  return files;
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

    expect(files.has("cap001.png")).toBe(true);
    expect(files.has("cap001.html")).toBe(true);
    expect(files.has("cap002.png")).toBe(true);
    expect(files.has("cap002.html")).toBe(true);

    const html = files.get("cap001.html") as string;
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
    expect(rows).toHaveLength(14); // All rubric questions included

    const row1 = rows.find((r) => r.Question_ID === "TR.data_source_clarity");
    expect(row1?.Score).toBe("2");
    expect(row1?.Notes).toBe("Good coverage");
    expect(row1?.Category).toBe("TR — Transparent");
    expect(row1?.Title).toBe("Data source clarity");
    expect(row1?.Type).toBe("scoring");
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
    const row = rows.find((r) => r.Question_ID === "TR.data_source_clarity");
    expect(row?.Linked_Capture_IDs).toBe("cap-001; cap-002");
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
    const row = rows.find((r) => r.Question_ID === "TR.data_source_clarity");
    expect(row?.Linked_Capture_IDs).toBe("cap-001");
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
    expect(html).toContain("<style>");
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
    expect(row?.Score).toBe("N/A");

    const html = files.get("Evaluation_Report_TestSearch.html") as string;
    expect(html).toContain("N/A");
  });

  it("joins discipline array with semicolons in CSV", async () => {
    const metadata = makeMetadata({ discipline: ["Physics", "Mathematics"] });
    const blob = await exportSession(metadata, [], [], RUBRIC);
    const files = await unzipToFiles(blob);
    const csv = files.get("session_metadata.csv") as string;
    expect(csv).toBeDefined();

    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].Discipline).toBe("Physics; Mathematics");
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
    expect(html).toContain("CAUTION");
    expect(html).toContain("Needs improvement");
    expect(html).toContain("Limited docs");
  });

  it("succeeds with empty captures and no capture-derived image files in ZIP", async () => {
    const blob = await exportSession(makeMetadata(), [], [], RUBRIC);
    const files = await unzipToFiles(blob);

    // No capture-derived images should exist — only logos (semantic names)
    const captureImages = [...files.keys()].filter(
      (k) =>
        (k.endsWith(".jpg") || k.endsWith(".png")) &&
        !["trust-logo.jpg", "lisa-eis-logo.jpg", "ut-logo.jpg"].includes(k),
    );
    expect(captureImages).toHaveLength(0);

    // ZIP should still contain core files
    expect(files.has("session_metadata.csv")).toBe(true);
    expect(files.has("rubric_scores.csv")).toBe(true);
    expect(files.has("session.json")).toBe(true);
  });

  it("handles missing optional metadata fields", async () => {
    const metadata = makeMetadata({
      company: undefined,
      pricing: undefined,
      availability: undefined,
      termsConditionsUrl: undefined,
      authenticationMethod: undefined,
      dataSources: undefined,
      searchMethods: undefined,
      discipline: undefined,
      notes: undefined,
      toolLogoUrl: undefined,
      description: undefined,
    });

    const blob = await exportSession(metadata, [], [], RUBRIC);
    const files = await unzipToFiles(blob);

    const csv = files.get("session_metadata.csv") as string;
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].Company).toBe("");
    expect(rows[0].Pricing).toBe("");
    expect(rows[0].Discipline).toBe("");
    expect(rows[0].Notes).toBe("");

    // HTML report should still be generated
    const html = files.get("Evaluation_Report_TestSearch.html") as string;
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("sanitizes special characters in tool name for filenames", async () => {
    const toolName = `Tool<>&"'Test`;
    const blob = await exportSession(makeMetadata({ toolName }), [], [], RUBRIC);
    const files = await unzipToFiles(blob);

    // Filenames should use sanitized name (special chars replaced with _)
    const reportFile = [...files.keys()].find((k) => k.startsWith("Evaluation_Report_"));
    expect(reportFile).toBeDefined();
    /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
    expect(reportFile!).not.toContain("<");
    /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
    expect(reportFile!).not.toContain(">");
    // & and ' are valid in filenames — only <, >, " are stripped
    /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
    expect(reportFile!).not.toContain('"');

    // HTML report should not contain raw injection from tool name
    /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
    const html = files.get(reportFile!) as string;
    expect(html).not.toContain("<script>");
    expect(html).toContain("Tool");
  });

  it("handles very long tool name in filenames", async () => {
    const toolName = "A".repeat(300);
    const blob = await exportSession(makeMetadata({ toolName }), [], [], RUBRIC);
    const files = await unzipToFiles(blob);

    const reportFile = [...files.keys()].find((k) => k.startsWith("Evaluation_Report_"));
    expect(reportFile).toBeDefined();

    // The filename should exist and be reasonable length (no OS path overflow)
    /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
    expect(reportFile!.length).toBeLessThan(350);

    // ZIP should still be valid
    expect(files.has("session.json")).toBe(true);
  });

  it("excludes AI-only questions from report when usesAi is false", async () => {
    const metadata = makeMetadata({ usesAi: false });

    // Score some non-AI questions so the report has content
    const evaluations: Evaluation[] = [
      {
        rubricId: "TR.data_source_clarity",
        score: 2,
        notes: "Good",
        explicitEvidenceIds: [],
      },
      {
        rubricId: "US.workflow_integration",
        score: 3,
        notes: "Excellent",
        explicitEvidenceIds: [],
      },
    ];

    const blob = await exportSession(metadata, [], evaluations, RUBRIC);
    const files = await unzipToFiles(blob);
    const html = files.get("Evaluation_Report_TestSearch.html") as string;

    // AI-only question titles should NOT appear in the report
    expect(html).not.toContain("AI model training policy");
    expect(html).not.toContain("Methodology disclosure");
    expect(html).not.toContain("Accuracy and hallucination");
    expect(html).not.toContain("Critical thinking prompts");

    // Non-AI questions should still appear
    // Non-AI questions should still appear (by code in the report)
    expect(html).toContain("TR1"); // Data source clarity
    expect(html).toContain("US1"); // Workflow integration

    // Metadata should indicate AI-powered: No
    expect(html).toContain("AI-powered");
    expect(html).toContain('muted">No</');
  });
});

describe("buildHtmlReport", () => {
  it("produces valid HTML with tool name", async () => {
    const html = await buildHtmlReport(makeMetadata(), [], [], RUBRIC);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("TestSearch");
    expect(html).toContain("NOT EVALUATED");
    expect(html).toContain("</html>");
  });

  it("includes evaluation scores with color coding", async () => {
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "Excellent", explicitEvidenceIds: [] },
      { rubricId: "RE.result_accuracy", score: 1, notes: "Needs work", explicitEvidenceIds: [] },
    ];
    const html = await buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC);
    expect(html).toContain("#3d7249");
    expect(html).toContain("#c2410c");
  });

  it("renders finalization verdict", async () => {
    const finalization = {
      grade: "pass" as const,
      conclusion: "Solid tool",
      strengths: ["Good docs"],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };
    const html = await buildHtmlReport(makeMetadata(), [], [], RUBRIC, finalization);
    expect(html).toContain("RECOMMENDED");
    expect(html).toContain("Solid tool");
    expect(html).toContain("Good docs");
  });

  it("renders evidence images linked to evaluations", async () => {
    const c = makeCapture({ id: "cap-001", pageTitle: "Results Page" });
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: ["cap-001"] },
    ];
    const html = await buildHtmlReport(makeMetadata(), [c], evaluations, RUBRIC);
    expect(html).toContain("Results Page");
    expect(html).toContain("evidence-item");
  });

  it("escapes HTML in user-generated content", async () => {
    const html = await buildHtmlReport(
      makeMetadata({ notes: '<script>alert("xss")</script>' }),
      [],
      [],
      RUBRIC,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

import { sanitizeFilename } from "@/lib/export";

describe("sanitizeFilename", () => {
  it("passes through safe names unchanged", () => {
    expect(sanitizeFilename("MyTool")).toBe("MyTool");
    expect(sanitizeFilename("Google Search")).toBe("Google Search");
    expect(sanitizeFilename("tool-v2")).toBe("tool-v2");
  });

  it("replaces path separators", () => {
    expect(sanitizeFilename("foo/bar")).toBe("foo_bar");
    expect(sanitizeFilename("foo\\bar")).toBe("foo_bar");
    expect(sanitizeFilename("../../evil")).toBe("_._evil");
  });

  it("replaces Windows-invalid characters", () => {
    expect(sanitizeFilename('a<b>c:d"e|f?g*h')).toBe("a_b_c_d_e_f_g_h");
  });

  it("strips leading dots", () => {
    expect(sanitizeFilename(".hidden")).toBe("hidden");
    expect(sanitizeFilename("..parent")).toBe("parent");
  });

  it("collapses multiple dots", () => {
    expect(sanitizeFilename("foo...bar")).toBe("foo.bar");
  });

  it("returns fallback for empty/whitespace-only names", () => {
    expect(sanitizeFilename("")).toBe("review");
    expect(sanitizeFilename("   ")).toBe("review");
  });

  it("strips null bytes and control characters", () => {
    expect(sanitizeFilename("foo\x00bar\x01baz")).toBe("foo_bar_baz");
  });
});

describe("exportSession with reviewer", () => {
  it("includes reviewer name and email in CSV and HTML report", async () => {
    const meta = makeMetadata({ toolName: "ReviewerTest" });
    const cap = makeCapture();
    const evals: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
    ];
    const reviewer = { name: "Jane Doe", email: "jane@example.com" };

    const blob = await exportSession(meta, [cap], evals, RUBRIC, null, undefined, reviewer);
    const files = await unzipToMap(blob);

    // session_metadata.csv should contain reviewer columns
    const csv = files.get("session_metadata.csv");
    expect(csv).toBeDefined();
    expect(typeof csv).toBe("string");
    expect(csv!).toContain("Jane Doe");
    expect(csv!).toContain("jane@example.com");

    // HTML report should contain reviewer info
    const html = files.get("Evaluation_Report_ReviewerTest.html");
    expect(html).toBeDefined();
    expect(typeof html).toBe("string");
    expect(html!).toContain("Jane Doe");
    expect(html!).toContain("jane@example.com");
  });

  it("omits reviewer section when no reviewer provided", async () => {
    const meta = makeMetadata({ toolName: "NoReviewer" });
    const cap = makeCapture();
    const evals: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
    ];

    const blob = await exportSession(meta, [cap], evals, RUBRIC);
    const files = await unzipToMap(blob);

    const csv = files.get("session_metadata.csv") as string;
    expect(csv).toBeDefined();
    // CSV header should still have the columns, but values empty
    const rows = parseCsv(csv);
    expect(rows[0].Reviewer_Name).toBe("");
    expect(rows[0].Reviewer_Email).toBe("");
  });
});
