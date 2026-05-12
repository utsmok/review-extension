import { getCategoryLabel } from "./rubric";
import { buildHtmlReport, buildNutritionLabel } from "./html-report";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

/**
 * Sanitize a string for use as a filename. Strips path separators, parent
 * directory references, and characters invalid on Windows.
 *
 * Used at the export/download boundary to prevent path traversal in ZIP
 * entry names and download filenames.
 */
export function sanitizeFilename(name: string): string {
  // biome-ignore lint/complexity/useRegexLiterals: must use RegExp constructor to avoid noControlCharactersInRegex
  const INVALID_CHARS = new RegExp('[<>:"/\\\\|?*\u0000-\u001F]', "g");
  return (
    name.replace(INVALID_CHARS, "_").replace(/\.+/g, ".").replace(/^\.+/, "").trim() || "review"
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Strip whitespace, comments, and optional closing tags from HTML output for smaller ZIP entries. */
function minifyHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(?:li|dt|dd|p|tr|td|th|thead|tbody|tfoot|colgroup|option|optgroup)>/gi, "")
    .replace(/\n\s*\n/g, "\n")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .replace(/ (<|\/>)/g, "$1")
    .trim();
}

/** Strip whitespace and comments from CSS for smaller ZIP entries. */
function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // remove block comments
    .replace(/\/\/.*$/gm, "") // remove line comments
    .replace(/\s*([{}:;,])\s*/g, "$1") // strip around delimiters
    .replace(/;\}/g, "}") // remove trailing semicolons
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
// Cached dynamic imports
let cachedJSZip: typeof import("jszip") | null = null;
let cachedPapa: typeof import("papaparse") | null = null;

