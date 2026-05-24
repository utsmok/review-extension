import { RUBRIC_DATA } from "@/data/rubrics";
import { exportSession, importSessionFromZip } from "@/lib/export";
import { getRepository } from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { toastError } from "@/stores/toast";

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
    const data = await getRepository().load(id);
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
  if (data)
    getRepository()
      .save(data.metadata.id, data)
      .catch((err) => console.error("Fire-and-forget IDB save failed:", err));
}

/** Save current session data to IDB (returns promise for callers that need to await). */
export async function saveCurrentSessionAsync(): Promise<void> {
  const data = snapshot();
  if (data) {
    const ok = await getRepository().save(data.metadata.id, data);
    if (!ok) {
      toastError("Failed to save current review before switching. Your work may be lost.");
    }
  }
}

/** Create a new session: save to IDB, register in registry. */
export async function createSession(metadata: SessionMetadata): Promise<void> {
  await getRepository().save(metadata.id, {
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
  await getRepository().delete(id);
  useRegistryStore.getState().deleteSession(id);
}

/** Switch from current session to another. Saves current first (awaited). */
export async function switchToSession(id: string): Promise<void> {
  await saveCurrentSessionAsync();
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
  const data = await getRepository().load(id);
  if (!data) throw new Error(`Session ${id} not found in storage`);
  const blob = await exportSession(
    data.metadata,
    data.captures,
    data.evaluations,
    RUBRIC_DATA,
    data.finalization,
  );
  return blob;
}

/** Import a session from an exported ZIP file. Saves to IDB and registers. */
export async function importSessionFromZipFile(zipBlob: Blob): Promise<string> {
  const data = await importSessionFromZip(zipBlob);
  const id = data.metadata.id;

  // Check if session already exists
  const existing = useRegistryStore.getState().sessionIndex[id];
  if (existing) {
    throw new Error(
      `A review of "${existing.toolName}" already exists. Delete it first if you want to re-import.`,
    );
  }

  await getRepository().save(id, data);
  useRegistryStore.getState().addSession(data.metadata);
  return id;
}
