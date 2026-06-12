import { useCallback, useMemo, useRef, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureActiveTab } from "@/lib/capture";
import { getLinkedRubricIdsForCapture } from "@/lib/rubric";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import CaptureEmptyState from "./captures/CaptureEmptyState";
import CaptureGridItem from "./captures/CaptureGridItem";
import CaptureListItem from "./captures/CaptureListItem";
import EvidenceModal from "./EvidenceModal";

export default function Captures() {
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
        <CaptureEmptyState capturing={capturing} onCapture={handleCapture} />
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
                {displayed.map((capture, idx) => (
                  <CaptureGridItem
                    key={capture.id}
                    capture={capture}
                    index={idx}
                    isExpanded={expanded === capture.id}
                    isRemoving={removingId === capture.id}
                    linkedRubricIds={linkedIdsMap.get(capture.id) ?? []}
                    onToggleExpand={() => setExpanded(expanded === capture.id ? null : capture.id)}
                    onAnnotate={() => setViewCaptureId(capture.id)}
                    onDelete={() => setDeleteTarget(capture.id)}
                    onNotesChange={(notes) => updateCapture(capture.id, { notes })}
                    onToggleRubric={(rubricId, linked) =>
                      linked
                        ? unlinkCaptureFromRubric(capture.id, rubricId)
                        : linkCaptureToRubric(capture.id, rubricId)
                    }
                    onCollapseExpand={() => setExpanded(null)}
                  />
                ))}
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
              {reversed.map((capture) => (
                <CaptureListItem
                  key={capture.id}
                  capture={capture}
                  isExpanded={expanded === capture.id}
                  linkedRubricIds={linkedIdsMap.get(capture.id) ?? []}
                  onToggleExpand={() => setExpanded(expanded === capture.id ? null : capture.id)}
                  onAnnotate={() => setViewCaptureId(capture.id)}
                  onDelete={() => setDeleteTarget(capture.id)}
                  onNotesChange={(notes) => updateCapture(capture.id, { notes })}
                  onToggleRubric={(rubricId, linked) =>
                    linked
                      ? unlinkCaptureFromRubric(capture.id, rubricId)
                      : linkCaptureToRubric(capture.id, rubricId)
                  }
                />
              ))}
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
