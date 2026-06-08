import { useEffect, useMemo, useRef, useState } from "react";
import { RUBRIC_DATA } from "@/data/rubrics";
import { useActiveSession } from "@/hooks/useActiveSession";
import { downloadBlob, sanitizeFilename } from "@/lib/export";
import { getVisibleRubricQuestionIds } from "@/lib/rubric";
import type { SessionMetadata } from "@/lib/types";
import { exportSessionById, importSessionFromZipFile } from "@/lib/session-lifecycle";
import { getRepository } from "@/lib/session-repository";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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
      const data = await getRepository().load(id);
      const scoredCount =
        data?.evaluations.filter((e) => e.score !== "" && e.score !== undefined).length ?? 0;
      toastSuccess(
        `Review exported: ${data?.captures.length ?? 0} captures, ${scoredCount} scores`,
      );
    } catch (err) {
      console.error("Export failed:", err);
      toastError(
        err instanceof Error
          ? err.message
          : "Could not export this review. Try again or check the console for details.",
      );
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const id = await importSessionFromZipFile(file);
      const meta = useRegistryStore.getState().sessionIndex[id];
      toastSuccess(`Review imported: ${meta?.toolName ?? "Untitled review"}`);
      switchToSession(id);
    } catch (err) {
      console.error("Import failed:", err);
      toastError(
        err instanceof Error
          ? err.message
          : "Could not import this file. Make sure it is a TRUST Review export (.zip).",
      );
    } finally {
      setImporting(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        <button
          type="button"
          className="bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-md font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong active:scale-[0.98] disabled:opacity-50 transition-all w-full"
          onClick={() => setShowModal(true)}
        >
          Start New Review
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleImport}
        />
        <button
          type="button"
          className="border border-ut-border text-ut-navy rounded-ut-sm px-ut-4 py-ut-2 text-ut-xs font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-grey transition-all w-full mt-ut-2 disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? "Importing\u2026" : "Import Review"}
        </button>
      </div>

      {/* Session list or welcome */}
      <section aria-label="Review sessions" className="flex-1 min-h-0 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="onboard-welcome">
            <div className="onboard-welcome__icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--trust-magenta)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 12l2 2 4-4" />
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              </svg>
            </div>
            <p className="onboard-welcome__title">TRUST Review</p>
            <p className="onboard-welcome__desc">
              Evaluate search tools against a structured rubric covering transparency, reasoning,
              user control, security, and technical claims.
            </p>
            <div className="onboard-welcome__steps">
              <div className="onboard-step">
                <span className="onboard-step__num">1</span>
                <span>Start a new review and enter the tool name and URL.</span>
              </div>
              <div className="onboard-step">
                <span className="onboard-step__num">2</span>
                <span>Fill in tool details on the Metadata tab.</span>
              </div>
              <div className="onboard-step">
                <span className="onboard-step__num">3</span>
                <span>Score rubric questions and capture evidence screenshots.</span>
              </div>
              <div className="onboard-step">
                <span className="onboard-step__num">4</span>
                <span>Finalize your review and export a shareable report.</span>
              </div>
            </div>
            <p className="text-ut-xs text-ut-slate">
              Or{" "}
              <button
                type="button"
                className="text-trust-magenta hover:text-trust-magenta-strong underline"
                onClick={() => fileInputRef.current?.click()}
              >
                import an existing review
              </button>{" "}
              to continue where you left off.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-ut-2 px-ut-4">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onSwitch={() => switchToSession(s.id)}
                onExport={() => handleExport(s.id)}
                onDelete={() => handleDelete(s.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Keyboard shortcuts hint — always visible at bottom */}
      <div className="shortcut-hint-bar" role="note" aria-label="Keyboard shortcuts">
        <span>Shortcuts:</span>
        <span className="shortcut-hint">1-4</span>
        <span>tabs</span>
        <span className="shortcut-hint">Ctrl+Shift+S</span>
        <span>capture</span>
        <span className="shortcut-hint">?</span>
        <span>help</span>
      </div>

      {/* New session modal */}
      {showModal && <NewSessionModal onClose={() => setShowModal(false)} />}

      {/* Delete confirmation */}
      {deleteTargetId && deleteTargetMeta && (
        <ConfirmDialog
          message={`Permanently delete the review of \u201C${deleteTargetMeta.toolName}\u201D? All scores, evidence captures, and notes will be lost.`}
          actions={[
            { label: "Cancel", handler: () => setDeleteTargetId(null), variant: "cancel" },
            { label: "Delete", handler: confirmDelete, variant: "danger" },
          ]}
        />
      )}
    </div>
  );
}

