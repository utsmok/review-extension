// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import type { FieldDescriptor, FieldSurface, SessionMetadata } from "@/lib/types";
import { makeMetadata } from "@/tests/fixtures";

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

function textareaDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f2",
    storageKey: "notes",
    surface: "metadata",
    label: "Notes",
    type: "textarea",
    required: false,
    group: "Identity",
    order: 2,
    enabled: true,
    ...overrides,
  };
}

function urlDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f3",
    storageKey: "toolUrl",
    surface: "metadata",
    label: "Tool URL",
    type: "url",
    required: false,
    group: "Identity",
    order: 3,
    enabled: true,
    ...overrides,
  };
}

function emailDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f4",
    storageKey: "email",
    surface: "settings",
    label: "Email",
    type: "email",
    required: false,
    group: "Reviewer",
    order: 1,
    enabled: true,
    ...overrides,
  };
}

function booleanDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f5",
    storageKey: "usesAi",
    surface: "metadata",
    label: "Uses AI",
    type: "boolean",
    required: false,
    group: "Identity",
    order: 4,
    enabled: true,
    ...overrides,
  };
}

function imageDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f6",
    storageKey: "toolLogoUrl",
    surface: "metadata",
    label: "Logo",
    type: "image",
    captureable: true,
    required: false,
    group: "Identity",
    order: 5,
    enabled: true,
    ...overrides,
  };
}

function multiSelectDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f7",
    storageKey: "dataSources",
    surface: "metadata",
    label: "Data Sources",
    type: "multi-select",
    allowCustom: true,
    options: ["CrossRef", "PubMed"],
    required: false,
    group: "Coverage",
    order: 1,
    enabled: true,
    ...overrides,
  };
}

