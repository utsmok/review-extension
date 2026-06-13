// @vitest-environment jsdom

// Zustand persist captures `window.localStorage` at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
vi.hoisted(() => {
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
});

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeCapture } from "@/tests/fixtures";
import { AllProviders } from "@/tests/helpers/render-utils";

// ---------------------------------------------------------------------------
// Mock tldraw — the real library needs a full DOM layout engine.
// Use a simple function component (no hooks) so the mock factory is safe.
// ---------------------------------------------------------------------------
vi.mock("tldraw", () => {
  const Tldraw = () => <div data-testid="tldraw-mock" />;
  return {
    Tldraw,
    AssetRecordType: { createId: () => "fake-asset-id" },
    DefaultColorStyle: {},
    DefaultSizeStyle: {},
    createShapeId: () => "fake-shape-id",
    track: (fn: unknown) => fn,
    useValue: (_key: string, fn: () => unknown) => fn(),
  };
});

// Mock session-lifecycle to avoid IndexedDB access
vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
  markDoneAndClose: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
}));

// Mock session-repository to avoid IndexedDB
vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn(), remove: vi.fn() }),
}));

// Mock image-convert to avoid canvas API
vi.mock("@/lib/image-convert", () => ({
  resizeImageBlob: vi.fn(() => Promise.resolve(new Blob([], { type: "image/png" }))),
}));

// Mock RubricChipGroup to avoid rendering its full subtree
vi.mock("@/components/RubricChipGroup", () => ({
  default: () => <div data-testid="rubric-chip-group" />,
}));

import EvidenceModal from "@/components/EvidenceModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderModal(
  overrides: { capture?: ReturnType<typeof makeCapture>; onClose?: () => void } = {},
) {
  const onClose = overrides.onClose ?? vi.fn();
  const capture = overrides.capture ?? makeCapture();
  const result = render(
    <AllProviders>
      <EvidenceModal capture={capture} onClose={onClose} />
    </AllProviders>,
  );
  return { ...result, onClose, capture };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EvidenceModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders with capture page title", () => {
    const capture = makeCapture({ pageTitle: "My Search Results" });
    renderModal({ capture });

    expect(screen.getByText("My Search Results")).toBeDefined();
  });

  it("renders the source URL", () => {
    const capture = makeCapture({ sourceUrl: "https://example.com/search?q=test" });
    renderModal({ capture });

    expect(screen.getByText("https://example.com/search?q=test")).toBeDefined();
  });

  it("calls onClose when backdrop is clicked", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderModal({ onClose });

    // The outermost element is a <button class="modal-backdrop">.
    // It has no accessible name, but it wraps the dialog.
    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement;
    if (backdrop) fireEvent.click(backdrop);

    // Advance past the 200ms close animation
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.keyDown(document, { key: "Escape" });

    // Advance past the 200ms close animation
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders the dialog with correct aria attributes", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Evidence viewer and annotation");
  });
});
