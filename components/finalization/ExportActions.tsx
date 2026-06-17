interface ExportActionsProps {
  onFinalize: () => void;
  onClear: () => void;
  canFinalize: boolean;
  saved: boolean;
  showClear: boolean;
}

export default function ExportActions({
  onFinalize,
  onClear,
  canFinalize,
  saved,
  showClear,
}: ExportActionsProps) {
  return (
    <>
      {/* Actions */}
      <div className="border-t-2 border-ut-border pt-ut-3 mt-ut-1 flex items-center gap-ut-2">
        <button
          type="button"
          className="flex-1 rounded-ut-sm px-ut-4 py-ut-4 text-ut-body font-heading font-bold uppercase tracking-ut-uppercase disabled:opacity-50 bg-trust-magenta text-white hover:bg-trust-magenta-strong transition-colors"
          disabled={!canFinalize}
          onClick={onFinalize}
        >
          {saved ? "Re-finalize Review" : "Lock & Finalize Review"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-ut-green text-ut-xs font-heading font-bold uppercase tracking-ut-label shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9l3.5 3.5L14 6" />
            </svg>
            Saved
          </span>
        )}
      </div>
      {showClear && (
        <button
          type="button"
          className="w-full rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase text-ut-slate hover:text-ut-red"
          onClick={onClear}
        >
          Clear Finalization
        </button>
      )}
    </>
  );
}
