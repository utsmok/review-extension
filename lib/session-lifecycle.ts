import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import {
  loadFromIDB,
  saveToIDB,
  deleteFromIDB,
  saveToIDBFireAndForget,
} from "@/lib/session-storage";
import { toastError } from "@/stores/toast";
import { getRubricById } from "@/data/rubrics";
import { exportSession } from "@/lib/export";
import type { SessionData, SessionMetadata } from "@/lib/types";

/** Snapshot current session store state as SessionData */
function snapshot(): SessionData | null {
  const { session, captures, evaluations, finalization } = useSessionStore.getState();
  if (!session) return null;
  return { metadata: session, captures, evaluations, finalization };
}

/** Load a session from IDB into the session store. Returns true if data was found. */
export async function loadSessionById(id: string): Promise<boolean> {
  useSessionStore.getState().setStatus("loading");
  try {
    const data = await loadFromIDB(id);
    if (data) {
      useSessionStore.getState().loadSession(data);
      return true;
    }
    useSessionStore.setState({ status: "empty" });
    useRegistryStore.getState().setActiveSessionId(null);
    return false;
  } catch (err) {
    console.error("Failed to load session from IDB:", err);
    useSessionStore.setState({ status: "empty" });
    useRegistryStore.getState().setActiveSessionId(null);
    toastError("Failed to load review. It may be corrupted or storage is unavailable.");
    return false;
  }
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
    finalization: null,
  });
  useRegistryStore.getState().addSession(metadata);
}

/** Delete a session: clear store if active, delete from IDB first, then registry. */
export async function deleteSession(id: string): Promise<void> {
  const { activeSessionId } = useRegistryStore.getState();
  if (activeSessionId === id) {
    useSessionStore.getState().clear();
  }
  // Delete from IDB first — if this fails, the registry entry stays valid
  await deleteFromIDB(id);
  useRegistryStore.getState().deleteSession(id);
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

/** Export a session by ID, loading from IDB and building the ZIP blob. */
export async function exportSessionById(id: string): Promise<Blob> {
  const meta = useRegistryStore.getState().sessionIndex[id];
  if (!meta) throw new Error(`Review ${id} not found in registry`);
  const data = await loadFromIDB(id);
  if (!data) throw new Error(`Session ${id} not found in storage`);
  const variant = getRubricById(meta.rubricId);
  const blob = await exportSession(meta, data.captures, data.evaluations, variant.data, data.finalization);
  return blob;
}
