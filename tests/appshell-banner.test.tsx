/**
 * @vitest-environment jsdom
 */
// localStorage shim provided by setupFiles — see tests/helpers/local-storage.ts

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
  });
});

function renderAppShell(overrides?: {
  onSettingsClick?: () => void;
  showSettingsButton?: boolean;
}) {
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
    useRegistryStore.getState().updateSettings({ reviewerName: "" });
    renderAppShell();
    expect(screen.getByTestId("setup-banner")).toBeDefined();
    expect(screen.getByText("Set up your reviewer name to get started.")).toBeDefined();
  });

  it("hides the banner when reviewerName is set", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "Alice" });
    renderAppShell();
    expect(screen.queryByTestId("setup-banner")).toBeNull();
  });

  it("hides the banner when reviewerName is set after initial render", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "" });
    const { rerender } = renderAppShell();
    expect(screen.getByTestId("setup-banner")).toBeDefined();

    useRegistryStore.getState().updateSettings({ reviewerName: "Alice" });
    rerender(
      <AppShell onSettingsClick={vi.fn()} showSettingsButton={true}>
        <div data-testid="child">Content</div>
      </AppShell>,
    );
    expect(screen.queryByTestId("setup-banner")).toBeNull();
  });

  it("stays visible when reviewerName is empty", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "" });
    renderAppShell();
    expect(screen.getByTestId("setup-banner")).toBeDefined();
  });
  it("calls onSettingsClick when Open Settings link is clicked", () => {
    const onSettingsClick = vi.fn();
    useRegistryStore.getState().updateSettings({ reviewerName: "" });
    renderAppShell({ onSettingsClick });
    fireEvent.click(screen.getByText("Open Settings"));
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it("does not show banner when reviewerName is already set", () => {
    useRegistryStore.getState().updateSettings({ reviewerName: "Bob" });
    renderAppShell();
    expect(screen.queryByTestId("setup-banner")).toBeNull();
  });
});