/**
 * Individual session card with progress indicator.
 * Loads session data from IDB to compute completion percentage.
 */
function SessionCard({
  session: s,
  onSwitch,
  onExport,
  onDelete,
}: {
  session: SessionMetadata;
  onSwitch: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [progress, setProgress] = useState<{ pct: number; scored: number; total: number } | null>(
    null,
  );

  // Load progress from IDB on mount
  useEffect(() => {
    let cancelled = false;
    getRepository()
      .load(s.id)
      .then((data) => {
        if (cancelled || !data) return;
        const rubric = RUBRIC_DATA;
        const usesAi = s.usesAi ?? true;
        const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, usesAi));
        const total = visibleIds.size;
        const scored = data.evaluations.filter(
          (e) => visibleIds.has(e.rubricId) && e.score !== "" && e.score !== undefined,
        ).length;
        const cappedScored = Math.min(scored, total);
        const pct = total > 0 ? Math.min(100, Math.round((cappedScored / total) * 100)) : 0;
        setProgress({ pct, scored: cappedScored, total });
      })
      .catch(() => {
        // Silent — progress bar simply won't show
      });
    return () => {
      cancelled = true;
    };
  }, [s.id, s.usesAi]);

  const isComplete = s.status === "done";
  return (
    <div
      role="button"
      tabIndex={0}
      className={`border border-ut-border rounded-ut-sm px-ut-3 py-ut-2 flex items-center gap-ut-2 cursor-pointer hover:bg-trust-magenta-tint transition-colors group bg-transparent text-left w-full border-t-[3px] ${isComplete ? "border-t-ut-green" : "border-t-ut-navy"}`}
      onClick={onSwitch}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSwitch();
        }
      }}
    >
      {/* Favicon */}
      <FaviconOrFallback url={s.faviconUrl} toolName={s.toolName} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-ut-1">
          <span className="text-ut-sm font-bold text-ut-text truncate">{s.toolName}</span>
          <span
            className={`text-ut-xs font-heading font-bold uppercase tracking-ut-label px-1.5 py-0.5 rounded ${
              isComplete
                ? "bg-[color-mix(in_srgb,var(--ut-green)_20%,var(--ut-white))] text-ut-green"
                : "bg-[color-mix(in_srgb,var(--trust-magenta)_20%,var(--ut-white))] text-trust-magenta-strong"
            }`}
          >
            {isComplete ? "Complete" : "In Progress"}
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
        {/* Progress bar */}
        {progress !== null && (
          <div>
            <div className="session-progress-bar">
              <div
                className={`session-progress-bar__fill${progress.pct === 100 ? " session-progress-bar__fill--complete" : ""}`}
                style={{ transform: `scaleX(${progress.pct / 100})` }}
              />
            </div>
            <p className="session-progress-text">
              {progress.scored}/{progress.total} questions scored
              {progress.pct === 100 ? " \u2713" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          title="Open tool in new tab"
          className="text-ut-muted hover:text-ut-navy transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            const url = s.toolUrl?.trim() ?? "";
            if (/^https?:\/\//i.test(url)) window.open(url, "_blank");
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
            aria-hidden="true"
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
            onExport();
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
            aria-hidden="true"
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
            onDelete();
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
            aria-hidden="true"
          >
            <title>Delete review</title>
            <path d="M2 4h12" />
            <path d="M5.33 4V2.67a1.33 1.33 0 0 1 1.34-1.34h2.66a1.33 1.33 0 0 1 1.34 1.34V4" />
            <path d="M12.67 4v9.33a1.33 1.33 0 0 1-1.34 1.34H4.67a1.33 1.33 0 0 1-1.34-1.34V4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
