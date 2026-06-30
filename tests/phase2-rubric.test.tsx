// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import { QuestionSection } from "@/components/QuestionSection";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeEvaluation } from "@/tests/fixtures";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mocks (copied from question-section.test.tsx)
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
// localStorage stub
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

const SCORING_IDS = ["TR.data_source_clarity", "TR.methodology_disclosure"];

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

function seedAllEvaluations() {
  const evals = [
    ...QG_IDS.map((id) => makeEvaluation({ rubricId: id })),
    ...SCORING_IDS.map((id) => makeEvaluation({ rubricId: id })),
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

function getQuestionDetailsByRubricId(rubricId: string): HTMLDetailsElement {
  const escaped = rubricId.replace(/\./g, "\\.");
  const radio = document.querySelector(`input[type="radio"][name="${escaped}"]`);
  if (!radio) throw new Error(`No radio found for rubricId "${rubricId}"`);
  const details = radio.closest("details.question-details") as HTMLDetailsElement | null;
  if (!details) throw new Error(`No <details.question-details> ancestor for "${rubricId}"`);
  return details;
}

function openDetails(details: HTMLDetailsElement) {
  details.open = true;
}

async function flush() {
  await waitFor(() => {});
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Phase 2 — Rubric surface click-to-edit", () => {
  beforeEach(() => {
    resetStores();
    seedAllEvaluations();
  });
  afterEach(cleanup);

  it("title is editable in edit mode", async () => {
    renderWithEditMode("scoring_rubric", true);

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    await flush();

    // Find the title EditableText display
    const titleDisplay = screen.getByRole("button", { name: "data_source_clarity title" });
    expect(titleDisplay.textContent).toBe("Data source clarity");

    // Click to enter edit mode
    fireEvent.click(titleDisplay);

    const input = screen.getByTestId("editable-text-input") as HTMLInputElement;
    expect(input.value).toBe("Data source clarity");

    // Change and blur
    fireEvent.change(input, { target: { value: "Updated title" } });
    fireEvent.blur(input);
    await flush();

    // Assert patch written
    const patches = useFrameworkCustomizationStore.getState().customization.rubric.valuePatches;
    expect(patches["scoring_rubric.TR.data_source_clarity.title"]).toBe("Updated title");
  });

  it("requirement editable for a quality-gate question", async () => {
    renderWithEditMode("quality_gate", true);

    const details = getQuestionDetailsByRubricId("privacy_and_security.data_privacy");
    openDetails(details);
    await flush();

    const reqDisplay = screen.getByRole("button", {
      name: "data_privacy requirement",
    });
    expect(reqDisplay).toBeTruthy();

    fireEvent.click(reqDisplay);

    const textarea = screen.getByTestId("editable-text-input") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Vendor must explicitly state");

    fireEvent.change(textarea, { target: { value: "Updated requirement" } });
    fireEvent.blur(textarea);
    await flush();

    const patches = useFrameworkCustomizationStore.getState().customization.rubric.valuePatches;
    expect(patches["quality_gate.privacy_and_security.data_privacy.requirement"]).toBe(
      "Updated requirement",
    );
  });

  it("edit mode OFF: no editable-text-display for titles", async () => {
    renderWithEditMode("scoring_rubric", false);

    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    await flush();

    // No editable-text-display elements should exist
    const displays = screen.queryAllByTestId("editable-text-display");
    expect(displays.length).toBe(0);

    // Title should render as plain text (not a button)
    const titleButton = screen.queryByRole("button", {
      name: "data_source_clarity title",
    });
    expect(titleButton).toBeNull();
  });

  it("background foldout editable after opening", async () => {
    renderWithEditMode("scoring_rubric", true);

    // Open the main question
    const details = getQuestionDetailsByRubricId("TR.data_source_clarity");
    openDetails(details);
    await flush();

    // Find and open the Background foldout
    const bgSummary = details.querySelector("details.question-foldout > summary");
    if (!bgSummary) throw new Error("Background foldout not found");
    const bgDetails = bgSummary.parentElement as HTMLDetailsElement;
    bgDetails.open = true;
    await flush();

    const bgDisplay = screen.getByRole("button", {
      name: "data_source_clarity background",
    });
    expect(bgDisplay).toBeTruthy();

    fireEvent.click(bgDisplay);

    const textarea = screen.getByTestId("editable-text-input") as HTMLTextAreaElement;
    expect(textarea.value).toContain("Source transparency");

    fireEvent.change(textarea, { target: { value: "Updated background" } });
    fireEvent.blur(textarea);
    await flush();

    const patches = useFrameworkCustomizationStore.getState().customization.rubric.valuePatches;
    expect(patches["scoring_rubric.TR.data_source_clarity.background"]).toBe("Updated background");
  });
});
