import type { Capture } from "@/lib/types";
import CaptureImg from "./CaptureImg";
import RubricTaggingSection from "./RubricTaggingSection";

interface CaptureGridItemProps {
  capture: Capture;
  index: number;
  isExpanded: boolean;
  isRemoving: boolean;
  linkedRubricIds: string[];
  onToggleExpand: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
  onNotesChange: (notes: string) => void;
  onToggleRubric: (rubricId: string, linked: boolean) => void;
  onCollapseExpand: () => void;
}

export default function CaptureGridItem({
  capture,
  index,
  isExpanded,
  isRemoving,
  linkedRubricIds,
  onToggleExpand,
  onAnnotate,
  onDelete,
  onNotesChange,
  onToggleRubric,
  onCollapseExpand,
}: CaptureGridItemProps) {
  return (
    <div
      className={`capture-card-stagger ${isRemoving ? "capture-card-removing" : ""}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Thumbnail card */}
      <button
        type="button"
        className="evidence-thumb-wrap cursor-pointer"
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <CaptureImg capture={capture} className="" />
        <div className="evidence-thumb-overlay">
          <button
            type="button"
            className="btn-view"
            title="Annotate"
            aria-label="Annotate capture"
            onClick={(e) => {
              e.stopPropagation();
              onAnnotate();
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="btn-remove"
            title="Delete"
            aria-label="Delete capture"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-ut-1 py-0.5 pointer-events-none">
          <p className="text-ut-xs text-white truncate">{capture.pageTitle || capture.sourceUrl}</p>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <section
          aria-label="Capture details"
          className="border-t border-ut-border bg-ut-offwhite p-ut-3"
          onKeyDown={(e) => {
            if (
              e.key === "Escape" &&
              !(e.target instanceof HTMLTextAreaElement) &&
              !(e.target instanceof HTMLInputElement)
            ) {
              onToggleExpand();
            }
          }}
        >
          <div className="flex items-center justify-between mb-ut-2">
            <p className="text-ut-xs text-ut-muted font-mono truncate flex-1 mr-ut-2">
              {capture.sourceUrl}
            </p>
            <div className="flex gap-ut-1 shrink-0">
              <button
                type="button"
                className="text-ut-xs text-ut-blue hover:text-ut-navy"
                onClick={onAnnotate}
              >
                Annotate
              </button>
              <button
                type="button"
                className="text-ut-xs text-ut-slate hover:text-ut-red"
                onClick={onDelete}
              >
                Delete
              </button>
              <button
                type="button"
                className="text-ut-xs text-ut-slate hover:text-ut-text ml-ut-1"
                onClick={onToggleExpand}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>
          </div>
          {capture.pageTitle && (
            <p className="text-ut-xs font-bold text-ut-text truncate mb-ut-1">
              {capture.pageTitle}
            </p>
          )}
          <p className="text-ut-xs text-ut-slate">
            {new Date(capture.timestamp).toLocaleString()} · {linkedRubricIds.length} tag
            {linkedRubricIds.length !== 1 && "s"}
          </p>

          <textarea
            className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 mt-ut-2 resize-y bg-ut-grey"
            rows={2}
            placeholder="Notes..."
            value={capture.notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />

          {/* Rubric tagging */}
          <RubricTaggingSection
            linkedRubricIds={linkedRubricIds}
            onToggle={onToggleRubric}
            showDetails
            onDetailsToggle={(e) => {
              if (!(e.target as HTMLDetailsElement).open) {
                onCollapseExpand();
              }
            }}
          />
        </section>
      )}
    </div>
  );
}
