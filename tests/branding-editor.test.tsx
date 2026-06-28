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

  it("renders inside EditorShell with correct title and subtitle", () => {
    const onBack = vi.fn();
    render(<BrandingEditor onBack={onBack} />);
    expect(screen.getByTestId("editor-shell")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Branding" })).toBeDefined();
    expect(screen.getByText(/Framework name, colors, logos/)).toBeDefined();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = vi.fn();
    render(<BrandingEditor onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders live report-header PreviewBox with framework name and full name", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const branding = getActiveBranding();
    const preview = screen.getByTestId("report-header-preview");
    expect(preview).toBeDefined();
    expect(preview.textContent).toContain(branding.frameworkName);
    expect(preview.textContent).toContain(branding.frameworkFullName);
  });

  it("renders preview logo when framework logo exists", () => {
    const branding = getActiveBranding();
    render(<BrandingEditor onBack={() => {}} />);
    if (branding.logos.framework) {
      expect(screen.getByTestId("preview-logo")).toBeDefined();
    }
  });

  // ── Identity section (open by default) ──

  it("renders identity section open by default with frameworkName value", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const branding = getActiveBranding();
    const input = screen.getByTestId("identity-frameworkName");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe(branding.frameworkName);
  });

  it("edits wordmark via setBrandingOverrides", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const input = screen.getByTestId("identity-wordmark");
    fireEvent.change(input, { target: { value: "New Wordmark" } });

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
    expect(swatch.style.backgroundColor).toBeTruthy();
    expect(swatch.getAttribute("style")).toContain("background-color");
  });

  it("shows edited dot on Identity section when identity fields are overridden", () => {
    useFrameworkCustomizationStore.getState().setBrandingOverrides({ wordmark: "Custom" });
    render(<BrandingEditor onBack={() => {}} />);
    const section = screen.getByTestId("section-identity");
    expect(section.querySelector('[title="Edited from shipped default"]')).toBeDefined();
  });

  // ── Report Literals section (collapsed by default) ──

  it("renders report literals section collapsed by default", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const section = screen.getByTestId("section-report");
    expect(section.getAttribute("data-open")).toBe("false");
  });

  it("expands report literals section on click and shows report.title input", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const section = screen.getByTestId("section-report");
    fireEvent.click(section.querySelector("button")!);
    expect(section.getAttribute("data-open")).toBe("true");

    const branding = getActiveBranding();
    const titleInput = screen.getByTestId("report-title");
    expect((titleInput as HTMLInputElement).value).toBe(branding.report.title);
  });

  it("edits report.title via setBrandingOverrides", () => {
    render(<BrandingEditor onBack={() => {}} />);
    // Expand report section
    const section = screen.getByTestId("section-report");
    fireEvent.click(section.querySelector("button")!);

    const titleInput = screen.getByTestId("report-title");
    fireEvent.change(titleInput, { target: { value: "Custom Report" } });

    const updated = getActiveBranding();
    expect(updated.report.title).toBe("Custom Report");
  });

  // ── Export section (collapsed by default) ──

  it("expands export section and edits labelFilenamePrefix", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const section = screen.getByTestId("section-export");
    fireEvent.click(section.querySelector("button")!);

    const input = screen.getByTestId("export-labelFilenamePrefix");
    fireEvent.change(input, { target: { value: "custom-prefix" } });

    const updated = getActiveBranding();
    expect(updated.export.labelFilenamePrefix).toBe("custom-prefix");
  });

  // ── Logos section (collapsed by default) ──

  it("expands logos section and renders the upload input", () => {
    render(<BrandingEditor onBack={() => {}} />);
    const section = screen.getByTestId("section-logos");
    fireEvent.click(section.querySelector("button")!);

    const upload = screen.getByTestId("logo-upload");
    expect(upload).toBeDefined();
    expect(upload.getAttribute("type")).toBe("file");
    expect(upload.getAttribute("accept")).toBe("image/*");
  });

  it("renders logo preview when framework logo exists (logos section expanded)", () => {
    const branding = getActiveBranding();
    render(<BrandingEditor onBack={() => {}} />);
    const section = screen.getByTestId("section-logos");
    fireEvent.click(section.querySelector("button")!);

    if (branding.logos.framework) {
      const preview = screen.getByTestId("logo-preview");
      expect(preview).toBeDefined();
      expect(preview.getAttribute("src")).toBe(branding.logos.framework);
    }
  });

  // ── Reset ──

  it("renders Reset Branding button in footer", () => {
    render(<BrandingEditor onBack={() => {}} />);
    expect(screen.getByText("Reset Branding")).toBeDefined();
  });

  it("shows confirm dialog when Reset Branding is clicked", () => {
    render(<BrandingEditor onBack={() => {}} />);
    fireEvent.click(screen.getByText("Reset Branding"));
    // ConfirmDialog renders with the danger message
    expect(screen.getByText(/Reset all branding to the framework defaults/)).toBeDefined();
  });

  it("does not reset when confirm dialog is cancelled", () => {
    useFrameworkCustomizationStore.getState().setBrandingOverrides({ wordmark: "Test Override" });
    expect(getActiveBranding().wordmark).toBe("Test Override");

    render(<BrandingEditor onBack={() => {}} />);
    fireEvent.click(screen.getByText("Reset Branding"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(getActiveBranding().wordmark).toBe("Test Override");
  });

  it("resets branding when confirm dialog is confirmed", () => {
    useFrameworkCustomizationStore.getState().setBrandingOverrides({ wordmark: "Test Override" });
    expect(getActiveBranding().wordmark).toBe("Test Override");

    render(<BrandingEditor onBack={() => {}} />);
    fireEvent.click(screen.getByText("Reset Branding"));
    fireEvent.click(screen.getByText("Reset"));

    const reset = getActiveBranding();
    expect(reset.wordmark).not.toBe("Test Override");
  });
});
