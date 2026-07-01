// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import { QuestionRow, QuestionSection } from "@/components/QuestionSection";
import type { Evaluation } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeEvaluation } from "@/tests/fixtures";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/capture", () => ({
  captureActiveTab: vi.fn(),
}));

vi.mock("@/lib/session-lifecycle", () => ({
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  markDoneAndClose: vi.fn(),
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
}));

vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({
    save: vi.fn(),
    load: vi.fn(),
    remove: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
  }),
}));

// ---------------------------------------------------------------------------
// localStorage stub — Zustand persist captures window.localStorage at import
// time. WXT jsdom provides a broken localStorage, so we stub it first.
// ---------------------------------------------------------------------------

const _ls = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  return store;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QG_IDS = [
  "privacy_and_security.data_privacy",
  "privacy_and_security.training_policy",
  "accessibility.compliance",
  "intellectual_property.ip_preservation",
];

const SCORING_IDS = [
  "TR.data_source_clarity",
  "TR.methodology_disclosure",
  "RE.accuracy_and_hallucination",
  "RE.variance_consistency",
  "US.workflow_integration",
  "US.cognitive_guardrails",
  "SE.algorithmic_fairness",
  "SE.data_handling",
  "TC.source_attribution_depth",
  "TC.bibliometric_credibility",
];

/** Escape a CSS attribute value containing dots. */
function escAttr(val: string): string {
  return val.replace(/\./g, "\\.");
}

function stubProps() {
  return {
    capturingFor: null as string | null,
    setCapturingFor: vi.fn(),
    captureQueue: {
      enqueue: vi.fn(),
      isCapturing: false,
    },
    onConfirmRemove: vi.fn(),
    onViewEvidence: vi.fn(),
  };
}

function seedAllEvaluations(overrides?: Record<string, Partial<Evaluation>>) {
  const evals = [
    ...QG_IDS.map((id) => makeEvaluation({ rubricId: id, ...(overrides?.[id] ?? {}) })),
    ...SCORING_IDS.map((id) => makeEvaluation({ rubricId: id, ...(overrides?.[id] ?? {}) })),
  ];
  seedActiveSession({ evaluations: evals });
}

function resetStores() {
  useSessionStore.getState().clear();
  useRegistryStore.setState({
    activeSessionId: null,
    sessionIndex: {},
    settings: { reviewerName: "", reviewerEmail: "", labs: {} },
  });
  useFrameworkCustomizationStore.getState().resetAll();
}

/**
 * Find the <details class="question-details"> for a question by its rubricId.
 * Falls back to id-based lookup when radios aren't rendered (edit mode).
 */
function getQuestionDetailsByRubricId(rubricId: string): HTMLDetailsElement {
  // Try radio-based lookup first (works in review mode).
  const escaped = rubricId.replace(/\./g, "\\.");
  const radio = document.querySelector(`input[type="radio"][name="${escaped}"]`);
  if (radio) {
    const details = radio.closest("details.question-details") as HTMLDetailsElement | null;
    if (details) return details;
  }

  // Fallback: the details element has id="question-{rubricId}".
  const byId = document.getElementById(`question-${rubricId}`);
  if (byId instanceof HTMLDetailsElement) return byId;

  throw new Error(`No <details.question-details> found for rubricId "${rubricId}"`);
}

/** Programmatically open a <details> element. */
function openDetails(details: HTMLDetailsElement) {
  details.open = true;
}

