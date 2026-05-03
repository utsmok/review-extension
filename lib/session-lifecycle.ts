import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { loadFromIDB, saveToIDB, deleteFromIDB, saveToIDBFireAndForget } from "@/lib/session-storage";
import type { SessionData, SessionMetadata } from "@/lib/types";

/** Snapshot current session store state as SessionData */
function snapshot(): SessionData | null {
  const { session, captures, evaluations, questionModes } = useSessionStore.getState();
  if (!session) return null;
  return { metadata: session, captures, evaluations, questionModes };
}

/** Load a session from IDB into the session store. Returns true if data was found. */
export async function loadSessionById(id: string): Promise<boolean> {
  useSessionStore.getState().setStatus("loading");
  const data = await loadFromIDB(id);
  if (data) {
    useSessionStore.getState().loadSession(data);
    return true;
  }
  useSessionStore.setState({ status: "empty" });
  useRegistryStore.getState().setActiveSessionId(null);
  return false;
}

/** Save current session data to IDB (fire-and-forget). */
export function saveCurrentSession(): void {
  const data = snapshot();
  if (data) saveToIDBFireAndForget(data.metadata.id, data);
}

/** Create a new session: save to IDB, register in registry. */
export async function createSession(metadata: SessionMetadata): Promise<void> {
  await saveToIDB(metadata.id, {
    metadata,
    captures: [],
    evaluations: [],
    questionModes: {},
  });
  useRegistryStore.getState().addSession(metadata);
}

/** Delete a session: clear store if active, delete from registry + IDB. */
export async function deleteSession(id: string): Promise<void> {
  const { activeSessionId } = useRegistryStore.getState();
  if (activeSessionId === id) {
    useSessionStore.getState().clear();
  }
  useRegistryStore.getState().deleteSession(id);
  await deleteFromIDB(id);
}

/** Switch from current session to another. Saves current first. */
export function switchToSession(id: string): void {
  saveCurrentSession();
  useSessionStore.getState().clear();
  useRegistryStore.getState().setActiveSessionId(id);
}

/** Mark session as done, save, and close. */
export function markDoneAndClose(id: string): void {
  useRegistryStore.getState().markSessionDone(id);
  saveCurrentSession();
  useSessionStore.getState().clear();
  useRegistryStore.getState().setActiveSessionId(null);
}
