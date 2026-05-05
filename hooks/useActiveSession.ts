import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { saveToIDB } from "@/lib/session-storage";
import { downloadBlob, exportSession } from "@/lib/export";
import { sanitizeFilename } from "@/lib/filename";
import { initAutoSave } from "@/lib/auto-save";
import { toastError } from "@/stores/toast";
import type { RubricData } from "@/lib/types";
import * as lifecycle from "@/lib/session-lifecycle";

export function useActiveSession(migrationReady = true) {
  // --- State from both stores (individual selectors for re-render safety) ---
  const activeSessionId = useRegistryStore((s) => s.activeSessionId);
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const finalization = useSessionStore((s) => s.finalization);

  // --- Lifecycle orchestration ---

  // Effect 1: Load/save on activeSessionId change (gated on migration)
  useEffect(() => {
    if (!migrationReady) return;
    if (activeSessionId && status === "empty") {
      lifecycle
        .loadSessionById(activeSessionId)
        .then((found) => {
          void found;
        })
        .catch((err) => {
          console.error("Failed to load session:", err);
          toastError("Failed to load session. It may be corrupted or storage is unavailable.");
          useSessionStore.setState({ status: "empty" });
        });
    } else if (!activeSessionId && (status === "active" || status === "loading")) {
      const {
        session: curSession,
        captures: curCaptures,
        evaluations: curEvaluations,
        finalization: curFinalization,
      } = useSessionStore.getState();
      if (curSession) {
        saveToIDB(curSession.id, {
          metadata: curSession,
          captures: curCaptures,
          evaluations: curEvaluations,
          finalization: curFinalization,
        });
      }
      useSessionStore.getState().clear();
    }
  }, [activeSessionId, migrationReady]);

  // Effect 2+3: Init auto-save singleton (debounced auto-save + visibility flush)
  // This replaces the per-consumer subscriptions that caused N-way amplification.
  useEffect(() => {
    if (!migrationReady) return;
    initAutoSave();
  }, [migrationReady]);

  // --- Forwarded actions ---
  // Session store actions
  const loadSession = useSessionStore((s) => s.loadSession);
  const clear = useSessionStore((s) => s.clear);
  const addCapture = useSessionStore((s) => s.addCapture);
  const updateCapture = useSessionStore((s) => s.updateCapture);
  const removeCapture = useSessionStore((s) => s.removeCapture);
  const setEvaluation = useSessionStore((s) => s.setEvaluation);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore((s) => s.unlinkCaptureFromRubric);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);
  const setFinalization = useSessionStore((s) => s.setFinalization);

  // Composite actions (delegate to lifecycle module)
  const closeSession = () => {
    lifecycle.saveCurrentSession();
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);
  };

  const doExportAndClose = async (rubric: RubricData) => {
    const { session: s, captures: c, evaluations: e, finalization: f } = useSessionStore.getState();
    if (!s) throw new Error("No active session");
    const blob = await exportSession(s, c, e, rubric, f);
    downloadBlob(blob, `TRUST_Review_${sanitizeFilename(s.toolName)}.zip`);
    lifecycle.markDoneAndClose(s.id);
  };

  return {
    status,
    session,
    captures,
    evaluations,
    finalization,
    loadSession,
    clear,
    addCapture,
    updateCapture,
    removeCapture,
    setEvaluation,
    linkCaptureToRubric,
    unlinkCaptureFromRubric,
    updateMetadata,
    setFinalization,
    closeSession,
    exportAndClose: doExportAndClose,
    switchToSession: lifecycle.switchToSession,
    createSession: lifecycle.createSession,
    deleteSession: lifecycle.deleteSession,
    markDoneAndClose: lifecycle.markDoneAndClose,
  };
}
