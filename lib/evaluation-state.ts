/**
 * Evaluation state helpers — consolidated progress/completion logic.
 * Single source of truth for determining question progress states.
 */

export type ProgressState = "empty" | "partial" | "complete";

/**
 * Determine the progress state of a rubric question.
 *
 * - "complete": manualDone override, OR has both a score and (evidence or notes)
 * - "partial": has either a score or (evidence or notes), but not both
 * - "empty": nothing scored or noted
 */
export function getProgressState(
  hasScore: boolean,
  hasEvidence: boolean,
  hasNotes: boolean,
  manualDone?: boolean,
): ProgressState {
  if (manualDone) return "complete";
  const hasExtra = hasEvidence || hasNotes;
  if (hasScore && hasExtra) return "complete";
  if (hasScore || hasExtra) return "partial";
  return "empty";
}
