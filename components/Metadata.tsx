import { useState } from "react";
import { exportSession } from "@/lib/export";
import { useSessionStore } from "@/stores/session";

export default function Metadata() {
  const session = useSessionStore((s) => s.session);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);
  const endSession = useSessionStore((s) => s.endSession);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const [exporting, setExporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!session) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportSession(session, captures, evaluations);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TRUST_Review_${session.toolName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      endSession();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleClearSession = () => {
    if (confirmClear) {
      endSession();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const scoredCount = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-ut-navy">
        Tool Details
      </h2>

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
          Availability
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
          Session Notes
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={3}
          placeholder="General observations, context..."
          value={session.notes ?? ""}
          onChange={(e) => updateMetadata({ notes: e.target.value })}
        />
      </label>

      {/* Session summary */}
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

        <button
          type="button"
          className="w-full bg-ut-darkblue text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-navy disabled:opacity-50 transition-colors"
          disabled={exporting}
          onClick={handleExport}
        >
          {exporting ? "Exporting..." : "End Session & Export"}
        </button>

        <button
          type="button"
          className={`w-full mt-ut-2 rounded-ut-sm px-ut-4 py-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase ${
            confirmClear ? "bg-ut-red text-white" : "text-ut-slate hover:text-ut-red"
          }`}
          onClick={handleClearSession}
        >
          {confirmClear ? "Click again to discard" : "Discard session"}
        </button>
      </div>
    </div>
  );
}
