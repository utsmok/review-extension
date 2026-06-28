// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PrincipleEditor from "@/components/PrincipleEditor";
import { getActivePrinciples } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("PrincipleEditor", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });
  afterEach(cleanup);

  it("renders all five principles (TR, RE, US, SE, TC)", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    expect(active.length).toBe(5);
    for (const p of active) {
      expect(screen.getByText(p.code)).toBeDefined();
    }
  });

  it("renders color swatches for each principle", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    // Each principle renders two swatch divs (color + report color)
    const swatches = document.querySelectorAll('[aria-hidden="true"][class*="rounded-full"]');
    expect(swatches.length).toBeGreaterThanOrEqual(active.length * 2);
  });

  it("renders full name inputs for each principle", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    for (const p of active) {
      const input = screen.getByDisplayValue(p.fullName);
      expect(input).toBeDefined();
      expect(input.getAttribute("aria-label")).toBe(`${p.code} full name`);
    }
  });

  it("renders code inputs for each principle", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    for (const p of active) {
      const input = screen.getByDisplayValue(p.code);
      expect(input).toBeDefined();
      expect(input.getAttribute("aria-label")).toBe(`${p.code} code`);
    }
  });

  it("edits fullName via setPrincipleOverride", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    const first = active[0];
    const input = screen.getByDisplayValue(first.fullName);
    fireEvent.change(input, { target: { value: "Trustworthy Reliability" } });
    const overrides = useFrameworkCustomizationStore.getState().customization.principleOverrides;
    expect(overrides[first.id]?.fullName).toBe("Trustworthy Reliability");
  });

  it("edits code via setPrincipleOverride", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    const first = active[0];
    const input = screen.getByDisplayValue(first.code);
    fireEvent.change(input, { target: { value: "TR2" } });
    const overrides = useFrameworkCustomizationStore.getState().customization.principleOverrides;
    expect(overrides[first.id]?.code).toBe("TR2");
  });

  it("edits color via color picker", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    const first = active[0];
    const picker = screen.getByLabelText(`${first.code} color`);
    fireEvent.change(picker, { target: { value: "#112233" } });
    const overrides = useFrameworkCustomizationStore.getState().customization.principleOverrides;
    expect(overrides[first.id]?.color).toBe("#112233");
  });

  it("edits reportColor via color picker", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    const first = active[0];
    const picker = screen.getByLabelText(`${first.code} report color`);
    fireEvent.change(picker, { target: { value: "#445566" } });
    const overrides = useFrameworkCustomizationStore.getState().customization.principleOverrides;
    expect(overrides[first.id]?.reportColor).toBe("#445566");
  });

  it("renders hex values for colors and report colors", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    for (const p of active) {
      // Some principles share the same hex; getAllByText is safe
      expect(screen.getAllByText(p.color).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(p.reportColor).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<PrincipleEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
