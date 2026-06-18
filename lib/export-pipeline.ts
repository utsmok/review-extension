import JSZip from "jszip";
import { buildBusinessCardLabel, buildHtmlReport, buildNutritionLabel } from "./html-report";
import { ensureArray } from "./metadata-utils";
import { minifyHtml } from "./minify";
import {
  getCategoryLabel,
  getQGQuestionCode,
  getQuestionCode,
  getRubricQuestionIds,
} from "./rubric";
import { loadAllScreenshots } from "./screenshot-store";
import type {
  Capture,
  Evaluation,
  EvaluationScore,
  ReviewFinalization,
  RubricData,
  SessionData,
  SessionMetadata,
} from "./types";

/** Reviewer identity passed from global settings into exports. */
export interface ReviewerInfo {
  name?: string;
  email?: string;
}

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

/** Session data shape for export — captures use the lightweight form (no heavy blobs). */
type ExportSessionData = Omit<SessionData, "captures"> & { captures: LightweightCapture[] };

/** Typed result of the data preparation phase — all artefacts ready for ZIP assembly. */
export interface ExportArtifacts {
  metadataCsv: string;
  scoresCsv: string;
  captureLogCsv: string;
  conclusionsCsv: string | null;
  sessionJson: string;
  htmlReport: string;
  nutritionLabel: string;
  businessCardLabel: string;
  /** filename → base64-encoded content (images, logos). */
  imageFiles: Map<string, string>;
  /** filename → plain-text content (capture HTML files). */
  captureHtmlFiles: Map<string, string>;
  /** Sanitized tool name — used for ZIP entry filenames. */
  reportFilename: string;
  labelFilename: string;
  cardFilename: string;
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
  quickNotes?: SessionData["quickNotes"],
  reviewer?: ReviewerInfo,
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

  // Downscale screenshots for the INLINE HTML report to a max edge of 1280px
  // (JPEG q0.9). Full-resolution PNGs are still written as standalone files in
  // the ZIP (imageFiles above), so evidence fidelity is preserved — only the
  // report's inlined copies are reduced to keep the single-file HTML small.
  const capturesForReport = await Promise.all(
    capturesWithScreenshots.map(async (c) => {
      const src = c.annotatedScreenshotBase64 ?? c.screenshotBase64;
      if (!src) return c;
      try {
        const { dataUrl } = await pngToJpeg(src, 0.9, 1280);
        return { ...c, screenshotBase64: dataUrl, annotatedScreenshotBase64: undefined };
      } catch {
        return c;
      }
    }),
  );

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

  /** Pre-computed question metadata — avoids repeated string splitting. */
  interface QuestionMeta {
    title: string;
    type: string;
    aiOnly: boolean;
    code: string;
  }

