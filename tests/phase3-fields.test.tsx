// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import SchemaForm from "@/components/SchemaForm";
import type { FieldDescriptor, FieldSurface } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

// ---------------------------------------------------------------------------
// Mocks — override getActiveFields so tests control the field list
// ---------------------------------------------------------------------------
const mockGetActiveFields = vi.hoisted(() =>
  vi.fn<(_surface?: FieldSurface) => FieldDescriptor[]>(),
);
vi.mock("@/lib/field-schema", () => ({
  getActiveFields: (...args: unknown[]) => mockGetActiveFields(...(args as [FieldSurface?])),
  getFieldValue: (session: Record<string, unknown>, desc: FieldDescriptor) => {
    return (session as Record<string, unknown>)[desc.storageKey] ?? "";
  },
  setFieldValue: (session: Record<string, unknown>, desc: FieldDescriptor, value: unknown) => {
    (session as Record<string, unknown>)[desc.storageKey] = value;
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
describe("Phase 3 — metadata fields reorder / add / remove", () => {
  it("remove button removes a custom field after confirm", () => {
    const fields = [
      textDesc({ id: "f-shipped", order: 1 }),
      textDesc({ id: "f-custom", order: 2, custom: true, label: "Custom Field" }),
    ];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = { description: "" };

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // The custom field should have a Remove button
    const removeBtn = screen.getByRole("button", { name: "Remove f-custom" });
    expect(removeBtn).toBeDefined();

    // The shipped field should NOT have a Remove button
    expect(screen.queryByRole("button", { name: "Remove f-shipped" })).toBeNull();

    // Click remove to open confirm dialog
    fireEvent.click(removeBtn);

    // Confirm removal
    act(() => {
      const confirmBtn = screen.getByRole("button", { name: "Remove" });
      fireEvent.click(confirmBtn);
    });

    // The custom field should be removed from the store's customFields
    const { customFields } = useFrameworkCustomizationStore.getState().customization;
    expect(customFields.find((f) => f.id === "f-custom")).toBeUndefined();
  });

  it("reorder up swaps order values", () => {
    const fields = [
      textDesc({ id: "f-a", order: 10, label: "Alpha" }),
      textDesc({ id: "f-b", order: 20, label: "Beta" }),
      textDesc({ id: "f-c", order: 30, label: "Gamma" }),
    ];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = {};

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // Move Beta (index 1) up — swap with Alpha
    const moveBetaUp = screen.getByRole("button", { name: "Move Beta up" });
    expect(moveBetaUp).toBeDefined();

    act(() => {
      fireEvent.click(moveBetaUp);
    });

    const overrides = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    // Beta should get Alpha's order (10), Alpha should get Beta's order (20)
    expect(overrides["f-b"]).toEqual({ order: 10 });
    expect(overrides["f-a"]).toEqual({ order: 20 });

    // Move down Gamma (index 2) — should be disabled since it's last
    const moveGammaDown = screen.getByRole("button", { name: "Move Gamma down" });
    expect((moveGammaDown as HTMLButtonElement).disabled).toBe(true);

    // First item can't move up
    const moveAlphaUp = screen.getByRole("button", { name: "Move Alpha up" });
    expect((moveAlphaUp as HTMLButtonElement).disabled).toBe(true);
  });

  it("add field via + Add", () => {
    const fields = [textDesc()];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = {};

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // Click the "+ Add field" button
    const addBtn = screen.getByTestId("inline-add-field");
    expect(addBtn).toBeDefined();
    fireEvent.click(addBtn);

    // Type a title
    const input = screen.getByTestId("inline-add-field-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My New Field" } });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    // The field should be added to customFields
    const { customFields } = useFrameworkCustomizationStore.getState().customization;
    const added = customFields.find((f) => f.label === "My New Field");
    expect(added).toBeDefined();
    expect(added!.id).toBe("my_new_field");
    expect(added!.surface).toBe("metadata");
    expect(added!.type).toBe("text");
    expect(added!.order).toBeGreaterThan(1); // max order + 1
    expect(added!.custom).toBe(true);
    expect(added!.enabled).toBe(true);
  });

  it("edit-mode OFF: no affordances", () => {
    const fields = [
      textDesc({ id: "f-a", order: 1, label: "Alpha" }),
      textDesc({ id: "f-b", order: 2, label: "Beta", custom: true }),
    ];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = {};

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, false);

    // No reorder handles
    expect(screen.queryByRole("group", { name: "Reorder Alpha" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Reorder Beta" })).toBeNull();

    // No remove buttons
    expect(screen.queryByRole("button", { name: "Remove f-b" })).toBeNull();

    // No add button
    expect(screen.queryByTestId("inline-add-field")).toBeNull();

    // Fields still render
    expect(screen.getByTestId("field-f-a")).toBeDefined();
    expect(screen.getByTestId("field-f-b")).toBeDefined();
  });
});
