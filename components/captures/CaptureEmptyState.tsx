export default function CaptureEmptyState({
  capturing,
  onCapture,
}: {
  capturing: boolean;
  onCapture: () => void;
}) {
  return (
    <div className="tab-empty-state">
      <div className="tab-empty-state__icon bg-[var(--trust-magenta-tint)] captures-empty-icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--trust-magenta)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
      <p className="tab-empty-state__title">No captures yet</p>
      <p className="tab-empty-state__desc">
        Screenshot the current page to collect visual evidence for your review. You can annotate
        captures and tag them to rubric items.
      </p>
      <button
        type="button"
        className="tab-empty-state__action"
        disabled={capturing}
        onClick={onCapture}
      >
        Capture current page
      </button>
      <p className="inline-hint">
        Keyboard shortcut: <span className="shortcut-hint">Ctrl+Shift+S</span>
      </p>
    </div>
  );
}
