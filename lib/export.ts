import { prepareExportArtifacts, assembleZip, sanitizeFilename } from "./export-pipeline";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

export { sanitizeFilename };

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Cached dynamic import (used by importSessionFromZip)
let cachedJSZip: typeof import("jszip") | null = null;

export async function exportSession(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null = null,
): Promise<Blob> {
  const artifacts = await prepareExportArtifacts(
    metadata,
    captures,
    evaluations,
    rubric,
    finalization,
  );
  return assembleZip(artifacts);
}

// --- ZIP bomb protection limits ---
const MAX_INPUT_SIZE = 200 * 1024 * 1024; // 200 MB compressed
const MAX_ZIP_ENTRIES = 500;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB uncompressed
function validateSessionData(data: unknown): import("./types").SessionData {
  if (!data || typeof data !== "object") throw new Error("session.json is not a valid object");
  const d = data as Record<string, unknown>;

  // Validate metadata
  if (!d.metadata || typeof d.metadata !== "object")
    throw new Error("session.json is missing required fields (metadata)");
  const m = d.metadata as Record<string, unknown>;
  if (typeof m.id !== "string") throw new Error("metadata.id must be a string");
  if (typeof m.toolName !== "string") throw new Error("metadata.toolName must be a string");
  if (typeof m.startTime !== "string") throw new Error("metadata.startTime must be a string");

  // Validate captures is array of objects with string id
  if (!Array.isArray(d.captures))
    throw new Error("session.json is missing required fields (captures)");
  for (const c of d.captures) {
    if (!c || typeof c !== "object") throw new Error("each capture must be an object");
    const cap = c as Record<string, unknown>;
    if (typeof cap.id !== "string") throw new Error("capture.id must be a string");
  }

  // Validate evaluations is array of objects with string rubricId
  if (!Array.isArray(d.evaluations))
    throw new Error("session.json is missing required fields (evaluations)");
  for (const e of d.evaluations) {
    if (!e || typeof e !== "object") throw new Error("each evaluation must be an object");
    const ev = e as Record<string, unknown>;
    if (typeof ev.rubricId !== "string") throw new Error("evaluation.rubricId must be a string");
  }

  return data as import("./types").SessionData;
}

export async function importSessionFromZip(zipBlob: Blob): Promise<import("./types").SessionData> {
  if (zipBlob.size > MAX_INPUT_SIZE) {
    throw new Error(
      `ZIP file too large (${Math.round(zipBlob.size / 1024 / 1024)} MB). Maximum compressed size is 200 MB.`,
    );
  }

  if (!cachedJSZip) cachedJSZip = (await import("jszip")).default;
  const JSZip = cachedJSZip;

  const zip = await JSZip.loadAsync(zipBlob);

  const entryNames = Object.keys(zip.files);
  if (entryNames.length > MAX_ZIP_ENTRIES) {
    throw new Error(
      `ZIP contains too many entries (${entryNames.length}). Maximum is ${MAX_ZIP_ENTRIES}.`,
    );
  }

  const sessionFile = zip.file("session.json");
  if (!sessionFile) {
    throw new Error("No session.json found in archive. Not a valid TRUST Review export.");
  }

  let totalBytesRead = 0;
  const checkBudget = (bytes: number) => {
    totalBytesRead += bytes;
    if (totalBytesRead > MAX_TOTAL_BYTES) {
      throw new Error(
        "ZIP contents exceed maximum uncompressed size (500 MB). Archive may be corrupted or malicious.",
      );
    }
  };

  const raw = await sessionFile.async("string");
  checkBudget(raw.length);
  const data = validateSessionData(JSON.parse(raw));

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
        checkBudget(base64.length);
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
        const html = await htmlFile.async("string");
        checkBudget(html.length);
        capture.htmlContent = html;
      }
    }
    // Reassemble annotated screenshot if flagged in session.json
    const hasAnnotated = (capture as unknown as Record<string, unknown>).hasAnnotatedScreenshot;
    if (hasAnnotated && !capture.annotatedScreenshotBase64) {
      const annFile = findFile([`${sid}_annotated.jpg`, `${sid}_annotated.png`]);
      if (annFile) {
        const base64 = await annFile.async("base64");
        checkBudget(base64.length);
        const mime = annFile.name.endsWith(".jpg") ? "image/jpeg" : "image/png";
        capture.annotatedScreenshotBase64 = `data:${mime};base64,${base64}`;
      }
    }
  }

  return data;
}
