import { useEffect } from "react";
import { initAutoSave, teardownAutoSave } from "@/lib/auto-save";
import { downloadBlob, exportSession, sanitizeFilename } from "@/lib/export";
import * as lifecycle from "@/lib/session-lifecycle";
import { getRepository } from "@/lib/session-repository";
import type { RubricData } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { toastError } from "@/stores/toast";
import { useSessionActions } from "./useSessionActions";
import { useSessionData } from "./useSessionData";

export function useActiveSession() {
  const data = useSessionData();
  const actions = useSessionActions();

  // Registry state needed for effects
  const activeSessionId = useRegistryStore((s) => s.activeSessionId);

  // --- Lifecycle orchestration ---

  // Effect 1: Load/save on activeSessionId change
  useEffect(() => {
    if (activeSessionId && data.status === "empty") {
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
    } else if (!activeSessionId && (data.status === "active" || data.status === "loading")) {
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
  }, [activeSessionId, data.status]);

  // Effect 2+3: Init auto-save singleton (debounced auto-save + visibility flush)
  // This replaces the per-consumer subscriptions that caused N-way amplification.
  useEffect(() => {
    initAutoSave();
    return () => teardownAutoSave();
  }, []);

  // --- Composite actions (delegate to lifecycle module) ---

  const closeSession = async () => {
    await lifecycle.saveCurrentSession();
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
      if (blob.size === 0) throw new Error("Export produced an empty file. Please try again.");
      downloadBlob(blob, `TRUST_Review_${sanitizeFilename(s.toolName)}.zip`);
      await lifecycle.markDoneAndClose(s.id);
      return { blobSize: blob.size };
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Export failed. Please try again.");
      return undefined;
    }
  };

  return {
    ...data,
    ...actions,
    closeSession,
    exportAndClose: doExportAndClose,
    switchToSession: lifecycle.switchToSession,
    createSession: lifecycle.createSession,
    deleteSession: lifecycle.deleteSession,
    markDoneAndClose: lifecycle.markDoneAndClose,
  };
}
