import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { loadFromIDB, saveToIDB } from "@/lib/session-storage";
import * as lifecycle from "@/lib/session-lifecycle";
import type { SessionData, SessionMetadata } from "@/lib/types";

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
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: null,
    settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full" },
  });
  useSessionStore.setState({
    status: "empty",
    session: null,
    captures: [],
    evaluations: [],
    questionModes: {},
  });
});

// --- Lifecycle module tests ---

describe("lifecycle.loadSessionById", () => {
  it("loads session from IDB into session store", async () => {
    const meta = makeMetadata({ id: "sess-1" });
    const data: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [{ rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] }],
      questionModes: {},
      finalization: null,
    };
    await saveToIDB("sess-1", data);
    useRegistryStore.getState().addSession(meta);

    const found = await lifecycle.loadSessionById("sess-1");

    expect(found).toBe(true);
    const state = useSessionStore.getState();
    expect(state.status).toBe("active");
    expect(state.session?.id).toBe("sess-1");
    expect(state.evaluations).toHaveLength(1);
  });

  it("clears activeSessionId when IDB load returns null", async () => {
    useRegistryStore.getState().setActiveSessionId("nonexistent");

    const found = await lifecycle.loadSessionById("nonexistent");

    expect(found).toBe(false);
    expect(useRegistryStore.getState().activeSessionId).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");
  });
});

describe("lifecycle.createSession", () => {
  it("saves to IDB and registers in registry", async () => {
    const meta = makeMetadata({ id: "sess-new" });

    await lifecycle.createSession(meta);

    const saved = await loadFromIDB("sess-new");
    expect(saved).not.toBeNull();
    expect(saved!.metadata.toolName).toBe("Test Tool");
    expect(saved!.captures).toHaveLength(0);

    expect(useRegistryStore.getState().sessionIndex["sess-new"]).toBeDefined();
    expect(useRegistryStore.getState().activeSessionId).toBe("sess-new");
  });
});

describe("lifecycle.deleteSession", () => {
  it("deletes from registry and IDB", async () => {
    const meta = makeMetadata({ id: "sess-del" });
    await saveToIDB("sess-del", { metadata: meta, captures: [], evaluations: [], questionModes: {}, finalization: null });
    useRegistryStore.getState().addSession(meta);

    await lifecycle.deleteSession("sess-del");

    expect(useRegistryStore.getState().sessionIndex["sess-del"]).toBeUndefined();
    const saved = await loadFromIDB("sess-del");
    expect(saved).toBeNull();
  });

  it("clears session store when deleting the active session", async () => {
    const meta = makeMetadata({ id: "sess-active-del" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], questionModes: {}, finalization: null };
    await saveToIDB("sess-active-del", data);
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
    const meta2 = makeMetadata({ id: "sess-b" });
    await saveToIDB("sess-a", { metadata: meta1, captures: [], evaluations: [], questionModes: {}, finalization: null });
    useRegistryStore.getState().addSession(meta1);
    useSessionStore.getState().loadSession(await loadFromIDB("sess-a") as SessionData);
    useSessionStore.getState().setEvaluation("TR.data_source_clarity", { score: 3, notes: "", explicitEvidenceIds: [] });

    lifecycle.switchToSession("sess-b");

    expect(useSessionStore.getState().session).toBeNull();
    expect(useRegistryStore.getState().activeSessionId).toBe("sess-b");

    // Original saved with evaluation (fire-and-forget needs a tick)
    await new Promise((r) => setTimeout(r, 50));
    const saved = await loadFromIDB("sess-a");
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].score).toBe(3);
  });
});

describe("lifecycle.markDoneAndClose", () => {
  it("marks session done in registry, saves to IDB, and clears store", async () => {
    const meta = makeMetadata({ id: "sess-done" });
    const data: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [{ rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] }],
      questionModes: {},
      finalization: null,
    };
    await saveToIDB("sess-done", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);

    lifecycle.markDoneAndClose("sess-done");

    expect(useRegistryStore.getState().sessionIndex["sess-done"].status).toBe("done");
    expect(useRegistryStore.getState().activeSessionId).toBeNull();
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");

    // Data was persisted to IDB
    await new Promise((r) => setTimeout(r, 50));
    const saved = await loadFromIDB("sess-done");
    expect(saved).not.toBeNull();
    expect(saved!.evaluations).toHaveLength(1);
  });
});

describe("lifecycle.saveCurrentSession", () => {
  it("snapshots and persists session store state to IDB", async () => {
    const meta = makeMetadata({ id: "sess-save" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], questionModes: {}, finalization: null };
    await saveToIDB("sess-save", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);
    useSessionStore.getState().setEvaluation("SE.algorithmic_fairness", { score: 2, notes: "", explicitEvidenceIds: [] });

    lifecycle.saveCurrentSession();

    await new Promise((r) => setTimeout(r, 50));
    const saved = await loadFromIDB("sess-save");
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].rubricId).toBe("SE.algorithmic_fairness");
  });

  it("is a no-op when no session is active", () => {
    expect(useSessionStore.getState().session).toBeNull();
    // Should not throw
    lifecycle.saveCurrentSession();
  });
});

// --- Legacy hook-effect simulation tests (kept for regression coverage) ---

describe("hook Effect 1 simulation: save on activeSessionId clear", () => {
  it("saves to IDB when activeSessionId is cleared with active session", async () => {
    const meta = makeMetadata({ id: "sess-2" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], questionModes: {}, finalization: null };
    await saveToIDB("sess-2", data);
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession(data);
    useSessionStore.getState().setEvaluation("RE.variance_consistency", { score: 1, notes: "", explicitEvidenceIds: [] });

    const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
    await saveToIDB(s!.id, { metadata: s!, captures: c, evaluations: e, questionModes: q, finalization: null });
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);

    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");

    const saved = await loadFromIDB("sess-2");
    expect(saved).not.toBeNull();
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].score).toBe(1);
  });
});

describe("hook Effect 2 simulation: debounced auto-save", () => {
  it("saves session state to IDB after debounce", async () => {
    const meta = makeMetadata({ id: "sess-d" });
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession({
      metadata: meta,
      captures: [],
      evaluations: [],
      questionModes: {},
      finalization: null,
    });

    useSessionStore.getState().setEvaluation("SE.algorithmic_fairness", { score: 2, notes: "", explicitEvidenceIds: [] });

    const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
    await saveToIDB(s!.id, { metadata: s!, captures: c, evaluations: e, questionModes: q, finalization: null });

    const saved = await loadFromIDB("sess-d");
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].rubricId).toBe("SE.algorithmic_fairness");
  });
});
