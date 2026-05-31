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

import { useCallback, useMemo, useRef, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureActiveTab } from "@/lib/capture";
import { useRubric } from "@/lib/contexts";
import { getAccentKey, getCategoryLabel, getLinkedRubricIdsForCapture } from "@/lib/rubric";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import EvidenceModal from "./EvidenceModal";
import RubricChipGroup from "./RubricChipGroup";
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
  const [removingId, setRemovingId] = useState<string | null>(null);

  const linkedIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of captures) {
      map.set(c.id, getLinkedRubricIdsForCapture(c.id, evaluations));
    }
    return map;
  }, [captures, evaluations]);
  const reversedCaptures = useMemo(() => [...captures].reverse(), [captures]);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDelete = useCallback(
    (id: string) => {
      setRemovingId(id);
      setTimeout(() => {
        removeCapture(id);
        setRemovingId(null);
        setDeleteTarget(null);
      }, 250);
    },
    [removeCapture],
  );

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
        <div className="tab-empty-state">
          <div className="tab-empty-state__icon bg-[color-mix(in_srgb,var(--trust-magenta)_10%,var(--ut-white))] captures-empty-icon">
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
            onClick={handleCapture}
          >
            Capture current page
          </button>
          <p className="inline-hint">
            Keyboard shortcut: <span className="shortcut-hint">Ctrl+Shift+S</span>
          </p>
        </div>
      )}

      {captures.length > 0 && (
        <div className="flex items-center gap-ut-2 mb-ut-2">
          <button
            type="button"
            className={`text-ut-xs px-ut-2 py-ut-1 rounded-ut-sm ${viewMode === "grid" ? "bg-trust-magenta text-white" : "bg-ut-grey text-ut-text"}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            Grid
          </button>
          <button
            type="button"
            className={`text-ut-xs px-ut-2 py-ut-1 rounded-ut-sm ${viewMode === "list" ? "bg-trust-magenta text-white" : "bg-ut-grey text-ut-text"}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            List
          </button>
        </div>
      )}

      {viewMode === "grid" &&
        captures.length > 0 &&
        (() => {
          const reversed = reversedCaptures;
          const displayed = showAll ? reversed : reversed.slice(0, 12);
          const needsPagination = reversed.length > 12;
          return (
            <>
              {needsPagination && (
                <p className="text-ut-xs text-ut-slate text-center mb-ut-2">
                  Showing {displayed.length} of {reversed.length} captures
                </p>
              )}

              <div ref={gridRef} className="grid grid-cols-2 gap-ut-2">
                {displayed.map((capture, idx) => {
                  const linkedRubricIds = linkedIdsMap.get(capture.id) ?? [];
                  const isExpanded = expanded === capture.id;
                  const isRemoving = removingId === capture.id;

                  return (
                    <div
                      key={capture.id}
                      className={`capture-card-stagger ${isRemoving ? "capture-card-removing" : ""}`}
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
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
                        <CaptureImg capture={capture} className="" />
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
                          className="border-t border-ut-border bg-ut-offwhite p-ut-3"
                          onKeyDown={(e) => {
                            if (e.key === "Escape" && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) {
                              setExpanded(null);
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
                                className="text-ut-xs text-ut-slate hover:text-ut-text ml-ut-1"
                                onClick={() => setExpanded(null)}
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

                            <div className="mt-ut-2 space-y-ut-2">
                              {/* Quality Gates */}
                              <div>
                                <p className="section-kicker mb-ut-1">Quality Gates</p>
                                {Object.entries(rubric.quality_gate).map(([cat, questions]) => (
                                  <div key={cat} className="mb-ut-1" data-accent-key="control">
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
                                <p className="section-kicker mb-ut-1">Scoring Rubric</p>
                                {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
                                  <div
                                    key={cat}
                                    className="mb-ut-1"
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
          const reversed = reversedCaptures;
          return (
            <div className="border border-ut-border rounded-ut-sm overflow-hidden">
              {reversed.map((capture) => {
                const linkedRubricIds = linkedIdsMap.get(capture.id) ?? [];
                const isExpanded = expanded === capture.id;
                return (
                  <div key={capture.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="captures-list-row"
                      onClick={() => setExpanded(isExpanded ? null : capture.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpanded(isExpanded ? null : capture.id);
                        }
                      }}
                    >
                      <CaptureImg capture={capture} className="captures-list-thumb" />
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
                      <div className="list-action-btns shrink-0">
                        <button
                          type="button"
                          className="list-action-btn list-action-btn--annotate"
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
                          className="list-action-btn list-action-btn--delete"
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
                    </div>
                    {isExpanded && (
                      <section
                        aria-label="Capture details"
                        className="border-t border-ut-border bg-ut-offwhite p-ut-3"
                        onKeyDown={(e) => {
                          if (e.key === "Escape" && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) {
                            setExpanded(null);
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
                              onClick={() => setExpanded(null)}
                              aria-label="Close details"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <p className="text-ut-xs text-ut-slate">
                          {new Date(capture.timestamp).toLocaleString()} · {linkedRubricIds.length}{" "}
                          tag
                          {linkedRubricIds.length !== 1 && "s"}
                        </p>
                        <textarea
                          className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 mt-ut-2 resize-y bg-ut-grey"
                          rows={2}
                          placeholder="Notes..."
                          value={capture.notes}
                          onChange={(e) => updateCapture(capture.id, { notes: e.target.value })}
                        />
                        <details open className="mt-ut-2">
                          <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-muted cursor-pointer hover:text-ut-navy">
                            Tag to rubric items ({linkedRubricIds.length})
                          </summary>
                          <div className="mt-ut-2 space-y-ut-2">
                            <div>
                              <p className="section-kicker mb-ut-1">Quality Gates</p>
                              {Object.entries(rubric.quality_gate).map(([cat, questions]) => (
                                <div key={cat} className="mb-ut-1" data-accent-key="control">
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
                            <div>
                              <p className="section-kicker mb-ut-1">Scoring Rubric</p>
                              {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
                                <div
                                  key={cat}
                                  className="mb-ut-1"
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
                handleDelete(deleteTarget);
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
