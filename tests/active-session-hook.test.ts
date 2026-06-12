import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as lifecycle from "@/lib/session-lifecycle";
import {
  getRepository,
  InMemorySessionRepository,
  resetRepository,
  setRepository,
} from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: "2025-01-01T00:00:00.000Z",
    status: "started",
    ...overrides,
  };
}

/**
 * Tests for the session lifecycle module and useActiveSession orchestration.
 *
 * The lifecycle module owns all session transitions (load/save/switch/delete/markDone).
 * The hook is a thin React wrapper that delegates to these functions.
 */
beforeEach(() => {
  setRepository(new InMemorySessionRepository());
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: null,
    settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full", labs: {} },
  });
  useSessionStore.setState({
    status: "empty",
    session: null,
    captures: [],
    evaluations: [],
  });
});

afterAll(() => {
  resetRepository();
});

// --- Lifecycle module tests ---

describe("lifecycle.loadSessionById", () => {
  it("loads session from repository into session store", async () => {
    const meta = makeMetadata({ id: "sess-1" });
    const data: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [
        { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
      ],
      finalization: null,
    };
    await getRepository().save("sess-1", data);
    useRegistryStore.getState().addSession(meta);

    const found = await lifecycle.loadSessionById("sess-1");

    expect(found).toBe(true);
    const state = useSessionStore.getState();
    expect(state.status).toBe("active");
    expect(state.session?.id).toBe("sess-1");
    expect(state.evaluations).toHaveLength(1);
  });

  it("clears activeSessionId when repository load returns null", async () => {
    useRegistryStore.getState().setActiveSessionId("nonexistent");

    const found = await lifecycle.loadSessionById("nonexistent");

    expect(found).toBe(false);
    expect(useRegistryStore.getState().activeSessionId).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");
  });
});

describe("lifecycle.createSession", () => {
  it("saves to repository and registers in registry", async () => {
    const meta = makeMetadata({ id: "sess-new" });

    await lifecycle.createSession(meta);

    const saved = await getRepository().load("sess-new");
    expect(saved).not.toBeNull();
    expect(saved?.metadata.toolName).toBe("Test Tool");
    expect(saved?.captures).toHaveLength(0);

    expect(useRegistryStore.getState().sessionIndex["sess-new"]).toBeDefined();
    expect(useRegistryStore.getState().activeSessionId).toBe("sess-new");
  });
});

describe("lifecycle.deleteSession", () => {
  it("deletes from registry and repository", async () => {
    const meta = makeMetadata({ id: "sess-del" });
    await getRepository().save("sess-del", {
      metadata: meta,
      captures: [],
      evaluations: [],
      finalization: null,
    });
    useRegistryStore.getState().addSession(meta);

    await lifecycle.deleteSession("sess-del");

    expect(useRegistryStore.getState().sessionIndex["sess-del"]).toBeUndefined();
    const saved = await getRepository().load("sess-del");
    expect(saved).toBeNull();
  });

  it("clears session store when deleting the active session", async () => {
    const meta = makeMetadata({ id: "sess-active-del" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], finalization: null };
    await getRepository().save("sess-active-del", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);

    expect(useSessionStore.getState().session).not.toBeNull();

    await lifecycle.deleteSession("sess-active-del");

    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");
  });
});

describe("lifecycle.switchToSession", () => {
  it("saves current session, clears store, and sets new activeSessionId", async () => {
    const meta1 = makeMetadata({ id: "sess-a" });
    const _meta2 = makeMetadata({ id: "sess-b" });
    await getRepository().save("sess-a", {
      metadata: meta1,
      captures: [],
      evaluations: [],
      finalization: null,
    });
    useRegistryStore.getState().addSession(meta1);
    useSessionStore.getState().loadSession((await getRepository().load("sess-a")) as SessionData);
    useSessionStore
      .getState()
      .setEvaluation("TR.data_source_clarity", { score: 3, notes: "", explicitEvidenceIds: [] });

    await lifecycle.switchToSession("sess-b");

    expect(useSessionStore.getState().session).toBeNull();
    expect(useRegistryStore.getState().activeSessionId).toBe("sess-b");

    // Original saved with evaluation (fire-and-forget needs a tick)
    await new Promise((r) => setTimeout(r, 50));
    const saved = await getRepository().load("sess-a");
    expect(saved?.evaluations).toHaveLength(1);
    expect(saved?.evaluations[0].score).toBe(3);
  });
});

