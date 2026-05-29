import { loadAllScreenshots } from "./screenshot-store";
import { minifyCss, minifyHtml } from "./minify";
import { buildHtmlReport, buildNutritionLabel, REPORT_CSS } from "./html-report";
import { getCategoryLabel } from "./rubric";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

// biome-ignore lint/complexity/useRegexLiterals: must use RegExp constructor to avoid noControlCharactersInRegex
const INVALID_FILENAME_CHARS = new RegExp('[<>:"/\\\\|?*\u0000-\u001F]', "g");
/**
 * Sanitize a string for use as a filename. Strips path separators, parent
 * directory references, and characters invalid on Windows.
 */
export function sanitizeFilename(name: string): string {
  return (
    name.replace(INVALID_FILENAME_CHARS, "_").replace(/\.+/g, ".").replace(/^\.+/, "").trim() ||
    "review"
  );
}

/** Subset of Capture written to session.json inside the ZIP — heavy blobs stored separately. */
type LightweightCapture = Pick<Capture, "id" | "timestamp" | "sourceUrl" | "pageTitle"> & {
  notes?: Capture["notes"];
  /** Flag indicating an annotated version exists as `{shortId}_annotated.{ext}` in the ZIP. */
  hasAnnotatedScreenshot?: boolean;
  metadataField?: string;
};

/** Typed result of the data preparation phase — all artefacts ready for ZIP assembly. */
export interface ExportArtifacts {
  metadataCsv: string;
  scoresCsv: string;
  captureLogCsv: string;
  conclusionsCsv: string | null;
  sessionJson: string;
  htmlReport: string;
  nutritionLabel: string;
  /** filename → base64-encoded content (images, logos). */
  imageFiles: Map<string, string>;
  /** filename → plain-text content (capture HTML files). */
  captureHtmlFiles: Map<string, string>;
  css: string;
  /** Sanitized tool name — used for ZIP entry filenames. */
  reportFilename: string;
  labelFilename: string;
}

// Cached dynamic imports
let cachedPapa: typeof import("papaparse") | null = null;
let cachedPngToJpeg: typeof import("./image-convert").pngToJpeg | null = null;
let cachedMinifiedCss: string | null = null;

/** Short ID: first 8 hex chars of capture UUID, unique within a session. */
export const shortId = (id: string) => id.replace(/-/g, "").substring(0, 8);

/**
 * Pure data transformation: prepares every artefact that will go into the
 * export ZIP.  No ZIP logic lives here — that belongs to `assembleZip`.
 */
