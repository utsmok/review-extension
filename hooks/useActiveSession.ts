import { useEffect } from "react";
import { initAutoSave, teardownAutoSave } from "@/lib/auto-save";
import { downloadBlob, exportSession, sanitizeFilename } from "@/lib/export";
import * as lifecycle from "@/lib/session-lifecycle";
import { getRepository } from "@/lib/session-repository";
import type { RubricData } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { toastError } from "@/stores/toast";

export function useActiveSession() {
  // --- State from both stores (individual selectors for re-render safety) ---
  const activeSessionId = useRegistryStore((s) => s.activeSessionId);
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const finalization = useSessionStore((s) => s.finalization);

  // --- Lifecycle orchestration ---

  // Effect 1: Load/save on activeSessionId change
  useEffect(() => {
    if (activeSessionId && status === "empty") {
      lifecycle
        .loadSessionById(activeSessionId)
        .then((found) => {
          void found;
        })
        .catch((err) => {
          console.error("Failed to load session:", err);
          toastError("Failed to load session. It may be corrupted or storage is unavailable.");
          useRegistryStore.setState({ activeSessionId: null });
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
        getRepository().save(curSession.id, {
          metadata: curSession,
          captures: curCaptures,
          evaluations: curEvaluations,
          finalization: curFinalization,
        });
      }
      useSessionStore.getState().clear();
    }
  }, [activeSessionId, status]);

  // Effect 2+3: Init auto-save singleton (debounced auto-save + visibility flush)
  // This replaces the per-consumer subscriptions that caused N-way amplification.
  useEffect(() => {
    initAutoSave();
    return () => teardownAutoSave();
  }, []);

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
  const linkCaptureToMetadataField = useSessionStore((s) => s.linkCaptureToMetadataField);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);
  const setFinalization = useSessionStore((s) => s.setFinalization);

  // Composite actions (delegate to lifecycle module)
  const closeSession = () => {
    lifecycle.saveCurrentSession();
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);
  };

  const doExportAndClose = async (rubric: RubricData) => {
    try {
      const {
        session: s,
        captures: c,
        evaluations: e,
        finalization: f,
      } = useSessionStore.getState();
      if (!s) throw new Error("No active session");
      const blob = await exportSession(s, c, e, rubric, f);
      downloadBlob(blob, `TRUST_Review_${sanitizeFilename(s.toolName)}.zip`);
      await lifecycle.markDoneAndClose(s.id);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Export failed. Please try again.");
    }
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
    linkCaptureToMetadataField,
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
