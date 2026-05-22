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

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RubricContext, TabNavigationContext } from "@/lib/contexts";
import FinalizationScreen from "@/components/FinalizationScreen";
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { makeMetadata, RUBRIC } from "@/tests/fixtures";
import type { ReviewFinalization } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────

function loadSessionWithFinalization(fin: ReviewFinalization | null) {
  const metadata = makeMetadata();
  useSessionStore.getState().loadSession({
    metadata,
    captures: [],
    evaluations: [],
    finalization: fin,
  });
  useRegistryStore.getState().setActiveSessionId(metadata.id);
}

function renderFinalization() {
  return render(
    <RubricContext.Provider value={{ rubric: RUBRIC, usesAi: false }}>
      <TabNavigationContext.Provider value={vi.fn()}>
        <FinalizationScreen />
      </TabNavigationContext.Provider>
    </RubricContext.Provider>,
  );
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("FinalizationScreen autosave", () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("autosaves grade to store after 50ms debounce", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    act(() => {
      screen.getByText("Pass").click();
    });

    // Not saved yet — debounce window
    expect(useSessionStore.getState().finalization).toBeNull();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const fin = useSessionStore.getState().finalization;
    expect(fin).not.toBeNull();
    expect(fin?.grade).toBe("pass");
    // Autosave does NOT set finalizedAt
    expect(fin?.finalizedAt).toBe("");

    vi.useRealTimers();
  });

  it("autosaves text fields after 50ms debounce", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    // Set grade first (autosave won't fire without grade)
    act(() => {
      screen.getByText("Conditional").click();
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Type in conclusion
    const conclusionTextarea = screen.getByPlaceholderText("Overall summary of the review...");
    act(() => {
      fireEvent.change(conclusionTextarea, { target: { value: "Great tool" } });
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const fin = useSessionStore.getState().finalization;
    expect(fin).not.toBeNull();
    expect(fin?.conclusion).toBe("Great tool");

    vi.useRealTimers();
  });

  it("does NOT autosave when grade is empty", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    // Type in conclusion without setting grade
    const conclusionTextarea = screen.getByPlaceholderText("Overall summary of the review...");
    act(() => {
      fireEvent.change(conclusionTextarea, { target: { value: "Some text" } });
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(useSessionStore.getState().finalization).toBeNull();

    vi.useRealTimers();
  });

  it("explicit Save sets finalizedAt", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    act(() => {
      screen.getByText("Pass").click();
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    act(() => {
      screen.getByText("Save Finalization").click();
    });

    const fin = useSessionStore.getState().finalization;
    expect(fin).not.toBeNull();
    expect(fin?.finalizedAt).not.toBe("");
    expect(new Date(fin?.finalizedAt).getTime()).not.toBeNaN();

    vi.useRealTimers();
  });

  it("autosave preserves existing finalizedAt from explicit Save", () => {
    vi.useFakeTimers();
    const existingFinalization: ReviewFinalization = {
      grade: "pass",
      conclusion: "Initial",
      strengths: [],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-15T12:00:00.000Z",
    };
    loadSessionWithFinalization(existingFinalization);
    renderFinalization();

    const conclusionTextarea = screen.getByPlaceholderText("Overall summary of the review...");
    act(() => {
      fireEvent.change(conclusionTextarea, { target: { value: "Updated" } });
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const fin = useSessionStore.getState().finalization;
    expect(fin).not.toBeNull();
    expect(fin?.conclusion).toBe("Updated");
    expect(fin?.finalizedAt).toBe("2025-06-15T12:00:00.000Z");

    vi.useRealTimers();
  });

  it("shows Finalized banner only when finalizedAt is set", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    act(() => {
      screen.getByText("Pass").click();
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Banner should NOT show (only autosaved, not formally finalized)
    expect(screen.queryByText(/Finalized/)).toBeNull();

    act(() => {
      screen.getByText("Save Finalization").click();
    });

    // Banner should show now
    expect(screen.getByText(/Finalized/)).toBeDefined();

    vi.useRealTimers();
  });

  it("debounces rapid changes — last value wins", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    act(() => {
      screen.getByText("Pass").click();
    });
    act(() => {
      screen.getByText("Fail").click();
    });
    act(() => {
      screen.getByText("Conditional").click();
    });

    expect(useSessionStore.getState().finalization).toBeNull();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const fin = useSessionStore.getState().finalization;
    expect(fin).not.toBeNull();
    expect(fin?.grade).toBe("conditional");

    vi.useRealTimers();
  });

  it("Clear Finalization resets store and local state", () => {
    vi.useFakeTimers();
    const existingFinalization: ReviewFinalization = {
      grade: "pass",
      conclusion: "Done",
      strengths: [],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-15T12:00:00.000Z",
    };
    loadSessionWithFinalization(existingFinalization);
    renderFinalization();

    act(() => {
      screen.getByText("Clear Finalization").click();
    });

    expect(useSessionStore.getState().finalization).toBeNull();
    expect(screen.queryByText(/Finalized/)).toBeNull();
    expect(screen.queryByText("Saved")).toBeNull();

    vi.useRealTimers();
  });

  it("syncs local state when store finalization changes externally", () => {
    const existingFinalization: ReviewFinalization = {
      grade: "pass",
      conclusion: "External change",
      strengths: [],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-15T12:00:00.000Z",
    };
    loadSessionWithFinalization(null);
    renderFinalization();

    act(() => {
      useSessionStore.getState().setFinalization(existingFinalization);
    });

    const passBtn = screen.getByText("Pass");
    expect(passBtn.className).toContain("bg-ut-green");
  });

  it("does not create feedback loop between autosave and sync effect", () => {
    vi.useFakeTimers();
    loadSessionWithFinalization(null);
    renderFinalization();

    act(() => {
      screen.getByText("Pass").click();
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    const fin1 = useSessionStore.getState().finalization;
    expect(fin1).not.toBeNull();

    // Advance more time — should NOT trigger another autosave
    act(() => {
      vi.advanceTimersByTime(200);
    });

    const fin2 = useSessionStore.getState().finalization;
    expect(fin2).toEqual(fin1);

    vi.useRealTimers();
  });
});
