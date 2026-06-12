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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { AllProviders, seedActiveSession } from "@/tests/helpers/render-utils";

// Mock session-lifecycle to avoid IndexedDB access
vi.mock("@/lib/session-lifecycle", () => ({
  initAutoSave: vi.fn(),
  teardownAutoSave: vi.fn(),
  switchToSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  markDoneAndClose: vi.fn(),
  saveCurrentSession: vi.fn(),
  loadSessionById: vi.fn(),
}))

// Mock session-repository to avoid IndexedDB
vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({ save: vi.fn(), load: vi.fn(), delete: vi.fn() }),
}));

import FinalizationScreen from "@/components/FinalizationScreen";

function renderFinalization() {
  return render(<FinalizationScreen />, { wrapper: AllProviders });
}

describe("FinalizationScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useRegistryStore.setState({
      sessionIndex: {},
      activeSessionId: null,
    });
    useSessionStore.getState().clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("renders grade buttons", () => {
    seedActiveSession();
    renderFinalization();

    const buttons = screen.getAllByRole("button");
    const gradeButtons = buttons.filter((b) =>
      ["Pass", "Conditional", "Fail"].some((label) => b.textContent?.startsWith(label)),
    );
    expect(gradeButtons).toHaveLength(3);
  });

  it("selecting a grade updates UI", () => {
    seedActiveSession();
    renderFinalization();

    const passBtn = screen.getAllByRole("button").find((b) => b.textContent?.startsWith("Pass"));
    expect(passBtn).toBeDefined();
    fireEvent.click(passBtn!);

    expect(passBtn!.className).toContain("is-selected");
  });

  it("conclusion textarea is visible", () => {
    seedActiveSession();
    renderFinalization();

    const textarea = screen.getByPlaceholderText(
      "Summarize the key findings. Reference specific principles or criteria where relevant (e.g., 'Strong transparency but limited accessibility'). Mention the tool's primary strengths and the most significant concerns.",
    );
    expect(textarea).toBeDefined();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("explicit save sets finalizedAt", async () => {
    seedActiveSession();
    renderFinalization();

    // Select a grade
    const passBtn = screen.getAllByRole("button").find((b) => b.textContent?.startsWith("Pass"));
    fireEvent.click(passBtn!);

    // Click Lock & Finalize
    const finalizeBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "Lock & Finalize Review");
    expect(finalizeBtn).toBeDefined();
    fireEvent.click(finalizeBtn!);

    // Expect "Saved" indicator
    expect(screen.getByText("Saved")).toBeDefined();

    // Verify store has finalizedAt set
    const fin = useSessionStore.getState().finalization;
    expect(fin?.finalizedAt).toBeTruthy();
  });

  it("clear finalization resets form", () => {
    seedActiveSession();
    renderFinalization();

    // Select grade and save
    const passBtn = screen.getAllByRole("button").find((b) => b.textContent?.startsWith("Pass"));
    fireEvent.click(passBtn!);

    const finalizeBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "Lock & Finalize Review");
    fireEvent.click(finalizeBtn!);

    // Now click "Clear Finalization"
    const clearBtn = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "Clear Finalization");
    expect(clearBtn).toBeDefined();
    fireEvent.click(clearBtn!);

    // Grade buttons should no longer have is-selected
    const passBtnAfter = screen
      .getAllByRole("button")
      .find((b) => b.textContent?.startsWith("Pass"));
    expect(passBtnAfter!.className).not.toContain("is-selected");

    // "Saved" indicator should be gone
    expect(screen.queryByText("Saved")).toBeNull();

    // Store finalization should be null
    expect(useSessionStore.getState().finalization).toBeNull();
  });
});
