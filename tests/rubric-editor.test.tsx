// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RubricEditor from "@/components/RubricEditor";
import { getActiveRubric } from "@/lib/rubric-schema";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("RubricEditor", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });
  afterEach(cleanup);

  it("renders inside EditorShell with title and subtitle", () => {
    render(<RubricEditor onBack={() => {}} />);
    expect(screen.getByText("Rubric questions")).toBeDefined();
    expect(
      screen.getByText(
        "Author the quality-gate checks and scoring questions reviewers score against. Edits apply to new reviews.",
      ),
    ).toBeDefined();
  });

  it("renders Quality Gates and Scoring section headers", () => {
    render(<RubricEditor onBack={() => {}} />);
    expect(screen.getByText("Quality Gates")).toBeDefined();
    expect(screen.getByText("Scoring")).toBeDefined();
  });

  it("renders quality gate category buttons with question counts", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    for (const [cat, qs] of Object.entries(rubric.quality_gate)) {
      const label = cat.replace(/_/g, " ");
      const btn = screen.getByRole("button", { name: new RegExp(`^${label}`) });
      expect(btn).toBeDefined();
      expect(btn.textContent).toContain(`${Object.keys(qs).length}`);
    }
  });

  it("renders scoring principle buttons with question counts", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    for (const [principle, qs] of Object.entries(rubric.scoring_rubric)) {
      const btn = screen.getByRole("button", { name: new RegExp(`^${principle}`) });
      expect(btn).toBeDefined();
      expect(btn.textContent).toContain(`${Object.keys(qs).length}`);
    }
  });

  it("collapses and re-expands a quality gate category", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const firstCat = Object.keys(rubric.quality_gate)[0];
    const label = firstCat.replace(/_/g, " ");
    const btn = screen.getByRole("button", { name: new RegExp(`^${label}`) });
    // Starts expanded
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    // Collapse
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    // Re-expand
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("questions are collapsed by default; expanding reveals title input", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const firstCat = Object.keys(rubric.quality_gate)[0];
    const firstQKey = Object.keys(rubric.quality_gate[firstCat])[0];
    // Questions default collapsed — CollapsibleRow has data-open="false"
    const row = screen.getByText(firstQKey).closest("[data-open]");
    expect(row?.getAttribute("data-open")).toBe("false");
    // Expand the question's CollapsibleRow
    const toggleBtn = row?.querySelector("button");
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn!);
    expect(row?.getAttribute("data-open")).toBe("true");
    // Now the title input is visible
    const title = rubric.quality_gate[firstCat][firstQKey].title;
    expect(screen.getByDisplayValue(title)).toBeDefined();
  });

  it("edits a scoring question title after expanding the question", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
    // Expand the question
    const row = screen.getByText(qKey).closest("[data-open]");
    const toggleBtn = row?.querySelector("button");
    fireEvent.click(toggleBtn!);
    const titleInput = screen.getByDisplayValue(rubric.scoring_rubric[principle][qKey].title);
    fireEvent.change(titleInput, { target: { value: "Source clarity" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `scoring_rubric.${principle}.${qKey}.title`
      ],
    ).toBe("Source clarity");
  });

  it("edits a quality gate requirement after expanding the question", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    const qKey = Object.keys(rubric.quality_gate[cat])[0];
    const q = rubric.quality_gate[cat][qKey];
    // Expand the question
    const row = screen.getByText(qKey).closest("[data-open]");
    const toggleBtn = row?.querySelector("button");
    fireEvent.click(toggleBtn!);
    const reqTextarea = screen.getByDisplayValue(q.requirement);
    fireEvent.change(reqTextarea, { target: { value: "Updated requirement" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `quality_gate.${cat}.${qKey}.requirement`
      ],
    ).toBe("Updated requirement");
  });

  it("toggles ai_only on a scoring question from the summary row", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
    // AI-only checkbox is visible in the collapsed summary row
    const aiCheckbox = screen.getByRole("checkbox", {
      name: `${qKey} ai_only`,
    }) as HTMLInputElement;
    const before = aiCheckbox.checked;
    fireEvent.click(aiCheckbox);
    expect(aiCheckbox.checked).toBe(!before);
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `scoring_rubric.${principle}.${qKey}.ai_only`
      ],
    ).toBe(!before);
  });

  it("shows a confirm dialog before removing a question", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
    // Click remove
    fireEvent.click(screen.getByRole("button", { name: `Remove ${qKey}` }));
    // Confirm dialog appears
    expect(screen.getByRole("alertdialog")).toBeDefined();
    // Question NOT yet removed
    const removed = useFrameworkCustomizationStore.getState().customization.rubric.removedQuestions;
    expect(removed.some((r) => r.key === qKey && r.parent === principle)).toBe(false);
    // Confirm removal — use getAllByRole because there are multiple "Remove" buttons
    const dangerBtns = screen.getAllByRole("button", { name: "Remove" });
    // The danger variant is the last one (dialog button, not the X icon)
    fireEvent.click(dangerBtns[dangerBtns.length - 1]);
    // Now removed
    const removedAfter =
      useFrameworkCustomizationStore.getState().customization.rubric.removedQuestions;
    expect(removedAfter.some((r) => r.key === qKey && r.parent === principle)).toBe(true);
  });

  it("can cancel the remove confirmation dialog", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
    fireEvent.click(screen.getByRole("button", { name: `Remove ${qKey}` }));
    expect(screen.getByRole("alertdialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    // Not removed
    const removed = useFrameworkCustomizationStore.getState().customization.rubric.removedQuestions;
    expect(removed.some((r) => r.key === qKey)).toBe(false);
  });

  it("adds a new quality gate question by title with auto-slug", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    const catLabel = cat.replace(/_/g, " ");
    const input = screen.getByLabelText(`Add question to ${catLabel}`);
    fireEvent.change(input, { target: { value: "  New Gate Q  " } });
    // Slug preview should be visible
    expect(screen.getByText("key: new_gate_q")).toBeDefined();
    fireEvent.keyDown(input, { key: "Enter" });
    const added = useFrameworkCustomizationStore.getState().customization.rubric.addedQuestions;
    expect(added.some((a) => a.key === "new_gate_q" && a.parent === cat)).toBe(true);
  });

  it("adds a new scoring question via the Add button", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const input = screen.getByLabelText(`Add question to ${principle}`);
    fireEvent.change(input, { target: { value: "Custom Score" } });
    expect(screen.getByText("key: custom_score")).toBeDefined();
    // Re-query the button after the state update enables it
    const container = input.closest(".flex.items-end");
    const addBtn = container?.querySelector("button:not([disabled])") as HTMLButtonElement;
    expect(addBtn).not.toBeNull();
    fireEvent.click(addBtn!);
    const added = useFrameworkCustomizationStore.getState().customization.rubric.addedQuestions;
    expect(added.some((a) => a.key === "custom_score" && a.parent === principle)).toBe(true);
  });

  it("disables Add button when title is empty", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    const catLabel = cat.replace(/_/g, " ");
    const input = screen.getByLabelText(`Add question to ${catLabel}`);
    // The Add button in the same flex container should be disabled
    const container = input.closest(".flex.items-end");
    const addBtn = container?.querySelector("button[disabled]") as HTMLButtonElement | null;
    expect(addBtn).not.toBeNull();
  });

  it("reorders questions via up/down buttons", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKeys = Object.keys(rubric.scoring_rubric[principle]);
    expect(qKeys.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole("button", { name: `Move ${qKeys[0]} down` }));
    const order =
      useFrameworkCustomizationStore.getState().customization.rubric.order[
        `scoring_rubric.${principle}`
      ];
    expect(order).toBeDefined();
    expect(order[0]).toBe(qKeys[1]);
    expect(order[1]).toBe(qKeys[0]);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<RubricEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("up button is disabled for the first question in a category", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    const qKey = Object.keys(rubric.quality_gate[cat])[0];
    const upBtn = screen.getByRole("button", { name: `Move ${qKey} up` });
    expect(upBtn.hasAttribute("disabled")).toBe(true);
  });

  it("down button is disabled for the last question in a category", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    const qKeys = Object.keys(rubric.quality_gate[cat]);
    const lastKey = qKeys[qKeys.length - 1];
    const downBtn = screen.getByRole("button", { name: `Move ${lastKey} down` });
    expect(downBtn.hasAttribute("disabled")).toBe(true);
  });
});