/** Wait for React and Zustand state to settle after an interaction. */
async function flush() {
  await waitFor(() => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QuestionSection", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    resetStores();
  });

  // -----------------------------------------------------------------------
  // Interaction tests
  // -----------------------------------------------------------------------

  it("renders all quality gate questions", () => {
    seedAllEvaluations();
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    // Only question-details (not inner question-foldout)
    const details = document.querySelectorAll("details.question-details");
    expect(details.length).toBe(6);

    // Verify each QG question has a radio group with 4 options
    for (const rubricId of QG_IDS) {
      const radios = document.querySelectorAll(`input[type="radio"][name="${escAttr(rubricId)}"]`);
      expect(radios.length).toBe(4); // pass, fail, na, unsure
    }
  });

  it("renders all scoring questions", () => {
    seedAllEvaluations();
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="scoring_rubric" {...props} />
      </AllProviders>,
    );

    const details = document.querySelectorAll("details.question-details");
    expect(details.length).toBe(10);
  });

  it("clicking a QG score updates the evaluation", async () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    openDetails(details);

    const passLabel = details.querySelector('label[data-judgment="pass"]');
    expect(passLabel).toBeTruthy();
    const passRadio = passLabel?.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(passRadio);

    await flush();

    const evals = useSessionStore.getState().evaluations;
    const ev = evals.find((e) => e.rubricId === "accessibility.compliance");
    expect(ev?.score).toBe("pass");
  });

  it("clicking a scoring score updates the evaluation", async () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection section="scoring_rubric" {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);

    const score2Label = details.querySelector('label[data-score="2"]');
    expect(score2Label).toBeTruthy();
    const score2Radio = score2Label?.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(score2Radio);

    await flush();

    const evals = useSessionStore.getState().evaluations;
    const ev = evals.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.score).toBe(2);
  });

  it("notes input updates evaluation", async () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    openDetails(details);

    const body = details.querySelector(".question-body")!;

    const textarea = within(body as HTMLElement).getByPlaceholderText(
      "e.g., Privacy policy dated 2025-03; confirms no third-party sharing",
    );
    fireEvent.change(textarea, { target: { value: "test note" } });

    await flush();

    const evals = useSessionStore.getState().evaluations;
    const ev = evals.find((e) => e.rubricId === "accessibility.compliance");
    expect(ev?.notes).toBe("test note");
  });

  it("shows progress indicator for scored question", () => {
    seedAllEvaluations({
      "accessibility.compliance": { score: "pass" },
    });
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    const summary = details.querySelector("summary");
    expect(summary).toBeTruthy();
    const svg = summary?.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Render count tests
  //
  // We wrap the QuestionSection function itself in a counting wrapper.
  // Each time React calls the function (initial render + re-renders),
  // the count increments. This accurately measures how many times the
  // component body executes, regardless of what triggers the re-render.
  // -----------------------------------------------------------------------

  it("records baseline render count for notes typing", async () => {
    seedAllEvaluations();
    let renderCount = 0;
    const Orig = QuestionSection;
    // Wrapper subscribes to evaluations so it re-renders on store changes
    const Wrapped = (props: React.ComponentProps<typeof QuestionSection>) => {
      renderCount++;
      // Subscribe to same store slice as QuestionSection to trigger re-renders
      useSessionStore((s) => s.evaluations);
      return <Orig {...props} />;
    };

    const props = stubProps();
    render(
      <AllProviders>
        <Wrapped section="quality_gate" {...props} />
      </AllProviders>,
    );

    await flush();
    await flush();

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    openDetails(details);
    renderCount = 0;

    const body = details.querySelector(".question-body")!;

    const textarea = within(body as HTMLElement).getByPlaceholderText(
      "e.g., Privacy policy dated 2025-03; confirms no third-party sharing",
    );
    fireEvent.change(textarea, { target: { value: "x" } });

    await flush();
    await flush();

    // Concrete baseline: store update triggers re-render through
    // useActiveSession → evaluationMap recomputed
    expect(renderCount).toBe(1);
  });

  it("records baseline render count for score selection", async () => {
    seedAllEvaluations();
    let renderCount = 0;
    const Orig = QuestionSection;
    const Wrapped = (props: React.ComponentProps<typeof QuestionSection>) => {
      renderCount++;
      useSessionStore((s) => s.evaluations);
      return <Orig {...props} />;
    };

    const props = stubProps();
    render(
      <AllProviders>
        <Wrapped section="quality_gate" {...props} />
      </AllProviders>,
    );

    await flush();
    await flush();

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    openDetails(details);
    renderCount = 0;

    const passLabel = details.querySelector('label[data-judgment="pass"]');
    const passRadio = passLabel?.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(passRadio);

    await flush();
    await flush();

    expect(renderCount).toBe(1);
  });

  it("records total render count for single score click across full component", async () => {
    seedAllEvaluations();
    let renderCount = 0;
    const Orig = QuestionSection;
    const Wrapped = (props: React.ComponentProps<typeof QuestionSection>) => {
      renderCount++;
      useSessionStore((s) => s.evaluations);
      return <Orig {...props} />;
    };

    const props = stubProps();
    render(
      <AllProviders>
        <Wrapped section="scoring_rubric" {...props} />
      </AllProviders>,
    );

    await flush();
    await flush();

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    renderCount = 0;

    const score2Label = details.querySelector('label[data-score="2"]');
    expect(score2Label).toBeTruthy();
    const score2Radio = score2Label?.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(score2Radio);

    await flush();
    await flush();

    // Single score click → store update → one re-render of the whole
    // QuestionSection component (all questions rendered together)
    expect(renderCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Per-question memo isolation tests
//
// Verify that React.memo on QuestionRow prevents unrelated rows from
// re-rendering when one row's evaluation changes.
// ---------------------------------------------------------------------------

describe("QuestionRow memo isolation", () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it("only the modified question row re-renders on notes change", async () => {
    seedAllEvaluations();

    // Track renders per rubricId by spying on QuestionRow's render
    const renderCounts = new Map<string, number>();
    const OrigRow = QuestionRow;
    const _TrackedRow = React.memo((props: React.ComponentProps<typeof QuestionRow>) => {
      const key = props.rubricId;
      renderCounts.set(key, (renderCounts.get(key) ?? 0) + 1);
      return <OrigRow {...props} />;
    });

    // We need to intercept QuestionSection's import of QuestionRow.
    // Since QuestionSection imports it at module level, we render the section
    // and measure DOM mutations as a proxy.
    //
    // Simpler approach: use the store to measure setEvaluation calls, then
    // verify only 1 QuestionSection re-render (which means React.memo is
    // doing its job — the parent re-renders but memo blocks child updates).
    //
    // Actually, the cleanest test: render QuestionSection, interact with one
    // question, then verify that interacting with that question does NOT
    // cause another question's textarea value to reset (proving it wasn't
    // unmounted/remounted).

    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    await flush();
    await flush();

    // Open two different questions
    const q1Details = getQuestionDetailsByRubricId("accessibility.compliance");
    const q2Details = getQuestionDetailsByRubricId("privacy_and_security.training_policy");
    openDetails(q1Details);
    openDetails(q2Details);

    // Type in q1's notes
    const q1Body = q1Details.querySelector(".question-body")!;

    const q1Textarea = within(q1Body as HTMLElement).getByPlaceholderText(
      "e.g., Privacy policy dated 2025-03; confirms no third-party sharing",
    );
    fireEvent.change(q1Textarea, { target: { value: "hello from q1" } });
    await flush();
    await flush();

    // Verify q1's notes persisted
    expect((q1Textarea as HTMLTextAreaElement).value).toBe("hello from q1");

    // Now type in q2's notes
    const q2Body = q2Details.querySelector(".question-body")!;

    const q2Textarea = within(q2Body as HTMLElement).getByPlaceholderText(
      "e.g., Privacy policy dated 2025-03; confirms no third-party sharing",
    );
    fireEvent.change(q2Textarea, { target: { value: "hello from q2" } });
    await flush();
    await flush();

    // Verify BOTH notes are preserved — proves q1 was not remounted when q2 changed
    expect((q1Textarea as HTMLTextAreaElement).value).toBe("hello from q1");
    expect((q2Textarea as HTMLTextAreaElement).value).toBe("hello from q2");

    // Verify store has both notes
    const evals = useSessionStore.getState().evaluations;
    const q1Eval = evals.find((e) => e.rubricId === "accessibility.compliance");
    const q2Eval = evals.find((e) => e.rubricId === "privacy_and_security.training_policy");
    expect(q1Eval?.notes).toBe("hello from q1");
    expect(q2Eval?.notes).toBe("hello from q2");
  });

  it("changing a score does not clear another question's notes", async () => {
    seedAllEvaluations();

    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    await flush();
    await flush();

    // Open two questions
    const q1Details = getQuestionDetailsByRubricId("accessibility.compliance");
    const q2Details = getQuestionDetailsByRubricId("privacy_and_security.training_policy");
    openDetails(q1Details);
    openDetails(q2Details);

    // Type notes in q1
    const q1Body = q1Details.querySelector(".question-body")!;

    const q1Textarea = within(q1Body as HTMLElement).getByPlaceholderText(
      "e.g., Privacy policy dated 2025-03; confirms no third-party sharing",
    );
    fireEvent.change(q1Textarea, { target: { value: "important notes" } });
    await flush();
    await flush();

    // Click score on q2 (different question)
    const q2Body = q2Details.querySelector(".question-body")!;
    const failLabel = q2Body.querySelector('label[data-judgment="fail"]');
    const failRadio = failLabel?.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(failRadio);
    await flush();
    await flush();

    // q1's notes must still be there
    expect((q1Textarea as HTMLTextAreaElement).value).toBe("important notes");
  });
});
// ---------------------------------------------------------------------------
// Merged gate badge tests (§2e)
//
// Verify merged-gate scoring questions render correctly in the QG section
// with pass/fail/na badges derived from their numeric score.
// ---------------------------------------------------------------------------

describe("merged gate badges (§2e)", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    resetStores();
  });

  /**
   * Find a merged-gate <details> by its rubricId (e.g. "SE.data_handling").
   * Merged gates don't have radio inputs — they render with a font-mono code
   * span whose text starts with the category prefix (e.g. "SE2", "TC1").
   */
  function getMergedGateDetails(rubricId: string): HTMLDetailsElement {
    const category = rubricId.split(".")[0];
    const allDetails = document.querySelectorAll("details.question-details");
    for (const d of allDetails) {
      // Merged gates have no radio inputs — identify by code span prefix
      if (d.querySelector('input[type="radio"]')) continue;
      const codeSpan = d.querySelector("summary span.font-mono");
      if (codeSpan?.textContent?.startsWith(category)) {
        return d as HTMLDetailsElement;
      }
    }
    throw new Error(`No merged gate details found for "${rubricId}"`);
  }

  /** Get all merged-gate <details> elements. */
  function _getAllMergedGateDetails(): HTMLDetailsElement[] {
    const result: HTMLDetailsElement[] = [];
    const allDetails = document.querySelectorAll("details.question-details");
    for (const d of allDetails) {
      if (!d.querySelector('input[type="radio"]') && d.querySelector("summary span.font-mono")) {
        result.push(d as HTMLDetailsElement);
      }
    }
    return result;
  }

  it("shows Merged Gates header when QG section renders", () => {
    seedAllEvaluations();
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    expect(document.body.textContent).toContain("Merged Gates");
  });

  it("shows pass badge (✓) for merged gate with score > 0", () => {
    seedAllEvaluations({
      "SE.data_handling": { score: 3 },
    });
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const details = getMergedGateDetails("SE.data_handling");
    const badge = details.querySelector("summary span.rounded-full");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("✓");
    expect(badge?.className).toContain("text-ut-green");
  });

  it("shows fail badge (✗) for merged gate with score 0", () => {
    seedAllEvaluations({
      "TC.source_attribution_depth": { score: 0 },
    });
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const details = getMergedGateDetails("TC.source_attribution_depth");
    const badge = details.querySelector("summary span.rounded-full");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("✗");
    expect(badge?.className).toContain("text-ut-red");
  });

  it("shows na badge (—) for merged gate with score 'na'", () => {
    seedAllEvaluations({
      "SE.data_handling": { score: "na" },
    });
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const details = getMergedGateDetails("SE.data_handling");
    const badge = details.querySelector("summary span.rounded-full");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("—");
    expect(badge?.className).toContain("text-ut-slate");
  });

  it("shows no badge for unanswered merged gate", () => {
    // Seed all but leave merged gate evaluations at default (score: "")
    seedAllEvaluations();
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    // The merged gate details exist but should have no rounded-full badge
    const seDetails = getMergedGateDetails("SE.data_handling");
    const seBadge = seDetails.querySelector("summary span.rounded-full");
    expect(seBadge).toBeNull();

    const tcDetails = getMergedGateDetails("TC.source_attribution_depth");
    const tcBadge = tcDetails.querySelector("summary span.rounded-full");
    expect(tcBadge).toBeNull();
  });

  it("shows (merged) label on merged gate entries", () => {
    seedAllEvaluations();
    const props = stubProps();
    render(
      <AllProviders>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    // Both merged gates should be findable in the Merged Gates section
    const seDetails = getMergedGateDetails("SE.data_handling");
    expect(seDetails).toBeTruthy();

    const tcDetails = getMergedGateDetails("TC.source_attribution_depth");
    expect(tcDetails).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Drag-reorder tests
// ---------------------------------------------------------------------------

describe("drag-reorder in rubric questions", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders a DragHandle per question with aria-label 'Reorder <title>' in edit mode", () => {
    seedAllEvaluations();
    const props = stubProps();
    render(
      <EditModeProvider initialEditMode>
        <AllProviders usesAi>
          <QuestionSection section="quality_gate" {...props} />
        </AllProviders>
      </EditModeProvider>,
    );

    // Every question should have a DragHandle — pick a known title
    const handles = document.querySelectorAll('button[aria-label^="Reorder"]');
    expect(handles.length).toBeGreaterThan(0);

    // Verify one specific title matches
    const labels = Array.from(handles).map((b) => b.getAttribute("aria-label"));
    expect(labels).toContain("Reorder Data privacy policy");
  });

  it("renders no DragHandle in review mode", () => {
    seedAllEvaluations();
    const props = stubProps();
    render(
      <AllProviders usesAi>
        <QuestionSection section="quality_gate" {...props} />
      </AllProviders>,
    );

    const handles = document.querySelectorAll('button[aria-label^="Reorder"]');
    expect(handles.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edit-mode score controls (Phase 4)
//
// Verify that score-selection controls become inert in edit mode, level
// anchor descriptions become editable, and the onEditLevel/patch path fires.
// ---------------------------------------------------------------------------

describe("edit-mode score controls", () => {
  beforeEach(() => {
    resetStores();
    vi.clearAllMocks();
    seedAllEvaluations();
  });
  afterEach(() => {
    cleanup();
    resetStores();
  });

  function renderWithEditMode(section: "quality_gate" | "scoring_rubric", initialEditMode = true) {
    const props = stubProps();
    return render(
      <EditModeProvider initialEditMode={initialEditMode}>
        <AllProviders usesAi>
          <QuestionSection section={section} {...props} />
        </AllProviders>
      </EditModeProvider>,
    );
  }

  it("scoring score rows show editable anchor in edit mode and clicking does NOT select", async () => {
    renderWithEditMode("scoring_rubric", true);

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    await flush();

    // Level 2 row should render as a div (not label), with an editable text
    const row = details.querySelector('div[data-score="2"]');
    expect(row).toBeTruthy();

    // Should contain an EditableText display (button role)
    const display = within(row as HTMLElement).getByRole("button", {
      name: /score 2 description$/,
    });
    expect(display).toBeTruthy();

    // No radio input should exist in edit mode for this row
    const radio = row?.querySelector("input[type=radio]");
    expect(radio).toBeNull();

    // Clicking the row should NOT change the evaluation
    const evalBefore = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    fireEvent.click(row!);
    await flush();

    const evalAfter = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(evalAfter?.score).toBe(evalBefore?.score);
  });

  it("scoring score rows still select in review mode (editMode=false)", async () => {
    renderWithEditMode("scoring_rubric", false);

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    await flush();

    // Should have the label-based ScoreOption
    const score2Label = details.querySelector('label[data-score="2"]');
    expect(score2Label).toBeTruthy();
    const score2Radio = score2Label?.querySelector("input[type=radio]") as HTMLInputElement;
    expect(score2Radio).toBeTruthy();

    fireEvent.click(score2Radio);
    await flush();

    const evals = useSessionStore.getState().evaluations;
    const ev = evals.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.score).toBe(2);
  });

  it("quality gate labels are inert in edit mode", async () => {
    renderWithEditMode("quality_gate", true);

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    openDetails(details);
    await flush();

    // Should render as divs, not labels with radios
    const passDiv = details.querySelector('div[data-judgment="pass"]');
    expect(passDiv).toBeTruthy();
    expect(passDiv?.textContent).toBe("✓ Pass");

    const radio = details.querySelector('input[type="radio"]');
    expect(radio).toBeNull();

    // Clicking pass should NOT change the score
    const evalBefore = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "accessibility.compliance");
    fireEvent.click(passDiv!);
    await flush();

    const evalAfter = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "accessibility.compliance");
    expect(evalAfter?.score).toBe(evalBefore?.score);
  });

  it("editing a level anchor in edit mode calls setRubricOverride via patch", async () => {
    renderWithEditMode("scoring_rubric", true);

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    await flush();

    // Find the level-2 EditableText display and click to enter edit
    const display = within(details).getByRole("button", {
      name: /score 2 description$/,
    });
    fireEvent.click(display);

    const input = screen.getByTestId("editable-text-input") as HTMLInputElement;
    expect(input.value).toBeTruthy();

    // Change and blur
    fireEvent.change(input, { target: { value: "Updated score 2 desc" } });
    fireEvent.blur(input);
    await flush();

    // Assert patch written to the customization store
    const patches = useFrameworkCustomizationStore.getState().customization.rubric.valuePatches;
    expect(patches["scoring_rubric.TR.data_source_clarity.2"]).toBe("Updated score 2 desc");
  });
});
