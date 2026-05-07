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

  // Full session data for re-import
  const sessionData: import("./types").SessionData = {
    metadata,
    captures,
    evaluations,
    finalization,
  };
  zip.file("session.json", JSON.stringify(sessionData));

  const htmlReport = await buildHtmlReport(metadata, captures, evaluations, rubric, finalization);
  zip.file(`Evaluation_Report_${sanitizeFilename(metadata.toolName)}.html`, htmlReport);

  const labelHtml = await buildNutritionLabel(metadata, evaluations, rubric, finalization);
  zip.file(`TRUST_Label_${sanitizeFilename(metadata.toolName)}.html`, labelHtml);

  return zip.generateAsync({ type: "blob" });
}

export async function importSessionFromZip(zipBlob: Blob): Promise<import("./types").SessionData> {
  if (!cachedJSZip) cachedJSZip = (await import("jszip")).default;
  if (!cachedPapa) cachedPapa = (await import("papaparse")).default;
  const JSZip = cachedJSZip;
  const Papa = cachedPapa;

  const zip = await JSZip.loadAsync(zipBlob);

  // Try session.json first (newer exports)
  const sessionFile = zip.file("session.json");
  if (sessionFile) {
    const raw = await sessionFile.async("string");
    const data = JSON.parse(raw) as import("./types").SessionData;
    if (data.metadata && data.captures && data.evaluations) return data;
  }

  // Fallback: reconstruct from CSV files (older exports)
  const metaCsv = zip.file("session_metadata.csv");
  const scoresCsv = zip.file("rubric_scores.csv");
  const capturesCsv = zip.file("capture_log.csv");
  const conclusionsCsv = zip.file("review_conclusions.csv");

  if (!metaCsv || !scoresCsv || !capturesCsv) {
    throw new Error(
      "No session.json or CSV data found in archive. Not a valid TRUST Review export.",
    );
  }

  // Parse metadata
  const metaRows = Papa.parse(await metaCsv.async("string"), { header: true }).data as Record<
    string,
    string
  >[];
  const mr = metaRows[0];
  if (!mr) throw new Error("Empty session_metadata.csv");

  const sessionId = crypto.randomUUID();
  const metadata: import("./types").SessionMetadata = {
    id: sessionId,
    toolName: mr.Tool_Name || "Unknown Tool",
    toolUrl: mr.Tool_URL || "",
    startTime: mr.Start_Time || new Date().toISOString(),
    status: "started",
    usesAi: mr.Uses_AI === "true",
    rubricId: mr.Rubric_Variant || "trust-full",
    company: mr.Company || undefined,
    pricing: mr.Pricing || undefined,
    availability: mr.Availability || undefined,
    termsConditionsUrl: mr.Terms_Conditions_URL || undefined,
    dataSources: mr.Data_Sources ? mr.Data_Sources.split("; ").filter(Boolean) : undefined,
    searchMethods: mr.Search_Methods ? mr.Search_Methods.split("; ").filter(Boolean) : undefined,
    discipline: mr.Discipline || undefined,
    notes: mr.Notes || undefined,
    toolLogoUrl: mr.Tool_Logo_URL || undefined,
    description: mr.Tool_Description || undefined,
  };

  // Parse captures — reconstruct from evidence/ folder
  const captureRows = Papa.parse(await capturesCsv.async("string"), { header: true })
    .data as Record<string, string>[];
  const captures: import("./types").Capture[] = [];
  for (const cr of captureRows) {
    const captureId = cr.Capture_ID;
    if (!captureId) continue;

    // Read screenshot PNG and convert to data URL
    const pngFile = zip.file(`evidence/capture_${captureId}.png`);
    let screenshotBase64 = "";
    if (pngFile) {
      const pngData = await pngFile.async("base64");
      screenshotBase64 = `data:image/png;base64,${pngData}`;
    }

    // Read HTML content
    const htmlFile = zip.file(`evidence/capture_${captureId}.html`);
    const htmlContent = htmlFile ? await htmlFile.async("string") : "";

    captures.push({
      id: captureId,
      timestamp: cr.Timestamp || new Date().toISOString(),
      pageTitle: cr.Page_Title || "",
      sourceUrl: cr.URL_Captured || "",
      screenshotBase64,
      htmlContent,
      notes: cr.User_Notes || "",
    });
  }

  // Parse evaluations
  const scoreRows = Papa.parse(await scoresCsv.async("string"), { header: true }).data as Record<
    string,
    string
  >[];
  const evaluations: import("./types").Evaluation[] = scoreRows.map((sr) => {
    const rawScore = sr.Score || "";
    let score: import("./types").EvaluationScore = "";
    if (["pass", "fail", "na", "unsure"].includes(rawScore)) {
      score = rawScore as import("./types").QualityGateScore;
    } else if (["0", "1", "2", "3"].includes(rawScore)) {
      score = Number(rawScore) as import("./types").ScoringScore;
    }

    return {
      rubricId: sr.Question_ID || "",
      score,
      notes: sr.Notes || "",
      explicitEvidenceIds: sr.Linked_Capture_IDs
        ? sr.Linked_Capture_IDs.split("; ").filter(Boolean)
        : [],
    };
  });

  // Parse finalization
  let finalization: import("./types").ReviewFinalization | null = null;
  if (conclusionsCsv) {
    const conclRows = Papa.parse(await conclusionsCsv.async("string"), { header: true })
      .data as Record<string, string>[];
    const cr = conclRows[0];
    if (cr && cr.Grade) {
      finalization = {
        grade: cr.Grade as import("./types").FinalizationGrade,
        conclusion: cr.Conclusion || "",
        strengths: cr.Strengths ? cr.Strengths.split("; ").filter(Boolean) : [],
        weaknesses: cr.Weaknesses ? cr.Weaknesses.split("; ").filter(Boolean) : [],
        recommendations: cr.Recommendations || "",
        finalizedAt: cr.Finalized_At || new Date().toISOString(),
      };
      metadata.status = "done";
      metadata.finalizedAt = cr.Finalized_At;
    }
  }

  return { metadata, captures, evaluations, finalization };
}
