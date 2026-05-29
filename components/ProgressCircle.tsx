import { useEffect, useRef, useState } from "react";
import { type ProgressState, getProgressState } from "@/lib/evaluation-state";

export type { ProgressState };
export { getProgressState };

/**
 * Animated SVG progress ring.
 *
 * Uses stroke-dasharray / stroke-dashoffset to draw the arc progressively,
 * with a spring-like easing that overshoots slightly for a "live drawing" feel.
 * On mount and on every state change the ring animates from the previous
 * position to the new one.
 *
 * 3 states:  empty → 0° arc,  partial → 180° arc,  complete → 360° arc
 */
const PROGRESS_R = 6;
const PROGRESS_C = 2 * Math.PI * PROGRESS_R; // ~37.7
const STATE_PCT: Record<ProgressState, number> = { empty: 0, partial: 0.5, complete: 1 };

export function ProgressCircle({ state }: { state: ProgressState }) {
  const prevPctRef = useRef(STATE_PCT[state]);
  const [animPct, setAnimPct] = useState(0); // start at 0 for mount animation

  useEffect(() => {
    // Use rAF to ensure the browser has painted the initial 0-offset state
    // before we transition to the target — this triggers the CSS transition.
    const raf = requestAnimationFrame(() => {
      setAnimPct(STATE_PCT[state]);
    });
    prevPctRef.current = STATE_PCT[state];
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const offset = PROGRESS_C * (1 - animPct);

  const color =
    state === "complete"
      ? "var(--state-success)"
      : state === "partial"
        ? "var(--ut-blue)"
        : "var(--ut-slate)";

  const ariaValuenow = Math.round(STATE_PCT[state] * 100);

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 16 16"
      className={`shrink-0 progress-circle ${state === "complete" ? "progress-circle--complete" : ""}`}
      role="progressbar"
      aria-valuenow={ariaValuenow}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Review progress"
    >
      {/* Background track */}
      <circle
        cx="8"
        cy="8"
        r={PROGRESS_R}
        fill="none"
        stroke="var(--neutral-100)"
        strokeWidth="2"
      />
      {/* Animated arc */}
      <circle
        cx="8"
        cy="8"
        r={PROGRESS_R}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={PROGRESS_C}
        strokeDashoffset={offset}
        className="progress-circle__arc"
        transform="rotate(-90 8 8)"
      />
      {/* Center dot on complete */}
      {state === "complete" && (
        <circle
          cx="8"
          cy="8"
          r="3"
          fill="var(--state-success)"
          className="progress-circle__dot"
        />
      )}
    </svg>
  );
}
