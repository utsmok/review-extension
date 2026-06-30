/**
 * Reorder affordance: up/down arrow buttons (dependency-free; a true drag handle via
 * @dnd-kit is the planned enhancement once the dependency is installable). Accessible
 * — each arrow is a labelled button disabled at the list boundaries. Render only when
 * editMode is on.
 */
export default function ReorderHandle({
  onUp,
  onDown,
  canUp,
  canDown,
  ariaLabelPrefix,
}: {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  /** e.g. "Source clarity" — buttons become "Move Source clarity up/down". */
  ariaLabelPrefix: string;
}) {
  const btn =
    "text-ut-muted hover:text-ut-navy disabled:opacity-30 disabled:cursor-not-allowed p-0.5 transition-colors";
  return (
    <div className="flex items-center" role="group" aria-label={`Reorder ${ariaLabelPrefix}`}>
      <button
        type="button"
        onClick={onUp}
        disabled={!canUp}
        aria-label={`Move ${ariaLabelPrefix} up`}
        className={btn}
      >
        <svg
          aria-hidden="true"
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canDown}
        aria-label={`Move ${ariaLabelPrefix} down`}
        className={btn}
      >
        <svg
          aria-hidden="true"
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
