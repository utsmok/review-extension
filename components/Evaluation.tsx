import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EvidenceModal from "@/components/EvidenceModal";
import QuestionSection from "@/components/QuestionSection";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useRovingTabIndex } from "@/lib/hooks";
import { getRubricQuestionIds } from "@/lib/rubric";
import { useRubric } from "@/lib/contexts"
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import type { Capture } from "@/lib/types";

const evalTabs = ["Quality Gates", "Scoring Rubric"] as const;

export default function Evaluation() {
  const { evaluations, removeCapture, unlinkCaptureFromRubric } = useActiveSession();
  const { rubric } = useRubric();
  const { activeTab, setActiveTab, handleKeyDown } = useRovingTabIndex(evalTabs, "Quality Gates");
  const [capturingFor, setCapturingFor] = useState<string | null>(null);
  const captureQueue = useCaptureQueue();
  const [confirmTarget, setConfirmTarget] = useState<{
    capture: Capture;
    rubricId: string;
  } | null>(null);
  const [viewCapture, setViewCapture] = useState<Capture | null>(null);

  const progress = useMemo(() => {
    if (!rubric) return { scored: 0, total: 0, complete: false };
    const total = getRubricQuestionIds(rubric).length;
    const scored = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;
    return { scored, total, complete: total > 0 && scored >= total };
  }, [evaluations, rubric]);

  const handleConfirmRemove = (capture: Capture, rubricId: string) => {
    setConfirmTarget({ capture, rubricId });
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4">
      <div className="flex items-end justify-between border-b border-ut-border mb-ut-2">
        <div
          className="flex"
          role="tablist"
          aria-label="Evaluation sections"
          onKeyDown={handleKeyDown}
        >
          {evalTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
              aria-selected={activeTab === tab}
              tabIndex={activeTab === tab ? 0 : -1}
              className={`px-ut-3 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-label border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-trust-magenta text-trust-magenta"
                  : "border-transparent text-ut-slate hover:text-ut-text"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <span
          className={`text-ut-xs font-mono pb-ut-2 whitespace-nowrap pl-ut-2 transition-colors ${
            progress.complete ? "text-ut-green font-bold" : "text-ut-muted"
          }`}
        >
          {progress.complete ? (
            <>
              {progress.scored}/{progress.total} scored — All complete!
            </>
          ) : (
            <>
              {progress.scored}/{progress.total} scored
            </>
          )}
        </span>
      </div>

      {activeTab === "Quality Gates" && (
        <QuestionSection
          section="quality_gate"
          capturingFor={capturingFor}
          setCapturingFor={setCapturingFor}
          captureQueue={captureQueue}
          onConfirmRemove={handleConfirmRemove}
          onViewEvidence={setViewCapture}
        />
      )}
      {activeTab === "Scoring Rubric" && (
        <QuestionSection
          section="scoring_rubric"
          capturingFor={capturingFor}
          setCapturingFor={setCapturingFor}
          captureQueue={captureQueue}
          onConfirmRemove={handleConfirmRemove}
          onViewEvidence={setViewCapture}
        />
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          message="Remove this evidence?"
          actions={[
            {
              label: "Remove tag",
              handler: () => {
                unlinkCaptureFromRubric(confirmTarget.capture.id, confirmTarget.rubricId);
                setConfirmTarget(null);
              },
              variant: "secondary",
            },
            {
              label: "Delete",
              handler: () => {
                removeCapture(confirmTarget.capture.id);
                setConfirmTarget(null);
              },
              variant: "danger",
            },
            { label: "Cancel", handler: () => setConfirmTarget(null), variant: "cancel" },
          ]}
        />
      )}

      {/* Evidence modal */}
      {viewCapture && <EvidenceModal capture={viewCapture} onClose={() => setViewCapture(null)} />}
    </div>
  );
}
