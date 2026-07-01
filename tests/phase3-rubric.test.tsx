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

describe("Phase 3 — Rubric surface reorder + remove + add", () => {
  beforeEach(() => {
    resetStores();
    seedAllEvaluations();
  });
  afterEach(cleanup);

  it("remove button removes a question after confirm", async () => {
    renderWithEditMode("quality_gate", true);
    await flush();

    // Open the first question's details so the summary is visible
    const details = getQuestionDetailsByRubricId("privacy_and_security.data_privacy");
    openDetails(details);
    await flush();

    // Find the remove button by aria-label
    const removeBtn = screen.getByRole("button", { name: /Remove data_privacy/ });
    expect(removeBtn).toBeTruthy();

    // Click to open confirm dialog
    fireEvent.click(removeBtn);
    await flush();

    // Confirm dialog should be visible with "Remove" button
    const confirmBtn = screen.getByRole("button", { name: "Remove" });
    expect(confirmBtn).toBeTruthy();

    // Click Remove in the dialog
    fireEvent.click(confirmBtn);
    await flush();

    // Assert the store recorded the removal
    const { customization } = useFrameworkCustomizationStore.getState();
    const removed = customization.rubric.removedQuestions;
    expect(removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: "quality_gate",
          parent: "privacy_and_security",
          key: "data_privacy",
        }),
      ]),
    );
  });

  it("reorder up moves the question", async () => {
    renderWithEditMode("scoring_rubric", true);
    await flush();

    // The TR section should have at least two questions: data_source_clarity and methodology_disclosure
    // methodology_disclosure is index 1, so it should have a "Move ... up" enabled button
    const details = getQuestionDetailsByRubricId("TR.methodology_disclosure");
    openDetails(details);
    await flush();

    const upBtn = screen.getByRole("button", { name: /Move Methodology disclosure up/i });
    expect(upBtn).toBeTruthy();
    expect((upBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(upBtn);
    await flush();

    // Assert reorder stored
    const { customization } = useFrameworkCustomizationStore.getState();
    const order = customization.rubric.order["scoring_rubric.TR"];
    expect(order).toBeTruthy();
    // methodology_disclosure should now be before data_source_clarity
    expect(order[0]).toBe("methodology_disclosure");
    expect(order[1]).toBe("data_source_clarity");
  });

  it("add question via + Add check (quality gate)", async () => {
    renderWithEditMode("quality_gate", true);
    await flush();

    // Find the + Add check button (there's one per category group)
    const addBtns = screen.getAllByRole("button", { name: /\+ Add check/ });
    expect(addBtns.length).toBeGreaterThanOrEqual(1);

    // Click the first one
    fireEvent.click(addBtns[0]);
    await flush();

    // Should reveal an input
    const input = screen.getByTestId("inline-add-check-input") as HTMLInputElement;
    expect(input).toBeTruthy();

    // Type a title
    fireEvent.change(input, { target: { value: "New privacy check" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await flush();

    // Assert the store recorded the addition
    const { customization } = useFrameworkCustomizationStore.getState();
    const added = customization.rubric.addedQuestions;
    expect(added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: "quality_gate",
          parent: "privacy_and_security",
          key: "new_privacy_check",
          def: expect.objectContaining({
            type: "pass_fail",
            title: "New privacy check",
          }),
        }),
      ]),
    );
  });

  it("edit-mode OFF: no remove/reorder/add affordances", async () => {
    renderWithEditMode("scoring_rubric", false);
    await flush();

    // No remove buttons
    const removeBtns = screen.queryAllByRole("button", { name: /Remove / });
    expect(removeBtns.length).toBe(0);

    // No reorder buttons
    const upBtns = screen.queryAllByRole("button", { name: /Move .* up/ });
    expect(upBtns.length).toBe(0);
    const downBtns = screen.queryAllByRole("button", { name: /Move .* down/ });
    expect(downBtns.length).toBe(0);

    // No add buttons
    const addBtns = screen.queryAllByRole("button", { name: /\+ Add question/ });
    expect(addBtns.length).toBe(0);
  });
  it("principle color popup recolors a principle", async () => {
    renderWithEditMode("scoring_rubric", true);
    await flush();
    const gear = screen.getByRole("button", { name: "Style principle TR color" });
    fireEvent.click(gear);
    await flush();
    const colorInput = screen.getByLabelText("Principle TR color") as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#112233" } });
    await flush();
    expect(
      useFrameworkCustomizationStore.getState().customization.principleOverrides.TR?.color,
    ).toBe("#112233");
  });
});
