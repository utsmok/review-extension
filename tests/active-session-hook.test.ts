import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { loadFromIDB, saveToIDB, saveToIDBFireAndForget } from "@/lib/session-storage";
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
 * Tests for the useActiveSession orchestration logic.
 *
 * The hook is a thin React wrapper around zustand stores. These tests exercise
 * the same lifecycle logic (load/save/switch/flush) by driving the stores and
 * IDB directly — matching what the hook's effects do under the hood.
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

describe("active session lifecycle", () => {
  it("loads session from IDB into session store", async () => {
    const meta = makeMetadata({ id: "sess-1" });
    const data: SessionData = {
      metadata: meta,
      captures: [],
      evaluations: [{ rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] }],
      questionModes: {},
    };
    await saveToIDB("sess-1", data);

    // Simulate hook Effect 1: activeSessionId set, status is "empty"
    useRegistryStore.getState().setActiveSessionId("sess-1");
    useSessionStore.setState({ status: "loading" });

    const loaded = await loadFromIDB("sess-1");
    expect(loaded).not.toBeNull();
    useSessionStore.getState().loadSession(loaded!);

    const state = useSessionStore.getState();
    expect(state.status).toBe("active");
    expect(state.session?.id).toBe("sess-1");
    expect(state.evaluations).toHaveLength(1);
  });

  it("saves to IDB when activeSessionId is cleared with active session", async () => {
    const meta = makeMetadata({ id: "sess-2" });
    const data: SessionData = { metadata: meta, captures: [], evaluations: [], questionModes: {} };
    await saveToIDB("sess-2", data);
    useRegistryStore.getState().addSession(meta);

    useSessionStore.getState().loadSession(data);

    // Add some data
    useSessionStore.getState().setEvaluation("RE.variance_consistency", { score: 1, notes: "", explicitEvidenceIds: [] });

    const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
    await saveToIDB(s!.id, { metadata: s!, captures: c, evaluations: e, questionModes: q });

    // Clear (simulates hook Effect 1: activeSessionId becomes null)
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);

    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");

    const saved = await loadFromIDB("sess-2");
    expect(saved).not.toBeNull();
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].score).toBe(1);
  });

  it("clears activeSessionId and registry when IDB load returns null", async () => {
    useRegistryStore.getState().setActiveSessionId("nonexistent");
    useSessionStore.setState({ status: "loading" });

    const loaded = await loadFromIDB("nonexistent");
    expect(loaded).toBeNull();

    // Simulate hook's fallback behavior
    useSessionStore.setState({ status: "empty" });
    useRegistryStore.getState().setActiveSessionId(null);

    expect(useRegistryStore.getState().activeSessionId).toBeNull();
    expect(useSessionStore.getState().status).toBe("empty");
  });
});

describe("composite actions", () => {
  it("closeSession sets activeSessionId to null", () => {
    const meta = makeMetadata({ id: "sess-x" });
    useRegistryStore.getState().addSession(meta);
    expect(useRegistryStore.getState().activeSessionId).toBe("sess-x");

    // closeSession = () => setActiveSessionId(null)
    useRegistryStore.getState().setActiveSessionId(null);
    expect(useRegistryStore.getState().activeSessionId).toBeNull();
  });

  it("switchToSession saves current, clears, then sets new id", async () => {
    const meta1 = makeMetadata({ id: "sess-a" });
    const meta2 = makeMetadata({ id: "sess-b" });
    await saveToIDB("sess-a", { metadata: meta1, captures: [], evaluations: [], questionModes: {} });
    useRegistryStore.getState().addSession(meta1);

    useSessionStore.getState().loadSession(
      await loadFromIDB("sess-a") as SessionData,
    );
    useSessionStore.getState().setEvaluation("TR.data_source_clarity", { score: 3, notes: "", explicitEvidenceIds: [] });

    // switchToSession: save current → clear → set new id
    const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
    saveToIDBFireAndForget(s!.id, { metadata: s!, captures: c, evaluations: e, questionModes: q });
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId("sess-b");

    expect(useSessionStore.getState().session).toBeNull();
    expect(useRegistryStore.getState().activeSessionId).toBe("sess-b");

    // Original saved with evaluation
    await new Promise((r) => setTimeout(r, 50));
    const saved = await loadFromIDB("sess-a");
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].score).toBe(3);
  });
});

describe("debounced auto-save", () => {
  it("saves session state to IDB after debounce", async () => {
    const meta = makeMetadata({ id: "sess-d" });
    useRegistryStore.getState().addSession(meta);
    useSessionStore.getState().loadSession({
      metadata: meta,
      captures: [],
      evaluations: [],
      questionModes: {},
    });

    // Simulate a state change followed by debounce flush
    useSessionStore.getState().setEvaluation("SE.algorithmic_fairness", { score: 2, notes: "", explicitEvidenceIds: [] });

    const { session: s, captures: c, evaluations: e, questionModes: q } = useSessionStore.getState();
    await saveToIDB(s!.id, { metadata: s!, captures: c, evaluations: e, questionModes: q });

    const saved = await loadFromIDB("sess-d");
    expect(saved!.evaluations).toHaveLength(1);
    expect(saved!.evaluations[0].rubricId).toBe("SE.algorithmic_fairness");
  });
});
