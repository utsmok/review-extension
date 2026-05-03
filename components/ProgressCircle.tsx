export type ProgressState = "empty" | "partial" | "complete";

export function ProgressCircle({ state }: { state: ProgressState }) {
  if (state === "empty") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--ut-slate)" strokeWidth="2" />
      </svg>
    );
  }
  if (state === "partial") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
        <path d="M8 2a6 6 0 0 1 0 12Z" fill="var(--state-warning)" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--state-warning)" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="var(--state-success)" stroke="var(--state-success)" strokeWidth="2" />
    </svg>
  );
}

export function getProgressState(hasScore: boolean, hasEvidence: boolean, hasNotes: boolean): ProgressState {
  const hasExtra = hasEvidence || hasNotes;
  if (hasScore && hasExtra) return "complete";
  if (hasScore || hasExtra) return "partial";
  return "empty";
}
