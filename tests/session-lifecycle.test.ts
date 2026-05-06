import { afterEach, afterAll, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";

import type { SessionMetadata, SessionData } from "@/lib/types";

import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { deleteFromIDB, loadFromIDB } from "@/lib/session-storage";

// Mock exportSession to avoid JSZip/papaparse dependency
vi.mock("@/lib/export", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/export")>();
  return {
    ...original,
    exportSession: vi.fn().mockResolvedValue(new Blob(["test"], { type: "application/zip" })),
  };
});

// Mock buildHtmlReport to avoid heavy template generation
vi.mock("@/lib/html-report", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/html-report")>();
  return {
    ...original,
    buildHtmlReport: vi.fn().mockResolvedValue("<html>report</html>"),
  };
});

// Mock toast to avoid side effects
vi.mock("@/stores/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

// Track created IDs for cleanup
const createdIds: string[] = [];

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  const id = crypto.randomUUID();
  createdIds.push(id);
  return {
    id,
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: new Date().toISOString(),
    status: "started",
    ...overrides,
  };
}

// Must import after mocks are set up
const { createSession, loadSessionById, deleteSession, switchToSession, markDoneAndClose, exportSessionById } =
  await import("@/lib/session-lifecycle");

afterEach(() => {
  useSessionStore.getState().clear();
  useRegistryStore.setState({ sessionIndex: {}, activeSessionId: null });
});

afterAll(async () => {
  for (const id of createdIds) {
    try {
      await deleteFromIDB(id);
    } catch {
      // ignore if already deleted
    }
  }
});

describe("createSession", () => {
  it("saves to IDB, registers in registry, and sets activeSessionId", async () => {
    const meta = makeMetadata();

    await createSession(meta);

    // Verify IDB
    const loaded = await loadFromIDB(meta.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.id).toBe(meta.id);
    expect(loaded!.captures).toEqual([]);
    expect(loaded!.evaluations).toEqual([]);
    expect(loaded!.finalization).toBeNull();

    // Verify registry
    const { sessionIndex, activeSessionId } = useRegistryStore.getState();
    expect(sessionIndex[meta.id]).toBeDefined();
    expect(sessionIndex[meta.id].toolName).toBe("Test Tool");
    expect(activeSessionId).toBe(meta.id);
  });
});

describe("loadSessionById", () => {
  it("loads session from IDB into store and returns true", async () => {
    const meta = makeMetadata();
    const sessionData: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [],
      finalization: null,
    };

    // Directly save to IDB to simulate a pre-existing session
    const { saveToIDB } = await import("@/lib/session-storage");
    await saveToIDB(meta.id, sessionData);

    // Register in registry so the lifecycle can reference it
    useRegistryStore.getState().addSession(meta);

    const result = await loadSessionById(meta.id);

    expect(result).toBe(true);

    const store = useSessionStore.getState();
    expect(store.status).toBe("active");
    expect(store.session).not.toBeNull();
    expect(store.session!.id).toBe(meta.id);
  });

  it("returns false and clears store when session not found", async () => {
    const result = await loadSessionById("nonexistent-id");

    expect(result).toBe(false);

    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");
    expect(store.session).toBeNull();

    const { activeSessionId } = useRegistryStore.getState();
    expect(activeSessionId).toBeNull();
  });
});

describe("deleteSession", () => {
  it("clears session store if session is active, deletes from IDB and registry", async () => {
    const meta = makeMetadata();
    await createSession(meta);

    // Load into store so it's "active"
    await loadSessionById(meta.id);
    expect(useSessionStore.getState().status).toBe("active");

    await deleteSession(meta.id);

    // Store should be cleared
    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");
    expect(store.session).toBeNull();

    // IDB should be gone
    const loaded = await loadFromIDB(meta.id);
    expect(loaded).toBeNull();

    // Registry should be cleaned
    const { sessionIndex, activeSessionId } = useRegistryStore.getState();
    expect(sessionIndex[meta.id]).toBeUndefined();
    expect(activeSessionId).toBeNull();
  });

  it("deletes from IDB and registry even if session is not active", async () => {
    const meta = makeMetadata();
    await createSession(meta);

    // Clear the store so the session is NOT active
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);

    await deleteSession(meta.id);

    const loaded = await loadFromIDB(meta.id);
    expect(loaded).toBeNull();

    const { sessionIndex } = useRegistryStore.getState();
    expect(sessionIndex[meta.id]).toBeUndefined();
  });
});

describe("switchToSession", () => {
  it("saves current session, clears store, and sets activeSessionId to new session", async () => {
    const metaA = makeMetadata({ toolName: "Session A" });
    const metaB = makeMetadata({ toolName: "Session B" });

    await createSession(metaA);
    await loadSessionById(metaA.id);

    // Add some data to the active session so we can verify save
    useSessionStore.getState().setEvaluation("transparency.1", {
      score: 3,
      notes: "test",
      explicitEvidenceIds: [],
    });

    await createSession(metaB);

    switchToSession(metaB.id);

    const { activeSessionId } = useRegistryStore.getState();
    expect(activeSessionId).toBe(metaB.id);

    // Store should be cleared
    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");
    expect(store.session).toBeNull();

    // Verify previous session was saved to IDB (it had an evaluation)
    const savedA = await loadFromIDB(metaA.id);
    expect(savedA).not.toBeNull();
    expect(savedA!.evaluations).toHaveLength(1);
    expect(savedA!.evaluations[0].rubricId).toBe("transparency.1");
  });
});

describe("markDoneAndClose", () => {
  it("marks session as done in registry, saves, clears store, sets activeSessionId to null", async () => {
    const meta = makeMetadata();
    await createSession(meta);
    await loadSessionById(meta.id);

    // Verify active
    expect(useSessionStore.getState().status).toBe("active");

    markDoneAndClose(meta.id);

    // Registry should mark it done
    const { sessionIndex, activeSessionId } = useRegistryStore.getState();
    expect(sessionIndex[meta.id].status).toBe("done");
    expect(activeSessionId).toBeNull();

    // Store should be cleared
    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");
    expect(store.session).toBeNull();

    // Session data should still be in IDB (saved before clear)
    const saved = await loadFromIDB(meta.id);
    expect(saved).not.toBeNull();
    expect(saved!.metadata.id).toBe(meta.id);
  });
});

describe("exportSessionById", () => {
  it("returns a Blob when session exists in registry and IDB", async () => {
    const meta = makeMetadata();
    await createSession(meta);

    const blob = await exportSessionById(meta.id);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/zip");
  });

  it("throws if session not in registry", async () => {
    await expect(exportSessionById("nonexistent-id")).rejects.toThrow(
      "Review nonexistent-id not found in registry",
    );
  });

  it("throws if session in registry but not in IDB", async () => {
    const meta = makeMetadata();
    // Register in registry but don't save to IDB
    useRegistryStore.getState().addSession(meta);

    await expect(exportSessionById(meta.id)).rejects.toThrow(
      `Session ${meta.id} not found in storage`,
    );
  });
});
