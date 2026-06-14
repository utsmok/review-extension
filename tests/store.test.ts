import { beforeEach, describe, expect, it } from "vitest";
import type { Capture, SessionMetadata } from "@/lib/types";
import { useSessionStore } from "@/stores/session";
import { makeCapture as _makeCapture, makeMetadata as _makeMetadata } from "@/tests/fixtures";

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return _makeMetadata({
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: "2025-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function makeCapture(overrides?: Partial<Capture>): Capture {
  return _makeCapture({
    timestamp: new Date().toISOString(),
    sourceUrl: "https://example.com/page",
    screenshotBase64: "data:image/png;base64,abc123",
    htmlContent: "<html></html>",
    ...overrides,
  });
}

describe("session lifecycle", () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: "empty",
      session: null,
      captures: [],
      evaluations: [],
      recentlyDeleted: [],
    });
  });

  it("starts a session via loadSession", () => {
    const store = useSessionStore.getState();
    store.loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization: null,
    });

    const state = useSessionStore.getState();
    expect(state.session).not.toBeNull();
    expect(state.session?.toolName).toBe("Test Tool");
    expect(state.captures).toEqual([]);
    expect(state.evaluations).toEqual([]);
    expect(state.status).toBe("active");
  });

  it("clears session and all data", () => {
    const store = useSessionStore.getState();
    store.loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization: null,
    });
    store.addCapture(makeCapture());
    store.setEvaluation("TR.data_source_clarity", { score: 3 });

    store.clear();

    const state = useSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.captures).toEqual([]);
    expect(state.evaluations).toEqual([]);
    expect(state.status).toBe("empty");
  });

  it("updates metadata without replacing the whole session", () => {
    const store = useSessionStore.getState();
    store.loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization: null,
    });
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

  it("saves and clears finalization", () => {
    const store = useSessionStore.getState();
    store.loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization: null,
    });

    const finalization = {
      grade: "pass" as const,
      conclusion: "Great tool",
      strengths: ["Good UI"],
      weaknesses: ["Slow"],
      recommendations: "Improve speed",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };
    store.setFinalization(finalization);
    expect(useSessionStore.getState().finalization).toEqual(finalization);

    store.setFinalization(null);
    expect(useSessionStore.getState().finalization).toBeNull();
  });

  it("clear resets finalization to null", () => {
    const store = useSessionStore.getState();
    store.loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization: {
        grade: "conditional",
        conclusion: "Mixed results",
        strengths: [],
        weaknesses: ["Incomplete docs"],
        recommendations: "Add docs",
        finalizedAt: "2025-06-01T12:00:00.000Z",
      },
    });

    store.clear();
    expect(useSessionStore.getState().finalization).toBeNull();
  });

  it("loadSession hydrates finalization", () => {
    const store = useSessionStore.getState();
    const finalization = {
      grade: "fail" as const,
      conclusion: "Not ready",
      strengths: [],
      weaknesses: ["No transparency"],
      recommendations: "Overhaul needed",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };
    store.loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization,
    });

    expect(useSessionStore.getState().finalization).toEqual(finalization);
  });
});

describe("capture management", () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: "empty",
      session: null,
      captures: [],
      evaluations: [],
      recentlyDeleted: [],
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

describe("undo-delete preserves new evidence links", () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: "empty",
      session: null,
      captures: [],
      evaluations: [],
      recentlyDeleted: [],
    });
  });

  it("undo-merge keeps evidence links added during undo window", () => {
    const store = useSessionStore.getState();
    const capA = makeCapture({ id: "cap-A" });
    const capB = makeCapture({ id: "cap-B" });
    store.addCapture(capA);
    store.addCapture(capB);

    // Link capture A to rubric R
    store.linkCaptureToRubric("cap-A", "TR.data_source_clarity");

    // Delete capture A
    store.removeCapture("cap-A");

    // During the undo window, link capture B to the same rubric
    store.linkCaptureToRubric("cap-B", "TR.data_source_clarity");

    // Undo the deletion of A
    store.undoDeleteCapture();

    const state = useSessionStore.getState();
    expect(state.captures).toHaveLength(2);

    const ev = state.evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.explicitEvidenceIds).toContain("cap-A");
    expect(ev?.explicitEvidenceIds).toContain("cap-B");
  });
});

describe("evaluation management", () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: "empty",
      session: null,
      captures: [],
      evaluations: [],
      recentlyDeleted: [],
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

describe("capture ↔ rubric linking (single-direction)", () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: "empty",
      session: null,
      captures: [],
      evaluations: [],
      recentlyDeleted: [],
    });
  });

  it("linkCaptureToRubric updates evaluation with capture reference", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));

    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");

    const state = useSessionStore.getState();

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
    expect(state.evaluations[0].explicitEvidenceIds).toHaveLength(1);
  });

  it("unlinkCaptureFromRubric removes capture from evaluation", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));
    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");

    store.unlinkCaptureFromRubric("cap-1", "TR.data_source_clarity");

    const state = useSessionStore.getState();
    expect(state.evaluations[0].explicitEvidenceIds).toHaveLength(0);
  });

  it("a capture can be linked to multiple rubric items", () => {
    const store = useSessionStore.getState();
    store.addCapture(makeCapture({ id: "cap-1" }));

    store.linkCaptureToRubric("cap-1", "TR.data_source_clarity");
    store.linkCaptureToRubric("cap-1", "RE.variance_consistency");

    const state = useSessionStore.getState();
    expect(state.evaluations).toHaveLength(2);
  });
});

describe("status management", () => {
  beforeEach(() => {
    useSessionStore.setState({
      status: "empty",
      session: null,
      captures: [],
      evaluations: [],
      recentlyDeleted: [],
    });
  });

  it("setStatus updates status", () => {
    const store = useSessionStore.getState();
    expect(store.status).toBe("empty");

    store.setStatus("loading");
    expect(useSessionStore.getState().status).toBe("loading");

    store.setStatus("active");
    expect(useSessionStore.getState().status).toBe("active");
  });
});