export async function prepareExportArtifacts(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null,
): Promise<ExportArtifacts> {
  // Load screenshots from separate IDB store
  const screenshotMap = await loadAllScreenshots(captures.map((c) => c.id));

  // Merge screenshot data back into captures for export
  const capturesWithScreenshots = captures.map((c) => {
    const blob = screenshotMap.get(c.id);
    return {
      ...c,
      screenshotBase64: c.screenshotBase64 || blob?.screenshotBase64 || "",
      annotatedScreenshotBase64: c.annotatedScreenshotBase64 || blob?.annotatedScreenshotBase64,
    };
  });

  if (!cachedPapa) cachedPapa = (await import("papaparse")).default;
  const Papa = cachedPapa;

  if (!cachedPngToJpeg) cachedPngToJpeg = (await import("./image-convert")).pngToJpeg;
  // biome-ignore lint/style/noNonNullAssertion: guaranteed non-null by preceding guard
  const pngToJpeg = cachedPngToJpeg!;

  // ── Image conversion (batched) ───────────────────────────────────────
  const idMap = new Map(capturesWithScreenshots.map((c) => [c.id, shortId(c.id)]));
  const imageFiles = new Map<string, string>();
  const captureHtmlFiles = new Map<string, string>();
  const imgExtensions = new Map<string, "jpg" | "png">();
  const annotatedExtensions = new Map<string, "jpg" | "png">();

  const BATCH_SIZE = 4;
  for (let i = 0; i < capturesWithScreenshots.length; i += BATCH_SIZE) {
    const batch = capturesWithScreenshots.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (capture) => {
        const sid = idMap.get(capture.id);
        if (!sid) return;
        const { dataUrl: converted, extension } = await pngToJpeg(capture.screenshotBase64, 0.8);
        const base64Data = converted.split(",")[1] ?? "";
        imageFiles.set(`${sid}.${extension}`, base64Data);
        captureHtmlFiles.set(`${sid}.html`, minifyHtml(capture.htmlContent));
        imgExtensions.set(capture.id, extension);
        if (capture.annotatedScreenshotBase64) {
          const { dataUrl: annConverted, extension: annExt } = await pngToJpeg(
            capture.annotatedScreenshotBase64,
            0.8,
          );
          const annBase64 = annConverted.split(",")[1] ?? "";
          imageFiles.set(`${sid}_annotated.${annExt}`, annBase64);
          annotatedExtensions.set(capture.id, annExt);
        }
      }),
    );
  }

  // ── Build capture maps for HTML reports ───────────────────────────────
  const capturePathMap = new Map(
    capturesWithScreenshots.map((c) => [c.id, `${idMap.get(c.id)}.${imgExtensions.get(c.id) ?? "png"}`]),
  );
  const annotatedPathMap = new Map(
    capturesWithScreenshots
      .filter((c) => c.annotatedScreenshotBase64)
      .map((c) => [
        c.id,
        `${idMap.get(c.id)}_annotated.${annotatedExtensions.get(c.id) ?? imgExtensions.get(c.id) ?? "png"}`,
      ]),
  );
  const capturesWithPaths = capturesWithScreenshots.map((c) => ({
    ...c,
    screenshotBase64: capturePathMap.get(c.id) ?? c.screenshotBase64,
    annotatedScreenshotBase64: annotatedPathMap.has(c.id)
      ? (annotatedPathMap.get(c.id) as string)
      : c.annotatedScreenshotBase64,
  }));

  // ── CSS (minified once) ───────────────────────────────────────────────
  if (!cachedMinifiedCss) {
    cachedMinifiedCss = minifyCss(REPORT_CSS);
  }

  // ── CSV generation ────────────────────────────────────────────────────
  const metadataCsv = Papa.unparse([
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
      Authentication_Method: metadata.authenticationMethod ?? "",
      Data_Sources: (metadata.dataSources ?? []).join("; "),
      Search_Methods: (metadata.searchMethods ?? []).join("; "),
      Discipline: (metadata.discipline ?? []).join("; "),
      Notes: metadata.notes ?? "",
      Tool_Logo_URL: metadata.toolLogoUrl ?? "",
      Tool_Description: metadata.description ?? "",
    },
  ]);

  const scoresCsv = Papa.unparse(
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
  );

  const captureLogCsv = Papa.unparse(
    capturesWithScreenshots.map((c) => ({
      Capture_ID: c.id,
      Timestamp: c.timestamp,
      Page_Title: c.pageTitle,
      URL_Captured: c.sourceUrl,
      User_Notes: c.notes,
      Tagged_Rubric_IDs: (() => {
        const parts: string[] = [];
        for (const e of evaluations) {
          if (e.explicitEvidenceIds.includes(c.id)) parts.push(e.rubricId);
        }
        return parts.join("; ");
      })(),
    })),
  );

  const conclusionsCsv = finalization
    ? Papa.unparse([
        {
          Grade: finalization.grade,
          Conclusion: finalization.conclusion,
          Strengths: finalization.strengths.join("; "),
          Weaknesses: finalization.weaknesses.join("; "),
          Recommendations: finalization.recommendations,
          Finalized_At: finalization.finalizedAt,
        },
      ])
    : null;

  // ── session.json ──────────────────────────────────────────────────────
  const lightweightCaptures = capturesWithScreenshots.map((c): LightweightCapture => {
    const entry: LightweightCapture = {
      id: c.id,
      timestamp: c.timestamp,
      sourceUrl: c.sourceUrl,
      pageTitle: c.pageTitle,
    };
    if (c.notes) entry.notes = c.notes;
    if (c.metadataField) entry.metadataField = c.metadataField;
    if (c.annotatedScreenshotBase64) entry.hasAnnotatedScreenshot = true;
    return entry;
  });

  const sessionData: import("./types").SessionData = {
    metadata,
    captures: lightweightCaptures as import("./types").Capture[],
    evaluations,
    finalization,
  };

  // ── Logo files (extracted as JPEG) ────────────────────────────────────
  const { TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO } = await import("./logos");
  for (const [name, dataUrl] of [
    ["1.jpg", TRUST_LOGO],
    ["2.jpg", LISA_EIS_LOGO],
    ["3.jpg", UT_LOGO],
  ] as const) {
    const { dataUrl: jpegUrl } = await pngToJpeg(dataUrl, 0.95, 400);
    const base64 = jpegUrl.split(",")[1] ?? "";
    imageFiles.set(name, base64);
  }

  // ── HTML reports ──────────────────────────────────────────────────────
  // Replace inline logo data-URLs with file references
  const replaceLogos = (html: string) => {
    let result = html;
    for (const [dataUrl, path] of [
      [TRUST_LOGO, "1.jpg"],
      [LISA_EIS_LOGO, "2.jpg"],
      [UT_LOGO, "3.jpg"],
    ] as const) {
      result = result.replaceAll(dataUrl, path);
    }
    return result;
  };

  const htmlReport = await buildHtmlReport(
    metadata,
    capturesWithPaths,
    evaluations,
    rubric,
    finalization,
  );
  const labelHtml = await buildNutritionLabel(metadata, evaluations, rubric, finalization);

  const safeName = sanitizeFilename(metadata.toolName);

  return {
    metadataCsv,
    scoresCsv,
    captureLogCsv,
    conclusionsCsv,
    sessionJson: JSON.stringify(sessionData),
    htmlReport: minifyHtml(replaceLogos(htmlReport)),
    nutritionLabel: minifyHtml(replaceLogos(labelHtml)),
    imageFiles,
    captureHtmlFiles,
    css: cachedMinifiedCss,
    reportFilename: `Evaluation_Report_${safeName}.html`,
    labelFilename: `TRUST_Label_${safeName}.html`,
  };
}

/**
 * Pure ZIP assembly: takes prepared artefacts and produces the final Blob.
 * No data logic lives here — that belongs to `prepareExportArtifacts`.
 */
export async function assembleZip(artifacts: ExportArtifacts): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Add all base64-encoded image/logo files
  for (const [filename, base64] of artifacts.imageFiles) {
    zip.file(filename, base64, { base64: true });
  }

  // Add capture HTML files
  for (const [filename, content] of artifacts.captureHtmlFiles) {
    zip.file(filename, content);
  }

  // Add CSS
  zip.file("report.css", artifacts.css);

  // Add CSVs
  zip.file("session_metadata.csv", artifacts.metadataCsv);
  zip.file("rubric_scores.csv", artifacts.scoresCsv);
  zip.file("capture_log.csv", artifacts.captureLogCsv);
  if (artifacts.conclusionsCsv) {
    zip.file("review_conclusions.csv", artifacts.conclusionsCsv);
  }

  // Add session data
  zip.file("session.json", artifacts.sessionJson);

  // Add HTML reports
  zip.file(artifacts.reportFilename, artifacts.htmlReport);
  zip.file(artifacts.labelFilename, artifacts.nutritionLabel);

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}
