/**
 * @vitest-environment jsdom
 */
// localStorage shim provided by setupFiles — see tests/helpers/local-storage.ts

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
