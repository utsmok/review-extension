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
      <div className="border-t-2 border-ut-border pt-ut-3 mt-1 flex items-center gap-ut-2">
        <button
          type="button"
          className="flex-1 rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase disabled:opacity-50 bg-trust-magenta text-white hover:bg-trust-magenta-strong transition-colors"
          disabled={!canFinalize}
          onClick={onFinalize}
        >
          Lock &amp; Finalize Review
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-ut-green text-ut-xs font-heading font-bold uppercase tracking-ut-label shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7.5l3 3 6-6" />
            </svg>
            Saved
          </span>
        )}
      </div>
      {showClear && (
        <button
          type="button"
          className="w-full rounded-ut-sm px-ut-4 py-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase text-ut-slate hover:text-ut-red"
          onClick={onClear}
        >
          Clear Finalization
        </button>
      )}
    </>
  );
}
