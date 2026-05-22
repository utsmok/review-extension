import { getCategoryLabel } from "./rubric";
import { buildHtmlReport, buildNutritionLabel } from "./html-report";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";
/** Subset of Capture written to session.json inside the ZIP — heavy blobs stored separately. */
type LightweightCapture = Pick<Capture, "id" | "timestamp" | "sourceUrl" | "pageTitle"> & {
  notes?: Capture["notes"];
};

// biome-ignore lint/complexity/useRegexLiterals: must use RegExp constructor to avoid noControlCharactersInRegex
const INVALID_FILENAME_CHARS = new RegExp('[<>:"/\\\\|?*\u0000-\u001F]', "g");
/**
 * Sanitize a string for use as a filename. Strips path separators, parent
 * directory references, and characters invalid on Windows.
 *
 * Used at the export/download boundary to prevent path traversal in ZIP
 * entry names and download filenames.
 */
export function sanitizeFilename(name: string): string {
  return (
    name.replace(INVALID_FILENAME_CHARS, "_").replace(/\.+/g, ".").replace(/^\.+/, "").trim() ||
    "review"
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
export function minifyHtml(html: string): string {
  return html
    .replace(
      /<!--[\s\S]*?-->|<\/(?:li|dt|dd|p|tr|td|th|thead|tbody|tfoot|colgroup|option|optgroup)>/g,
      "",
    )
    .replace(/\s+/g, " ")
    .replace(/ (?=<|\/>)/g, "")
    .trim();
}

/** Strip whitespace, comments, and resolve CSS variables for smaller ZIP entries.
 *  Keeps vars needed by HTML inline styles (--magenta, --muted, --text, --ff-heading)
 *  in a compact :root block; resolves all others inline. */
const CSS_KEEP_VARS = new Set(["--magenta", "--muted", "--text", "--ff-heading"]);
export function minifyCss(css: string): string {
  // Vars used in HTML inline styles — must be kept in :root (see CSS_KEEP_VARS)

  let result = css.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // remove block + line comments

  // Extract all CSS variable definitions and build root keeps in one pass
  const vars = new Map<string, string>();
  const rootKeepParts: string[] = [];
  result = result.replace(/--([a-z-]+)\s*:\s*([^;{}]+)/g, (_, name, value) => {
    const trimmed = value.trim();
    vars.set(name, trimmed);
    if (CSS_KEEP_VARS.has(`--${name}`)) rootKeepParts.push(`--${name}:${trimmed}`);
    return "";
  });

  // Resolve all var() references in a single pass
  result = result.replace(/var\(--([a-z-]+)\)/g, (_, name) => vars.get(name) ?? `var(--${name})`);

  // Remove :root block (now empty after var extraction) — handles leftover semicolons
  result = result.replace(/:root\s*\{[^}]*\}/g, "");
  if (rootKeepParts.length > 0) result = `:root{${rootKeepParts.join(";")}}${result}`;

  return result
    .replace(/\s*([{}:;,])\s*/g, "$1") // strip around delimiters
    .replace(/;\}/g, "}") // remove trailing semicolons
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
// Cached dynamic imports
let cachedJSZip: typeof import("jszip") | null = null;
let cachedPapa: typeof import("papaparse") | null = null;
let cachedPngToJpeg: typeof import("./image-convert").pngToJpeg | null = null;
let cachedMinifiedCss: string | null = null;
let cachedLogos: typeof import("./logos") | null = null;

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

  if (!cachedPngToJpeg) cachedPngToJpeg = (await import("./image-convert")).pngToJpeg;
  const pngToJpeg = cachedPngToJpeg!;

  const zip = new JSZip();
  const imgExtensions = new Map<string, "jpg" | "png">();

  /** Short ID: first 8 hex chars of capture UUID, unique within a session. */
  const shortId = (id: string) => id.replace(/-/g, "").substring(0, 8);
  const idMap = new Map(captures.map((c) => [c.id, shortId(c.id)]));

  for (const capture of captures) {
    const sid = idMap.get(capture.id)!;
    const { dataUrl: converted, extension } = await pngToJpeg(capture.screenshotBase64, 0.8);
    const base64Data = converted.split(",")[1] ?? "";
    zip.file(`${sid}.${extension}`, base64Data, {
      base64: true,
    });
    zip.file(`${sid}.html`, minifyHtml(capture.htmlContent));
    imgExtensions.set(capture.id, extension);
  }

  // Build capture map for HTML reports: reference files instead of embedding base64
  const capturePathMap = new Map(
    captures.map((c) => [c.id, `${idMap.get(c.id)}.${imgExtensions.get(c.id) ?? "png"}`]),
  );
  const capturesWithPaths = captures.map((c) => ({
    ...c,
    screenshotBase64: capturePathMap.get(c.id) ?? c.screenshotBase64,
  }));

  // Extract shared CSS to a single file — pre-minified on first call
  if (!cachedMinifiedCss) {
    const { REPORT_CSS } = await import("./html-report");
    cachedMinifiedCss = minifyCss(REPORT_CSS);
  }
  zip.file("report.css", cachedMinifiedCss);
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
  const lightweightCaptures = captures.map((c): LightweightCapture => {
    const entry: LightweightCapture = {
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
    captures: lightweightCaptures as import("./types").Capture[],
    evaluations,
    finalization,
  };
  zip.file("session.json", JSON.stringify(sessionData));

  // Extract logo files as JPEG — avoid embedding 17KB+ of base64 in both HTML reports
  if (!cachedLogos) cachedLogos = await import("./logos");
  const { TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO } = cachedLogos;
  const logoReplacements: [string, string][] = [];
  for (const [name, dataUrl] of [
    ["1.jpg", TRUST_LOGO],
    ["2.jpg", LISA_EIS_LOGO],
    ["3.jpg", UT_LOGO],
  ] as const) {
    const { dataUrl: jpegUrl } = await pngToJpeg(dataUrl, 0.95, 400);
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

  // Reassemble screenshot and HTML data — try root (current), e/, evidence/, capture_ prefix (legacy)
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
          `${sid}.jpg`,
          `e/${sid}.jpg`,
          `evidence/${sid}.jpg`,
          `evidence/${capture.id}.jpg`,
          `evidence/capture_${capture.id}.jpg`,
        ]) ??
        findFile([
          `${sid}.png`,
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
        `${sid}.html`,
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
