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
  getActiveFields: (...args: unknown[]) => {
    const baseFields = mockGetActiveFields(...(args as [FieldSurface?]));
    const overrides = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    return baseFields.map((f) => ({
      ...f,
      ...(overrides[f.id] ?? {}),
    }));
  },
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
describe("Phase 4 — field styling popup editor", () => {
  it("required checkbox writes required override", () => {
    const fields = [textDesc({ id: "f-title", required: false, label: "Title" })];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = {};

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, true);

    // Open popup
    fireEvent.click(screen.getByRole("button", { name: "Style f-title field" }));
    const panel = screen.getByTestId("popup-editor-panel");

    // Find the Required checkbox — it's inside a label, so click the checkbox
    const checkboxes = panel.querySelectorAll('input[type="checkbox"]');
    // First checkbox = Required, second = Enabled
    const requiredCb = checkboxes[0] as HTMLInputElement;
    expect(requiredCb.checked).toBe(false);

    // Toggle required on
    fireEvent.click(requiredCb);

    const overrides = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    expect(overrides["f-title"]).toBeDefined();
    expect(overrides["f-title"].required).toBe(true);

    // Toggle required back off — wrap in act so React re-renders with override
    act(() => {
      fireEvent.click(requiredCb);
    });
    const overrides2 = useFrameworkCustomizationStore.getState().customization.fieldOverrides;
    expect(overrides2["f-title"].required).toBe(false);
  });

  it("edit-mode OFF: no gear popup", () => {
    const fields = [textDesc({ id: "f-desc", label: "Description" })];
    mockGetActiveFields.mockReturnValue(fields);
    const session: Record<string, unknown> = {};

    renderWithEditMode(<SchemaForm surface="metadata" session={session} onChange={noop} />, false);

    // No gear button should render
    expect(screen.queryByRole("button", { name: "Style f-desc field" })).toBeNull();
    // No popup panel
    expect(screen.queryByTestId("popup-editor-panel")).toBeNull();
    // Field itself still renders
    expect(screen.getByTestId("field-f-desc")).toBeDefined();
  });
});
