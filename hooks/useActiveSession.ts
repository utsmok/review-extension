import { useEffect } from "react";
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { saveToIDB } from "@/lib/session-storage";
import * as lifecycle from "@/lib/session-lifecycle";

export function useActiveSession(migrationReady = true) {
  // --- State from both stores (individual selectors for re-render safety) ---
  const activeSessionId = useRegistryStore((s) => s.activeSessionId);
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const questionModes = useSessionStore((s) => s.questionModes);

  // --- Lifecycle orchestration ---

  // Effect 1: Load/save on activeSessionId change (gated on migration)
  useEffect(() => {
    if (!migrationReady) return;
    if (activeSessionId && status === "empty") {
      const controller = new AbortController();
      lifecycle.loadSessionById(activeSessionId).then((found) => {
        if (controller.signal.aborted) return;
        // loadSessionById already handles both success and not-found cases
        void found;
      });
      return () => controller.abort();
    } else if (!activeSessionId && (status === "active" || status === "loading")) {
      const { session: curSession, captures: curCaptures, evaluations: curEvaluations, questionModes: curQuestionModes } =
        useSessionStore.getState();
      if (curSession) {
        saveToIDB(curSession.id, {
          metadata: curSession,
          captures: curCaptures,
          evaluations: curEvaluations,
          questionModes: curQuestionModes,
        });
      }
      useSessionStore.getState().clear();
    }
  }, [activeSessionId, migrationReady]);

  // Effect 2: Debounced auto-save during active review
  useEffect(() => {
    if (!migrationReady || status !== "active" || !activeSessionId) return;

    const timerRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };

    const unsub = useSessionStore.subscribe((state) => {
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
        if (s && activeSessionId) {
          saveToIDB(activeSessionId, { metadata: s, captures: c, evaluations: e, questionModes: q });
        }
      }, 300);
    });

    return () => {
      unsub();
      if (timerRef.current !== undefined) clearTimeout(timerRef.current);
    };
  }, [activeSessionId, status, migrationReady]);

  // Effect 3: Flush on panel close / tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
        if (s) {
          saveToIDB(s.id, { metadata: s, captures: c, evaluations: e, questionModes: q });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // --- Forwarded actions ---
  // Session store actions
  const loadSession = useSessionStore((s) => s.loadSession);
  const clear = useSessionStore((s) => s.clear);
  const addCapture = useSessionStore((s) => s.addCapture);
  const updateCapture = useSessionStore((s) => s.updateCapture);
  const removeCapture = useSessionStore((s) => s.removeCapture);
  const setEvaluation = useSessionStore((s) => s.setEvaluation);
  const setQuestionMode = useSessionStore((s) => s.setQuestionMode);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore((s) => s.unlinkCaptureFromRubric);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);

  // Composite actions (delegate to lifecycle module)
  const closeSession = () => {
    lifecycle.saveCurrentSession();
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);
  };

  return {
    status,
    session,
    captures,
    evaluations,
    questionModes,
    loadSession,
    clear,
    addCapture,
    updateCapture,
    removeCapture,
    setEvaluation,
    setQuestionMode,
    linkCaptureToRubric,
    unlinkCaptureFromRubric,
    updateMetadata,
    closeSession,
    switchToSession: lifecycle.switchToSession,
    createSession: lifecycle.createSession,
    deleteSession: lifecycle.deleteSession,
    markDoneAndClose: lifecycle.markDoneAndClose,
  };
}
