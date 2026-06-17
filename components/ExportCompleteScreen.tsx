import { useEffect, useRef } from "react";
import { GRADE_LABELS } from "@/lib/report/compute-scores";
import type { ReviewFinalization } from "@/lib/types";

interface ExportCompleteScreenProps {
  captures: number;
  scoredCount: number;
  finalization: ReviewFinalization | null;
  filename: string;
  error?: string | null;
  fileSize?: number;
  loading?: boolean;
  onRetry?: () => void;
  onDone: () => void;
}

function gradeLabel(finalization: ReviewFinalization | null): string {
  if (!finalization) return "";
  return GRADE_LABELS[finalization.grade] ?? finalization.grade;
}

function gradeColorClass(finalization: ReviewFinalization | null): string {
  if (!finalization) return "text-ut-muted";
  const colorMap: Record<string, string> = {
    pass: "text-ut-green",
    conditional: "text-score-1",
    fail: "text-ut-red",
    recommended: "text-ut-green",
    recommended_with_caveats: "text-score-1",
    needs_review: "text-ut-muted",
    pilot_only: "text-score-1",
    not_recommended: "text-ut-red",
    out_of_scope: "text-ut-muted",
  };
  return colorMap[finalization.grade] ?? "text-ut-muted";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExportCompleteScreen({
  captures,
  scoredCount,
  finalization,
  filename,
  error,
  fileSize,
  loading,
  onRetry,
  onDone,
}: ExportCompleteScreenProps) {
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const hasError = !!error;

  // Focus primary action button on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      primaryBtnRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={hasError ? "Export failed" : "Review exported successfully"}
      className="flex flex-col items-center justify-center gap-ut-4 p-ut-6 h-full"
    >
      {/* Status indicator */}
      {hasError ? (
        <div className="export-status-icon export-status-icon--error animate-scale-in">
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Error</title>
            <path d="M4 4l12 12M16 4L4 16" />
          </svg>
        </div>
      ) : (
        <div className="export-status-icon export-status-icon--success animate-scale-in">
          <svg
            width="24"
            height="24"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Checkmark</title>
            <path d="M5 10.5l3.5 3.5 7-7" className="export-check-path" />
          </svg>
        </div>
      )}

      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta text-center">
        {hasError ? "Export Failed" : "Review Exported"}
      </h2>

      {/* Subtitle */}
      {hasError ? (
        <p className="text-ut-sm text-state-error text-center -mt-2 max-w-[260px] break-words">
          {error}
        </p>
      ) : (
        <p className="text-ut-sm text-ut-muted text-center -mt-2">
          Your report has been downloaded
        </p>
      )}

      {/* Grade & verdict — success only */}
      {!hasError && finalization && (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`font-heading text-ut-heading font-bold uppercase tracking-ut-heading ${gradeColorClass(finalization)}`}
          >
            {gradeLabel(finalization)}
          </span>
          {finalization.conclusion && (
            <p className="text-ut-xs text-ut-muted text-center max-w-[260px] line-clamp-2">
              {finalization.conclusion}
            </p>
          )}
        </div>
      )}

      {/* Stats summary */}
      <dl className="flex flex-col gap-ut-1 w-full max-w-[260px]">
        <div className="flex justify-between text-ut-xs font-mono">
          <dt className="text-ut-muted">Captures</dt>
          <dd className={captures > 0 ? "text-ut-text" : "text-state-warning"}>
            {captures > 0 ? captures : "None"}
          </dd>
        </div>
        <div className="flex justify-between text-ut-xs font-mono">
          <dt className="text-ut-muted">Scored items</dt>
          <dd className={scoredCount > 0 ? "text-ut-text" : "text-state-warning"}>
            {scoredCount > 0 ? scoredCount : "None"}
          </dd>
        </div>
        <div className="flex justify-between text-ut-xs font-mono">
          <dt className="text-ut-muted">Finalization</dt>
          <dd className={finalization ? "text-ut-green" : "text-state-warning"}>
            {finalization ? "Complete" : "Skipped"}
          </dd>
        </div>
        {!hasError && (
          <>
            <div className="flex justify-between text-ut-xs font-mono">
              <dt className="text-ut-muted">File</dt>
              <dd className="text-ut-text truncate max-w-[160px]" title={filename}>
                {filename || "—"}
              </dd>
            </div>
            {fileSize != null && fileSize > 0 && (
              <div className="flex justify-between text-ut-xs font-mono">
                <dt className="text-ut-muted">Size</dt>
                <dd className="text-ut-text">{formatFileSize(fileSize)}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {/* Next steps hint — success only */}
      {!hasError && (
        <p className="text-ut-xs text-ut-muted text-center max-w-[260px] leading-normal">
          Return to sessions to start a new review or revisit past exports.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-ut-2 w-full max-w-[260px] mt-ut-2">
        {hasError && onRetry && (
          <button
            ref={primaryBtnRef}
            type="button"
            disabled={loading}
            className="w-full bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onRetry}
          >
            {loading ? "Retrying…" : "Retry Export"}
          </button>
        )}
        <button
          ref={hasError ? undefined : primaryBtnRef}
          type="button"
          className={`w-full rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase transition-colors ${
            hasError
              ? "border border-ut-border text-ut-muted hover:bg-ut-offwhite"
              : "bg-trust-magenta text-white hover:bg-trust-magenta-strong"
          }`}
          onClick={onDone}
        >
          Back to Sessions
        </button>
      </div>
    </div>
  );
}
