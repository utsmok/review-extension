// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RubricEditor from "@/components/RubricEditor";
import { getActiveRubric } from "@/lib/rubric-schema";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Categories start expanded (collapsed defaults to empty object, !!undefined = false). */
describe("RubricEditor", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });
  afterEach(cleanup);

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

  it("renders question rows inside quality gate categories (starts expanded)", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const firstCat = Object.keys(rubric.quality_gate)[0];
    const firstQKey = Object.keys(rubric.quality_gate[firstCat])[0];
    const firstQ = rubric.quality_gate[firstCat][firstQKey];
    // Title input should be present without clicking (categories start expanded)
    expect(screen.getByDisplayValue(firstQ.title)).toBeDefined();
  });

  it("renders scoring question rows with anchors (starts expanded)", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const firstPrinciple = Object.keys(rubric.scoring_rubric)[0];
    const firstQKey = Object.keys(rubric.scoring_rubric[firstPrinciple])[0];
    const firstQ = rubric.scoring_rubric[firstPrinciple][firstQKey];
    expect(screen.getByDisplayValue(firstQ.title)).toBeDefined();
    // Anchor textarea for level 0
    const anchor0 = screen.getByDisplayValue(firstQ["0"]).closest("textarea");
    expect(anchor0).toBeDefined();
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

  it("edits a scoring question title via setRubricOverride", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
    const titleInput = screen.getByDisplayValue(rubric.scoring_rubric[principle][qKey].title);
    fireEvent.change(titleInput, { target: { value: "Source clarity" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `scoring_rubric.${principle}.${qKey}.title`
      ],
    ).toBe("Source clarity");
  });

  it("edits a quality gate requirement via textarea", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    const qKey = Object.keys(rubric.quality_gate[cat])[0];
    const q = rubric.quality_gate[cat][qKey];
    const reqTextarea = screen.getByDisplayValue(q.requirement);
    fireEvent.change(reqTextarea, { target: { value: "Updated requirement" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.rubric.valuePatches[
        `quality_gate.${cat}.${qKey}.requirement`
      ],
    ).toBe("Updated requirement");
  });

  it("toggles ai_only on a scoring question", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
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

  it("removes a scoring question", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKey = Object.keys(rubric.scoring_rubric[principle])[0];
    fireEvent.click(screen.getByRole("button", { name: `Remove ${qKey}` }));
    const removed = useFrameworkCustomizationStore.getState().customization.rubric.removedQuestions;
    expect(removed.some((r) => r.key === qKey && r.parent === principle)).toBe(true);
  });

  it("adds a new quality gate question via slug input", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const cat = Object.keys(rubric.quality_gate)[0];
    // Find the slug input for the first quality gate category
    const catLabel = cat.replace(/_/g, " ");
    // Use aria-label matching the category
    const input = screen.getByLabelText(`Add question to ${catLabel}`);
    fireEvent.change(input, { target: { value: "  new gate q  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    const added = useFrameworkCustomizationStore.getState().customization.rubric.addedQuestions;
    expect(added.some((a) => a.key === "new_gate_q" && a.parent === cat)).toBe(true);
  });

  it("adds a new scoring question via button click", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const input = screen.getByLabelText(`Add question to ${principle}`);
    // Scope "Add question" click to the same parent as the input
    const addBtn = input.closest("div")?.querySelector("button:last-of-type");
    expect(addBtn).toBeDefined();
    fireEvent.change(input, { target: { value: "custom_score" } });
    fireEvent.click(addBtn!);
    const added = useFrameworkCustomizationStore.getState().customization.rubric.addedQuestions;
    expect(added.some((a) => a.key === "custom_score" && a.parent === principle)).toBe(true);
  });

  it("reorders questions via up/down buttons", () => {
    render(<RubricEditor onBack={() => {}} />);
    const rubric = getActiveRubric();
    const principle = Object.keys(rubric.scoring_rubric)[0];
    const qKeys = Object.keys(rubric.scoring_rubric[principle]);
    expect(qKeys.length).toBeGreaterThanOrEqual(2);
    // Click down on the first question
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
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
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