export async function exportSession(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<Blob> {
  if (!cachedJSZip) cachedJSZip = (await import("jszip")).default;
  const JSZip = cachedJSZip;

  if (!cachedPapa) cachedPapa = (await import("papaparse")).default;
  const Papa = cachedPapa;

  const zip = new JSZip();
  // biome-ignore lint/style/noNonNullAssertion: JSZip always returns
  const evidenceFolder = zip.folder("e")!;

  const imgExtensions = new Map<string, "jpg" | "png">();
  const { pngToJpeg } = await import("./image-convert");

  /** Short ID: first 8 hex chars of capture UUID, unique within a session. */
  const shortId = (id: string) => id.replace(/-/g, "").substring(0, 8);
  const idMap = new Map(captures.map((c) => [c.id, shortId(c.id)]));

  for (const capture of captures) {
    const sid = idMap.get(capture.id)!;
    const { dataUrl: converted, extension } = await pngToJpeg(capture.screenshotBase64, 0.8);
    const base64Data = converted.split(",")[1] ?? "";
    evidenceFolder.file(`${sid}.${extension}`, base64Data, {
      base64: true,
    });
    evidenceFolder.file(`${sid}.html`, capture.htmlContent);
    imgExtensions.set(capture.id, extension);
  }

  // Build capture map for HTML reports: reference evidence/ files instead of embedding base64
  const capturePathMap = new Map(
    captures.map((c) => [c.id, `e/${idMap.get(c.id)}.${imgExtensions.get(c.id) ?? "png"}`]),
  );
  const capturesWithPaths = captures.map((c) => ({
    ...c,
    screenshotBase64: capturePathMap.get(c.id) ?? c.screenshotBase64,
  }));

  // Extract shared CSS to a single file instead of duplicating in each HTML report
  const { REPORT_CSS } = await import("./html-report");
  zip.file("report.css", minifyCss(REPORT_CSS));
  zip.file(
    "session_metadata.csv",
    Papa.unparse([
      {
        Tool_Name: metadata.toolName,
        Tool_URL: metadata.toolUrl,
        Start_Time: metadata.startTime,
        Uses_AI: String(metadata.usesAi ?? true),
        Rubric_Variant: metadata.rubricId ?? "trust-full",
        Company: metadata.company ?? "",
        Pricing: metadata.pricing ?? "",
        Availability: metadata.availability ?? "",
        Terms_Conditions_URL: metadata.termsConditionsUrl ?? "",
        Data_Sources: (metadata.dataSources ?? []).join("; "),
        Search_Methods: (metadata.searchMethods ?? []).join("; "),
        Discipline: metadata.discipline ?? "",
        Notes: metadata.notes ?? "",
        Tool_Logo_URL: metadata.toolLogoUrl ?? "",
        Tool_Description: metadata.description ?? "",
      },
    ]),
  );

  zip.file(
    "rubric_scores.csv",
    Papa.unparse(
      evaluations.map((e) => {
        const [category] = e.rubricId.split(".");
        return {
          Rubric_Category: getCategoryLabel(category),
          Question_ID: e.rubricId,
          Score: String(e.score),
          Notes: e.notes,
          Custom_Reasoning: e.customScore?.reasoning ?? "",
          Linked_Capture_IDs: e.explicitEvidenceIds.join("; "),
        };
      }),
    ),
  );

  zip.file(
    "capture_log.csv",
    Papa.unparse(
      captures.map((c) => ({
        Capture_ID: c.id,
        Timestamp: c.timestamp,
        Page_Title: c.pageTitle,
        URL_Captured: c.sourceUrl,
        User_Notes: c.notes,
        Tagged_Rubric_IDs: evaluations
          .filter((e) => e.explicitEvidenceIds.includes(c.id))
          .map((e) => e.rubricId)
          .join("; "),
      })),
    ),
  );

  if (finalization) {
    zip.file(
      "review_conclusions.csv",
      Papa.unparse([
        {
          Grade: finalization.grade,
          Conclusion: finalization.conclusion,
          Strengths: finalization.strengths.join("; "),
          Weaknesses: finalization.weaknesses.join("; "),
          Recommendations: finalization.recommendations,
          Finalized_At: finalization.finalizedAt,
        },
      ]),
    );
  }

  // Full session data for re-import — strip heavy capture blobs since they're
  // already stored as separate files in evidence/. Import reassembles from there.
  const lightweightCaptures = captures.map((c) => {
    const entry: Record<string, unknown> = {
      id: c.id,
      timestamp: c.timestamp,
      sourceUrl: c.sourceUrl,
      pageTitle: c.pageTitle,
    };
    if (c.notes) entry.notes = c.notes;
    return entry;
  });
  const sessionData: import("./types").SessionData = {
    metadata,
    captures: lightweightCaptures as unknown as import("./types").Capture[],
    evaluations,
    finalization,
  };
  zip.file("session.json", JSON.stringify(sessionData));

  // Extract logo files as JPEG — avoid embedding 17KB+ of base64 in both HTML reports
  const { TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO } = await import("./logos");
  const logoReplacements: [string, string][] = [];
  for (const [name, dataUrl] of [
    ["1.jpg", TRUST_LOGO],
    ["2.jpg", LISA_EIS_LOGO],
    ["3.jpg", UT_LOGO],
  ] as const) {
    const { dataUrl: jpegUrl } = await pngToJpeg(dataUrl, 0.95);
    const base64 = jpegUrl.split(",")[1] ?? "";
    zip.file(name, base64, { base64: true });
    logoReplacements.push([dataUrl, name]);
  }

  const replaceLogos = (html: string) => {
    for (const [dataUrl, path] of logoReplacements) html = html.replaceAll(dataUrl, path);
    return html;
  };

  const htmlReport = await buildHtmlReport(
    metadata,
    capturesWithPaths,
    evaluations,
    rubric,
    finalization,
  );
  zip.file(
    `Evaluation_Report_${sanitizeFilename(metadata.toolName)}.html`,
    minifyHtml(replaceLogos(htmlReport)),
  );

  const labelHtml = await buildNutritionLabel(metadata, evaluations, rubric, finalization);
  zip.file(
    `TRUST_Label_${sanitizeFilename(metadata.toolName)}.html`,
    minifyHtml(replaceLogos(labelHtml)),
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export async function importSessionFromZip(zipBlob: Blob): Promise<import("./types").SessionData> {
  if (!cachedJSZip) cachedJSZip = (await import("jszip")).default;
  const JSZip = cachedJSZip;

  const zip = await JSZip.loadAsync(zipBlob);

  const sessionFile = zip.file("session.json");
  if (!sessionFile) {
    throw new Error("No session.json found in archive. Not a valid TRUST Review export.");
  }

  const raw = await sessionFile.async("string");
  const data = JSON.parse(raw) as import("./types").SessionData;
  if (!data.metadata || !data.captures || !data.evaluations) {
    throw new Error("session.json is missing required fields (metadata, captures, evaluations).");
  }

  // Reassemble screenshot and HTML data — try e/ (current), evidence/ (legacy), capture_ prefix (oldest)
  const shortId = (id: string) => id.replace(/-/g, "").substring(0, 8);
  const findFile = (patterns: string[]) => {
    for (const p of patterns) {
      const f = zip.file(p);
      if (f) return f;
    }
    return undefined;
  };
  for (const capture of data.captures) {
    const sid = shortId(capture.id);
    if (!capture.screenshotBase64) {
      const imgFile =
        findFile([
          `e/${sid}.jpg`,
          `evidence/${sid}.jpg`,
          `evidence/${capture.id}.jpg`,
          `evidence/capture_${capture.id}.jpg`,
        ]) ??
        findFile([
          `e/${sid}.png`,
          `evidence/${sid}.png`,
          `evidence/${capture.id}.png`,
          `evidence/capture_${capture.id}.png`,
        ]);
      if (imgFile) {
        const base64 = await imgFile.async("base64");
        const mime = imgFile.name.endsWith(".jpg") ? "image/jpeg" : "image/png";
        capture.screenshotBase64 = `data:${mime};base64,${base64}`;
      }
    }
    if (!capture.htmlContent) {
      const htmlFile = findFile([
        `e/${sid}.html`,
        `evidence/${sid}.html`,
        `evidence/${capture.id}.html`,
        `evidence/capture_${capture.id}.html`,
      ]);
      if (htmlFile) {
        capture.htmlContent = await htmlFile.async("string");
      }
    }
  }

  return data;
}
