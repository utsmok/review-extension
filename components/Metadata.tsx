import { useState } from "react";
import { useRubric } from "@/lib/rubric-context";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useTabNavigation } from "@/lib/tab-navigation-context";
import { toastError } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import ExportCompleteScreen from "./ExportCompleteScreen";

export default function Metadata() {
  const { rubric } = useRubric();
  const setActiveTab = useTabNavigation();
  const { session, updateMetadata, captures, evaluations, finalization, exportAndClose, deleteSession, closeSession } = useActiveSession();
  const [exporting, setExporting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportFilename, setExportFilename] = useState("");

  if (!session) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAndClose(rubric);
      setExportFilename(`TRUST_Review_${session.toolName}.zip`);
      setExportComplete(true);
    } catch (err) {
      console.error("Export failed:", err);
      toastError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDiscardSession = () => {
    setShowDiscardConfirm(true);
  };

  const scoredCount = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;

  const handleDone = () => {
    closeSession();
  };

  // Export completion overlay
  if (exportComplete) {
    return (
      <ExportCompleteScreen
        captures={captures.length}
        scoredCount={scoredCount}
        finalization={finalization}
        filename={exportFilename}
        onDone={handleDone}
      />
    );
  }

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
        Tool Details
      </h2>

      <label className="flex items-center gap-ut-2">
        <input
          type="checkbox"
          checked={session.usesAi ?? true}
          onChange={(e) => updateMetadata({ usesAi: e.target.checked })}
          className="w-4 h-4 rounded-ut-sm border-ut-border text-ut-blue focus:ring-ut-blue"
        />
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Tool uses AI / LLM
        </span>
      </label>
      {!(session.usesAi ?? true) && (
        <p className="text-ut-xs text-ut-muted">
          AI-specific questions are marked as not applicable.
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Company
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Elsevier"
          value={session.company ?? ""}
          onChange={(e) => updateMetadata({ company: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Pricing
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Freemium, Subscription"
          value={session.pricing ?? ""}
          onChange={(e) => updateMetadata({ pricing: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Access Level
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="e.g. Institutional license required"
          value={session.availability ?? ""}
          onChange={(e) => updateMetadata({ availability: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Terms &amp; Conditions URL
        </span>
        <input
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder="https://..."
          value={session.termsConditionsUrl ?? ""}
          onChange={(e) => updateMetadata({ termsConditionsUrl: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Review Notes
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={3}
          placeholder="General observations, context..."
          value={session.notes ?? ""}
          onChange={(e) => updateMetadata({ notes: e.target.value })}
        />
      </label>

      {/* Review summary */}
      <div className="border-t-2 border-ut-border pt-ut-3 mt-1">
        <div className="flex justify-between text-ut-xs text-ut-muted font-mono mb-1">
          <span>Started</span>
          <span className="text-ut-text">{new Date(session.startTime).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-ut-xs text-ut-muted font-mono mb-1">
          <span>Captures</span>
          <span className={captures.length === 0 ? "text-state-warning" : "text-ut-text"}>
            {captures.length}
          </span>
        </div>
        <div className="flex justify-between text-ut-xs text-ut-muted font-mono mb-ut-3">
          <span>Scored items</span>
          <span className={scoredCount === 0 ? "text-state-warning" : "text-ut-text"}>
            {scoredCount}
          </span>
        </div>

        {captures.length === 0 && (
          <p className="text-ut-xs text-state-warning mb-ut-2">
            No captures — export will contain only metadata and scores.
          </p>
        )}
        {scoredCount === 0 && captures.length > 0 && (
          <p className="text-ut-xs text-state-warning mb-ut-2">
            No scores yet — export will contain only captures and metadata.
          </p>
        )}

        {!finalization && (
          <div className="border border-score-1/40 bg-score-1/5 rounded-ut-sm px-ut-3 py-ut-2 mb-ut-2">
            <p className="text-ut-xs text-score-1 font-heading font-bold uppercase tracking-ut-label">
              Review not finalized
            </p>
            <p className="text-ut-xs text-ut-muted mt-0.5">
              Conclusions will not be included in the report.
            </p>
            <button
              type="button"
              className="mt-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta hover:text-trust-magenta-strong transition-colors"
              onClick={() => setActiveTab("Finalize")}
            >
              Finalize review &rarr;
            </button>
          </div>
        )}
        {finalization && (
          <p className="text-ut-xs text-ut-muted font-mono mb-ut-2">
            Finalized {new Date(finalization.finalizedAt).toLocaleString()}
          </p>
        )}

        <button
          type="button"
          className="w-full bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors"
          disabled={exporting}
          onClick={handleExport}
        >
          {exporting ? "Exporting..." : "End Review & Export"}
        </button>

        <button
          type="button"
          className="w-full mt-ut-2 rounded-ut-sm px-ut-4 py-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase text-ut-slate hover:text-ut-red"
          onClick={handleDiscardSession}
        >
          Discard review
        </button>
      </div>

      {showDiscardConfirm && (
        <ConfirmDialog
          message="This will permanently delete all captures, scores, and notes for this review."
          actions={[
            { label: "Cancel", handler: () => setShowDiscardConfirm(false), variant: "cancel" },
            { label: "Discard", handler: () => { deleteSession(session.id); setShowDiscardConfirm(false); }, variant: "danger" },
          ]}
        />
      )}
    </div>
  );
}
