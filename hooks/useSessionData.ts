import { useSessionStore } from "@/stores/session";

/** Read-only access to active session state. Re-renders on any state change. */
export function useSessionData() {
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const finalization = useSessionStore((s) => s.finalization);
  const quickNotes = useSessionStore((s) => s.quickNotes);
  return { status, session, captures, evaluations, finalization, quickNotes };
}
