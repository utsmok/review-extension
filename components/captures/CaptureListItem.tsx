import type { Capture } from "@/lib/types";
import CaptureImg from "./CaptureImg";
import RubricTaggingSection from "./RubricTaggingSection";

interface CaptureListItemProps {
  capture: Capture;
  isExpanded: boolean;
  linkedRubricIds: string[];
  onToggleExpand: () => void;
  onAnnotate: () => void;
  onDelete: () => void;
  onNotesChange: (notes: string) => void;
  onToggleRubric: (rubricId: string, linked: boolean) => void;
}

export default function CaptureListItem({
  capture,
  isExpanded,
  linkedRubricIds,
  onToggleExpand,
  onAnnotate,
  onDelete,
  onNotesChange,
  onToggleRubric,
}: CaptureListItemProps) {
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className="captures-list-row"
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleExpand();
          }
        }}
      >
        <CaptureImg capture={capture} className="captures-list-thumb" />
        <div className="captures-list-content">
          <div className="captures-list-url">{capture.sourceUrl}</div>
          {capture.pageTitle && <div className="text-ut-xs text-ut-text">{capture.pageTitle}</div>}
          {capture.metadataField && (
            <div className="text-ut-xs text-trust-magenta">
              →{" "}
              {capture.metadataField === "termsConditionsUrl"
                ? "Terms & Conditions"
                : capture.metadataField === "toolLogoUrl"
                  ? "Tool Logo"
                  : capture.metadataField}
            </div>
          )}
        </div>
        <div className="captures-list-meta">{new Date(capture.timestamp).toLocaleDateString()}</div>
        <div className="list-action-btns shrink-0">
          <button
            type="button"
            className="list-action-btn list-action-btn--annotate"
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
            className="list-action-btn list-action-btn--delete"
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
      </div>
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
                className="text-ut-xs text-ut-slate hover:text-ut-text ml-ut-1"
                onClick={onToggleExpand}
                aria-label="Close details"
              >
                ✕
              </button>
            </div>
          </div>
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
          <RubricTaggingSection linkedRubricIds={linkedRubricIds} onToggle={onToggleRubric} />
        </section>
      )}
    </div>
  );
}
