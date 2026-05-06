import { useMemo, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { downloadBlob } from "@/lib/export";
import { sanitizeFilename } from "@/lib/filename";
import { loadFromIDB } from "@/lib/session-storage";
import { exportSessionById } from "@/lib/session-lifecycle";
import { useRegistryStore } from "@/stores/registry";
import { toastError, toastSuccess } from "@/stores/toast";
import ConfirmDialog from "./ConfirmDialog";
import NewSessionModal from "./NewSessionModal";

function FaviconOrFallback({ url, toolName }: { url?: string; toolName: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <span className="inline-flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-[color-mix(in_srgb,var(--trust-magenta)_20%,var(--ut-white))] text-trust-magenta text-[9px] font-bold leading-none">
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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const sessionIndex = useRegistryStore((s) => s.sessionIndex);
  const { switchToSession, deleteSession } = useActiveSession();

  const sessions = useMemo(
    () =>
      Object.values(sessionIndex).sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
    [sessionIndex],
  );

  const handleExport = async (id: string) => {
    const meta = sessionIndex[id];
    if (!meta) return;
    try {
      const blob = await exportSessionById(id);
      const sanitized = sanitizeFilename(meta.toolName).slice(0, 80);
      const filename = `TRUST_Review_${sanitized}.zip`.slice(0, 100);
      downloadBlob(blob, filename);
      const data = await loadFromIDB(id);
      const scoredCount = data?.evaluations.filter(
        (e) => e.score !== "" && e.score !== undefined,
      ).length ?? 0;
      toastSuccess(`Review exported: ${data?.captures.length ?? 0} captures, ${scoredCount} scores`);
    } catch (err) {
      console.error("Export failed:", err);
      toastError(err instanceof Error ? err.message : "Export failed. Please try again.");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteSession(deleteTargetId);
    setDeleteTargetId(null);
  };

  const deleteTargetMeta = deleteTargetId ? sessionIndex[deleteTargetId] : null;

  return (
    <div className="flex flex-col h-full">
      {/* Hero section */}
      <div className="px-ut-4 pt-ut-6 pb-ut-4">
        <h1 className="font-display text-ut-xl font-bold text-ut-navy mb-ut-1">Start a Review</h1>
        <p className="text-ut-sm text-ut-muted mb-ut-4">
          Evaluate an information tool against the TRUST framework.
        </p>
        <button
          type="button"
          className="bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-md font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong active:scale-[0.98] disabled:opacity-50 transition-all w-full"
          onClick={() => setShowModal(true)}
        >
          Start New Review
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-ut-4">
        {sessions.length === 0 ? (
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
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-ut-sm text-ut-muted font-bold mb-ut-1">No reviews yet</p>
            <p className="text-ut-xs text-ut-slate">
              Start a new review to evaluate a search tool.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-ut-2">
            {sessions.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`border border-ut-border rounded-ut-sm px-ut-3 py-ut-2 flex items-center gap-ut-2 cursor-pointer hover:bg-trust-magenta-tint transition-colors group bg-transparent text-left w-full border-l-[3px] ${s.status === "done" ? "border-l-ut-green" : "border-l-ut-navy"}`}
                onClick={() => switchToSession(s.id)}
              >
                {/* Favicon */}
                <FaviconOrFallback url={s.faviconUrl} toolName={s.toolName} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-ut-1">
                    <span className="text-ut-sm font-bold text-ut-text truncate">{s.toolName}</span>
                    <span
                      className={`text-ut-xs font-heading font-bold uppercase tracking-ut-label px-1.5 py-0.5 rounded ${
                        s.status === "done"
                          ? "bg-[color-mix(in_srgb,var(--ut-green)_20%,var(--ut-white))] text-ut-green"
                          : "bg-[color-mix(in_srgb,var(--trust-magenta)_20%,var(--ut-white))] text-trust-magenta-strong"
                      }`}
                    >
                      {s.status === "done" ? "Done" : "Started"}
                    </span>
                    {s.finalizedAt && (
                      <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label px-1.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--trust-magenta)_20%,var(--ut-white))] text-trust-magenta">
                        Finalized
                      </span>
                    )}
                  </div>
                  <p className="text-ut-xs text-ut-muted truncate">
                    {new Date(s.startTime).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center shrink-0">
                  <button
                    type="button"
                    title="Open tool in new tab"
                    className="text-ut-muted hover:text-ut-navy transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(s.toolUrl, "_blank");
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Open in new tab</title>
                      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3" />
                      <path d="M9 2h5v5" />
                      <path d="M14 2 8 8" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Download report"
                    className="text-ut-muted hover:text-ut-navy transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(s.id);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Download report</title>
                      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" />
                      <path d="M8 2v8" />
                      <path d="M5 7l3 3 3-3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Delete review"
                    className="text-ut-muted hover:text-ut-red transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.id);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Delete review</title>
                      <path d="M2 4h12" />
                      <path d="M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4" />
                      <path d="M12.67 4v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4" />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New session modal */}
      {showModal && <NewSessionModal onClose={() => setShowModal(false)} />}

      {/* Delete confirmation */}
      {deleteTargetId && deleteTargetMeta && (
        <ConfirmDialog
          message={`Delete review of "${deleteTargetMeta.toolName}"? This cannot be undone.`}
          actions={[
            { label: "Cancel", handler: () => setDeleteTargetId(null), variant: "cancel" },
            { label: "Delete", handler: confirmDelete, variant: "danger" },
          ]}
        />
      )}
    </div>
  );
}
