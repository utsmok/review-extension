export { type ProgressState, getProgressState } from "@/lib/evaluation-state";

export function ProgressCircle({ state }: { state: ProgressState }) {
  const stateClass =
    state === "complete" ? "progress-circle progress-circle--complete" : "progress-circle";

  if (state === "empty") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 16 16"
        className={`shrink-0 ${stateClass}`}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--ut-slate)" strokeWidth="2" />
      </svg>
    );
  }
  if (state === "partial") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 16 16"
        className={`shrink-0 ${stateClass}`}
        aria-hidden="true"
      >
        <path d="M8 2a6 6 0 0 1 0 12Z" fill="var(--ut-blue)" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--ut-blue)" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 16 16"
      className={`shrink-0 ${stateClass}`}
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="var(--state-success)"
        stroke="var(--state-success)"
        strokeWidth="2"
      />
    </svg>
  );
}
