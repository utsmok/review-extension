// @vitest-environment jsdom
// localStorage shim provided by setupFiles — see tests/helpers/local-storage.ts

import { renderHook } from "@testing-library/react";

import { describe, expect, it } from "vitest";
import {
  RubricContext,
  TabNavigationContext,
  useRubric,
  useTabNavigation,
} from "@/components/contexts";
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
