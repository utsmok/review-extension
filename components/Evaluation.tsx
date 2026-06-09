import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useRubric } from "@/components/contexts";
import EvidenceModal from "@/components/EvidenceModal";
import { QuestionSection } from "@/components/QuestionSection";
import ScoreOverviewBar from "@/components/ScoreOverviewBar";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import type { Capture } from "@/lib/types";

export default function Evaluation() {
  const { evaluations, captures, removeCapture, unlinkCaptureFromRubric } = useActiveSession();
  const { rubric, usesAi } = useRubric();
  const [capturingFor, setCapturingFor] = useState<string | null>(null);
  const captureQueue = useCaptureQueue();
  const [confirmTarget, setConfirmTarget] = useState<{
    capture: Capture;
    rubricId: string;
  } | null>(null);
  const [viewCapture, setViewCapture] = useState<Capture | null>(null);

  const handleConfirmRemove = (capture: Capture, rubricId: string) => {
    setConfirmTarget({ capture, rubricId });
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4">
      {/* Sticky score overview bar */}
      <ScoreOverviewBar
        evaluations={evaluations}
        captures={captures}
        rubric={rubric}
        usesAi={usesAi}
      />
      {evaluations.length === 0 && (
        <div className="tab-empty-state">
          <div className="tab-empty-state__icon bg-[color-mix(in_srgb,var(--trust-magenta)_10%,var(--ut-white))]">
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
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p className="tab-empty-state__title">Begin your evaluation</p>
          <p className="tab-empty-state__desc">
            Expand a Quality Gate or Scoring Rubric question below to start scoring. Use the score
            overview bar to track your progress.
          </p>
        </div>
      )}

      {/* Quality Gates section (flat — no nested tabs) */}
      <QuestionSection
        section="quality_gate"
        capturingFor={capturingFor}
        setCapturingFor={setCapturingFor}
        captureQueue={captureQueue}
        onConfirmRemove={handleConfirmRemove}
        onViewEvidence={setViewCapture}
      />

      {/* Scoring Rubric section (flat — below QG) */}
      <QuestionSection
        section="scoring_rubric"
        capturingFor={capturingFor}
        setCapturingFor={setCapturingFor}
        captureQueue={captureQueue}
        onConfirmRemove={handleConfirmRemove}
        onViewEvidence={setViewCapture}
      />

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
