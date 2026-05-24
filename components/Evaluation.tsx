import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EvidenceModal from "@/components/EvidenceModal";
import QuestionSection from "@/components/QuestionSection";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useCaptureQueue } from "@/hooks/useCaptureQueue";
import { useRubric } from "@/lib/contexts";
import { countUnsure, getAccentKey, getCategoryLabel, getVisibleRubricQuestionIds } from "@/lib/rubric";
import type { Capture } from "@/lib/types";

export default function Evaluation() {
  const { evaluations, removeCapture, unlinkCaptureFromRubric } = useActiveSession();
  const { rubric, usesAi } = useRubric();
  const [capturingFor, setCapturingFor] = useState<string | null>(null);
  const captureQueue = useCaptureQueue();
  const [confirmTarget, setConfirmTarget] = useState<{
    capture: Capture;
    rubricId: string;
  } | null>(null);
  const [viewCapture, setViewCapture] = useState<Capture | null>(null);

  const progress = useMemo(() => {
    if (!rubric) return { scored: 0, total: 0, complete: false };
    const total = getVisibleRubricQuestionIds(rubric, usesAi).length;
    const scored = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;
    return { scored, total, complete: total > 0 && scored >= total };
  }, [evaluations, rubric, usesAi]);

  const categorySummary = useMemo(() => {
    if (!rubric) return [];
    const evalSet = new Set(
      evaluations.filter((e) => e.score !== "" && e.score !== undefined).map((e) => e.rubricId),
    );
    const sections: { key: "quality_gate" | "scoring_rubric"; label: string }[] = [
      { key: "quality_gate", label: "Quality Gates" },
      { key: "scoring_rubric", label: "Scoring Rubric" },
    ];
    const result: {
      sectionLabel: string;
      categories: {
        categoryId: string;
        label: string;
        scored: number;
        total: number;
        accentKey: string;
        unsureCount: number;
      }[];
    }[] = [];
    for (const { key, label } of sections) {
      const rubricSection = rubric[key];
      const cats: {
        categoryId: string;
        label: string;
        scored: number;
        total: number;
        accentKey: string;
        unsureCount: number;
      }[] = [];
      for (const [cat, questions] of Object.entries(rubricSection)) {
        const ids = Object.keys(questions);
        const total = ids.length;
        const scored = ids.filter((qId) => evalSet.has(`${cat}.${qId}`)).length;
        cats.push({
          categoryId: cat,
          label: getCategoryLabel(cat),
          scored,
          total,
          accentKey: getAccentKey(cat),
          unsureCount: key === "scoring_rubric" ? countUnsure(cat, evaluations, rubric) : 0,
        });
      }
      result.push({ sectionLabel: label, categories: cats });
    }
    return result;
  }, [evaluations, rubric]);

  const handleConfirmRemove = (capture: Capture, rubricId: string) => {
    setConfirmTarget({ capture, rubricId });
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <span
          className={`text-ut-sm font-heading font-bold whitespace-nowrap transition-colors ${
            progress.complete ? "text-ut-green" : "text-ut-muted"
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

      {/* Per-category completion summary */}
      {categorySummary.map((section) => (
        <div key={section.sectionLabel} className="flex flex-wrap gap-ut-2">
          {section.categories.map((cat) => (
            <span
              key={cat.categoryId}
              className="text-ut-xs font-mono px-ut-1 bg-ut-grey rounded-ut-sm"
              style={{ color: `var(--section-${cat.accentKey}-accent, var(--ut-navy))` }}
              title={`${cat.scored} of ${cat.total} questions scored`}
            >
              {cat.label}{" "}
              <span className="font-bold">
                {cat.scored}/{cat.total}
              </span>
              {cat.unsureCount > 0 && (
                <span
                  className="text-ut-xs text-ut-muted"
                  title={`${cat.unsureCount} question${cat.unsureCount !== 1 ? "s" : ""} marked Unsure`}
                >
                  ({cat.unsureCount}?)
                </span>
              )}
            </span>
          ))}
        </div>
      ))}

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
