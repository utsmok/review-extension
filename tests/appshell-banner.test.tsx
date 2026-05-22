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

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppShell from "@/components/AppShell";
import { useRegistryStore } from "@/stores/registry";

afterEach(() => {
  cleanup();
  // Reset store to default state
  useRegistryStore.getState().updateSettings({
    reviewerName: "",
    reviewerEmail: "",
    setupBannerDismissed: false,
  });
});

function renderAppShell(overrides?: { onSettingsClick?: () => void; showSettingsButton?: boolean }) {
  const onSettingsClick = overrides?.onSettingsClick ?? vi.fn();
  const showSettingsButton = overrides?.showSettingsButton ?? true;
  return render(
    <AppShell onSettingsClick={onSettingsClick} showSettingsButton={showSettingsButton}>
      <div data-testid="child">Content</div>
    </AppShell>,
  );
}

describe("Setup Banner", () => {
  it("shows the banner when reviewerName is empty", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "", setupBannerDismissed: false });
    renderAppShell();
    expect(screen.getByTestId("setup-banner")).toBeDefined();
    expect(screen.getByText("Set up your reviewer name to get started.")).toBeDefined();
  });

  it("hides the banner when reviewerName is set", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "Alice", setupBannerDismissed: false });
    renderAppShell();
    expect(screen.queryByTestId("setup-banner")).toBeNull();
  });

  it("hides the banner after dismissal", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "", setupBannerDismissed: false });
    renderAppShell();
    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);
    expect(screen.queryByTestId("setup-banner")).toBeNull();
  });

  it("stays hidden after dismissal even when reviewerName is still empty", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "", setupBannerDismissed: false });
    renderAppShell();
    fireEvent.click(screen.getByLabelText("Dismiss"));
    // Verify the store flag is set
    expect(useRegistryStore.getState().settings.setupBannerDismissed).toBe(true);
  });

  it("calls onSettingsClick when Open Settings link is clicked", () => {
    const onSettingsClick = vi.fn();
    useRegistryStore.getState().updateSettings({ reviewerName: "", setupBannerDismissed: false });
    renderAppShell({ onSettingsClick });
    fireEvent.click(screen.getByText("Open Settings"));
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it("does not show banner when setupBannerDismissed is true", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "", setupBannerDismissed: true });
    renderAppShell();
    expect(screen.queryByTestId("setup-banner")).toBeNull();
  });
});
