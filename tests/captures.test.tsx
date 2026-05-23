// @vitest-environment jsdom

// Zustand persist captures `window.localStorage` at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
const _lsStore: Record<string, string> = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  return store;
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionStore } from "@/stores/session";
import { makeCapture } from "@/tests/fixtures";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/capture", () => ({
  captureActiveTab: vi.fn(),
}));

vi.mock("@/lib/auto-save", () => ({
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
}));

vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
  markDoneAndClose: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn(), remove: vi.fn() }),
}));

vi.mock("@/stores/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/components/ConfirmDialog", () => ({
  default: (props: { message: string; actions: Array<{ label: string; handler: () => void }> }) => (
    <div data-testid="confirm-dialog">
      <span>{props.message}</span>
      {props.actions.map((a) => (
        <button key={a.label} type="button" onClick={a.handler}>
          {a.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/EvidenceModal", () => ({
  default: (props: { capture: { id: string }; onClose: () => void }) => (
    <div data-testid="evidence-modal">
      <span>Evidence modal for {props.capture.id}</span>
      <button type="button" onClick={props.onClose}>
        Close
      </button>
    </div>
  ),
}));

vi.mock("@/components/RubricChipGroup", () => ({
  default: () => <div data-testid="rubric-chip-group" />,
}));

import Captures from "@/components/Captures";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderCaptures() {
  return render(<Captures />, { wrapper: AllProviders });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  for (const k of Object.keys(_lsStore)) delete _lsStore[k];
  useSessionStore.getState().clear();
});

afterEach(() => {
  cleanup();
});

describe("Captures", () => {
  it("shows empty state when no captures", () => {
    seedActiveSession();
    renderCaptures();

    expect(screen.getByText("No captures yet")).toBeDefined();
    expect(
      screen.getByText("Use the capture button above to save screenshots as evidence."),
    ).toBeDefined();
  });

  it("shows captures in grid view", () => {
    const capture1 = makeCapture({ pageTitle: "Result Page" });
    const capture2 = makeCapture({ pageTitle: "About Page" });
    seedActiveSession({ captures: [capture1, capture2] });
    renderCaptures();

    // Grid view is the default — thumbnails show alt text from page titles
    expect(screen.getByAltText("Screenshot of Result Page")).toBeDefined();
    expect(screen.getByAltText("Screenshot of About Page")).toBeDefined();

    // Grid/List toggle should appear since there are captures
    expect(screen.getByLabelText("Grid view")).toBeDefined();
    expect(screen.getByLabelText("List view")).toBeDefined();
  });

  it("capture button triggers captureActiveTab", async () => {
    const { captureActiveTab } = await import("@/lib/capture");
    const mockCapture = makeCapture();
    vi.mocked(captureActiveTab).mockResolvedValueOnce(mockCapture);

    seedActiveSession();
    renderCaptures();

    const btn = screen.getByRole("button", { name: /\+ Quick Capture/ });
    fireEvent.click(btn);

    expect(captureActiveTab).toHaveBeenCalledOnce();
  });

  it("delete shows confirmation dialog", () => {
    const capture = makeCapture({ pageTitle: "Delete Me" });
    seedActiveSession({ captures: [capture] });
    renderCaptures();

    // Click the delete button on the thumbnail overlay
    const deleteBtn = screen.getByLabelText("Delete capture");
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId("confirm-dialog")).toBeDefined();
    expect(screen.getByText("Delete this capture? This cannot be undone.")).toBeDefined();
  });

  it("delete confirmation removes capture", () => {
    const capture1 = makeCapture({ pageTitle: "Keep Me" });
    const capture2 = makeCapture({ pageTitle: "Remove Me" });
    seedActiveSession({ captures: [capture1, capture2] });
    renderCaptures();

    // Both captures present
    expect(screen.getByAltText("Screenshot of Keep Me")).toBeDefined();
    expect(screen.getByAltText("Screenshot of Remove Me")).toBeDefined();

    // Click delete on the first capture shown (reversed order, so capture2 is first)
    const deleteBtns = screen.getAllByLabelText("Delete capture");
    fireEvent.click(deleteBtns[0]);

    // Confirm delete in dialog
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);

    // Dialog should be gone
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    // One capture should remain
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(1);
  });

  it("switches to list view", () => {
    const capture = makeCapture({ pageTitle: "List Item", sourceUrl: "https://example.com/list" });
    seedActiveSession({ captures: [capture] });
    renderCaptures();

    // Switch to list view
    const listBtn = screen.getByLabelText("List view");
    fireEvent.click(listBtn);

    // In list view, the source URL is rendered in a div
    expect(screen.getByText("https://example.com/list")).toBeDefined();

    // Grid images should no longer be shown
    expect(screen.queryByAltText("Screenshot of List Item")).toBeNull();
  });

  it("list view has annotate and delete actions", () => {
    const capture = makeCapture({ pageTitle: "Action Test" });
    seedActiveSession({ captures: [capture] });
    renderCaptures();

    // Switch to list view
    fireEvent.click(screen.getByLabelText("List view"));

    // List view has Annotate and Delete buttons
    expect(screen.getByRole("button", { name: "Annotate" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDefined();
  });
});
