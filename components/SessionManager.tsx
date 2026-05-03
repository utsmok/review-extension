import { useMemo, useState } from "react";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { useActiveSession } from "@/hooks/useActiveSession";
import { deleteFromIDB, loadFromIDB } from "@/lib/session-storage";
import { exportSession } from "@/lib/export";
import { getRubricById } from "@/data/rubrics";
import NewSessionModal from "./NewSessionModal";

function FaviconOrFallback({ url, toolName }: { url?: string; toolName: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <span className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-trust-magenta/20 text-trust-magenta text-[9px] font-bold leading-none">
        {toolName.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      width={16}
      height={16}
      className="shrink-0 w-4 h-4"
      onError={() => setFailed(true)}
    />
  );
}

export default function SessionManager() {
  const [showModal, setShowModal] = useState(false);
  const sessionIndex = useRegistryStore((s) => s.sessionIndex);
  const settings = useRegistryStore((s) => s.settings);
  const updateSettings = useRegistryStore((s) => s.updateSettings);
  const deleteSession = useRegistryStore((s) => s.deleteSession);
  const { switchToSession } = useActiveSession();

  const sessions = useMemo(
    () => Object.values(sessionIndex).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [sessionIndex],
  );

  const handleExport = async (id: string) => {
    const meta = sessionIndex[id];
    if (!meta) return;
    const data = await loadFromIDB(id);
    if (!data) return;
    const variant = getRubricById(meta.rubricId);
    try {
      const blob = await exportSession(meta, data.captures, data.evaluations, variant.data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `TRUST_Review_${meta.toolName.replace(/\s+/g, "_")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const meta = sessionIndex[id];
    if (!meta) return;
    if (!confirm(`Delete review of "${meta.toolName}"? This cannot be undone.`)) return;
    // Clear session store FIRST to prevent auto-save from resurrecting the session
    const registry = useRegistryStore.getState();
    if (registry.activeSessionId === id) {
      useSessionStore.getState().clear();
    }
    deleteSession(id);
    await deleteFromIDB(id).catch((err) => console.error("IDB delete failed:", err));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hero section */}
      <div className="px-ut-4 pt-ut-6 pb-ut-4">
        <h1 className="font-display text-ut-xl font-bold text-ut-navy mb-ut-1">
          Start a Review
        </h1>
        <p className="text-ut-sm text-ut-muted mb-ut-4">
          Evaluate an information tool against the TRUST framework.
        </p>
        <button
          type="button"
          className="bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors w-full"
          onClick={() => setShowModal(true)}
        >
          Start New Review
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-ut-4">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-ut-8">
            <p className="text-ut-sm text-ut-muted text-center">
              No reviews yet. Start your first review.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-ut-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="border border-ut-border rounded-ut-sm px-ut-3 py-ut-2 flex items-center gap-ut-2"
              >
                {/* Favicon */}
                <FaviconOrFallback url={s.faviconUrl} toolName={s.toolName} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-ut-1">
                    <span className="text-ut-sm font-bold text-ut-text truncate">
                      {s.toolName}
                    </span>
                    <span
                      className={`text-ut-xs font-heading font-bold uppercase tracking-ut-label px-1 rounded ${
                        s.status === "done"
                          ? "bg-ut-green/15 text-ut-green"
                          : "bg-trust-magenta/10 text-trust-magenta"
                      }`}
                    >
                      {s.status === "done" ? "Done" : "Started"}
                    </span>
                  </div>
                  <p className="text-ut-xs text-ut-muted truncate">
                    {new Date(s.startTime).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Open review"
                    className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta hover:text-trust-magenta-strong transition-colors px-1"
                    onClick={() => switchToSession(s.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    title="Open tool in new tab"
                    className="text-ut-muted hover:text-ut-navy transition-colors p-0.5"
                    onClick={() => window.open(s.toolUrl, "_blank")}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3" />
                      <path d="M9 2h5v5" />
                      <path d="M14 2 8 8" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Download report"
                    className="text-ut-muted hover:text-ut-navy transition-colors p-0.5"
                    onClick={() => handleExport(s.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
                      <path d="M8 2v8" />
                      <path d="M5 7l3 3 3-3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Delete review"
                    className="text-ut-muted hover:text-red-500 transition-colors p-0.5"
                    onClick={() => handleDelete(s.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 4h12" />
                      <path d="M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4" />
                      <path d="M12.67 4v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings section */}
      <div className="border-t border-ut-border px-ut-4 py-ut-3 space-y-ut-2">
        <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Settings
        </h2>
        <div className="flex gap-ut-2">
          <label className="flex-1 flex flex-col gap-0.5">
            <span className="text-ut-xs text-ut-muted">Name</span>
            <input
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={settings.reviewerName}
              onChange={(e) => updateSettings({ reviewerName: e.target.value })}
              placeholder="Reviewer name"
            />
          </label>
          <label className="flex-1 flex flex-col gap-0.5">
            <span className="text-ut-xs text-ut-muted">Email</span>
            <input
              type="email"
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={settings.reviewerEmail}
              onChange={(e) => updateSettings({ reviewerEmail: e.target.value })}
              placeholder="email@example.com"
            />
          </label>
        </div>
      </div>

      {/* New session modal */}
      {showModal && <NewSessionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
