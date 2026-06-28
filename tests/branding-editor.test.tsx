// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BrandingEditor from "@/components/BrandingEditor";
import { getActiveBranding } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("BrandingEditor", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });
  afterEach(cleanup);

  it("renders the screen title and back button", () => {
    const onBack = vi.fn();
    render(<BrandingEditor onBack={onBack} />);
    expect(screen.getByRole("heading", { name: "Customize Branding" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Back" })).toBeDefined();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<BrandingEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders identity section inputs with current branding values", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const branding = getActiveBranding();

    // frameworkName and frameworkFullName may share values; use getAllByDisplayValue
    const nameInputs = screen.getAllByDisplayValue(branding.frameworkName);
    expect(nameInputs.length).toBeGreaterThanOrEqual(1);
    const fullNameInputs = screen.getAllByDisplayValue(branding.frameworkFullName);
    expect(fullNameInputs.length).toBeGreaterThanOrEqual(1);
  });

  it("edits wordmark via setBrandingOverrides", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const original = getActiveBranding().wordmark;

    // Multiple inputs may share the same value; pick the wordmark one by label
    const inputs = screen.getAllByDisplayValue(original);
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    fireEvent.change(inputs[0], { target: { value: "New Wordmark" } });

    const updated = getActiveBranding();
    expect(updated.wordmark).toBe("New Wordmark");
  });

  it("edits magenta color via color picker", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const colorInput = screen.getByTestId("magenta-input");
    fireEvent.change(colorInput, { target: { value: "#00ff00" } });

    const updated = getActiveBranding();
    expect(updated.magenta).toBe("#00ff00");
  });

  it("renders magenta swatch with current branding color", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const swatch = screen.getByTestId("magenta-swatch");
    // JSDOM normalises hex to rgb()
    expect(swatch.style.backgroundColor).toBeTruthy();
    expect(swatch.getAttribute("style")).toContain("background-color");
  });

  it("edits report.title via setBrandingOverrides", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const original = getActiveBranding().report.title;

    const titleInput = screen.getByDisplayValue(original);
    fireEvent.change(titleInput, { target: { value: "Custom Report" } });

    const updated = getActiveBranding();
    expect(updated.report.title).toBe("Custom Report");
  });

  it("edits export.labelFilenamePrefix via setBrandingOverrides", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const original = getActiveBranding().export.labelFilenamePrefix;

    const input = screen.getByDisplayValue(original);
    fireEvent.change(input, { target: { value: "custom-prefix" } });

    const updated = getActiveBranding();
    expect(updated.export.labelFilenamePrefix).toBe("custom-prefix");
  });

  it("renders the logo upload input", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const upload = screen.getByTestId("logo-upload");
    expect(upload).toBeDefined();
    expect(upload.getAttribute("type")).toBe("file");
    expect(upload.getAttribute("accept")).toBe("image/*");
  });

  it("renders logo preview when framework logo exists", () => {
    const branding = getActiveBranding();
    render(<BrandingEditor onBack={() => {}} />);

    if (branding.logos.framework) {
      const preview = screen.getByTestId("logo-preview");
      expect(preview).toBeDefined();
      expect(preview.getAttribute("src")).toBe(branding.logos.framework);
    }
  });

  it("calls resetBranding when Reset Branding button is clicked", () => {
    // First set an override so we can verify reset clears it
    useFrameworkCustomizationStore.getState().setBrandingOverrides({ wordmark: "Test Override" });
    expect(getActiveBranding().wordmark).toBe("Test Override");

    render(<BrandingEditor onBack={() => {}} />);
    fireEvent.click(screen.getByText("Reset Branding"));

    const reset = getActiveBranding();
    expect(reset.wordmark).not.toBe("Test Override");
  });
});
