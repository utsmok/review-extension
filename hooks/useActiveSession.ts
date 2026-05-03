import { useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { loadFromIDB, saveToIDB, saveToIDBFireAndForget } from "@/lib/session-storage";

export function useActiveSession() {
  // --- State from both stores (individual selectors for re-render safety) ---
  const activeSessionId = useRegistryStore((s) => s.activeSessionId);
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const questionModes = useSessionStore((s) => s.questionModes);

  // --- Lifecycle orchestration ---

  // Effect 1: Load/save on activeSessionId change
  useEffect(() => {
    if (activeSessionId && status === "empty") {
      useSessionStore.setState({ status: "loading" });
      const controller = new AbortController();
      loadFromIDB(activeSessionId).then((data) => {
        if (controller.signal.aborted) return;
        if (data) {
          useSessionStore.getState().loadSession(data);
        } else {
          useSessionStore.setState({ status: "empty" });
          useRegistryStore.getState().setActiveSessionId(null);
        }
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
  }, [activeSessionId]);

  // Effect 2: Debounced auto-save during active review
  useEffect(() => {
    if (status !== "active" || !activeSessionId) return;

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
  }, [activeSessionId, status]);

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

  // Registry actions
  const addSession = useRegistryStore((s) => s.addSession);
  const setActiveSessionId = useRegistryStore((s) => s.setActiveSessionId);

  // Composite actions
  const closeSession = () => setActiveSessionId(null);
  const switchToSession = (id: string) => {
    const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
    if (s) {
      saveToIDBFireAndForget(s.id, { metadata: s, captures: c, evaluations: e, questionModes: q });
    }
    useSessionStore.getState().clear();
    setActiveSessionId(id);
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
    addSession,
    closeSession,
    switchToSession,
  };
}
