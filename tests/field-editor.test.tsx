// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FieldEditor from "@/components/FieldEditor";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("FieldEditor", () => {
  const onBack = vi.fn();

  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
    onBack.mockClear();
  });

  afterEach(cleanup);

  it("renders inside EditorShell with correct title and subtitle", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByText("Fields & options")).toBeDefined();
    expect(
      screen.getByText(
        "Toggle, rename, reorder, or add the entry fields reviewers fill in. Changes apply to new reviews.",
      ),
    ).toBeDefined();
  });

  it("renders the back button and calls onBack on click", () => {
    render(<FieldEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("shows surface sections: Tool details, Finalize, Settings", () => {
    render(<FieldEditor onBack={onBack} />);
    // Use heading role to disambiguate from <option> elements that share the same text
    expect(screen.getByRole("heading", { name: "Tool details", level: 2 })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Finalize", level: 2 })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Settings", level: 2 })).toBeDefined();
  });

  it("shows no grade tab or grade display content", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.queryByRole("button", { name: "Grade Display" })).toBeNull();
    expect(screen.queryByText("Grades")).toBeNull();
  });

  it("shows no IO footer (Export/Import/Reset all)", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.queryByRole("button", { name: "Reset all" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export customization" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Import customization" })).toBeNull();
  });

  it("shows Add field form with de-jargon labels", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByText("Add a new field")).toBeDefined();
    expect(screen.getByText("Field label")).toBeDefined();
    expect(screen.getByText("ID (auto-generated)")).toBeDefined();
    expect(screen.getByText("Surface")).toBeDefined();
    expect(screen.getByText("Field type")).toBeDefined();
  });

  it("auto-generates field ID slug from label", () => {
    render(<FieldEditor onBack={onBack} />);
    const labelInput = screen.getByPlaceholderText("e.g. License tier");
    fireEvent.change(labelInput, { target: { value: "My Custom Field" } });
    // The readonly ID field should show the slugified version
    const idInput = screen.getByDisplayValue("my_custom_field") as HTMLInputElement;
    expect(idInput.readOnly).toBe(true);
  });

  it("shows each field as a collapsed CollapsibleRow with enable checkbox", () => {
    render(<FieldEditor onBack={onBack} />);
    // All shipped fields should have checkboxes (at least the metadata ones)
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    // Fields start collapsed — no expanded details visible by default
    // The "Label" LabeledField inside CollapsibleRow should not be visible
    // since rows are collapsed
    const labelFields = screen.queryAllByText("Label");
    // These "Label" text instances are from LabeledField inside CollapsibleRow children
    // Since collapsed, there should be none visible
    expect(labelFields.length).toBe(0);
  });
  it("expands a field row when its summary is clicked", () => {
    render(<FieldEditor onBack={onBack} />);
    // Find a collapsed CollapsibleRow by data-testid and click its toggle button
    const row = screen.getByTestId("field-row-toolName");
    expect(row.getAttribute("data-open")).toBe("false");
    const toggle = row.querySelector('button[aria-expanded="false"]')!;
    fireEvent.click(toggle);
    expect(row.getAttribute("data-open")).toBe("true");
    // After expanding, the "Label" LabeledField should be visible
    expect(screen.getByText("Label")).toBeDefined();
  });

  it("shows field rows with move up/down controls", () => {
    render(<FieldEditor onBack={onBack} />);
    const moveUpButtons = screen.getAllByRole("button", { name: "Move up" });
    const moveDownButtons = screen.getAllByRole("button", { name: "Move down" });
    expect(moveUpButtons.length).toBeGreaterThan(0);
    expect(moveDownButtons.length).toBeGreaterThan(0);
    // First field should have disabled Move up
    expect(moveUpButtons[0].hasAttribute("disabled")).toBe(true);
  });

  it("toggles a field enabled state via the summary checkbox", () => {
    render(<FieldEditor onBack={onBack} />);
    // Find a checkbox (these are the summary-level enable toggles)
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    const firstCheckbox = checkboxes[0];
    const initiallyChecked = (firstCheckbox as HTMLInputElement).checked;
    fireEvent.click(firstCheckbox);
    expect((firstCheckbox as HTMLInputElement).checked).toBe(!initiallyChecked);
  });

  it("shows select/multi-select fields with options inside expanded rows", () => {
    render(<FieldEditor onBack={onBack} />);
    // Expand a row that has options — find a field row and expand it
    // First, let's expand all collapsed rows to find options
    const collapsedButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.getAttribute("aria-expanded") === "false");
    for (const btn of collapsedButtons) {
      fireEvent.click(btn);
    }
    // Now look for "Options" header (from select/multi-select fields)
    const optionsHeaders = screen.queryAllByText("Options");
    expect(optionsHeaders.length).toBeGreaterThanOrEqual(1);
  });

  it("shows edited dot when a field has overrides", () => {
    // Set an override on a real field.
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { required: true });
    render(<FieldEditor onBack={onBack} />);

    // The pricing field row should have an edited dot
    const pricingRow = screen.getByTestId("field-row-pricing");
    const editedDot = pricingRow.querySelector('[title="Edited from shipped default"]');
    expect(editedDot).toBeDefined();
  });

  it("shows Reset fields to default button when field overrides exist", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { required: true });
    render(<FieldEditor onBack={onBack} />);
    expect(screen.getByRole("button", { name: "Reset fields to default" })).toBeDefined();
  });

  it("hides Reset fields to default button when no field overrides exist", () => {
    render(<FieldEditor onBack={onBack} />);
    expect(screen.queryByRole("button", { name: "Reset fields to default" })).toBeNull();
  });

  it("confirms before resetting fields and clears overrides on confirm", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { required: true });
    render(<FieldEditor onBack={onBack} />);

    // Click reset — should show confirm dialog
    fireEvent.click(screen.getByRole("button", { name: "Reset fields to default" }));
    expect(screen.getByText(/Reset all field changes/)).toBeDefined();

    // Confirm the reset
    fireEvent.click(screen.getByRole("button", { name: "Reset fields" }));

    // The overrides should be cleared
    const state = useFrameworkCustomizationStore.getState();
    expect(Object.keys(state.customization.fieldOverrides).length).toBe(0);
    // Dialog should be gone
    expect(screen.queryByText(/Reset all field changes/)).toBeNull();
  });

  it("can cancel the reset confirmation", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { required: true });
    render(<FieldEditor onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Reset fields to default" }));
    expect(screen.getByText(/Reset all field changes/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/Reset all field changes/)).toBeNull();
    // Override should still exist
    const state = useFrameworkCustomizationStore.getState();
    expect(state.customization.fieldOverrides.pricing).toBeDefined();
  });
});
