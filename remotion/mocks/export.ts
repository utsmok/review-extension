import type {
  Capture,
  Evaluation,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "@/lib/types";

/** No-op download — Remotion has no download mechanism. */
export function downloadBlob(): void {}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export async function exportSession(
  _metadata: SessionMetadata,
  _captures: Capture[],
  _evaluations: Evaluation[],
  _rubric: RubricData,
  _finalization?: ReviewFinalization | null,
): Promise<Blob> {
  return new Blob([], { type: "application/zip" });
}
