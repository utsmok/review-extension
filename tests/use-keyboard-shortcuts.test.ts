// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Dispatch a keydown that bubbles up to the document-level listener. */
function fireKeyDown(key: string, options?: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, ...options, bubbles: true });
  document.dispatchEvent(event);
  return event;
}

/** Dispatch a keydown from a specific element (target check uses e.target). */
function fireKeyDownFrom(
  target: HTMLElement,
  key: string,
  options?: KeyboardEventInit,
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, ...options, bubbles: true });
  target.dispatchEvent(event);
  return event;
}

/** Create, mount, and focus an element so it becomes the event target. */
function mountFocused(tagName: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tagName);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  el.focus();
  return el;
}

// ---------------------------------------------------------------------------
// useKeyboardShortcuts
// ---------------------------------------------------------------------------

describe("useKeyboardShortcuts", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("invokes action when matching key is pressed", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ s: action }));

    fireKeyDown("s");

    expect(action).toHaveBeenCalledOnce();
  });

  it("supports modifier key combinations (Ctrl+S, Shift+A)", () => {
    const ctrlAction = vi.fn();
    const shiftAction = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "Ctrl+s": ctrlAction, "Shift+A": shiftAction }));

    // Real browser: Ctrl keeps lowercase, Shift uppercases the produced key.
    fireKeyDown("s", { ctrlKey: true });
    fireKeyDown("A", { shiftKey: true });

    expect(ctrlAction).toHaveBeenCalledOnce();
    expect(shiftAction).toHaveBeenCalledOnce();
  });

  it("ignores key events when focused on INPUT element", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ s: action }));

    const input = mountFocused("input");
    fireKeyDownFrom(input, "s");

    expect(action).not.toHaveBeenCalled();
  });

  it("ignores key events when focused on TEXTAREA element", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ s: action }));

    const textarea = mountFocused("textarea");
    fireKeyDownFrom(textarea, "s");

    expect(action).not.toHaveBeenCalled();
  });

  it("ignores key events when focused on SELECT element", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ s: action }));

    const select = mountFocused("select");
    fireKeyDownFrom(select, "s");

    expect(action).not.toHaveBeenCalled();
  });

  it("ignores key events when target is contentEditable", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ s: action }));

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.appendChild(editable);
    // jsdom does not compute isContentEditable from the attribute; mirror the
    // value a real browser exposes so the hook's guard branch is exercised.
    Object.defineProperty(editable, "isContentEditable", { value: true, configurable: true });
    editable.focus();

    fireKeyDownFrom(editable, "s");

    expect(action).not.toHaveBeenCalled();
  });

  it("does not invoke action for non-matching keys", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ s: action }));

    fireKeyDown("x");

    expect(action).not.toHaveBeenCalled();
  });

  it("updates action when shortcuts object changes (uses ref)", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useKeyboardShortcuts({ s: cb }), {
      initialProps: { cb: first },
    });

    rerender({ cb: second });
    fireKeyDown("s");

    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
  });

  it("removes event listener on unmount", () => {
    const action = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ s: action }));

    unmount();
    fireKeyDown("s");

    expect(action).not.toHaveBeenCalled();
  });
});
