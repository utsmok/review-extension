import { loadAllScreenshots } from "./screenshot-store";
import { minifyHtml } from "./minify";
import { buildHtmlReport, buildNutritionLabel } from "./html-report";
import {
  getCategoryLabel,
  getQGQuestionCode,
  getQuestionCode,
  getRubricQuestionIds,
} from "./rubric";
import type {
  Capture,
  Evaluation,
  EvaluationScore,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "./types";
import { ensureArray } from "./metadata-utils";

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
  /** Sanitized tool name — used for ZIP entry filenames. */
  reportFilename: string;
  labelFilename: string;
}

// Cached dynamic imports
let cachedPapa: typeof import("papaparse") | null = null;
let cachedPngToJpeg: typeof import("./image-convert").pngToJpeg | null = null;

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

  // ── Image files (PNG, lossless — preserves text readability) ──────────
  const idMap = new Map(capturesWithScreenshots.map((c) => [c.id, shortId(c.id)]));
  const imageFiles = new Map<string, string>();
  const captureHtmlFiles = new Map<string, string>();

  for (const capture of capturesWithScreenshots) {
    const sid = idMap.get(capture.id);
    if (!sid) continue;
    const base64Data = capture.screenshotBase64.split(",")[1] ?? "";
    const ext = capture.screenshotBase64.startsWith("data:image/png") ? "png" : "jpg";
    imageFiles.set(`${sid}.${ext}`, base64Data);
    captureHtmlFiles.set(`${sid}.html`, minifyHtml(capture.htmlContent));
    if (capture.annotatedScreenshotBase64) {
      const annBase64 = capture.annotatedScreenshotBase64.split(",")[1] ?? "";
      const annExt = capture.annotatedScreenshotBase64.startsWith("data:image/png") ? "png" : "jpg";
      imageFiles.set(`${sid}_annotated.${annExt}`, annBase64);
    }
  }

  // Captures pass through with original base64 data URLs (inline in HTML)
  const capturesForReport = capturesWithScreenshots;

  // ── CSV generation ────────────────────────────────────────────────────

  /** UTF-8 BOM — ensures Excel (Windows) decodes special characters correctly. */
  const BOM = "\uFEFF";

  /** Human-readable label for a score value. */
  function scoreLabel(score: EvaluationScore): string {
    if (score === "") return "—";
    if (score === "na") return "N/A";
    if (score === "unsure") return "Unsure";
    if (score === "pass") return "Pass";
    if (score === "fail") return "Fail";
    return String(score);
  }

  /** Look up question title from rubric by dot-separated ID. */
  function questionTitle(rubricId: string): string {
    const [cat, qKey] = rubricId.split(".");
    const qgSection = rubric.quality_gate[cat as keyof typeof rubric.quality_gate];
    if (qgSection) {
      const q = qgSection[qKey as keyof typeof qgSection];
      if (q) return q.title;
    }
    const srSection = rubric.scoring_rubric[cat as keyof typeof rubric.scoring_rubric];
    if (srSection) {
      const q = srSection[qKey as keyof typeof srSection];
      if (q) return q.title;
    }
    return "";
  }

  /** Determine question type from rubric. */
  function questionType(rubricId: string): string {
    const [cat, _qKey] = rubricId.split(".");
    const qgSection = rubric.quality_gate[cat as keyof typeof rubric.quality_gate];
    if (qgSection) return "quality_gate";
    return "scoring";
  }

  /** Whether a question is AI-only. */
  function questionAiOnly(rubricId: string): boolean {
    const [cat, qKey] = rubricId.split(".");
    const qgSection = rubric.quality_gate[cat as keyof typeof rubric.quality_gate];
    if (qgSection) {
      const q = qgSection[qKey as keyof typeof qgSection];
      return (q as { ai_only?: boolean })?.ai_only ?? false;
    }
    const srSection = rubric.scoring_rubric[cat as keyof typeof rubric.scoring_rubric];
    if (srSection) {
      const q = srSection[qKey as keyof typeof srSection];
      return (q as { ai_only?: boolean })?.ai_only ?? false;
    }
    return false;
  }

  /** Build a short display code (e.g. TR1, PS2) from a rubric ID. */
  function questionCode(rubricId: string): string {
    const [cat, qKey] = rubricId.split(".");
    // Quality gate categories use getQGQuestionCode
    const qgSection = rubric.quality_gate[cat as keyof typeof rubric.quality_gate];
    if (qgSection) {
      const keys = Object.keys(qgSection);
      const idx = keys.indexOf(qKey);
      return getQGQuestionCode(cat, idx >= 0 ? idx : 0);
    }
    // Scoring categories use getQuestionCode
    const srSection = rubric.scoring_rubric[cat as keyof typeof rubric.scoring_rubric];
    if (srSection) {
      const keys = Object.keys(srSection);
      const idx = keys.indexOf(qKey);
      return getQuestionCode(cat, idx >= 0 ? idx : 0);
    }
    return rubricId;
  }

  // Build evaluation lookup
  const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));

  const metadataCsv =
    BOM +
    Papa.unparse([
      {
        Tool_Name: metadata.toolName,
        Tool_URL: metadata.toolUrl,
        Start_Time: metadata.startTime,
        Status: metadata.status,
        Uses_AI: String(metadata.usesAi ?? true),
        Rubric_Variant: metadata.rubricId ?? "trust-full",
        Company: metadata.company ?? "",
        Pricing: metadata.pricing ?? "",
        Availability: metadata.availability ?? "",
        Terms_Conditions_URL: metadata.termsConditionsUrl ?? "",
        Authentication_Method: metadata.authenticationMethod ?? "",
        Data_Sources: ensureArray(metadata.dataSources).join("; "),
        Search_Methods: ensureArray(metadata.searchMethods).join("; "),
        Discipline: ensureArray(metadata.discipline).join("; "),
        Tool_Description: metadata.description ?? "",
        Tool_Logo_URL: metadata.toolLogoUrl ?? "",
        Favicon_URL: metadata.faviconUrl ?? "",
        Finalized_At: metadata.finalizedAt ?? "",
        Notes: metadata.notes ?? "",
      },
    ]);

  // All rubric questions — including unanswered ones
  const allQuestionIds = getRubricQuestionIds(rubric);
  const scoresCsv =
    BOM +
    Papa.unparse(
      allQuestionIds.map((rubricId) => {
        const [category] = rubricId.split(".");
        const ev = evalMap.get(rubricId);
        return {
          Code: questionCode(rubricId),
          Category: getCategoryLabel(category),
          Question_ID: rubricId,
          Title: questionTitle(rubricId),
          Type: questionType(rubricId),
          AI_Only: String(questionAiOnly(rubricId)),
          Score: ev ? scoreLabel(ev.score) : "—",
          Manual_Done: ev?.manualDone ? "Yes" : "",
          Notes: ev?.notes ?? "",
          Custom_Score: ev?.customScore?.score ?? "",
          Custom_Reasoning: ev?.customScore?.reasoning ?? "",
          Linked_Capture_IDs: ev?.explicitEvidenceIds.join("; ") ?? "",
        };
      }),
    );

  const captureLogCsv =
    BOM +
    Papa.unparse(
      capturesWithScreenshots.map((c) => ({
        Capture_ID: c.id,
        Timestamp: c.timestamp,
        Page_Title: c.pageTitle,
        URL_Captured: c.sourceUrl,
        Metadata_Field: c.metadataField ?? "",
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
    ? BOM +
      Papa.unparse([
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
  // ── Inline remote images (tool logo, favicon) for standalone reports ──
  const reportMetadata = { ...metadata };
  for (const field of ["toolLogoUrl", "faviconUrl"] as const) {
    const url = reportMetadata[field];
    if (url && !url.startsWith("data:")) {
      try {
        const resp = await fetch(url, { mode: "cors" });
        if (resp.ok) {
          const blob = await resp.blob();
          const b64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          reportMetadata[field] = b64;
        }
      } catch {
        // Silently skip — report will use the original URL as fallback
      }
    }
  }
  // ── HTML reports (fully standalone — all images inline) ─────────────
  const htmlReport = await buildHtmlReport(
    reportMetadata,
    capturesForReport,
    evaluations,
    rubric,
    finalization,
  );
  const labelHtml = await buildNutritionLabel(reportMetadata, evaluations, rubric, finalization);

  const safeName = sanitizeFilename(metadata.toolName);

  return {
    metadataCsv,
    scoresCsv,
    captureLogCsv,
    conclusionsCsv,
    sessionJson: JSON.stringify(sessionData),
    htmlReport: minifyHtml(htmlReport),
    nutritionLabel: minifyHtml(labelHtml),
    imageFiles,
    captureHtmlFiles,
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