function selectDesc(overrides?: Partial<FieldDescriptor>): FieldDescriptor {
  return {
    id: "f8",
    storageKey: "authMethod",
    surface: "metadata",
    label: "Auth Method",
    type: "select",
    allowCustom: false,
    options: ["SSO", "IP Auth"],
    required: false,
    group: "Access",
    order: 1,
    enabled: true,
    ...overrides,
  };
}

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SchemaForm", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
    mockGetActiveFields.mockReturnValue([]);
  });

  it("renders nothing when no active fields", () => {
    const session = makeMetadata();
    const { container } = render(
      <SchemaForm surface="metadata" session={session} onChange={onChange} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders a text field with label and value from session", () => {
    mockGetActiveFields.mockReturnValue([textDesc()]);
    const session = makeMetadata({ description: "hello" });
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Description")).toBeDefined();
    const input = screen.getByPlaceholderText("e.g. Enter value") as HTMLInputElement;
    expect(input.value).toBe("hello");
  });

  it("calls onChange when text input changes", () => {
    mockGetActiveFields.mockReturnValue([textDesc()]);
    const session = makeMetadata();
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    const input = screen.getByPlaceholderText("e.g. Enter value") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "updated" } });
    expect(onChange).toHaveBeenCalled();
    // Verify the session was mutated
    expect((session as unknown as Record<string, unknown>).description).toBe("updated");
  });

  it("renders a textarea field", () => {
    mockGetActiveFields.mockReturnValue([textareaDesc()]);
    const session = makeMetadata({ notes: "some notes" });
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Notes")).toBeDefined();
    const textarea = screen.getByPlaceholderText("e.g. Enter value") as HTMLTextAreaElement;
    expect(textarea.value).toBe("some notes");
  });

  it("renders a URL field with type=url input", () => {
    mockGetActiveFields.mockReturnValue([urlDesc()]);
    const session = makeMetadata({ toolUrl: "https://example.com" });
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Tool URL")).toBeDefined();
    const input = screen.getByDisplayValue("https://example.com") as HTMLInputElement;
    expect(input.type).toBe("url");
  });

  it("renders an email field with type=email input", () => {
    mockGetActiveFields.mockReturnValue([emailDesc()]);
    const session = { ...makeMetadata(), email: "a@b.com" } as unknown as Record<string, unknown>;
    render(<SchemaForm surface="settings" session={session} onChange={onChange} />);

    expect(screen.getByText("Email")).toBeDefined();
    const input = screen.getByDisplayValue("a@b.com") as HTMLInputElement;
    expect(input.type).toBe("email");
  });

  it("renders a boolean field as a checkbox", () => {
    mockGetActiveFields.mockReturnValue([booleanDesc()]);
    const session = makeMetadata({ usesAi: true });
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Uses AI")).toBeDefined();
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("toggles boolean and calls onChange", () => {
    mockGetActiveFields.mockReturnValue([booleanDesc()]);
    const session = makeMetadata({ usesAi: true });
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
    expect(session.usesAi).toBe(false);
  });

  it("renders an image field with URL input and capture button", () => {
    mockGetActiveFields.mockReturnValue([imageDesc()]);
    const session = makeMetadata({ toolLogoUrl: "https://example.com/logo.png" });
    const onCapture = vi.fn();

    render(
      <SchemaForm surface="metadata" session={session} onChange={onChange} onCapture={onCapture} />,
    );

    expect(screen.getByText("Logo")).toBeDefined();
    const input = screen.getByDisplayValue("https://example.com/logo.png") as HTMLInputElement;
    expect(input.type).toBe("url");

    // Capture button should be present when captureable
    expect(screen.getByText("Capture Page")).toBeDefined();
  });

  it("calls onCapture callback for image field", () => {
    mockGetActiveFields.mockReturnValue([imageDesc()]);
    const session = makeMetadata();
    const onCapture = vi.fn();

    render(
      <SchemaForm surface="metadata" session={session} onChange={onChange} onCapture={onCapture} />,
    );

    fireEvent.click(screen.getByText("Capture Page"));
    expect(onCapture).toHaveBeenCalledWith(expect.objectContaining({ id: "f6" }));
  });

  it("renders multi-select (pill) fields", () => {
    mockGetActiveFields.mockReturnValue([multiSelectDesc()]);
    const session = makeMetadata({ dataSources: ["CrossRef"] });
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Data Sources")).toBeDefined();
    // CrossRef should appear as a selected pill
    expect(screen.getByRole("button", { name: "CrossRef" })).toBeDefined();
  });

  it("renders single-select fields via PillField", () => {
    mockGetActiveFields.mockReturnValue([selectDesc()]);
    const session = { ...makeMetadata(), authMethod: "SSO" } as unknown as Record<string, unknown>;
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Auth Method")).toBeDefined();
    expect(screen.getByRole("button", { name: "SSO" })).toBeDefined();
  });

  it("renders fields grouped by group property", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "a", group: "Identity", order: 1 }),
      textDesc({ id: "b", group: "Coverage", order: 1 }),
    ]);
    const session = makeMetadata();
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    // Both fields should render (group headers not rendered for now — fields just flow)
    const inputs = screen.getAllByPlaceholderText("e.g. Enter value");
    expect(inputs.length).toBe(2);
  });

  it("renders fields in order within a group", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "first", storageKey: "f1", label: "First", order: 2 }),
      textDesc({ id: "second", storageKey: "f2", label: "Second", order: 1 }),
    ]);
    const session = makeMetadata();
    const { container } = render(
      <SchemaForm surface="metadata" session={session} onChange={onChange} />,
    );

    const labels = container.querySelectorAll("span.text-ut-sm.font-heading");
    expect(labels[0]?.textContent).toBe("Second");
    expect(labels[1]?.textContent).toBe("First");
  });

  it("renders renderFieldExtra for captureable fields", () => {
    mockGetActiveFields.mockReturnValue([imageDesc()]);
    const session = makeMetadata();
    const extraContent = "EXTRA_UI_HERE";

    render(
      <SchemaForm
        surface="metadata"
        session={session}
        onChange={onChange}
        renderFieldExtra={() => <div data-testid="extra">{extraContent}</div>}
      />,
    );

    expect(screen.getByTestId("extra")).toBeDefined();
    expect(screen.getByText(extraContent)).toBeDefined();
  });

  it("filters fields by surface", () => {
    mockGetActiveFields.mockImplementation((surface?: FieldSurface) => {
      if (surface === "finalization")
        return [
          textareaDesc({
            id: "conclusion",
            storageKey: "conclusion",
            label: "Conclusion",
            surface: "finalization",
          }),
        ];
      return [];
    });
    const session = makeMetadata();
    render(<SchemaForm surface="finalization" session={session} onChange={onChange} />);

    expect(screen.getByText("Conclusion")).toBeDefined();
  });

  it("renders helpText when present on a descriptor", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "ht", storageKey: "ht", label: "With Help", helpText: "Enter help here" }),
    ]);
    const session = makeMetadata();
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByText("Enter help here")).toBeDefined();
  });

  it("applies maxLength from descriptor to text input", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "ml", storageKey: "ml", label: "MaxLen", maxLength: 100 }),
    ]);
    const session = makeMetadata();
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    const input = screen.getByPlaceholderText("e.g. Enter value") as HTMLInputElement;
    expect(input.maxLength).toBe(100);
  });

  it("renders image field without capture button when onCapture not provided", () => {
    mockGetActiveFields.mockReturnValue([imageDesc()]);
    const session = makeMetadata();

    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.queryByText("Capture Page")).toBeNull();
  });

  it("renders image field without capture button when not captureable", () => {
    mockGetActiveFields.mockReturnValue([imageDesc({ captureable: false, id: "img-no-cap" })]);
    const session = makeMetadata();
    const onCapture = vi.fn();

    render(
      <SchemaForm surface="metadata" session={session} onChange={onChange} onCapture={onCapture} />,
    );

    expect(screen.queryByText("Capture Page")).toBeNull();
  });

  it("uses descriptor placeholder when available", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "p", storageKey: "p", label: "Custom", placeholder: "Type here..." }),
    ]);
    const session = makeMetadata();
    render(<SchemaForm surface="metadata" session={session} onChange={onChange} />);

    expect(screen.getByPlaceholderText("Type here...")).toBeDefined();
  });

  it("renders DragHandle button per field in edit mode", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "f-alpha", label: "Alpha" }),
      textDesc({ id: "f-beta", label: "Beta" }),
    ]);
    const session = makeMetadata();
    render(
      <EditModeProvider initialEditMode>
        <SchemaForm surface="metadata" session={session} onChange={onChange} />
      </EditModeProvider>,
    );

    expect(screen.getByRole("button", { name: "Reorder Alpha" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reorder Beta" })).toBeDefined();
  });

  it("renders no DragHandle in review mode", () => {
    mockGetActiveFields.mockReturnValue([
      textDesc({ id: "f-alpha", label: "Alpha" }),
      textDesc({ id: "f-beta", label: "Beta" }),
    ]);
    const session = makeMetadata();
    render(
      <EditModeProvider initialEditMode={false}>
        <SchemaForm surface="metadata" session={session} onChange={onChange} />
      </EditModeProvider>,
    );

    expect(screen.queryByRole("button", { name: "Reorder Alpha" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reorder Beta" })).toBeNull();
  });
});
