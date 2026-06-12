import { useSessionStore } from "@/stores/session";

/** Session mutation actions from the store. Does NOT re-render on state changes. */
export function useSessionActions() {
  const loadSession = useSessionStore((s) => s.loadSession);
  const clear = useSessionStore((s) => s.clear);
  const addCapture = useSessionStore((s) => s.addCapture);
  const updateCapture = useSessionStore((s) => s.updateCapture);
  const removeCapture = useSessionStore((s) => s.removeCapture);
  const undoDeleteCapture = useSessionStore((s) => s.undoDeleteCapture);
  const setEvaluation = useSessionStore((s) => s.setEvaluation);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore((s) => s.unlinkCaptureFromRubric);
  const linkCaptureToMetadataField = useSessionStore((s) => s.linkCaptureToMetadataField);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);
  const setFinalization = useSessionStore((s) => s.setFinalization);
  const addQuickNote = useSessionStore((s) => s.addQuickNote);
  const removeQuickNote = useSessionStore((s) => s.removeQuickNote);
  const setPrincipleSummary = useSessionStore((s) => s.setPrincipleSummary);
  return {
    loadSession,
    clear,
    addCapture,
    updateCapture,
    removeCapture,
    undoDeleteCapture,
    setEvaluation,
    linkCaptureToRubric,
    unlinkCaptureFromRubric,
    linkCaptureToMetadataField,
    updateMetadata,
    setFinalization,
    addQuickNote,
    removeQuickNote,
    setPrincipleSummary,
  };
}
