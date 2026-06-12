import { useEffect } from "react";
import * as lifecycle from "@/lib/session-lifecycle";
import { getRepository } from "@/lib/session-repository";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { toastError } from "@/stores/toast";
import { useExportSession } from "./useExportSession";
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
        principleSummaries: curPs,
      } = useSessionStore.getState();
      if (curSession) {
        getRepository()
          .save(curSession.id, {
            metadata: curSession,
            captures: curCaptures,
            evaluations: curEvaluations,
            finalization: curFinalization,
            ...(curPs.length ? { principleSummaries: curPs } : {}),
          })
          .catch((err) => {
            console.error("Failed to save session before clearing:", err);
          })
          .finally(() => {
            useSessionStore.getState().clear();
          });
      } else {
        useSessionStore.getState().clear();
      }
    }
  }, [activeSessionId, data.status]);

  // Effect 2+3: Init auto-save singleton (debounced auto-save + visibility flush)
  // This replaces the per-consumer subscriptions that caused N-way amplification.
  useEffect(() => {
    lifecycle.initAutoSave();
    return () => lifecycle.teardownAutoSave();
  }, []);

  // --- Composite actions ---

  const closeSession = async () => {
    await lifecycle.saveCurrentSession();
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);
  };

  const { exportAndClose } = useExportSession();

  return {
    ...data,
    ...actions,
    closeSession,
    exportAndClose,
    switchToSession: lifecycle.switchToSession,
    createSession: lifecycle.createSession,
    deleteSession: lifecycle.deleteSession,
    markDoneAndClose: lifecycle.markDoneAndClose,
  };
}
