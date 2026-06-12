/**
 * @vitest-environment jsdom
 */
// localStorage shim provided by setupFiles — see tests/helpers/local-storage.ts

import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import SettingsScreen from "@/components/SettingsScreen";
import { useRegistryStore } from "@/stores/registry";

beforeEach(() => {
  cleanup();
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: null,
    settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full", labs: {} },
  });
});

describe("Labs settings", () => {
  it("shows the Labs heading", () => {
    render(<SettingsScreen onBack={() => {}} />);
    expect(screen.getByText("Labs")).toBeDefined();
  });

  it("starts with both toggles unchecked", () => {
    render(<SettingsScreen onBack={() => {}} />);
    const enhanced = screen.getByRole("checkbox", { name: /Enhanced Recommendation/i });
    const summaries = screen.getByRole("checkbox", { name: /Principle Summaries/i });
    expect(enhanced.hasAttribute("checked")).toBe(false);
    expect(summaries.hasAttribute("checked")).toBe(false);
  });

  it("toggles Enhanced Recommendation on", () => {
    render(<SettingsScreen onBack={() => {}} />);
    screen.getByRole("checkbox", { name: /Enhanced Recommendation/i }).click();
    expect(useRegistryStore.getState().settings.labs.enhancedRecommendation).toBe(true);
  });

  it("toggles Enhanced Recommendation back off", () => {
    render(<SettingsScreen onBack={() => {}} />);
    const cb = screen.getByRole("checkbox", { name: /Enhanced Recommendation/i });
    cb.click();
    cb.click();
    expect(useRegistryStore.getState().settings.labs.enhancedRecommendation).toBe(false);
  });

  it("toggling one does not affect the other", () => {
    render(<SettingsScreen onBack={() => {}} />);
    screen.getByRole("checkbox", { name: /Enhanced Recommendation/i }).click();
    const { labs } = useRegistryStore.getState().settings;
    expect(labs.enhancedRecommendation).toBe(true);
    expect(labs.principleSummaries).toBeUndefined();
  });
});
