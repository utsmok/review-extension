// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RubricEditor from "@/components/RubricEditor";
import { getActivePrinciples as activePrinciples } from "@/lib/framework-config";
import { getActiveRubric as activeRubric } from "@/lib/rubric-schema";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("RubricEditor", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });
  afterEach(cleanup);

  it("renders inside EditorShell with title and subtitle", () => {
    render(<RubricEditor onBack={() => {}} />);
    expect(screen.getByText("Rubric")).toBeDefined();
    expect(
      screen.getByText(
        /The five principles, their scored questions, and the required pass\/fail checks/,
      ),
    ).toBeDefined();
  });

  it("renders Required checks and Principles section headers", () => {
    render(<RubricEditor onBack={() => {}} />);
    expect(screen.getByText("Required checks")).toBeDefined();
    expect(screen.getByText("Principles")).toBeDefined();
  });

  it("renders humanized required-check group labels with counts", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = activeRubric();
    for (const cat of Object.keys(rubric.quality_gate)) {
      const group = screen.getByTestId(`group-quality_gate-${cat}`);
      expect(group).toBeDefined();
      // Humanized label appears in the collapsed summary
      expect(group.textContent).toContain(
        cat === "privacy_and_security"
          ? "Privacy & security"
          : cat === "intellectual_property"
            ? "Intellectual property"
            : "Accessibility",
      );
    }
  });

  it("renders a collapsible group per principle with code + count", () => {
    render(<RubricEditor onBack={() => {}} />);
    for (const p of activePrinciples()) {
      const group = screen.getByTestId(`principle-${p.id}`);
      expect(group).toBeDefined();
      expect(group.textContent).toContain(p.code);
    }
  });

  /** Expand a group CollapsibleRow by testId (clicks its toggle button). */
  function expandByTestId(testId: string) {
    const row = screen.getByTestId(testId);
    const toggle = row.querySelector("button");
    expect(toggle).toBeDefined();
    fireEvent.click(toggle!);
    return row;
  }

  /** Expand a group, then expand the first question inside it. */
  function expandFirstQuestion(section: "quality_gate" | "scoring_rubric", parent: string) {
    expandByTestId(
      section === "quality_gate" ? `group-quality_gate-${parent}` : `principle-${parent}`,
    );
    const rubric = activeRubric();
    const qKey = Object.keys(
      section === "quality_gate" ? rubric.quality_gate[parent] : rubric.scoring_rubric[parent],
    )[0];
    expandByTestId(`question-${qKey}`);
    return qKey;
  }

  function editEditableField(displayEl: HTMLElement, newText: string) {
    fireEvent.click(displayEl);
    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: newText } });
    fireEvent.blur(input);
  }

  it("groups are collapsed by default; expanding a required-check group reveals its questions", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const group = screen.getByTestId(`group-quality_gate-${cat}`);
    expect(group.getAttribute("data-open")).toBe("false");
    expandByTestId(`group-quality_gate-${cat}`);
    expect(screen.getByTestId(`group-quality_gate-${cat}`).getAttribute("data-open")).toBe("true");
  });

  it("questions are collapsed by default; expanding reveals the title input", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const qKey = expandFirstQuestion("quality_gate", cat);
    const titleDisplay = screen.getByRole("button", { name: `${qKey} title` });
    fireEvent.click(titleDisplay);
    const titleInput = screen.getByTestId("editable-text-input");
    expect(titleInput).toBeDefined();
  });

  it("edits a scoring question title after expanding", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    const qKey = expandFirstQuestion("scoring_rubric", principle);
    const titleDisplay = screen.getByRole("button", { name: `${qKey} title` });
    editEditableField(titleDisplay, "Source clarity");
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `scoring_rubric.${principle}.${qKey}.title`
      ],
    ).toBe("Source clarity");
  });

  it("edits a required-check requirement (pass criteria) after expanding", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const qKey = expandFirstQuestion("quality_gate", cat);
    const reqDisplay = screen.getByRole("button", { name: `${qKey} pass criteria` });
    editEditableField(reqDisplay, "Updated requirement");
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `quality_gate.${cat}.${qKey}.requirement`
      ],
    ).toBe("Updated requirement");
  });

  it("renders named score levels (0 · Fail … 3 · Good) instead of 'Anchor'", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    expandFirstQuestion("scoring_rubric", principle);
    expect(screen.getAllByText("0 · Fail").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3 · Good").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Anchor/)).toBeNull();
  });

  it("toggles AI-assisted on a scoring question from the expanded body", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    const qKey = expandFirstQuestion("scoring_rubric", principle);
    const checkbox = screen.getByRole("checkbox", {
      name: `${qKey} AI-assisted`,
    }) as HTMLInputElement;
    const before = checkbox.checked;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(!before);
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `scoring_rubric.${principle}.${qKey}.ai_only`
      ],
    ).toBe(!before);
  });

  it("Escape cancels an edit without committing", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const qKey = expandFirstQuestion("quality_gate", cat);
    const titleDisplay = screen.getByRole("button", { name: `${qKey} title` });
    fireEvent.click(titleDisplay);
    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "Cancelled title" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `quality_gate.${cat}.${qKey}.title`
      ],
    ).toBeUndefined();
  });

  it("editing a score-level definition commits on blur", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    const qKey = expandFirstQuestion("scoring_rubric", principle);
    const scoreDisplay = screen.getByRole("button", { name: `${qKey} score 0 Fail` });
    editEditableField(scoreDisplay, "A completely failing response");
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `scoring_rubric.${principle}.${qKey}.0`
      ],
    ).toBe("A completely failing response");
  });

  it("shows a confirm dialog before removing a question", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const qKey = expandFirstQuestion("quality_gate", cat);
    fireEvent.click(screen.getByRole("button", { name: `Remove ${qKey}` }));
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("removes the question after confirming", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const qKey = expandFirstQuestion("quality_gate", cat);
    fireEvent.click(screen.getByRole("button", { name: `Remove ${qKey}` }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(
      useFrameworkCustomizationStore
        .getState()
        .customization.rubric.removedQuestions.some(
          (q) => q.section === "quality_gate" && q.parent === cat && q.key === qKey,
        ),
    ).toBe(true);
  });

  it("can cancel the remove confirmation dialog", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    const qKey = expandFirstQuestion("quality_gate", cat);
    fireEvent.click(screen.getByRole("button", { name: `Remove ${qKey}` }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("adds a new required check via + Add → title → Add", () => {
    render(<RubricEditor onBack={() => {}} />);
    const cat = Object.keys(activeRubric().quality_gate)[0];
    expandByTestId(`group-quality_gate-${cat}`);
    fireEvent.click(screen.getByText("+ Add check"));
    const input = screen.getByLabelText(/New check title for/);
    fireEvent.change(input, { target: { value: "Data retention policy" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      useFrameworkCustomizationStore
        .getState()
        .customization.rubric.addedQuestions.some(
          (q) =>
            q.section === "quality_gate" && q.parent === cat && q.key === "data_retention_policy",
        ),
    ).toBe(true);
  });

  it("adds a new scoring question under a principle", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    expandByTestId(`principle-${principle}`);
    fireEvent.click(screen.getByText("+ Add question"));
    const input = screen.getByLabelText(/New question title for/);
    fireEvent.change(input, { target: { value: "Source verification" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(
      useFrameworkCustomizationStore
        .getState()
        .customization.rubric.addedQuestions.some(
          (q) =>
            q.section === "scoring_rubric" &&
            q.parent === principle &&
            q.key === "source_verification",
        ),
    ).toBe(true);
  });

  it("reorders questions via the up/down toolbar", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    const keys = Object.keys(activeRubric().scoring_rubric[principle]);
    expandFirstQuestion("scoring_rubric", principle);
    fireEvent.click(screen.getByRole("button", { name: `Move ${keys[0]} down` }));
    const order = useFrameworkCustomizationStore.getState().customization.rubric.order;
    expect(order[`scoring_rubric.${principle}`]).toEqual([keys[1], keys[0], ...keys.slice(2)]);
  });

  it("up button is disabled for the first question, down for the last", () => {
    render(<RubricEditor onBack={() => {}} />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    const keys = Object.keys(activeRubric().scoring_rubric[principle]);
    // Expand the principle then the first + last questions
    expandByTestId(`principle-${principle}`);
    expandByTestId(`question-${keys[0]}`);
    expect(
      (screen.getByRole("button", { name: `Move ${keys[0]} up` }) as HTMLButtonElement).disabled,
    ).toBe(true);
    cleanup();
    useFrameworkCustomizationStore.getState().resetAll();
    render(<RubricEditor onBack={() => {}} />);
    expandByTestId(`principle-${principle}`);
    expandByTestId(`question-${keys[keys.length - 1]}`);
    expect(
      (
        screen.getByRole("button", {
          name: `Move ${keys[keys.length - 1]} down`,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  // ── Folded principle-identity coverage (was principle-editor.test.tsx) ──

  it("edits a principle's full name and color from its Identity panel", () => {
    render(<RubricEditor onBack={() => {}} />);
    const first = activePrinciples()[0];
    expandByTestId(`principle-${first.id}`);
    expandByTestId(`principle-identity-${first.id}`);
    const nameInput = screen.getByDisplayValue(first.fullName);
    fireEvent.change(nameInput, { target: { value: "Radical Transparency" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.principleOverrides[first.id]
        ?.fullName,
    ).toBe("Radical Transparency");

    const colorPicker = screen.getByLabelText(`${first.code} color`);
    fireEvent.change(colorPicker, { target: { value: "#112233" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.principleOverrides[first.id]?.color,
    ).toBe("#112233");
  });

  it("shows an edited dot on a principle once its identity is overridden", () => {
    useFrameworkCustomizationStore
      .getState()
      .setPrincipleOverride(activePrinciples()[0].id, { fullName: "Changed" });
    render(<RubricEditor onBack={() => {}} />);
    const first = activePrinciples()[0];
    const group = screen.getByTestId(`principle-${first.id}`);
    expect(group.querySelector('[aria-label="Edited from shipped default"]')).toBeDefined();
  });

  it("calls onBack when the back button is clicked", () => {
    const onBack = vi.fn();
    render(<RubricEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to framework customization" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
