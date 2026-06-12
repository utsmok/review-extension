import { useShallow } from "zustand/react/shallow";
import { useSessionStore } from "@/stores/session";

/** Read-only access to active session state. Only re-renders when selected values actually change. */
export function useSessionData() {
  return useSessionStore(
    useShallow((s) => ({
      status: s.status,
      session: s.session,
      captures: s.captures,
      evaluations: s.evaluations,
      finalization: s.finalization,
      quickNotes: s.quickNotes,
      principleSummaries: s.principleSummaries,
    })),
  );
}
