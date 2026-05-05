import { useRegistryStore } from "@/stores/registry";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { loadFromIDB, saveToIDB } from "./session-storage";

export function deterministicId(toolName: string, toolUrl: string, startTime: string): string {
  const input = `trust-session:${toolName}:${toolUrl}:${startTime}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// Phase 3: idempotent migration from legacy localStorage session
export async function migrateLegacySession(): Promise<void> {
  if (localStorage.getItem("trust-review-migrated")) return;

  const raw = localStorage.getItem("trust-review-session");
  if (!raw) {
    localStorage.setItem("trust-review-migrated", "1");
    return;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    localStorage.setItem("trust-review-migrated", "1");
    return;
  }

  // Navigate the persisted zustand shape: { version: N, state: { session, captures, evaluations } }
  const state = (data as { state?: Record<string, unknown> }).state ?? data;
  const session = state.session as Record<string, unknown> | undefined;

  const id = deterministicId(
    (session?.toolName as string) ?? "unknown",
    (session?.toolUrl as string) ?? "",
    (session?.startTime as string) ?? new Date().toISOString(),
  );

  // Idempotent: check if already migrated to IDB
  const existing = await loadFromIDB(id);
  if (existing) {
    const registry = useRegistryStore.getState();
    if (!registry.sessionIndex[id]) {
      registry.addSession({
        ...(session as unknown as SessionMetadata),
        id,
        status: "started",
      });
    }
    localStorage.removeItem("trust-review-session");
    localStorage.setItem("trust-review-migrated", "1");
    return;
  }

  // Strip linkedRubricIds from captures (removed from Capture type)
  const rawCaptures = (state.captures ?? []) as Record<string, unknown>[];
  const captures = rawCaptures.map((c) => {
    const { linkedRubricIds: _stripped, ...rest } = c;
    return rest;
  });

  const metadata: SessionMetadata = {
    ...(session as unknown as SessionMetadata),
    id,
    status: "started",
  };

  await saveToIDB(id, {
    metadata,
    captures: captures as unknown as SessionData["captures"],
    evaluations: (state.evaluations ?? []) as SessionData["evaluations"],
    finalization: null,
  });

  try {
    useRegistryStore.getState().addSession(metadata);
  } catch (err) {
    console.error("Migration: registry write failed, will retry on next launch", err);
    return;
  }

  localStorage.removeItem("trust-review-session");
  localStorage.setItem("trust-review-migrated", "1");
}
