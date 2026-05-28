import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EvidenceModal from "@/components/EvidenceModal";
import QuestionSection from "@/components/QuestionSection";
import ScoreOverviewBar from "@/components/ScoreOverviewBar";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import { useRubric } from "@/lib/contexts";
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

      {/* Quality Gates section (flat — no nested tabs) */}
      <QuestionSection
        section="quality_gate"
        capturingFor={capturingFor}
        setCapturingFor={setCapturingFor}
        captureQueue={captureQueue}
        onConfirmRemove={handleConfirmRemove}
        onViewEvidence={setViewCapture}
      />

      <hr className="border-ut-border my-ut-4" />

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