  const questionMetaMap = new Map<string, QuestionMeta>();
  for (const rubricId of getRubricQuestionIds(rubric)) {
    const dotIdx = rubricId.indexOf(".");
    const cat = dotIdx >= 0 ? rubricId.slice(0, dotIdx) : rubricId;
    const qKey = dotIdx >= 0 ? rubricId.slice(dotIdx + 1) : "";

    const qgSection = rubric.quality_gate[cat as keyof typeof rubric.quality_gate];
    if (qgSection) {
      const q = qgSection[qKey as keyof typeof qgSection];
      const keys = Object.keys(qgSection);
      const idx = keys.indexOf(qKey);
      questionMetaMap.set(rubricId, {
        title: q?.title ?? "",
        type: "quality_gate",
        aiOnly: (q as { ai_only?: boolean })?.ai_only ?? false,
        code: getQGQuestionCode(cat, idx >= 0 ? idx : 0),
      });
      continue;
    }

    const srSection = rubric.scoring_rubric[cat as keyof typeof rubric.scoring_rubric];
    if (srSection) {
      const q = srSection[qKey as keyof typeof srSection];
      const keys = Object.keys(srSection);
      const idx = keys.indexOf(qKey);
      questionMetaMap.set(rubricId, {
        title: q?.title ?? "",
        type: "scoring",
        aiOnly: (q as { ai_only?: boolean })?.ai_only ?? false,
        code: getQuestionCode(cat, idx >= 0 ? idx : 0),
      });
      continue;
    }

    questionMetaMap.set(rubricId, { title: "", type: "", aiOnly: false, code: rubricId });
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
        Reviewer_Name: reviewer?.name ?? "",
        Reviewer_Email: reviewer?.email ?? "",
      },
    ]);

  // All rubric questions — including unanswered ones
  const allQuestionIds = getRubricQuestionIds(rubric);
  const scoresCsv =
    BOM +
    Papa.unparse(
      allQuestionIds.map((rubricId) => {
        const meta = questionMetaMap.get(rubricId);
        const dotIdx = rubricId.indexOf(".");
        const category = dotIdx >= 0 ? rubricId.slice(0, dotIdx) : rubricId;
        const ev = evalMap.get(rubricId);
        return {
          Code: meta?.code ?? rubricId,
          Category: getCategoryLabel(category),
          Question_ID: rubricId,
          Title: meta?.title ?? "",
          Type: meta?.type ?? "",
          AI_Only: String(meta?.aiOnly ?? false),
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

  const sessionData: ExportSessionData = {
    metadata,
    captures: lightweightCaptures,
    evaluations,
    finalization,
    ...(quickNotes?.length ? { quickNotes } : {}),
  };

  // ── Logo files (extracted as JPEG) ────────────────────────────────────
  // Dynamic import is correct here: logos are only needed during export,
  // so they should not be loaded at module parse time. The await ensures
  // the data is available when needed without blocking app startup.
  const { TRUST_LOGO, LISA_EIS_LOGO, UT_LOGO } = await import("./logos");
  for (const [name, dataUrl] of [
    ["trust-logo.jpg", TRUST_LOGO],
    ["lisa-eis-logo.jpg", LISA_EIS_LOGO],
    ["ut-logo.jpg", UT_LOGO],
  ] as const) {
    const { dataUrl: jpegUrl } = await pngToJpeg(dataUrl, 0.95, 400);
    const base64 = jpegUrl.split(",")[1] ?? "";
    imageFiles.set(name, base64);
  }
  // ── Inline remote tool logo / favicon as data URLs ───────────────────
  // The standalone report CSP is img-src data:, so any http(s) logo/favicon
  // would render broken. Fetch each via the background service worker (which
  // holds the <all_urls> host permission and is not bound by the side panel's
  // connect-src 'self' CSP) and substitute the data URL for the HTML reports
  // only — session.json and the CSVs keep the original URLs.
  const reportMetadata = { ...metadata };
  for (const field of ["toolLogoUrl", "faviconUrl"] as const) {
    const val = reportMetadata[field];
    if (val && /^https?:\/\//i.test(val)) {
      try {
        const res = (await browser.runtime.sendMessage({
          type: "trust:fetch-data-url",
          url: val,
        })) as { dataUrl: string | null } | undefined;
        if (res?.dataUrl) reportMetadata[field] = res.dataUrl;
      } catch {
        // fetch unavailable (e.g. tests) — keep the original URL
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
    reviewer,
    quickNotes,
  );
  const labelHtml = await buildNutritionLabel(reportMetadata, evaluations, rubric, finalization);
  const cardHtml = await buildBusinessCardLabel(reportMetadata, evaluations, rubric, finalization);

  const safeName = sanitizeFilename(metadata.toolName);

  return {
    metadataCsv,
    scoresCsv,
    captureLogCsv,
    conclusionsCsv,
    sessionJson: JSON.stringify(sessionData),
    htmlReport: minifyHtml(htmlReport),
    nutritionLabel: minifyHtml(labelHtml),
    businessCardLabel: minifyHtml(cardHtml),
    imageFiles,
    captureHtmlFiles,
    reportFilename: `Evaluation_Report_${safeName}.html`,
    labelFilename: `TRUST_Label_${safeName}.html`,
    cardFilename: `${safeName}-card.html`,
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
  zip.file(artifacts.cardFilename, artifacts.businessCardLabel);

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
/**
 * Batch ZIP assembly: combines multiple sessions into a single ZIP.
 * Each session gets its own subfolder (sanitized tool name).
 */
export async function assembleBatchZip(
  sessions: Array<{ artifacts: ExportArtifacts; toolName: string; grade?: string }>,
): Promise<Blob> {
  const zip = new JSZip();

  const usedFolders = new Map<string, number>();
  for (const { artifacts, toolName } of sessions) {
    const base = sanitizeFilename(toolName);
    const count = usedFolders.get(base) ?? 0;
    usedFolders.set(base, count + 1);
    const folderName = count > 0 ? `${base}_${count + 1}` : base;
    const folder = zip.folder(folderName);
    if (!folder) continue;

    for (const [filename, base64] of artifacts.imageFiles) {
      folder.file(filename, base64, { base64: true });
    }
    for (const [filename, content] of artifacts.captureHtmlFiles) {
      folder.file(filename, content);
    }
    folder.file("session_metadata.csv", artifacts.metadataCsv);
    folder.file("rubric_scores.csv", artifacts.scoresCsv);
    folder.file("capture_log.csv", artifacts.captureLogCsv);
    if (artifacts.conclusionsCsv) {
      folder.file("review_conclusions.csv", artifacts.conclusionsCsv);
    }
    folder.file("session.json", artifacts.sessionJson);
    folder.file(artifacts.reportFilename, artifacts.htmlReport);
    folder.file(artifacts.labelFilename, artifacts.nutritionLabel);
    folder.file(artifacts.cardFilename, artifacts.businessCardLabel);
  }

  // Root manifest
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        version: 1,
        exportDate: new Date().toISOString(),
        sessionCount: sessions.length,
        sessions: sessions.map(({ toolName, grade }) => ({
          toolName,
          grade: grade ?? "not finalized",
        })),
      },
      null,
      2,
    ),
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
