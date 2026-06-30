// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import SchemaForm from "@/components/SchemaForm";
import type { FieldDescriptor, FieldSurface, SessionMetadata } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

// ---------------------------------------------------------------------------
// Mocks — override getActiveFields so tests control the field list
// ---------------------------------------------------------------------------
const mockGetActiveFields = vi.hoisted(() =>
  vi.fn<(_surface?: FieldSurface) => FieldDescriptor[]>(),
);
vi.mock("@/lib/field-schema", () => ({
  getActiveFields: (...args: unknown[]) => mockGetActiveFields(...(args as [FieldSurface?])),
  getFieldValue: (session: SessionMetadata, desc: FieldDescriptor) => {
    if (desc.custom) return session.customFields?.[desc.storageKey];
    return (session as unknown as Record<string, unknown>)[desc.storageKey];
  },
  setFieldValue: (session: SessionMetadata, desc: FieldDescriptor, value: unknown) => {
    if (desc.custom) {
      session.customFields = { ...(session.customFields ?? {}), [desc.storageKey]: value };
    } else {
      (session as unknown as Record<string, unknown>)[desc.storageKey] = value;
    }
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function textDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f1",
    storageKey: "description",
    surface: "metadata",
    label: "Description",
    type: "text",
    required: false,
    group: "Identity",
    order: 1,
    enabled: true,
    ...overrides,
  };
}

function textDescWithHelp(): FieldDescriptor {
  return textDesc({ id: "f-help", helpText: "Enter a brief description" });
}

const noop = () => {};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  useFrameworkCustomizationStore.getState().resetAll();
});

function renderWithEditMode(ui: React.ReactNode, initial = true) {
  return render(<EditModeProvider initialEditMode={initial}>{ui}</EditModeProvider>);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Phase 2 — metadata field labels are click-to-edit", () => {
  it("field label is editable in edit mode", () => {
    const fields = [textDesc()];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = { description: "hello" };

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // The EditableText for the label renders as role=button with aria-label "f1 label"
    const labelBtn = screen.getByRole("button", { name: "f1 label" });
    expect(labelBtn).toBeDefined();
    expect(labelBtn.textContent).toBe("Description");

    // Click to enter edit mode
    fireEvent.click(labelBtn);

    // The editable input should appear, seeded with current label
    const editInput = screen.getByTestId("editable-text-input");
    expect(editInput).toBeDefined();
    expect((editInput as HTMLInputElement).value).toBe("Description");

    // Change the label and blur to commit
    fireEvent.change(editInput, { target: { value: "New Label" } });
    fireEvent.blur(editInput);

    // The override should have been written to the store
    const overrides = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    expect(overrides.f1).toEqual({ label: "New Label" });
  });

  it("help text is editable in edit mode", () => {
    const fields = [textDescWithHelp()];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = { description: "" };

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // The help text EditableText has aria-label "f-help help"
    const helpBtn = screen.getByRole("button", { name: "f-help help" });
    expect(helpBtn).toBeDefined();
    expect(helpBtn.textContent).toBe("Enter a brief description");

    // Click to edit
    fireEvent.click(helpBtn);
    const editInput = screen.getByTestId("editable-text-input");
    expect((editInput as HTMLInputElement).value).toBe("Enter a brief description");

    fireEvent.change(editInput, { target: { value: "Updated help" } });
    fireEvent.blur(editInput);

    const overrides = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    expect(overrides["f-help"]).toEqual({ helpText: "Updated help" });
  });

  it("edit mode OFF: labels render as plain spans, no editable-text-display", () => {
    const fields = [textDesc()];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = { description: "" };

    // Render WITHOUT initialEditMode
    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, false);

    // No role=button for the label should exist
    expect(screen.queryByRole("button", { name: "f1 label" })).toBeNull();

    // The label should be a plain span
    const span = screen.getByText("Description");
    expect(span.tagName).toBe("SPAN");

    // No EditableText display elements
    expect(screen.queryByTestId("editable-text-display")).toBeNull();
  });

  it("field value input is still present and session-controlled in edit mode", () => {
    const fields = [textDesc()];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = { description: "my value" };

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // The text input for the field value should still be there
    const valueInput = screen.getByPlaceholderText("e.g. Enter value") as HTMLInputElement;
    expect(valueInput).toBeDefined();
    expect(valueInput.value).toBe("my value");

    // Changing the value should mutate session, not the override
    fireEvent.change(valueInput, { target: { value: "new session value" } });
    expect(session.description).toBe("new session value");

    // No label override should have been written
    const overrides = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    expect(overrides.f1).toBeUndefined();
  });
});
