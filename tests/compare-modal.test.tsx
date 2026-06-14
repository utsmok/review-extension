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

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComparisonEntry } from "@/lib/types";
import { AllProviders } from "@/tests/helpers/render-utils";

// Mock session-lifecycle to avoid IndexedDB access
vi.mock("@/lib/session-lifecycle", () => ({
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
  markDoneAndClose: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  exportSessionById: vi.fn(),
  importSessionFromZipFile: vi.fn(),
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
  buildSessionComparison: vi.fn(),
}));

// Mock session-repository to avoid IndexedDB
vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn().mockResolvedValue(null), delete: vi.fn() }),
}));

import CompareModal from "@/components/CompareModal";

function makeEntry(overrides?: Partial<ComparisonEntry>): ComparisonEntry {
  return {
    id: "test-entry-1",
    toolName: "ToolA",
    conclusion: "Good tool",
    strengths: ["Fast"],
    weaknesses: ["Expensive"],
    principleAverages: { TR: 2.5, RE: 1.0, US: null, SE: 2.0, TC: 0.5 },
    total: [6, 9, 6 / 9],
    ...overrides,
  };
}

function renderModal(
  entries: ComparisonEntry[] = [
    makeEntry(),
    makeEntry({
      toolName: "ToolB",
      conclusion: "Decent tool",
      strengths: ["Cheap"],
      weaknesses: ["Slow"],
      principleAverages: { TR: 0.5, RE: 3.0, US: 2.5, SE: null, TC: 1.5 },
      total: [8, 9, 8 / 9],
    }),
  ],
  onClose = vi.fn(),
) {
  return render(
    <AllProviders>
      <CompareModal entries={entries} onClose={onClose} />
    </AllProviders>,
  );
}

describe("CompareModal", () => {
  afterEach(cleanup);

  it("renders 2 entries with correct columns", () => {
    renderModal();

    // Header
    expect(screen.getByText("Compare Tools")).toBeDefined();

    // Column headers for both tools
    expect(screen.getByText("ToolA")).toBeDefined();
    expect(screen.getByText("ToolB")).toBeDefined();

    // Criterion rows
    expect(screen.getByText("Verdict")).toBeDefined();
    expect(screen.getByText("Score")).toBeDefined();
    expect(screen.getByText("Transparency")).toBeDefined();
    expect(screen.getByText("Reliability")).toBeDefined();

    // Conclusions rendered as text
    expect(screen.getByText("Good tool")).toBeDefined();
    expect(screen.getByText("Decent tool")).toBeDefined();

    // Table should have tool columns: 1 criterion + 2 tools = 3 columns in header
    const headerRow = screen.getAllByRole("row")[0];
    expect(headerRow.querySelectorAll("th")).toHaveLength(3);
  });

  it("highlights best score cells when >= 2 tools", () => {
    renderModal();

    // ToolA has TR=2.5 (best for TR) → should have font-bold and underline
    const trBestCell = screen.getByTestId("cell-ToolA-TR");
    expect(trBestCell.className).toContain("font-bold");
    expect(trBestCell.className).toContain("underline");

    // ToolB has RE=3.0 (best for RE) → should have highlight
    const reBestCell = screen.getByTestId("cell-ToolB-RE");
    expect(reBestCell.className).toContain("font-bold");
    expect(reBestCell.className).toContain("underline");

    // ToolA RE=1.0 is not best → no highlight
    const reCell = screen.getByTestId("cell-ToolA-RE");
    expect(reCell.className).not.toContain("font-bold");
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    renderModal([makeEntry()], onClose);

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    renderModal([makeEntry()], onClose);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
