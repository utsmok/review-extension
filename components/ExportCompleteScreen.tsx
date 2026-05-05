import type { ReviewFinalization } from "@/lib/types";

interface ExportCompleteScreenProps {
  captures: number;
  scoredCount: number;
  finalization: ReviewFinalization | null;
  filename: string;
  onDone: () => void;
}

export default function ExportCompleteScreen({ captures, scoredCount, finalization, filename, onDone }: ExportCompleteScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-ut-4 p-ut-6 h-full">
      {/* Checkmark indicator */}
      <div className="w-10 h-10 rounded-full border-2 border-ut-green flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ut-green">
          <title>Checkmark</title>
          <path d="M5 10.5l3.5 3.5 7-7" />
        </svg>
      </div>

      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta text-center">
        Review Exported
      </h2>

      <div className="flex flex-col gap-ut-1 w-full max-w-[260px]">
        <div className="flex justify-between text-ut-xs font-mono">
          <span className="text-ut-muted">Captures</span>
          <span className="text-ut-text">{captures}</span>
        </div>
        <div className="flex justify-between text-ut-xs font-mono">
          <span className="text-ut-muted">Scored items</span>
          <span className="text-ut-text">{scoredCount}</span>
        </div>
        <div className="flex justify-between text-ut-xs font-mono">
          <span className="text-ut-muted">Finalization</span>
          <span className={finalization ? "text-ut-green" : "text-state-warning"}>
            {finalization ? "Complete" : "Skipped"}
          </span>
        </div>
        <div className="flex justify-between text-ut-xs font-mono mt-ut-1">
          <span className="text-ut-muted">File</span>
          <span className="text-ut-text truncate max-w-[160px]" title={filename}>
            {filename}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="w-full max-w-[260px] bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong transition-colors mt-ut-2"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
