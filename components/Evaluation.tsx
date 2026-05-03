import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import EvidenceModal from "@/components/EvidenceModal";
import QualityGateSection from "@/components/QualityGateSection";
import ScoringSection from "@/components/ScoringSection";
import { useActiveSession } from "@/hooks/useActiveSession";
import type { Capture } from "@/lib/types";

const evalTabs = ["Quality Gates", "Scoring Rubric"] as const;
type EvalTab = (typeof evalTabs)[number];

export default function Evaluation() {
  const { removeCapture, unlinkCaptureFromRubric } = useActiveSession();
  const [activeTab, setActiveTab] = useState<EvalTab>("Quality Gates");
  const [capturingFor, setCapturingFor] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    capture: Capture;
    rubricId: string;
  } | null>(null);
  const [viewCapture, setViewCapture] = useState<Capture | null>(null);

  const handleConfirmRemove = (capture: Capture, rubricId: string) => {
    setConfirmTarget({ capture, rubricId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = evalTabs.indexOf(activeTab);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setActiveTab(evalTabs[(idx + 1) % evalTabs.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveTab(evalTabs[(idx - 1 + evalTabs.length) % evalTabs.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(evalTabs[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab(evalTabs[evalTabs.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4">
      <nav
        className="flex border-b border-ut-border mb-ut-2"
        role="tablist"
        aria-label="Evaluation sections"
        onKeyDown={handleKeyDown}
      >
        {evalTabs.map((tab) => (
          <button
            key={tab}
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
      </nav>

      {activeTab === "Quality Gates" && (
        <QualityGateSection
          capturingFor={capturingFor}
          setCapturingFor={setCapturingFor}
          onConfirmRemove={handleConfirmRemove}
          onViewEvidence={setViewCapture}
        />
      )}
      {activeTab === "Scoring Rubric" && (
        <ScoringSection
          capturingFor={capturingFor}
          setCapturingFor={setCapturingFor}
          onConfirmRemove={handleConfirmRemove}
          onViewEvidence={setViewCapture}
        />
      )}

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          message="Remove this evidence?"
          onRemoveTag={() => {
            unlinkCaptureFromRubric(confirmTarget.capture.id, confirmTarget.rubricId);
            setConfirmTarget(null);
          }}
          onDelete={() => {
            removeCapture(confirmTarget.capture.id);
            setConfirmTarget(null);
          }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Evidence modal */}
      {viewCapture && (
        <EvidenceModal capture={viewCapture} onClose={() => setViewCapture(null)} />
      )}
    </div>
  );
}
