// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoFocus, useFocusTrap, useRovingTabIndex } from "@/lib/hooks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTrap(buttons = ["A", "B", "C"]) {
  const container = document.createElement("div");
  container.innerHTML = buttons.map((t) => `<button>${t}</button>`).join("");
  document.body.appendChild(container);
  const ref = { current: container as HTMLElement | null };
  const cleanup = () => {
    if (container.parentNode) container.parentNode.removeChild(container);
  };
  return { container, ref, cleanup };
}

function dispatchKeyDown(target: EventTarget, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "shiftKey", { value: shiftKey });
  target.dispatchEvent(event);
  return event;
}

// ---------------------------------------------------------------------------
// useFocusTrap
// ---------------------------------------------------------------------------

describe("useFocusTrap", () => {
  let trap: ReturnType<typeof renderTrap>;

  beforeEach(() => {
    trap = renderTrap();
  });

  // Cleanup is per-test; each test may create its own trap or use the default.
  afterEach(() => {
    trap.cleanup();
  });

  it("wraps focus from last element to first on Tab", () => {
    const { container, ref } = trap;
    const buttons = container.querySelectorAll("button");
    renderHook(() => useFocusTrap(ref));

    // Focus last button
    (buttons[2] as HTMLElement).focus();
    expect(document.activeElement).toBe(buttons[2]);

    dispatchKeyDown(container, "Tab");
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("wraps focus from first element to last on Shift+Tab", () => {
    const { container, ref } = trap;
    const buttons = container.querySelectorAll("button");
    renderHook(() => useFocusTrap(ref));

    (buttons[0] as HTMLElement).focus();
    dispatchKeyDown(container, "Tab", true);
    expect(document.activeElement).toBe(buttons[2]);
  });

  it("does not wrap when Tab from middle element", () => {
    const { container, ref } = trap;
    const buttons = container.querySelectorAll("button");
    renderHook(() => useFocusTrap(ref));

    (buttons[1] as HTMLElement).focus();
    const event = dispatchKeyDown(container, "Tab");
    // The hook should NOT call preventDefault — normal browser Tab proceeds
    expect(event.defaultPrevented).toBe(false);
  });

  it("wraps to first when focus is outside container on Tab", () => {
    const { container, ref } = trap;
    const buttons = container.querySelectorAll("button");
    renderHook(() => useFocusTrap(ref));

    // Focus something outside the container
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    dispatchKeyDown(container, "Tab");
    expect(document.activeElement).toBe(buttons[0]);

    document.body.removeChild(outside);
  });

  it("does not error when container has no focusable elements", () => {
    const empty = renderTrap([]);
    const _hook = renderHook(() => useFocusTrap(empty.ref));

    // Should not throw
    dispatchKeyDown(empty.container, "Tab");
    expect(() => dispatchKeyDown(empty.container, "Tab")).not.toThrow();
    empty.cleanup();
  });

  it("does not error when container ref is null", () => {
    const nullRef = { current: null };
    expect(() => renderHook(() => useFocusTrap(nullRef))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// useRovingTabIndex
// ---------------------------------------------------------------------------

/** Minimal React.KeyboardEvent stub — only the fields the hook reads. */
function keyEvent(key: string): React.KeyboardEvent {
  return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent;
}

describe("useRovingTabIndex", () => {
  const tabs = ["a", "b", "c"] as const;

  it("initialises with the given tab", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "b"));
    expect(result.current.activeTab).toBe("b");
  });

  it("moves to next tab on ArrowRight", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "a"));
    act(() => result.current.handleKeyDown(keyEvent("ArrowRight")));
    expect(result.current.activeTab).toBe("b");
  });

  it("wraps to first on ArrowRight from last", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "c"));
    act(() => result.current.handleKeyDown(keyEvent("ArrowRight")));
    expect(result.current.activeTab).toBe("a");
  });

  it("moves to previous tab on ArrowLeft", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "b"));
    act(() => result.current.handleKeyDown(keyEvent("ArrowLeft")));
    expect(result.current.activeTab).toBe("a");
  });

  it("wraps to last on ArrowLeft from first", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "a"));
    act(() => result.current.handleKeyDown(keyEvent("ArrowLeft")));
    expect(result.current.activeTab).toBe("c");
  });

  it("goes to first on Home", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "c"));
    act(() => result.current.handleKeyDown(keyEvent("Home")));
    expect(result.current.activeTab).toBe("a");
  });

  it("goes to last on End", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "a"));
    act(() => result.current.handleKeyDown(keyEvent("End")));
    expect(result.current.activeTab).toBe("c");
  });

  it("does nothing on unknown key", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "b"));
    act(() => result.current.handleKeyDown(keyEvent("Enter")));
    expect(result.current.activeTab).toBe("b");
  });

  it("setActiveTab updates the active tab", () => {
    const { result } = renderHook(() => useRovingTabIndex(tabs, "a"));
    act(() => result.current.setActiveTab("c"));
    expect(result.current.activeTab).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// useAutoFocus
// ---------------------------------------------------------------------------

describe("useAutoFocus", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.innerHTML = '<button id="first">1</button><button id="second">2</button>';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  });

  it("focuses first focusable element on mount", () => {
    const ref = { current: container };
    renderHook(() => useAutoFocus(ref));

    const first = container.querySelector("#first") as HTMLElement;
    expect(document.activeElement).toBe(first);
  });

  it("focuses target element when targetSelector is provided", () => {
    const ref = { current: container };
    renderHook(() => useAutoFocus(ref, "#second"));

    const second = container.querySelector("#second") as HTMLElement;
    expect(document.activeElement).toBe(second);
  });

  it("does not re-focus on subsequent renders", () => {
    const ref = { current: container };
    const { rerender } = renderHook(({ cRef }) => useAutoFocus(cRef), {
      initialProps: { cRef: ref },
    });

    // First render focuses #first
    const first = container.querySelector("#first") as HTMLElement;
    expect(document.activeElement).toBe(first);

    // Move focus away manually
    const second = container.querySelector("#second") as HTMLElement;
    second.focus();
    expect(document.activeElement).toBe(second);

    // Re-render — should NOT steal focus back
    rerender({ cRef: ref });
    expect(document.activeElement).toBe(second);
  });

  it("is a no-op when container ref is null", () => {
    const nullRef = { current: null };
    expect(() => renderHook(() => useAutoFocus(nullRef))).not.toThrow();
  });
});
