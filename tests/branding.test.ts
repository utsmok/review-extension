// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyBrandingTokens,
  BRANDING,
  getActiveBranding,
  getReportBranding,
} from "@/lib/branding";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("branding config data-layer", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("declares framework name, wordmark, magenta, and report literals", () => {
    expect(BRANDING.frameworkName).toBeTruthy();
    expect(BRANDING.magenta).toMatch(/^#/);
    expect(BRANDING.report.title).toBeTruthy();
    expect(BRANDING.report.footerFramework).toBeTruthy();
    expect(BRANDING.report.archiveNotice).toContain("Archived by");
    expect(BRANDING.export.labelFilenamePrefix).toBeTruthy();
  });

  it("logos resolve to data URLs (injected from lib/logos.ts, not stored in JSON)", () => {
    expect(BRANDING.logos.framework).toMatch(/^data:image\//);
    expect(BRANDING.logos.secondary).toMatch(/^data:image\//);
  });

  it("getReportBranding returns the fields html-report needs", () => {
    const b = getReportBranding();
    expect(b.title).toBeTruthy();
    expect(b.archiveNotice).toContain("Archived by");
    expect(b.reviewedBy).toBeTruthy();
    expect(b.qrUrl).toMatch(/^https?:\/\//);
    expect(b.labelFilenamePrefix).toBeTruthy();
  });

  it("branding overrides flow through getActiveBranding", () => {
    useFrameworkCustomizationStore.getState().setBrandingOverrides({ magenta: "#ff00ff" });
    expect(getActiveBranding().magenta).toBe("#ff00ff");
    // report override deep-merges without clobbering siblings
    useFrameworkCustomizationStore
      .getState()
      .setBrandingOverrides({ report: { title: "X Label" } });
    const b = getActiveBranding();
    expect(b.report.title).toBe("X Label");
    expect(b.report.footerFramework).toBeTruthy();
  });

  it("applyBrandingTokens sets the runtime magenta + footer-framework vars", () => {
    useFrameworkCustomizationStore
      .getState()
      .setBrandingOverrides({ magenta: "#112233", report: { footerFramework: "Custom FW" } });
    applyBrandingTokens();
    const style = getComputedStyle(document.documentElement);
    expect(style.getPropertyValue("--trust-magenta").trim()).toBe("#112233");
    expect(style.getPropertyValue("--report-footer-framework").trim()).toBe("Custom FW");
  });
});
