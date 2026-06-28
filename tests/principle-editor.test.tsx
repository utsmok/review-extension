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

  it("renders inside EditorShell with correct title and subtitle", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    expect(screen.getByTestId("editor-shell")).toBeDefined();
    expect(screen.getByText("Principles")).toBeDefined();
    expect(
      screen.getByText(
        "Rename and recolor the five TRUST principles. Colors flow live into the rubric sections and the exported report.",
      ),
    ).toBeDefined();
  });

  it("renders the live preview strip with all five principles", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    expect(screen.getByTestId("principle-preview")).toBeDefined();
    const container = screen.getByTestId("principle-preview-swatches");
    // Each principle shows two swatches (tint + report) + code label
    expect(container.children.length).toBe(active.length);
    for (const p of active) {
      expect(screen.getByTestId(`preview-tint-${p.id}`)).toBeDefined();
      expect(screen.getByTestId(`preview-report-${p.id}`)).toBeDefined();
      expect(screen.getAllByText(p.code).length).toBeGreaterThanOrEqual(2); // preview + card header
    }
  });

  it("renders all five principle cards (TR, RE, US, SE, TC)", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    expect(active.length).toBe(5);
    // Each card header shows the code
    for (const p of active) {
      expect(screen.getAllByText(p.code).length).toBeGreaterThanOrEqual(2); // preview + card header
      expect(screen.getByTestId(`swatch-color-${p.id}`)).toBeDefined();
      expect(screen.getByTestId(`swatch-report-${p.id}`)).toBeDefined();
    }
  });

  it("renders color swatches for each principle", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    // Each principle renders two swatch divs (color + report color) in the card header
    const swatches = document.querySelectorAll('[aria-hidden="true"][class*="rounded-full"]');
    expect(swatches.length).toBeGreaterThanOrEqual(active.length * 2);
  });

  it("renders full name inputs with LabeledField labels and hints", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    // LabeledField renders the label text
    const nameLabels = screen.getAllByText("Full Name");
    expect(nameLabels.length).toBe(active.length);
    for (const p of active) {
      const input = screen.getByDisplayValue(p.fullName);
      expect(input).toBeDefined();
      expect(input.getAttribute("aria-label")).toBe(`${p.code} full name`);
    }
  });

  it("renders code inputs with LabeledField labels and hints", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const active = getActivePrinciples();
    const codeLabels = screen.getAllByText("Code");
    expect(codeLabels.length).toBe(active.length);
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

  it("renders de-jargon hints on color fields", () => {
    render(<PrincipleEditor onBack={() => {}} />);
    const colorHints = screen.getAllByText(
      "Tints this principle's rubric sections in the review UI.",
    );
    expect(colorHints.length).toBe(5);
    const reportHints = screen.getAllByText(
      "Hex used for this principle in the exported report. UI uses a theme class; the report needs an explicit hex.",
    );
    expect(reportHints.length).toBe(5);
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<PrincipleEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back to framework customization" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
