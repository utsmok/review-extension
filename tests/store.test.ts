import { beforeEach, describe, expect, it } from "vitest";
import type { Capture, SessionMetadata } from "@/lib/types";
import { useSessionStore } from "@/stores/session";

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    sourceUrl: "https://example.com/page",
    pageTitle: "Test Page",
    screenshotBase64: "data:image/png;base64,abc123",
    htmlContent: "<html></html>",
    notes: "",
    linkedRubricIds: [],
    ...overrides,
  };
}

describe("session lifecycle", () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      captures: [],
      evaluations: [],
    });
  });

  it("starts a session", () => {
    const store = useSessionStore.getState();
    store.startSession(makeMetadata());

    const state = useSessionStore.getState();
    expect(state.session).not.toBeNull();
    expect(state.session?.toolName).toBe("Test Tool");
    expect(state.captures).toEqual([]);
    expect(state.evaluations).toEqual([]);
  });

  it("ends a session and clears all data", () => {
    const store = useSessionStore.getState();
    store.startSession(makeMetadata());
    store.addCapture(makeCapture());
    store.setEvaluation("TR.data_source_clarity", { score: 3 });

    store.endSession();

    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.captures).toEqual([]);
    expect(state.evaluations).toEqual([]);
  });

  it("updates metadata without replacing the whole session", () => {
    const store = useSessionStore.getState();
    store.startSession(makeMetadata());
    store.updateMetadata({ company: "Acme Corp", pricing: "Free" });

    const state = useSessionStore.getState();
    expect(state.session?.company).toBe("Acme Corp");
    expect(state.session?.pricing).toBe("Free");
    expect(state.session?.toolName).toBe("Test Tool");
  });

  it("does nothing when updating metadata with no active session", () => {
    const store = useSessionStore.getState();
    store.updateMetadata({ company: "Acme Corp" });

    expect(useSessionStore.getState().session).toBeNull();
  });
});

describe("capture management", () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      captures: [],
      evaluations: [],
    });
  });

  it("adds captures", () => {
    const store = useSessionStore.getState();
    const c1 = makeCapture({ id: "cap-1" });
    const c2 = makeCapture({ id: "cap-2" });

    store.addCapture(c1);
    store.addCapture(c2);

    expect(useSessionStore.getState().captures).toHaveLength(2);
    expect(useSessionStore.getState().captures.map((c) => c.id)).toEqual(["cap-1", "cap-2"]);
  });

  it("updates a capture by id", () => {
    const store = useSessionStore.getState();
    const c = makeCapture({ id: "cap-1" });
    store.addCapture(c);

    store.updateCapture("cap-1", { notes: "Updated notes" });

    expect(useSessionStore.getState().captures[0].notes).toBe("Updated notes");
  });

  it("removes a capture and cleans up evaluation references", () => {
    const store = useSessionStore.getState();
    const c1 = makeCapture({ id: "cap-1" });
    const c2 = makeCapture({ id: "cap-2" });
    store.addCapture(c1);
    store.addCapture(c2);

    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");
    store.linkCaptureToRubric("cap-2", "TR.data_source_clarity");

    store.removeCapture("cap-1");

    const state = useSessionStore.getState();
    expect(state.captures).toHaveLength(1);
    expect(state.captures[0].id).toBe("cap-2");

    const ev = state.evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.explicitEvidenceIds).not.toContain("cap-1");
    expect(ev?.explicitEvidenceIds).toContain("cap-2");
  });
});

describe("evaluation management", () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      captures: [],
      evaluations: [],
    });
  });

  it("creates a new evaluation on first score", () => {
    const store = useSessionStore.getState();
    store.setEvaluation("TR.data_source_clarity", { score: 2 });

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev).toBeDefined();
    expect(ev?.score).toBe(2);
    expect(ev?.notes).toBe("");
    expect(ev?.explicitEvidenceIds).toEqual([]);
  });

  it("updates an existing evaluation", () => {
    const store = useSessionStore.getState();
    store.setEvaluation("RE.accuracy_and_hallucination", {
      score: 1,
    });
    store.setEvaluation("RE.accuracy_and_hallucination", {
      score: 3,
      notes: "Excellent",
    });

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "RE.accuracy_and_hallucination");
    expect(ev?.score).toBe(3);
    expect(ev?.notes).toBe("Excellent");
    // Only one evaluation for this rubricId
    expect(
      useSessionStore
        .getState()
        .evaluations.filter((e) => e.rubricId === "RE.accuracy_and_hallucination"),
    ).toHaveLength(1);
  });

  it("handles pass/fail scores", () => {
    const store = useSessionStore.getState();
    store.setEvaluation("privacy_and_security.data_privacy", {
      score: "pass",
    });

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "privacy_and_security.data_privacy");
    expect(ev?.score).toBe("pass");
  });
});

describe("bi-directional capture ↔ rubric linking", () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      captures: [],
      evaluations: [],
    });
  });

  it("linkCaptureToRubric updates both capture and evaluation", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));

    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");

    const state = useSessionStore.getState();
    expect(state.captures[0].linkedRubricIds).toContain("TR.data_source_clarity");

    const ev = state.evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev).toBeDefined();
    expect(ev?.explicitEvidenceIds).toContain("cap-1");
  });

  it("linkCaptureToRubric adds to existing evaluation", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));
    store.addCapture(makeCapture({ id: "cap-2" }));

    store.setEvaluation("TR.data_source_clarity", {
      score: 2,
      notes: "Good",
    });
    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");
    store.linkCaptureToRubric("cap-2", "TR.data_source_clarity");

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.score).toBe(2);
    expect(ev?.notes).toBe("Good");
    expect(ev?.explicitEvidenceIds).toEqual(["cap-1", "cap-2"]);
  });

  it("is idempotent — linking twice does not duplicate", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));

    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");
    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");

    const state = useSessionStore.getState();
    expect(state.captures[0].linkedRubricIds).toHaveLength(1);
    expect(state.evaluations[0].explicitEvidenceIds).toHaveLength(1);
  });

  it("unlinkCaptureFromRubric removes from both sides", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));
    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");

    store.unlinkCaptureFromRubric("cap-1", "TR.data_source_clarity");

    const state = useSessionStore.getState();
    expect(state.captures[0].linkedRubricIds).not.toContain("TR.data_source_clarity");
    expect(state.evaluations[0].explicitEvidenceIds).toHaveLength(0);
  });

  it("a capture can be linked to multiple rubric items", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));

    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");
    store.linkCaptureToRubric("cap-1", "RE.variance_consistency");

    const state = useSessionStore.getState();
    expect(state.captures[0].linkedRubricIds).toHaveLength(2);
    expect(state.evaluations).toHaveLength(2);
  });
});
