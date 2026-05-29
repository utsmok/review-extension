// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// Zustand persist captures window.localStorage at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
const _lsStore = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
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
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  return store;
});

import { renderHook } from "@testing-library/react";
import { RubricContext, useRubric, useTabNavigation, TabNavigationContext } from "@/lib/contexts";
import { RUBRIC } from "@/tests/fixtures";

describe("useRubric", () => {
  it("returns context value from AllProviders", () => {
    const { result } = renderHook(() => useRubric(), {
      wrapper: ({ children }) => (
        <RubricContext.Provider value={{ rubric: RUBRIC, usesAi: true }}>
          {children}
        </RubricContext.Provider>
      ),
    });

    expect(result.current.rubric).toBe(RUBRIC);
    expect(result.current.usesAi).toBe(true);
  });

  it("returns default context value when no provider", () => {
    const { result } = renderHook(() => useRubric());
    expect(result.current.usesAi).toBe(true);
    expect(result.current.rubric).toBeNull();
  });
});

describe("useTabNavigation", () => {
  it("returns the provided navigation function", () => {
    const mockNavigate = (_tab: string) => {};
    const { result } = renderHook(() => useTabNavigation(), {
      wrapper: ({ children }) => (
        <TabNavigationContext.Provider value={mockNavigate}>
          {children}
        </TabNavigationContext.Provider>
      ),
    });

    expect(result.current).toBe(mockNavigate);
  });
});

describe("RubricContext default", () => {
  it("has usesAi: true in default value", () => {
    const { result } = renderHook(() => useRubric());
    expect(result.current.usesAi).toBe(true);
  });
});
