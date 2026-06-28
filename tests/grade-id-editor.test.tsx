// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GradeIdEditor from "@/components/GradeIdEditor";
import { getActiveGrades } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("GradeIdEditor", () => {
  const onBack = vi.fn();

  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
    onBack.mockClear();
  });

  afterEach(cleanup);

  it("renders with 'Grades' title (not 'Grade IDs')", () => {
    render(<GradeIdEditor onBack={onBack} />);
    expect(screen.getByText("Grades")).toBeDefined();
  });

  it("back button calls onBack", () => {
    render(<GradeIdEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to framework customization" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows the grade-contract warning", () => {
    render(<GradeIdEditor onBack={onBack} />);
    expect(screen.getByText("Warning:", { exact: false })).toBeDefined();
    expect(
      screen.getByText(/Adding or removing grade IDs changes the grade contract/),
    ).toBeDefined();
  });

  it("lists all active grades in collapsible rows", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    expect(grades.length).toBeGreaterThan(0);
    for (const g of grades) {
      // Each grade row has the id in the summary
      expect(screen.getByText(g.id)).toBeDefined();
    }
  });

  it("shows Active Grades count in section heading", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    expect(screen.getByText(`Active Grades (${grades.length})`)).toBeDefined();
  });

  it("shows the Add grade section with submit button", () => {
    render(<GradeIdEditor onBack={onBack} />);
    // Section title (h2)
    expect(screen.getByRole("heading", { name: "Add grade" })).toBeDefined();
    // Submit button (distinct by testId)
    expect(screen.getByTestId("add-grade-submit")).toBeDefined();
  });

  it("Add grade button is disabled when id and label are empty", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const btn = screen.getByRole("button", { name: "Add grade" });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows a Remove control for each active (shipped) grade", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    for (const g of grades) {
      const row = screen.getByTestId(`grade-row-${g.id}`);
      // Expand the row to reveal inner controls
      const expandBtn = row.querySelector('button[aria-expanded="false"]');
      if (expandBtn) fireEvent.click(expandBtn);
      expect(screen.getByTestId(`remove-grade-${g.id}`)).toBeDefined();
    }
  });

  it("shows confirm dialog when removing a grade, then confirms removal", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];
    expect(firstGrade).toBeDefined();

    // Expand the first grade row to reveal the remove button
    const firstRow = screen.getByTestId(`grade-row-${firstGrade.id}`);
    const expandBtn = firstRow.querySelector('button[aria-expanded="false"]');
    if (expandBtn) fireEvent.click(expandBtn);

    // Click Remove
    const removeBtn = screen.getByTestId(`remove-grade-${firstGrade.id}`);
    fireEvent.click(removeBtn);

    // Confirm dialog should appear
    expect(screen.getByText(/Remove the grade/)).toBeDefined();

    // Confirm
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    // After removal, the grade should be in gradeRemovals
    const customization = useFrameworkCustomizationStore.getState().customization;
    expect(customization.gradeRemovals).toContain(firstGrade.id);

    // Dialog should be gone
    expect(screen.queryByText(/Remove the grade/)).toBeNull();
  });

  it("can cancel the remove confirmation", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];

    const firstRow = screen.getByTestId(`grade-row-${firstGrade.id}`);
    const expandBtn = firstRow.querySelector('button[aria-expanded="false"]');
    if (expandBtn) fireEvent.click(expandBtn);

    fireEvent.click(screen.getByTestId(`remove-grade-${firstGrade.id}`));
    expect(screen.getByText(/Remove the grade/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Remove the grade/)).toBeNull();

    // Grade should NOT be removed
    const customization = useFrameworkCustomizationStore.getState().customization;
    expect(customization.gradeRemovals).not.toContain(firstGrade.id);
  });

  it("shows Removed Grades section after removing a grade", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];

    const firstRow = screen.getByTestId(`grade-row-${firstGrade.id}`);
    const expandBtn = firstRow.querySelector('button[aria-expanded="false"]');
    if (expandBtn) fireEvent.click(expandBtn);

    fireEvent.click(screen.getByTestId(`remove-grade-${firstGrade.id}`));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText(`Removed Grades (1)`)).toBeDefined();
    expect(screen.getByText(firstGrade.id)).toBeDefined();
  });

  it("adds a new grade via the form", () => {
    render(<GradeIdEditor onBack={onBack} />);

    fireEvent.change(screen.getByTestId("add-grade-id"), { target: { value: "custom_grade" } });
    fireEvent.change(screen.getByTestId("add-grade-label"), { target: { value: "Custom Grade" } });
    fireEvent.change(screen.getByTestId("add-grade-description"), {
      target: { value: "A custom grade" },
    });

    // Select a color from the palette (bg-ut-green is in COLOR_PALETTE)
    const colorSwatch = screen.getByTitle("bg-ut-green");
    fireEvent.click(colorSwatch);

    // Submit
    fireEvent.click(screen.getByTestId("add-grade-submit"));

    // Grade should now be active
    const activeGrades = getActiveGrades();
    expect(activeGrades.find((g) => g.id === "custom_grade")).toBeDefined();
  });

  it("shows footer with grade count summary", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    expect(screen.getByText(`${grades.length} grades active`)).toBeDefined();
  });

  it("renders live chip preview with grade colors", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const previewBox = screen.getByTestId("grade-preview");
    expect(previewBox).toBeDefined();
    const chips = screen.getByTestId("grade-preview-chips");
    expect(chips).toBeDefined();
    const grades = getActiveGrades();
    const previewGrades = grades.slice(0, 4);
    for (const g of previewGrades) {
      const chip = screen.getByTestId(`grade-chip-${g.id}`);
      expect(chip).toBeDefined();
      expect(chip.textContent).toBe(g.label);
    }
  });

  it("expanding a grade row reveals label and description editors", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];

    const firstRow = screen.getByTestId(`grade-row-${firstGrade.id}`);
    const expandBtn = firstRow.querySelector('button[aria-expanded="false"]');
    if (expandBtn) fireEvent.click(expandBtn);

    // Label and description fields should be visible
    expect(screen.getByTestId(`grade-label-${firstGrade.id}`)).toBeDefined();
    expect(screen.getByTestId(`grade-desc-${firstGrade.id}`)).toBeDefined();
  });

  it("shows color and tint swatch palettes in expanded grade row", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];

    const firstRow = screen.getByTestId(`grade-row-${firstGrade.id}`);
    const expandBtn = firstRow.querySelector('button[aria-expanded="false"]');
    if (expandBtn) fireEvent.click(expandBtn);

    // Color palette
    expect(screen.getByTestId(`color-palette-${firstGrade.id}`)).toBeDefined();
    // Tint palette
    expect(screen.getByTestId(`tint-palette-${firstGrade.id}`)).toBeDefined();
  });

  it("shows reportColor hex input and reportLabel field in expanded grade row", () => {
    render(<GradeIdEditor onBack={onBack} />);
    const grades = getActiveGrades();
    const firstGrade = grades[0];

    const firstRow = screen.getByTestId(`grade-row-${firstGrade.id}`);
    const expandBtn = firstRow.querySelector('button[aria-expanded="false"]');
    if (expandBtn) fireEvent.click(expandBtn);

    // Report color (type="color")
    expect(screen.getByTestId(`report-color-${firstGrade.id}`)).toBeDefined();
    // Report label
    expect(screen.getByTestId(`report-label-${firstGrade.id}`)).toBeDefined();
  });

  it("shows edited dot when a grade has overrides", () => {
    useFrameworkCustomizationStore.getState().setGradeOverride("pass", { label: "Approved" });
    render(<GradeIdEditor onBack={onBack} />);

    const passRow = screen.getByTestId("grade-row-pass");
    const editedDot = passRow.querySelector('[title="Edited from shipped default"]');
    expect(editedDot).toBeDefined();
  });

  it("shows color and tint swatch palettes in add-grade form", () => {
    render(<GradeIdEditor onBack={onBack} />);
    expect(screen.getByTestId("add-color-palette")).toBeDefined();
    expect(screen.getByTestId("add-tint-palette")).toBeDefined();
  });
});
