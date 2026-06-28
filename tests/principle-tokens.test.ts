// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyPrincipleTokens, getActivePrinciples } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("principle editing + runtime tokens", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());
  afterEach(() => {
    document.documentElement.style.cssText = "";
  });

  it("overrides a principle color and fullName", () => {
    useFrameworkCustomizationStore
      .getState()
      .setPrincipleOverride("TR", { color: "#ff0000", fullName: "Openness" });
    const tr = getActivePrinciples().find((p) => p.id === "TR");
    expect(tr?.color).toBe("#ff0000");
    expect(tr?.fullName).toBe("Openness");
  });

  it("applyPrincipleTokens injects CSS vars on :root (US maps to --uc)", () => {
    useFrameworkCustomizationStore.getState().setPrincipleOverride("TR", { color: "#ff0000" });
    useFrameworkCustomizationStore.getState().setPrincipleOverride("US", { color: "#123456" });
    applyPrincipleTokens();
    const style = getComputedStyle(document.documentElement);
    expect(style.getPropertyValue("--tr").trim()).toBe("#ff0000");
    expect(style.getPropertyValue("--uc").trim()).toBe("#123456");
    expect(style.getPropertyValue("--section-tr-accent").trim()).toBe("#ff0000");
  });

  it("reportColor override flows through getActivePrinciples", () => {
    useFrameworkCustomizationStore
      .getState()
      .setPrincipleOverride("TR", { reportColor: "#000000" });
    const tr = getActivePrinciples().find((p) => p.id === "TR");
    expect(tr?.reportColor).toBe("#000000");
  });
});
