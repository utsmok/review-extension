import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRepository,
  InMemorySessionRepository,
  resetRepository,
  setRepository,
} from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";

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

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: new Date().toISOString(),
    status: "started",
    ...overrides,
  };
}

let repo: InMemorySessionRepository;

beforeEach(() => {
  repo = new InMemorySessionRepository();
  setRepository(repo);
});

// Must import after mocks are set up
const {
  createSession,
  loadSessionById,
  deleteSession,
  switchToSession,
  markDoneAndClose,
  exportSessionById,
  importSessionFromZipFile,
} = await import("@/lib/session-lifecycle");

afterEach(() => {
  useSessionStore.getState().clear();
  useRegistryStore.setState({ sessionIndex: {}, activeSessionId: null });
});

afterAll(() => {
  resetRepository();
});

describe("createSession", () => {
  it("saves to repository, registers in registry, and sets activeSessionId", async () => {
    const meta = makeMetadata();

    await createSession(meta);

    // Verify repository
    const loaded = await getRepository().load(meta.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.metadata.id).toBe(meta.id);
    expect(loaded?.captures).toEqual([]);
    expect(loaded?.evaluations).toEqual([]);
    expect(loaded?.finalization).toBeNull();

    // Verify registry
    const { sessionIndex, activeSessionId } = useRegistryStore.getState();
    expect(sessionIndex[meta.id]).toBeDefined();
    expect(sessionIndex[meta.id].toolName).toBe("Test Tool");
    expect(activeSessionId).toBe(meta.id);
  });
});

describe("loadSessionById", () => {
  it("loads session from repository into store and returns true", async () => {
    const meta = makeMetadata();
    const sessionData: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [],
      finalization: null,
    };

    // Directly save to repository to simulate a pre-existing session
    await getRepository().save(meta.id, sessionData);

    // Register in registry so the lifecycle can reference it
    useRegistryStore.getState().addSession(meta);

    const result = await loadSessionById(meta.id);

    expect(result).toBe(true);

    const store = useSessionStore.getState();
    expect(store.status).toBe("active");
    expect(store.session).not.toBeNull();
    expect(store.session?.id).toBe(meta.id);
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
  it("clears session store if session is active, deletes from repository and registry", async () => {
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

    // Repository should be gone
    const loaded = await getRepository().load(meta.id);
    expect(loaded).toBeNull();

    // Registry should be cleaned
    const { sessionIndex, activeSessionId } = useRegistryStore.getState();
    expect(sessionIndex[meta.id]).toBeUndefined();
    expect(activeSessionId).toBeNull();
  });

  it("deletes from repository and registry even if session is not active", async () => {
    const meta = makeMetadata();
    await createSession(meta);

    // Clear the store so the session is NOT active
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);

    await deleteSession(meta.id);

    const loaded = await getRepository().load(meta.id);
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

    await switchToSession(metaB.id);

    const { activeSessionId } = useRegistryStore.getState();
    expect(activeSessionId).toBe(metaB.id);

    // Store should be cleared
    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");
    expect(store.session).toBeNull();

    // Verify previous session was saved to repository (it had an evaluation)
    const savedA = await getRepository().load(metaA.id);
    expect(savedA).not.toBeNull();
    expect(savedA?.evaluations).toHaveLength(1);
    expect(savedA?.evaluations[0].rubricId).toBe("transparency.1");
  });
});

describe("markDoneAndClose", () => {
  it("marks session as done in registry, saves, clears store, sets activeSessionId to null", async () => {
    const meta = makeMetadata();
    await createSession(meta);
    await loadSessionById(meta.id);

    // Verify active
    expect(useSessionStore.getState().status).toBe("active");

    await markDoneAndClose(meta.id);

    // Registry should mark it done
    const { sessionIndex, activeSessionId } = useRegistryStore.getState();
    expect(sessionIndex[meta.id].status).toBe("done");
    expect(activeSessionId).toBeNull();

    // Store should be cleared
    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");
    expect(store.session).toBeNull();

    // Session data should still be in repository (saved before clear)
    const saved = await getRepository().load(meta.id);
    expect(saved).not.toBeNull();
    expect(saved?.metadata.id).toBe(meta.id);
  });
});

