// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import HardcodedField from "@/components/metadata/HardcodedField";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

afterEach(cleanup);

beforeEach(() => {
  useFrameworkCustomizationStore.getState().resetAll();
});

function renderInEditMode(ui: React.ReactNode) {
  return render(<EditModeProvider initialEditMode>{ui}</EditModeProvider>);
}

describe("HardcodedField", () => {
  it("renders the default label in review mode", () => {
    render(
      <HardcodedField fieldId="meta.x" defaultLabel="Tool Name">
        <input data-testid="child-input" />
      </HardcodedField>,
    );
    expect(screen.getByText("Tool Name")).toBeDefined();
    expect(screen.getByTestId("child-input")).toBeDefined();
  });

  it("label is editable in edit mode", () => {
    const { container } = renderInEditMode(
      <HardcodedField fieldId="meta.x" defaultLabel="Tool Name">
        <input data-testid="child-input" />
      </HardcodedField>,
    );

    // Click the EditableText display for the label (renders as role="button")
    const labelBtn = screen.getByRole("button", { name: "meta.x label" });
    fireEvent.click(labelBtn);

    // EditableText switches to an input (multiline=false → input)
    const editInput = container.querySelector(
      'input[data-testid="editable-text-input"], input[placeholder="Click to add\\u2026"]',
    ) as HTMLInputElement;
    expect(editInput).toBeTruthy();
    fireEvent.change(editInput, { target: { value: "Custom Label" } });
    fireEvent.blur(editInput);

    // The store should have the override
    const override =
      useFrameworkCustomizationStore.getState().customization.fieldOverrides["meta.x"];
    expect(override?.label).toBe("Custom Label");
  });

  it("help text is editable in edit mode", () => {
    const { container } = renderInEditMode(
      <HardcodedField fieldId="meta.x" defaultLabel="Tool Name" defaultHelp="Default help">
        <input />
      </HardcodedField>,
    );

    // Click the help EditableText display to enter edit mode
    const helpBtn = screen.getByRole("button", { name: "meta.x help" });
    fireEvent.click(helpBtn);

    // Now find the editable textarea
    const helpInput = container.querySelector(
      'textarea[data-testid="editable-text-input"], textarea[placeholder="Click to add\\u2026"]',
    ) as HTMLTextAreaElement;
    expect(helpInput).toBeTruthy();
    fireEvent.change(helpInput, { target: { value: "Updated help" } });
    fireEvent.blur(helpInput);

    const override =
      useFrameworkCustomizationStore.getState().customization.fieldOverrides["meta.x"];
    expect(override?.helpText).toBe("Updated help");
  });

  it("toggling visible off hides the field in review mode", () => {
    // Set enabled=false via the store
    useFrameworkCustomizationStore.getState().setFieldOverride("meta.x", { enabled: false });

    // Render without EditModeProvider → review mode
    const { container } = render(
      <HardcodedField fieldId="meta.x" defaultLabel="Tool Name">
        <input data-testid="child-input" />
      </HardcodedField>,
    );

    // HardcodedField returns null when hidden + review mode
    expect(container.innerHTML).toBe("");
  });

  it("hidden field still renders in edit mode (so it can be un-hidden)", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("meta.x", { enabled: false });

    renderInEditMode(
      <HardcodedField fieldId="meta.x" defaultLabel="Tool Name">
        <input data-testid="child-input" />
      </HardcodedField>,
    );

    // The label should still be present (editable) even though hidden
    expect(screen.getByText("Tool Name")).toBeDefined();
    expect(screen.getByTestId("child-input")).toBeDefined();
    // The container should have reduced opacity
    const fieldContainer = screen.getByTestId("hardcoded-field-meta.x");
    expect(fieldContainer.className).toContain("opacity-50");
  });

  it("renders with as='div' wrapper in review mode", () => {
    render(
      <HardcodedField fieldId="meta.x" defaultLabel="My Label" as="div">
        <span data-testid="child">child</span>
      </HardcodedField>,
    );

    const wrapper = screen.getByText("My Label").parentElement!;
    expect(wrapper.tagName).toBe("DIV");
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("renders help text in review mode when provided", () => {
    render(
      <HardcodedField fieldId="meta.x" defaultLabel="My Label" defaultHelp="Some help">
        <input />
      </HardcodedField>,
    );

    expect(screen.getByText("Some help")).toBeDefined();
  });

  it("does not render help text in review mode when not provided", () => {
    render(
      <HardcodedField fieldId="meta.x" defaultLabel="My Label">
        <input />
      </HardcodedField>,
    );

    expect(screen.queryByText("Some help")).toBeNull();
  });
});
