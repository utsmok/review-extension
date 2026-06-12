import { RUBRIC_DATA } from "@/data/rubrics";
import { assembleBatchZip, prepareExportArtifacts } from "@/lib/export-pipeline";
import type { ExportArtifacts, ReviewerInfo } from "@/lib/export-pipeline";
import { exportSession, importSessionFromZip } from "@/lib/export";
import { deleteScreenshotsForCaptures, saveScreenshot } from "@/lib/screenshot-store";
import { getRepository } from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { type SessionState, useSessionStore } from "@/stores/session";
import { toastError, toastWarning } from "@/stores/toast";

// --- Auto-save singleton state ---
let autoSaveTimerRef: ReturnType<typeof setTimeout> | undefined;
let autoSaveScheduledSessionId: string | null = null;
let autoSaveUnsub: (() => void) | null = null;
let autoSaveVisibilityHandler: (() => void) | null = null;
let lastSaveSignature: string | null = null;

/** Content-aware signature that detects actual data changes, not just array lengths. */
function computeSignature(state: SessionState): string {
  const evalDigest = state.evaluations
    .slice()
    .sort((a, b) => a.rubricId.localeCompare(b.rubricId))
    .map((e) => [
      e.rubricId,
      e.score,
      e.notes,
      (e.explicitEvidenceIds ?? []).sort(),
      e.customScore?.score ?? "",
      e.customScore?.reasoning ?? "",
      e.manualDone ?? "",
    ]);

  // Capture content (exclude heavy screenshot fields)
  const captureDigest = state.captures.map((c) => [
    c.id,
    c.notes,
    c.metadataField ?? "",
  ]);

  // Session metadata (user-editable text fields)
  const s = state.session;
  const metadataDigest = s
    ? JSON.stringify({
        toolName: s.toolName,
        toolUrl: s.toolUrl,
        company: s.company ?? "",
        pricing: s.pricing ?? "",
        availability: s.availability ?? "",
        authenticationMethod: s.authenticationMethod ?? "",
        dataSources: s.dataSources ?? [],
        searchMethods: s.searchMethods ?? [],
        discipline: s.discipline ?? [],
        notes: s.notes ?? "",
        usesAi: s.usesAi ?? false,
        termsConditionsUrl: s.termsConditionsUrl ?? "",
        toolLogoUrl: s.toolLogoUrl ?? "",
        description: s.description ?? "",
        finalizedAt: s.finalizedAt ?? "",
      })
    : "";

  // Full finalization (not just grade)
  const fin = state.finalization;
  const finalizationDigest = fin
    ? JSON.stringify({
        conclusion: fin.conclusion,
        grade: fin.grade,
        strengths: fin.strengths,
        weaknesses: fin.weaknesses,
        recommendations: fin.recommendations,
        finalizedAt: fin.finalizedAt,
      })
    : "";

  return JSON.stringify([
    evalDigest,
    captureDigest,
    metadataDigest,
    (state.quickNotes ?? []).map((n) => [n.id, n.text]),
    finalizationDigest,
  ]);
}
let lastSaveTime = 0;
let rateLimitTimer: ReturnType<typeof setTimeout> | undefined;
async function autoSaveFlush(scheduledId?: string | null, bypassRateLimit = false): Promise<void> {
  // Rate limit: 3-second hard minimum between saves (debounced calls only)
  if (!bypassRateLimit) {
    const now = Date.now();
    if (now - lastSaveTime < 3000) {
      if (rateLimitTimer !== undefined) clearTimeout(rateLimitTimer);
      rateLimitTimer = setTimeout(
        () => {
          rateLimitTimer = undefined;
          autoSaveFlush(scheduledId, false);
        },
        3000 - (now - lastSaveTime),
      );
      return;
    }
  }
  lastSaveTime = Date.now();

  const { session: s, captures: c, evaluations: e, finalization: f } =
    useSessionStore.getState();
  const activeId = useRegistryStore.getState().activeSessionId;
  // Guard: skip if session switched between schedule and flush to prevent
  // a stale debounced save from overwriting the new session's data.
  if (scheduledId && activeId !== scheduledId) {
    lastSaveSignature = null;
    return;
  }
  if (s && activeId) {
    // Persist screenshots to separate IDB store, then strip from session data
    for (const cap of c) {
      if (cap.screenshotBase64) {
        await saveScreenshot(cap);
      }
    }
    const strippedCaptures = c.map((cap) => ({
      ...cap,
      screenshotBase64: "",
      annotatedScreenshotBase64: undefined,
    }));
    const ok = await getRepository().save(activeId, {
      metadata: s,
      captures: strippedCaptures,
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
    const signature = computeSignature(state);
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
  if (rateLimitTimer !== undefined) {
    clearTimeout(rateLimitTimer);
    rateLimitTimer = undefined;
  }
  autoSaveScheduledSessionId = null;
  lastSaveSignature = null;
  lastSaveTime = 0;
}

/** Save all captures' screenshots to the separate screenshot IDB store. */
async function saveCurrentScreenshots(): Promise<void> {
  const state = useSessionStore.getState();
  for (const c of state.captures) {
    if (c.screenshotBase64) {
      await saveScreenshot(c);
    }
  }
}

/** Snapshot current session store state as SessionData, stripping heavy screenshot data. */
function snapshot(): SessionData | null {
  const { session, captures, evaluations, finalization, quickNotes } =
    useSessionStore.getState();
  if (!session) return null;
  // Strip heavy screenshot data from captures before saving to session IDB.
  // Screenshots live in the separate screenshot IDB store.
  const strippedCaptures = captures.map((c) => ({
    ...c,
    screenshotBase64: "",
    annotatedScreenshotBase64: undefined,
  }));
  return {
    metadata: session,
    captures: strippedCaptures,
    evaluations,
    finalization,
    quickNotes,
  };
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

/** Save current session data to IDB (screenshots stripped). Persists screenshots
 *  to the separate screenshot IDB store first. */
export async function saveCurrentSession(): Promise<void> {
  await saveCurrentScreenshots();
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
  // Load session to get capture IDs for screenshot cleanup
  const data = await getRepository().load(id);
  const captureIds = data?.captures.map((c) => c.id) ?? [];
  // Delete from IDB first — if this fails, the registry entry stays valid
  await getRepository().delete(id);
  // Clean up associated screenshots from the separate store
  await deleteScreenshotsForCaptures(captureIds);
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
  const { reviewerName, reviewerEmail } = useRegistryStore.getState().settings;
  const blob = await exportSession(
    data.metadata,
    data.captures,
    data.evaluations,
    RUBRIC_DATA,
    data.finalization,
    data.quickNotes,
    { name: reviewerName || undefined, email: reviewerEmail || undefined },
  );
  return blob;
}
/** Export all sessions as a single batch ZIP. */
export async function exportAllSessions(): Promise<Blob> {
  const { sessionIndex, settings } = useRegistryStore.getState();
  const repo = getRepository();
  const rubric = RUBRIC_DATA;
  const reviewerInfo: ReviewerInfo | undefined = settings.reviewerName
    ? { name: settings.reviewerName, email: settings.reviewerEmail }
    : undefined;

  const entries: Array<{ artifacts: ExportArtifacts; toolName: string; grade?: string }> = [];

  for (const [id, meta] of Object.entries(sessionIndex)) {
    const data = await repo.load(id);
    if (!data) continue;

    const artifacts = await prepareExportArtifacts(
      meta,
      data.captures,
      data.evaluations,
      rubric,
      data.finalization,
      data.quickNotes,
      reviewerInfo,
    );

    entries.push({
      artifacts,
      toolName: meta.toolName,
      grade: data.finalization?.grade,
    });
  }

  if (entries.length === 0) throw new Error("No sessions to export");
  return assembleBatchZip(entries);
}

/** Import a session from an exported ZIP file. Saves to IDB and registers. */
export async function importSessionFromZipFile(zipBlob: Blob): Promise<string> {
  const data = await importSessionFromZip(zipBlob);
  let id = data.metadata.id;

  // Check if session already exists — if so, assign a new ID
  const existing = useRegistryStore.getState().sessionIndex[id];
  if (existing) {
    id = crypto.randomUUID();
    data.metadata = { ...data.metadata, id };
    toastWarning(`A review of "${existing.toolName}" already exists. Imported as a copy.`);
  }

  // Persist imported screenshots to the separate screenshot IDB store
  for (const c of data.captures) {
    if (c.screenshotBase64) {
      await saveScreenshot(c);
    }
  }

  // Strip screenshots before saving to session IDB
  const strippedCaptures = data.captures.map((c) => ({
    ...c,
    screenshotBase64: "",
    annotatedScreenshotBase64: undefined as string | undefined,
  }));
  await getRepository().save(id, { ...data, captures: strippedCaptures });
  useRegistryStore.getState().addSession(data.metadata);
  return id;
}