describe("exportSessionById", () => {
  it("returns a Blob when session exists in registry and repository", async () => {
    const meta = makeMetadata();
    await createSession(meta);

    const blob = await exportSessionById(meta.id);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/zip");
  });

  it("throws if session not found in storage", async () => {
    await expect(exportSessionById("nonexistent-id")).rejects.toThrow(
      "Session nonexistent-id not found in storage",
    );
  });

  it("throws if session in registry but not in repository", async () => {
    const meta = makeMetadata();
    // Register in registry but don't save to repository
    useRegistryStore.getState().addSession(meta);

    await expect(exportSessionById(meta.id)).rejects.toThrow(
      `Session ${meta.id} not found in storage`,
    );
  });
});

// We also need the toast mock for assertions
import { toastError } from "@/stores/toast";

describe("switchToSession re-entrancy guard", () => {
  it("ignores a rapid second call while the first is in flight", async () => {
    const metaA = makeMetadata({ toolName: "Session A" });
    const metaB = makeMetadata({ toolName: "Session B" });

    await createSession(metaA);
    await loadSessionById(metaA.id);

    await createSession(metaB);

    // Spy on clear to count calls
    const clearSpy = vi.spyOn(useSessionStore.getState(), "clear");

    // Fire both calls concurrently
    await Promise.all([switchToSession(metaB.id), switchToSession(metaA.id)]);

    // clear should be called only once (the first call wins)
    expect(clearSpy).toHaveBeenCalledTimes(1);

    // activeSessionId should be the first call's target
    const { activeSessionId } = useRegistryStore.getState();
    expect(activeSessionId).toBe(metaB.id);

    clearSpy.mockRestore();
  });
});

describe("deleteSession error handling", () => {
  it("removes registry entry and toasts when getRepository().delete rejects", async () => {
    const meta = makeMetadata();
    await createSession(meta);

    // Spy on delete to force rejection
    const deleteSpy = vi.spyOn(repo, "delete").mockRejectedValue(new Error("IDB quota exceeded"));

    await deleteSession(meta.id);

    // Registry entry should still be removed (finally block)
    const { sessionIndex } = useRegistryStore.getState();
    expect(sessionIndex[meta.id]).toBeUndefined();

    // toastError should have been called
    expect(toastError).toHaveBeenCalledWith(
      "Could not fully remove this review's data from storage. The card has been removed, but leftover data may occupy space.",
    );

    deleteSpy.mockRestore();
  });
});

describe("importSessionFromZipFile error handling", () => {
  it("cleans up saved screenshots and re-throws when getRepository().save rejects", async () => {
    const captureId = "cap-123";

    // Mock importSessionFromZip to return data with a screenshot capture
    vi.mocked(await import("@/lib/export")).importSessionFromZip = vi.fn().mockResolvedValue({
      metadata: makeMetadata(),
      captures: [
        {
          id: captureId,
          screenshotBase64: "fakepng",
          annotatedScreenshotBase64: undefined,
          notes: "",
          metadataField: undefined,
        },
      ],
      evaluations: [],
      finalization: null,
      quickNotes: [],
    });

    // Mock saveScreenshot to succeed
    const saveScreenshotSpy = vi
      .spyOn(await import("@/lib/screenshot-store"), "saveScreenshot")
      .mockResolvedValue(undefined);

    // Spy on deleteScreenshotsForCaptures
    const cleanupSpy = vi
      .spyOn(await import("@/lib/screenshot-store"), "deleteScreenshotsForCaptures")
      .mockResolvedValue(undefined);

    // Force getRepository().save to reject
    vi.spyOn(repo, "save").mockRejectedValue(new Error("IDB write failed"));

    await expect(importSessionFromZipFile(new Blob(["fake"]))).rejects.toThrow("IDB write failed");

    // Screenshots should have been cleaned up with the saved capture ID
    expect(cleanupSpy).toHaveBeenCalledWith([captureId]);

    // toastError should have been called
    expect(toastError).toHaveBeenCalledWith("Import failed. Could not save the review.");

    // No registry entry should remain
    const { sessionIndex } = useRegistryStore.getState();
    expect(Object.keys(sessionIndex)).toHaveLength(0);

    cleanupSpy.mockRestore();
    saveScreenshotSpy.mockRestore();
  });
});
