import type { Capture } from "@/lib/types";
import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";

function CaptureImg({ capture, className }: { capture: Capture; className?: string }) {
  const screenshotUrl = useScreenshotUrl(capture.id);
  const src = screenshotUrl ?? capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;
  return (
    <img
      src={src}
      alt={`Screenshot of ${capture.pageTitle || capture.sourceUrl}`}
      loading="lazy"
      className={className}
    />
  );
}

import { useMemo, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureActiveTab } from "@/lib/capture";
import { useRubric } from "@/lib/contexts";
import { getAccentKey, getCategoryLabel, getLinkedRubricIdsForCapture } from "@/lib/rubric";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import EvidenceModal from "./EvidenceModal";
import RubricChipGroup from "./RubricChipGroup";
import EmptyState from "./EmptyState";
export default function Captures() {
  const { rubric, usesAi } = useRubric();
  const {
    captures,
    evaluations,
    addCapture,
    updateCapture,
    removeCapture,
    linkCaptureToRubric,
    unlinkCaptureFromRubric,
  } = useActiveSession();
  const [capturing, setCapturing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [viewCaptureId, setViewCaptureId] = useState<string | null>(null);
  const viewCapture = viewCaptureId ? (captures.find((c) => c.id === viewCaptureId) ?? null) : null;

  const linkedIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of captures) {
      map.set(c.id, getLinkedRubricIdsForCapture(c.id, evaluations));
    }
    return map;
  }, [captures, evaluations]);

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const capture = await captureActiveTab();
      addCapture(capture);
    } catch (err) {
      console.error("Capture failed:", err);
      toastError(
        err instanceof Error ? err.message : "Capture failed. Check tab permissions and try again.",
      );
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta mb-ut-2">
        Captures
      </h2>
      <button
        type="button"
        className={`bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors ${capturing ? "animate-pulse-capture" : ""}`}
        disabled={capturing}
        onClick={handleCapture}
      >
        {capturing ? "Capturing..." : "+ Quick Capture"}
      </button>

      {captures.length === 0 && (
        <div className="text-center py-ut-6 text-ut-muted">
          <p className="text-ut-sm mb-ut-2">No captures yet.</p>
          <p className="text-ut-xs">
            Use <strong>+ Quick Capture</strong> or press{" "}
            <kbd className="px-1 py-0.5 bg-ut-grey rounded text-ut-xs font-mono">Ctrl+Shift+S</kbd>{" "}
            to screenshot the current page.
          </p>
        </div>
      )}

      {captures.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            className={`text-ut-xs px-2 py-1 rounded ${viewMode === "grid" ? "bg-trust-magenta text-white" : "bg-ut-grey text-ut-text"}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            type="button"
            className={`text-ut-xs px-2 py-1 rounded ${viewMode === "list" ? "bg-trust-magenta text-white" : "bg-ut-grey text-ut-text"}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            List
          </button>
        </div>
      )}

      {captures.length === 0 && (
          <EmptyState
            title="No captures yet"
            description="Use the capture button above to save screenshots as evidence."
          />
      )}

      {viewMode === "grid" &&
        captures.length > 0 &&
        (() => {
          const reversed = [...captures].reverse();
          const displayed = showAll ? reversed : reversed.slice(0, 12);
          const needsPagination = reversed.length > 12;
          return (
            <>
              {needsPagination && (
                <p className="text-ut-xs text-ut-slate text-center">
                  Showing {displayed.length} of {reversed.length} captures
                </p>
              )}

              <div className="grid grid-cols-2 gap-ut-2">
                {displayed.map((capture) => {
                  const linkedRubricIds = linkedIdsMap.get(capture.id) ?? [];
                  const isExpanded = expanded === capture.id;

                  return (
                    <div key={capture.id} className="capture-card-enter">
                      {/* Thumbnail card */}
                      <button
                        type="button"
                        className="evidence-thumb-wrap cursor-pointer"
                        onClick={() => setExpanded(isExpanded ? null : capture.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpanded(isExpanded ? null : capture.id);
                          }
                        }}
                      >
                        <CaptureImg capture={capture} className="w-full aspect-video object-cover border border-ut-border" />
                        <div className="evidence-thumb-overlay">
                          <button
                            type="button"
                            className="btn-view"
                            title="Annotate"
                            aria-label="Annotate capture"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewCaptureId(capture.id);
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
                              setDeleteTarget(capture.id);
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
                          <p className="text-ut-xs text-white truncate">
                            {capture.pageTitle || capture.sourceUrl}
                          </p>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <section
                          aria-label="Capture details"
                          className="border border-ut-border border-t-0 bg-ut-white p-ut-2"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setExpanded(null);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-ut-xs text-ut-muted font-mono truncate flex-1 mr-ut-2">
                              {capture.sourceUrl}
                            </p>
                            <div className="flex gap-ut-1 shrink-0">
                              <button
                                type="button"
                                className="text-ut-xs text-ut-blue hover:text-ut-navy"
                                onClick={() => setViewCaptureId(capture.id)}
                              >
                                Annotate
                              </button>
                              <button
                                type="button"
                                className="text-ut-xs text-ut-slate hover:text-ut-red"
                                onClick={() => setDeleteTarget(capture.id)}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                className="text-ut-xs text-ut-slate hover:text-ut-text ml-1"
                                onClick={() => setExpanded(null)}
                                aria-label="Close details"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          {capture.pageTitle && (
                            <p className="text-ut-xs font-bold text-ut-text truncate mb-0.5">
                              {capture.pageTitle}
                            </p>
                          )}
                          <p className="text-ut-xs text-ut-slate">
                            {new Date(capture.timestamp).toLocaleString()} ·{" "}
                            {linkedRubricIds.length} tag
                            {linkedRubricIds.length !== 1 && "s"}
                          </p>

                          <textarea
                            className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 mt-ut-2 resize-y bg-ut-grey"
                            rows={2}
                            placeholder="Notes..."
                            value={capture.notes}
                            onChange={(e) => updateCapture(capture.id, { notes: e.target.value })}
                          />

                          {/* Rubric tagging */}
                          <details
                            open
                            className="mt-ut-2"
                            onToggle={(e) => {
                              if (!(e.target as HTMLDetailsElement).open) {
                                setExpanded(null);
                              }
                            }}
                          >
                            <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-muted cursor-pointer hover:text-ut-navy">
                              Tag to rubric items ({linkedRubricIds.length})
                            </summary>

                            <div className="mt-1 space-y-1.5">
                              {/* Quality Gates */}
                              <div>
                                <p className="section-kicker mb-1">Quality Gates</p>
                                {Object.entries(rubric.quality_gate).map(([cat, questions]) => (
                                  <div key={cat} className="ml-ut-1 mb-1" data-accent-key="control">
                                    <p className="text-ut-xs text-ut-slate">
                                      {getCategoryLabel(cat)}
                                    </p>
                                    <RubricChipGroup
                                      questions={questions}
                                      categoryKey={cat}
                                      linkedIds={linkedRubricIds}
                                      usesAi={usesAi}
                                      isQG
                                      onToggle={(rubricId, linked) =>
                                        linked
                                          ? unlinkCaptureFromRubric(capture.id, rubricId)
                                          : linkCaptureToRubric(capture.id, rubricId)
                                      }
                                    />
                                  </div>
                                ))}
                              </div>

                              {/* Scoring Rubric */}
                              <div>
                                <p className="section-kicker mb-1">Scoring Rubric</p>
                                {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
                                  <div
                                    key={cat}
                                    className="ml-ut-1 mb-1"
                                    data-accent-key={getAccentKey(cat)}
                                  >
                                    <p className="text-ut-xs text-ut-slate">
                                      {getCategoryLabel(cat)}
                                    </p>
                                    <RubricChipGroup
                                      questions={questions}
                                      categoryKey={cat}
                                      linkedIds={linkedRubricIds}
                                      usesAi={usesAi}
                                      onToggle={(rubricId, linked) =>
                                        linked
                                          ? unlinkCaptureFromRubric(capture.id, rubricId)
                                          : linkCaptureToRubric(capture.id, rubricId)
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </details>
                        </section>
                      )}
                    </div>
                  );
                })}
              </div>

              {needsPagination && (
                <button
                  type="button"
                  className="text-ut-xs text-trust-magenta hover:text-trust-magenta-strong font-bold uppercase tracking-ut-uppercase text-center py-ut-2"
                  onClick={() => setShowAll((v) => !v)}
                >
                  {showAll ? "Show less" : "Show more"}
                </button>
              )}
            </>
          );
        })()}

      {viewMode === "list" &&
        captures.length > 0 &&
        (() => {
          const reversed = [...captures].reverse();
          return (
            <div className="border border-ut-border rounded-ut-sm overflow-hidden">
              {reversed.map((capture) => {
                return (
                  <div key={capture.id} className="captures-list-row">
                    <div className="captures-list-content">
                      <div className="captures-list-url">{capture.sourceUrl}</div>
                      {capture.pageTitle && (
                        <div className="text-ut-xs text-ut-text">{capture.pageTitle}</div>
                      )}
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
                    <div className="captures-list-meta">
                      {new Date(capture.timestamp).toLocaleDateString()}
                    </div>
                    <div className="flex gap-ut-1 shrink-0">
                      <button
                        type="button"
                        className="text-ut-xs text-ut-blue hover:underline"
                        onClick={() => setViewCaptureId(capture.id)}
                      >
                        Annotate
                      </button>
                      <button
                        type="button"
                        className="text-ut-xs text-ut-slate hover:text-ut-red"
                        onClick={() => setDeleteTarget(capture.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      {deleteTarget && (
        <ConfirmDialog
          message="Delete this capture? This cannot be undone."
          actions={[
            { label: "Cancel", handler: () => setDeleteTarget(null), variant: "cancel" },
            {
              label: "Delete",
              handler: () => {
                removeCapture(deleteTarget);
                setDeleteTarget(null);
              },
              variant: "danger",
            },
          ]}
        />
      )}
      {viewCapture && (
        <EvidenceModal capture={viewCapture} onClose={() => setViewCaptureId(null)} />
      )}
    </div>
  );
}
