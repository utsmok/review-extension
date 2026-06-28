// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FieldEditor from "@/components/FieldEditor";
import GradeIdEditor from "@/components/GradeIdEditor";
import { getActiveGrades } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("FieldEditor", () => {
  const onBack = vi.fn();

  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
    onBack.mockClear();
  });

  afterEach(cleanup);

  it("renders with header and field/customize tabs", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByText("Customize Fields")).toBeDefined();
    expect(screen.getByRole("button", { name: "Fields" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Grade Display" })).toBeDefined();
  });

  it("renders the back button and calls onBack on click", () => {
    render(<FieldEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows metadata fields section by default", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByText("Metadata")).toBeDefined();
  });

  it("shows finalization and settings fields sections", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByText("Finalization")).toBeDefined();
    expect(screen.getByText("Settings")).toBeDefined();
  });

  it("toggles to Grade Display tab and shows grades", () => {
    render(<FieldEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Grade Display" }));
    const grades = getActiveGrades();
    expect(grades.length).toBeGreaterThan(0);
    // Each grade should show its id
    for (const g of grades) {
      expect(screen.getAllByText(g.id).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders footer with Reset all, Export, and Import buttons", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByRole("button", { name: "Reset all" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Export customization" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Import customization" })).toBeDefined();
  });

  it("calls resetAll when Reset all is clicked", () => {
    const spy = vi.spyOn(useFrameworkCustomizationStore.getState(), "resetAll");
    render(<FieldEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset all" }));
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("shows Add field form at the bottom of fields tab", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getAllByText("Add field").length).toBeGreaterThanOrEqual(1);
  });

  it("shows field rows with enable/disable toggles", () => {
    render(<FieldEditor onBack={onBack} />);
    // All shipped fields should have checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it("shows select/multi-select fields with options", () => {
    render(<FieldEditor onBack={onBack} />);
    // Find a select field (e.g. "pricing" which has options)
    const optionHeaders = screen.queryAllByText("Options");
    // At least one select/multi-select field should show an Options section
    expect(optionHeaders.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GradeIdEditor", () => {
  const onBack = vi.fn();

  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
    onBack.mockClear();
  });

  afterEach(cleanup);

  it("renders with Grade IDs header", () => {
    render(<GradeIdEditor onBack={onBack} />);
    expect(screen.getByText("Grade IDs")).toBeDefined();
  });

  it("renders the back button and calls onBack", () => {
    render(<GradeIdEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows warning about grade contract changes", () => {
    render(<GradeIdEditor onBack={onBack} />);
    expect(screen.getByText("Warning:", { exact: false })).toBeDefined();
    expect(
      screen.getByText(/Adding or removing grade IDs changes the grade contract/),
    ).toBeDefined();
  });

  it("lists all active grades", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    expect(grades.length).toBeGreaterThan(0);
    for (const g of grades) {
      expect(screen.getAllByText(g.id).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows Active Grades count in heading", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    expect(screen.getByText(`Active Grades (${grades.length})`)).toBeDefined();
  });

  it("shows Add grade form", () => {
    render(<GradeIdEditor onBack={onBack} />);
    expect(screen.getAllByText("Add grade").length).toBeGreaterThanOrEqual(1);
  });

  it("Add grade button is disabled when id and label are empty", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const btn = screen.getByRole("button", { name: "Add grade" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a Remove button for each active grade", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const removeButtons = screen.getAllByText("Remove");
    expect(removeButtons.length).toBe(grades.length);
  });

  it("removes a grade when Remove is clicked", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];
    expect(firstGrade).toBeDefined();

    fireEvent.click(screen.getAllByText("Remove")[0]);
    // After removal, the grade should be in the removed section
    const customization = useFrameworkCustomizationStore.getState().customization;
    expect(customization.gradeRemovals).toContain(firstGrade.id);
  });

  it("shows Removed Grades section after removing a grade", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];

    fireEvent.click(screen.getAllByText("Remove")[0]);
    expect(screen.getByText(`Removed Grades (1)`)).toBeDefined();
    expect(screen.getByText(firstGrade.id)).toBeDefined();
    expect(screen.getByText("(removed)")).toBeDefined();
  });

  it("adds a new grade via the form", () => {
    render(<GradeIdEditor onBack={onBack} />);

    // Fill in the form — ID, Label, Description are the first 3 textboxes
    const allInputs = screen.getAllByRole("textbox");
    fireEvent.change(allInputs[0], { target: { value: "custom_grade" } });
    fireEvent.change(allInputs[1], { target: { value: "Custom Grade" } });
    fireEvent.change(allInputs[2], { target: { value: "A custom grade description" } });

    // Click Add grade button
    fireEvent.click(screen.getByRole("button", { name: "Add grade" }));

    // Verify it was added
    const updatedGrades = getActiveGrades();
    const added = updatedGrades.find((g) => g.id === "custom_grade");
    expect(added).toBeDefined();
    expect(added?.label).toBe("Custom Grade");
  });

  it("shows footer with grade count summary", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    expect(screen.getByText(`${grades.length} grades active`)).toBeDefined();
  });
});