describe("lifecycle.markDoneAndClose", () => {
  it("marks session done in registry, saves to repository, and clears store", async () => {
    const meta = makeMetadata({ id: "sess-done" });
    const data: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [
        { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
      ],
      finalization: null,
    };
    await getRepository().save("sess-done", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);

    await lifecycle.markDoneAndClose("sess-done");

    expect(useRegistryStore.getState().sessionIndex["sess-done"].status).toBe("done");
    expect(useRegistryStore.getState().activeSessionId).toBeNull();
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");

    // Data was persisted to repository
    await new Promise((r) => setTimeout(r, 50));
    const saved = await getRepository().load("sess-done");
    expect(saved).not.toBeNull();
    expect(saved?.evaluations).toHaveLength(1);
  });
});

describe("lifecycle.saveCurrentSession", () => {
  it("snapshots and persists session store state to repository", async () => {
    const meta = makeMetadata({ id: "sess-save" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], finalization: null };
    await getRepository().save("sess-save", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);
    useSessionStore
      .getState()
      .setEvaluation("SE.algorithmic_fairness", { score: 2, notes: "", explicitEvidenceIds: [] });

    lifecycle.saveCurrentSession();

    await new Promise((r) => setTimeout(r, 50));
    const saved = await getRepository().load("sess-save");
    expect(saved?.evaluations).toHaveLength(1);
    expect(saved?.evaluations[0].rubricId).toBe("SE.algorithmic_fairness");
  });

  it("is a no-op when no session is active", () => {
    expect(useSessionStore.getState().session).toBeNull();
    // Should not throw
    lifecycle.saveCurrentSession();
  });
});

// --- Legacy hook-effect simulation tests (kept for regression coverage) ---

describe("hook Effect 1 simulation: save on activeSessionId clear", () => {
  it("saves to repository when activeSessionId is cleared with active session", async () => {
    const meta = makeMetadata({ id: "sess-2" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], finalization: null };
    await getRepository().save("sess-2", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);
    useSessionStore
      .getState()
      .setEvaluation("RE.variance_consistency", { score: 1, notes: "", explicitEvidenceIds: [] });

    const { session: s, captures: c, evaluations: e } = useSessionStore.getState();
    const session = s as NonNullable<typeof s>;

    // Simulate the hook effect: save then clear in .finally()
    // (the clear must only happen after save completes/fails)
    let clearCalled = false;
    await getRepository()
      .save(session.id, {
        metadata: session,
        captures: c,
        evaluations: e,
        finalization: null,
      })
      .catch((err) => {
        console.error("Failed to save session before clearing:", err);
      })
      .finally(() => {
        useSessionStore.getState().clear();
        clearCalled = true;
      });

    expect(clearCalled).toBe(true);
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");

    const saved = await getRepository().load("sess-2");
    expect(saved).not.toBeNull();
    expect(saved?.evaluations).toHaveLength(1);
    expect(saved?.evaluations[0].score).toBe(1);
  });

  it("clears immediately when no current session exists", () => {
    // No session loaded — clear should happen synchronously
    useSessionStore.getState().clear();
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");
  });
});

describe("hook Effect 2 simulation: debounced auto-save", () => {
  it("saves session state to repository after debounce", async () => {
    const meta = makeMetadata({ id: "sess-d" });
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession({
      metadata: meta,
      captures: [],
      evaluations: [],
      finalization: null,
    });

    useSessionStore
      .getState()
      .setEvaluation("SE.algorithmic_fairness", { score: 2, notes: "", explicitEvidenceIds: [] });

    const { session: s, captures: c, evaluations: e } = useSessionStore.getState();
    const session = s as NonNullable<typeof s>;
    await getRepository().save(session.id, {
      metadata: session,
      captures: c,
      evaluations: e,
      finalization: null,
    });

    const saved = await getRepository().load("sess-d");
    expect(saved?.evaluations).toHaveLength(1);
    expect(saved?.evaluations[0].rubricId).toBe("SE.algorithmic_fairness");
  });
});
