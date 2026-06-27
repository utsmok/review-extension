import { describe, it, expect, beforeEach } from "vitest";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import type { FieldDescriptor } from "@/lib/types";
import { getActiveFrameworkConfig } from "@/lib/framework-config";
import { getActiveFields, getField } from "@/lib/field-schema";

describe("Task 3 – framework customization store", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });

  it("initial state has no overrides", () => {
    expect(useFrameworkCustomizationStore.getState().hasOverrides()).toBe(false);
  });

  it("hasOverrides returns true after setFieldOverride", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { order: 99 });
    expect(useFrameworkCustomizationStore.getState().hasOverrides()).toBe(true);
  });

  it("resetField clears field overrides + extras + hidden + renames", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.setFieldOverride("pricing", { label: "Price tier" });
    s.addOption("pricing", "Freemium");
    s.hideOption("pricing", "Free");
    s.renameOption("pricing", "Paid", "Commercial");
    s.resetField("pricing");
    const c = s.customization;
    expect(c.fieldOverrides["pricing"]).toBeUndefined();
    expect(c.extraOptions["pricing"]).toBeUndefined();
    expect(c.hiddenOptions["pricing"]).toBeUndefined();
    expect(c.renames["pricing"]).toBeUndefined();
  });

  it("addField adds a custom field to config", () => {
    const desc: FieldDescriptor = {
      id: "custom-field",
      storageKey: "customField",
      surface: "metadata",
      label: "My Field",
      type: "text",
      order: 50,
      enabled: true,
    };
    useFrameworkCustomizationStore.getState().addField(desc);
    const g = getActiveFrameworkConfig();
    expect(g.fields.find((f) => f.id === "custom-field")).toBeDefined();
  });

  it("removeCustomField removes a previously added field", () => {
    const desc: FieldDescriptor = {
      id: "x-field",
      storageKey: "xField",
      surface: "metadata",
      label: "X",
      type: "text",
      order: 50,
      enabled: true,
    };
    const s = useFrameworkCustomizationStore.getState();
    s.addField(desc);
    expect(getActiveFrameworkConfig().fields.find((f) => f.id === "x-field")).toBeDefined();
    s.removeCustomField("x-field");
    expect(getActiveFrameworkConfig().fields.find((f) => f.id === "x-field")).toBeUndefined();
  });

  it("addOption appends option to select field", () => {
    useFrameworkCustomizationStore.getState().addOption("authenticationMethod", "LTI");
    const auth = getField("authenticationMethod");
    expect(auth.options).toContain("LTI");
  });

  it("removeOption removes extra option", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.addOption("authenticationMethod", "LTI");
    s.removeOption("authenticationMethod", "LTI");
    const auth = getField("authenticationMethod");
    expect(auth.options).not.toContain("LTI");
  });

  it("hideOption hides shipped option", () => {
    useFrameworkCustomizationStore.getState().hideOption("authenticationMethod", "SSO/SAML");
    const auth = getField("authenticationMethod");
    expect(auth.options).not.toContain("SSO/SAML");
  });

  it("renameOption renames shipped option", () => {
    useFrameworkCustomizationStore.getState().renameOption("authenticationMethod", "SSO/SAML", "SAML/SSO");
    const auth = getField("authenticationMethod");
    expect(auth.options).toContain("SAML/SSO");
    expect(auth.options).not.toContain("SSO/SAML");
  });

  it("setGradeOverride merges label + color", () => {
    useFrameworkCustomizationStore.getState().setGradeOverride("pass", { label: "Approved", color: "#00ff00" });
    const pass = getActiveFrameworkConfig().grades.find((g) => g.id === "pass")!;
    expect(pass.label).toBe("Approved");
    expect(pass.color).toBe("#00ff00");
  });

  it("resetGrades clears grade overrides", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.setGradeOverride("pass", { label: "Approved" });
    s.resetGrades();
    const pass = getActiveFrameworkConfig().grades.find((g) => g.id === "pass")!;
    expect(pass.label).toBe("Pass");
  });

  it("resetAll clears everything", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.setFieldOverride("pricing", { order: 99 });
    s.setGradeOverride("pass", { label: "OK" });
    s.resetAll();
    expect(s.hasOverrides()).toBe(false);
  });

  it("exportCustomization returns a clone", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { order: 99 });
    const exp = useFrameworkCustomizationStore.getState().exportCustomization();
    expect(exp.fieldOverrides["pricing"]).toEqual({ order: 99 });
    exp.fieldOverrides["pricing"] = { order: 0 };
    expect(useFrameworkCustomizationStore.getState().customization.fieldOverrides["pricing"]).toEqual({ order: 99 });
  });

  it("importCustomization applies valid data", () => {
    useFrameworkCustomizationStore.getState().importCustomization({
      fieldOverrides: { company: { label: "Vendor" } },
      gradeOverrides: {},
    });
    expect(getField("company").label).toBe("Vendor");
  });

  it("importCustomization throws on bad shape", () => {
    expect(() =>
      useFrameworkCustomizationStore.getState().importCustomization(42),
    ).toThrow("Customization must be an object");
  });

  it("getActiveFields count increases after addField", () => {
    const before = getActiveFields().length;
    useFrameworkCustomizationStore.getState().addField({
      id: "z-custom",
      storageKey: "zCustom",
      surface: "metadata",
      label: "Z",
      type: "text",
      order: 99,
      enabled: true,
    });
    expect(getActiveFields().length).toBe(before + 1);
  });

  it("store customization structure supports persistence", () => {
    const c = useFrameworkCustomizationStore.getState().customization;
    for (const key of ["fieldOverrides", "customFields", "extraOptions", "hiddenOptions", "renames", "gradeOverrides"] as const) {
      expect(c).toHaveProperty(key);
    }
  });
});
