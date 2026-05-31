// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuestionSection from "@/components/QuestionSection";
import { RubricContext } from "@/lib/contexts";
import type { Evaluation } from "@/lib/types";
import { useSessionStore } from "@/stores/session";
import { makeEvaluation, RUBRIC } from "@/tests/fixtures";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/capture", () => ({
  captureActiveTab: vi.fn(),
}));

vi.mock("@/lib/auto-save", () => ({
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
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
  "intellectual_property.ip_preservation",
  "accessibility.compliance",
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

function escAttr(val: string): string {
  return val.replace(/\./g, "\\.");
}

function stubProps() {
  return {
    section: "quality_gate" as const,
    capturingFor: null,
    setCapturingFor: vi.fn(),
    captureQueue: { enqueue: vi.fn(), isCapturing: false },
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

function getQuestionDetailsByRubricId(rubricId: string): HTMLDetailsElement {
  const input = document.querySelector(`input[name="${escAttr(rubricId)}"]`);
  if (!input) throw new Error(`No input found for rubricId: ${rubricId}`);
  let el = input.parentElement;
  while (el && el.tagName !== "DETAILS") el = el.parentElement;
  if (!el) throw new Error(`No <details> ancestor for rubricId: ${rubricId}`);
  return el as HTMLDetailsElement;
}

function openDetails(details: HTMLDetailsElement) {
  details.open = true;
}

async function flush() {
  await new Promise<void>((r) => setTimeout(r, 0));
}

// ---------------------------------------------------------------------------
// Tests: unselect behavior
// ---------------------------------------------------------------------------

describe("unselect (deselect) score", () => {
  afterEach(cleanup);

  it("clicking an already-selected QG score clears the score", async () => {
    seedAllEvaluations({ "accessibility.compliance": { score: "pass" } });
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    openDetails(details);

    const passLabel = details.querySelector('[data-judgment="pass"]') as HTMLLabelElement;
    expect(passLabel).toBeTruthy();

    fireEvent.click(passLabel);
    await flush();

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "accessibility.compliance");
    expect(ev?.score).toBe("");
  });

  it("clicking an already-selected scoring score clears the score", async () => {
    seedAllEvaluations({ "TR.data_source_clarity": { score: 2 } });
    const props = { ...stubProps(), section: "scoring_rubric" as const };

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);

    // biome-ignore lint/style/noNonNullAssertion: querySelector after openDetails guarantees element exists
    const body = details.querySelector(".question-body")!;
    const score2Label = body.querySelector('label[data-score="2"]') as HTMLLabelElement;
    expect(score2Label).toBeTruthy();
    const radio = score2Label.querySelector("input[type=radio]") as HTMLInputElement;
    expect(radio).toBeTruthy();
    fireEvent.click(radio);
    await flush();

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.score).toBe("");
  });

  it("clicking an already-selected N/A clears the score", async () => {
    seedAllEvaluations({ "TR.data_source_clarity": { score: "na" } });
    const props = { ...stubProps(), section: "scoring_rubric" as const };

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);

    // biome-ignore lint/style/noNonNullAssertion: querySelector after openDetails guarantees element exists
    const body = details.querySelector(".question-body")!;
    const naLabel = body.querySelector('label[data-score="na"]') as HTMLLabelElement;
    expect(naLabel).toBeTruthy();
    const naRadio = naLabel.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(naRadio);
    await flush();

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.score).toBe("");
  });

  it("clicking an already-selected Unsure clears the score", async () => {
    seedAllEvaluations({ "TR.data_source_clarity": { score: "unsure" } });
    const props = { ...stubProps(), section: "scoring_rubric" as const };

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);

    // biome-ignore lint/style/noNonNullAssertion: querySelector after openDetails guarantees element exists
    const body = details.querySelector(".question-body")!;
    const unsureLabel = body.querySelector('label[data-score="unsure"]') as HTMLLabelElement;
    expect(unsureLabel).toBeTruthy();
    const unsureRadio = unsureLabel.querySelector("input[type=radio]") as HTMLInputElement;
    fireEvent.click(unsureRadio);
    await flush();

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "TR.data_source_clarity");
    expect(ev?.score).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Tests: manual done override
// ---------------------------------------------------------------------------

describe("manual done override", () => {
  afterEach(cleanup);

  it("renders a Done button in the summary for non-auto-NA questions", () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const doneButtons = screen.getAllByText(/mark done|done/i);
    expect(doneButtons.length).toBeGreaterThan(0);
  });

  it("clicking Done sets manualDone to true", async () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    const doneButton = within(details).getByText(/mark done/i);
    fireEvent.click(doneButton);
    await flush();

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "accessibility.compliance");
    expect(ev?.manualDone).toBe(true);
  });

  it("clicking Done again removes manualDone", async () => {
    seedAllEvaluations({ "accessibility.compliance": { manualDone: true } });
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    const doneButton = within(details).getByText("✓ Done");
    fireEvent.click(doneButton);
    await flush();

    const ev = useSessionStore
      .getState()
      .evaluations.find((e) => e.rubricId === "accessibility.compliance");
    expect(ev?.manualDone).toBeUndefined();
  });

  it("does not show Done button for auto-NA questions when usesAi=false", () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <RubricContext.Provider value={{ rubric: RUBRIC, usesAi: false }}>
        <QuestionSection {...props} />
      </RubricContext.Provider>,
    );

    const details = getQuestionDetailsByRubricId("privacy_and_security.training_policy");
    const doneButtons = within(details).queryAllByText("Done");
    expect(doneButtons.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: question ID attribute for navigation
// ---------------------------------------------------------------------------

describe("question ID attribute", () => {
  afterEach(cleanup);

  it("each question details element has an id for scroll navigation", () => {
    seedAllEvaluations();
    const props = stubProps();

    render(
      <AllProviders>
        <QuestionSection {...props} />
      </AllProviders>,
    );

    const details = getQuestionDetailsByRubricId("accessibility.compliance");
    expect(details.id).toBe("question-accessibility.compliance");
  });
});
