import { useMemo, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureActiveTab } from "@/lib/capture";
import {
  getAccentKey,
  getCategoryLabel,
  getLinkedRubricIdsForCapture,
} from "@/lib/rubric";
import { useRubric } from "@/lib/rubric-context";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
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
      <button
        type="button"
        className={`bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors ${capturing ? "animate-pulse-capture" : ""}`}
        disabled={capturing}
        onClick={handleCapture}
      >
        {capturing ? "Capturing..." : "+ Quick Capture"}
      </button>

      {captures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-ut-8 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ut-slate)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-ut-2"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <p className="text-ut-sm text-ut-muted font-bold mb-ut-1">No captures yet</p>
          <p className="text-ut-xs text-ut-slate">
            Use the capture button above to save screenshots as evidence.
          </p>
        </div>
      )}

      {captures.length > 0 &&
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
              {displayed.map((capture) => {
                const linkedRubricIds = linkedIdsMap.get(capture.id) ?? [];

                return (
                  <div
                    key={capture.id}
                    className="border border-ut-border overflow-hidden bg-ut-white"
                  >
                    <button
                      type="button"
                      className="w-full border-b border-ut-border cursor-pointer block"
                      onClick={() => setExpanded(expanded === capture.id ? null : capture.id)}
                    >
                      <img
                        src={capture.annotatedScreenshotBase64 ?? capture.screenshotBase64}
                        alt={`Screenshot of ${capture.pageTitle || capture.sourceUrl}`}
                        loading="lazy"
                        className="w-full block"
                      />
                    </button>

                    <div className="p-ut-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-ut-xs text-ut-muted font-mono truncate flex-1 mr-ut-2">
                          {capture.sourceUrl}
                        </p>
                        <button
                          type="button"
                          className="text-ut-xs text-ut-slate hover:text-ut-red shrink-0"
                          onClick={() => setDeleteTarget(capture.id)}
                        >
                          Delete
                        </button>
                      </div>
                      {capture.pageTitle && (
                        <p className="text-ut-xs font-bold text-ut-text truncate mb-0.5">
                          {capture.pageTitle}
                        </p>
                      )}
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

                      {/* Rubric tagging */}
                      <details
                        open={expanded === capture.id}
                        className="mt-ut-2"
                        onToggle={(e) =>
                          setExpanded((e.target as HTMLDetailsElement).open ? capture.id : null)
                        }
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
                                <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
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

                          {/* Scoring Rubric */}
                          <div>
                            <p className="section-kicker mb-1">Scoring Rubric</p>
                            {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
                              <div
                                key={cat}
                                className="ml-ut-1 mb-1"
                                data-accent-key={getAccentKey(cat)}
                              >
                                <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
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
                    </div>
                  </div>
                );
              })}
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
    </div>
  );
}
