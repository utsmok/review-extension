/**
 * @vitest-environment jsdom
 */

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

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsScreen from "@/components/SettingsScreen";

afterEach(() => {
  cleanup();
});

describe("SettingsScreen", () => {
  it("renders the Reviewer Profile section", () => {
    render(<SettingsScreen onBack={vi.fn()} />);
    expect(screen.getByText("Reviewer Profile")).toBeDefined();
  });

  it("does not render Data & Privacy section", () => {
    render(<SettingsScreen onBack={vi.fn()} />);
    expect(screen.queryByText("Data & Privacy")).toBeNull();
    expect(screen.queryByText("Storage")).toBeNull();
    expect(screen.queryByText("IndexedDB + localStorage")).toBeNull();
  });

  it("does not render About section", () => {
    render(<SettingsScreen onBack={vi.fn()} />);
    expect(screen.queryByText("About")).toBeNull();
    expect(
      screen.queryByText("TRUST Review Extension for evaluating academic information tools."),
    ).toBeNull();
  });

  it("renders name and email inputs", () => {
    render(<SettingsScreen onBack={vi.fn()} />);
    expect(screen.getByPlaceholderText("Reviewer name")).toBeDefined();
    expect(screen.getByPlaceholderText("email@example.com")).toBeDefined();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<SettingsScreen onBack={onBack} />);
    screen.getByLabelText("Back").click();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
