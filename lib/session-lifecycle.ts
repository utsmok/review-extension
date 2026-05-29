import { RUBRIC_DATA } from "@/data/rubrics";
import { exportSession, importSessionFromZip } from "@/lib/export";
import { getRepository } from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { toastError, toastWarning } from "@/stores/toast";

// --- Auto-save singleton state ---
let autoSaveTimerRef: ReturnType<typeof setTimeout> | undefined;
let autoSaveScheduledSessionId: string | null = null;
let autoSaveUnsub: (() => void) | null = null;
let autoSaveVisibilityHandler: (() => void) | null = null;
let lastSaveSignature: string | null = null;
let lastSaveTime = 0;


async function autoSaveFlush(scheduledId?: string | null, bypassRateLimit = false): Promise<void> {
  // Rate limit: 3-second hard minimum between saves (debounced calls only)
  if (!bypassRateLimit) {
    const now = Date.now();
    if (now - lastSaveTime < 3000) {
      setTimeout(() => {
        autoSaveFlush(scheduledId, false);
      }, 3000 - (now - lastSaveTime));
      return;
    }
  }
  lastSaveTime = Date.now();

  const { session: s, captures: c, evaluations: e, finalization: f } = useSessionStore.getState();
  const activeId = useRegistryStore.getState().activeSessionId;
  // Guard: skip if session switched between schedule and flush to prevent
  // a stale debounced save from overwriting the new session's data.
  if (scheduledId && activeId !== scheduledId) {
    lastSaveSignature = null;
    return;
  }
  if (s && activeId) {
    const ok = await getRepository().save(activeId, {
      metadata: s,
      captures: c,
      evaluations: e,
      finalization: f,
    });
    if (ok) {
      document.dispatchEvent(
        new CustomEvent("trust-save-succeeded", { detail: { timestamp: Date.now() } }),
      );
      lastSaveSignature = null;
    } else {
      toastWarning("Auto-save failed — your work may not be saved.");
      document.dispatchEvent(new CustomEvent("trust-save-failed"));
    }
  }
}


/**
 * Initialize the auto-save singleton. Safe to call multiple times —
 * subsequent calls are no-ops. Call from a single root component (App.tsx).
 */
export function initAutoSave(): void {
  teardownAutoSave();

  // Debounced auto-save on every store change
  autoSaveUnsub = useSessionStore.subscribe(() => {
    const state = useSessionStore.getState();
    const activeId = useRegistryStore.getState().activeSessionId;
    if (state.status !== "active" || !activeId) return;
    const signature = `${state.evaluations.length}:${state.captures.length}:${state.session?.finalizedAt ?? ""}`;
    if (signature === lastSaveSignature) return;
    lastSaveSignature = signature;

    if (autoSaveTimerRef !== undefined) clearTimeout(autoSaveTimerRef);
    autoSaveScheduledSessionId = activeId;
    autoSaveTimerRef = setTimeout(() => {
      autoSaveFlush(autoSaveScheduledSessionId);
    }, 1000);
  });

  // Flush on panel close / tab switch (single listener)
  autoSaveVisibilityHandler = () => {
    if (document.visibilityState === "hidden") {
      // Cancel pending debounce — we're flushing now
      if (autoSaveTimerRef !== undefined) clearTimeout(autoSaveTimerRef);
      autoSaveTimerRef = undefined;
      autoSaveFlush(autoSaveScheduledSessionId, true);

    }
  };
  document.addEventListener("visibilitychange", autoSaveVisibilityHandler);
}

/**
 * Tear down auto-save listeners. Only needed for hot-module reload in dev.
 */
export function teardownAutoSave(): void {
  if (autoSaveUnsub) {
    autoSaveUnsub();
    autoSaveUnsub = null;
  }
  if (autoSaveVisibilityHandler) {
    document.removeEventListener("visibilitychange", autoSaveVisibilityHandler);
    autoSaveVisibilityHandler = null;
  }
  if (autoSaveTimerRef !== undefined) {
    clearTimeout(autoSaveTimerRef);
    autoSaveTimerRef = undefined;
  }
  autoSaveScheduledSessionId = null;
  lastSaveSignature = null;
  lastSaveTime = 0;
}

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

/** Save current session data to IDB. Returns promise; callers may await or fire-and-forget. */
export async function saveCurrentSession(): Promise<void> {
  const data = snapshot();
  if (data) {
    const ok = await getRepository().save(data.metadata.id, data);
    if (!ok) {
      toastError("Failed to save current review. Your work may be lost.");
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
  await saveCurrentSession();
  useSessionStore.getState().clear();
  useRegistryStore.getState().setActiveSessionId(id);
}

/** Mark session as done, save, and close. */
export async function markDoneAndClose(id: string): Promise<void> {
  useRegistryStore.getState().markSessionDone(id);
  try {
    await saveCurrentSession();
  } catch (err) {
    console.error("Failed to save before close:", err);
    toastError("Failed to save final state. Your work may be lost.");
  }
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
