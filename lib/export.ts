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
  const evidenceFolder = zip.folder("evidence")!;

  for (const capture of captures) {
    const base64Data = capture.screenshotBase64.split(",")[1] ?? "";
    evidenceFolder.file(`capture_${capture.id}.png`, base64Data, {
      base64: true,
    });
    evidenceFolder.file(`capture_${capture.id}.html`, capture.htmlContent);
  }

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
  const lightweightCaptures = captures.map((c) => ({
    id: c.id,
    timestamp: c.timestamp,
    sourceUrl: c.sourceUrl,
    pageTitle: c.pageTitle,
    screenshotBase64: "",
    htmlContent: "",
    notes: c.notes,
  }));
  const sessionData: import("./types").SessionData = {
    metadata,
    captures: lightweightCaptures,
    evaluations,
    finalization,
  };
  zip.file("session.json", JSON.stringify(sessionData));

  const htmlReport = await buildHtmlReport(metadata, captures, evaluations, rubric, finalization);
  zip.file(`Evaluation_Report_${sanitizeFilename(metadata.toolName)}.html`, htmlReport);

  const labelHtml = await buildNutritionLabel(metadata, evaluations, rubric, finalization);
  zip.file(`TRUST_Label_${sanitizeFilename(metadata.toolName)}.html`, labelHtml);

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

  // Reassemble screenshot and HTML data from evidence/ folder
  for (const capture of data.captures) {
    if (!capture.screenshotBase64) {
      const pngFile = zip.file(`evidence/capture_${capture.id}.png`);
      if (pngFile) {
        const base64 = await pngFile.async("base64");
        capture.screenshotBase64 = `data:image/png;base64,${base64}`;
      }
    }
    if (!capture.htmlContent) {
      const htmlFile = zip.file(`evidence/capture_${capture.id}.html`);
      if (htmlFile) {
        capture.htmlContent = await htmlFile.async("string");
      }
    }
  }

  return data;
}
