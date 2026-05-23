// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSidepanelZoom } from "@/hooks/useSidepanelZoom";

const STORAGE_KEY = "omp-sidepanel-zoom";

// ---------------------------------------------------------------------------
// localStorage stub — WXT jsdom environment provides a broken localStorage
// (empty object with no Storage methods). Replace with a functional Map-based
// implementation so the hook under test can actually read/write.
// ---------------------------------------------------------------------------

const store = new Map<string, string>();

const stubStorage: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (index: number) => {
    const keys = [...store.keys()];
    return keys[index] ?? null;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStorage(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function styleZoom(): string {
  return document.documentElement.style.zoom;
}

function dispatchKeyDown(key: string, ctrlKey = false): void {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "ctrlKey", { value: ctrlKey });
  window.dispatchEvent(event);
}

function dispatchWheel(deltaY: number, ctrlKey = false): void {
  const event = new WheelEvent("wheel", {
    deltaY,
    ctrlKey,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, "ctrlKey", { value: ctrlKey });
  window.dispatchEvent(event);
}

// ---------------------------------------------------------------------------
// useSidepanelZoom
// ---------------------------------------------------------------------------

describe("useSidepanelZoom", () => {
  let unmount: () => void;

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", stubStorage);
    document.documentElement.style.removeProperty("zoom");
  });

  afterEach(() => {
    if (unmount) unmount();
    document.documentElement.style.removeProperty("zoom");
  });

  // --- Mount behaviour ---------------------------------------------------

  it("defaults to zoom 1.0 when localStorage is empty", () => {
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;
    expect(res.result.current.zoom).toBe(1.0);
    expect(styleZoom()).toBe("");
    expect(readStorage()).toBeNull();
  });

  it("restores persisted zoom from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEY, "1.2");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;
    expect(res.result.current.zoom).toBe(1.2);
    expect(styleZoom()).toBe("1.2");
  });

  // --- Keyboard shortcuts ------------------------------------------------

  it("Ctrl+= zooms in by 0.1 and persists", () => {
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchKeyDown("=", true));

    expect(readStorage()).toBe("1.1");
    expect(styleZoom()).toBe("1.1");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.1);
  });

  it("Ctrl+- zooms out by 0.1 and persists", () => {
    localStorage.setItem(STORAGE_KEY, "1.3");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchKeyDown("-", true));
    expect(readStorage()).toBe("1.2");
    expect(styleZoom()).toBe("1.2");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.2);
  });

  it("Ctrl+0 resets zoom to 1.0 and removes style property", () => {
    localStorage.setItem(STORAGE_KEY, "1.3");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;
    expect(styleZoom()).toBe("1.3");

    act(() => dispatchKeyDown("0", true));
    expect(readStorage()).toBe("1");
    expect(styleZoom()).toBe("");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.0);
  });

  it("clamps at maximum zoom (1.5)", () => {
    localStorage.setItem(STORAGE_KEY, "1.5");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchKeyDown("=", true));
    expect(readStorage()).toBe("1.5");
    expect(styleZoom()).toBe("1.5");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.5);
  });

  it("clamps at minimum zoom (0.8)", () => {
    localStorage.setItem(STORAGE_KEY, "0.8");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchKeyDown("-", true));
    expect(readStorage()).toBe("0.8");
    expect(styleZoom()).toBe("0.8");
    res.rerender();
    expect(res.result.current.zoom).toBe(0.8);
  });

  // --- Wheel --------------------------------------------------------------

  it("Ctrl+wheel with negative deltaY zooms in", () => {
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchWheel(-100, true));
    expect(readStorage()).toBe("1.1");
    expect(styleZoom()).toBe("1.1");

    act(() => dispatchWheel(-100, true));
    expect(readStorage()).toBe("1.2");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.2);
  });

  it("Ctrl+wheel with positive deltaY zooms out", () => {
    localStorage.setItem(STORAGE_KEY, "1.2");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchWheel(100, true));
    expect(readStorage()).toBe("1.1");
    expect(styleZoom()).toBe("1.1");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.1);
  });

  it("wheel without Ctrl does nothing", () => {
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => dispatchWheel(100, false));
    expect(readStorage()).toBeNull();
    expect(styleZoom()).toBe("");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.0);
  });

  // --- setZoom API --------------------------------------------------------

  it("setZoom updates style and persists to localStorage", () => {
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;

    act(() => res.result.current.setZoom(1.3));
    expect(styleZoom()).toBe("1.3");
    expect(readStorage()).toBe("1.3");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.3);
  });

  it("setZoom to 1 removes the style property", () => {
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;
    act(() => res.result.current.setZoom(1.3));
    expect(styleZoom()).toBe("1.3");

    act(() => res.result.current.setZoom(1));
    expect(styleZoom()).toBe("");
    expect(readStorage()).toBe("1");
    res.rerender();
    expect(res.result.current.zoom).toBe(1.0);
  });

  // --- Invalid localStorage values ---------------------------------------

  it("falls back to default when localStorage has a non-numeric value", () => {
    localStorage.setItem(STORAGE_KEY, "abc");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;
    expect(res.result.current.zoom).toBe(1.0);
    expect(styleZoom()).toBe("");
  });

  it("falls back to default when localStorage has NaN string", () => {
    localStorage.setItem(STORAGE_KEY, "NaN");
    const res = renderHook(() => useSidepanelZoom());
    unmount = res.unmount;
    expect(res.result.current.zoom).toBe(1.0);
    expect(styleZoom()).toBe("");
  });
});
