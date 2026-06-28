import { beforeEach, describe, expect, it } from "vitest";
import { getActiveFields } from "@/lib/field-schema";
import { getActiveBranding, getActiveGrades, getActivePrinciples } from "@/lib/framework-config";
import { applyPack, buildActivePack } from "@/lib/pack";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("framework pack import/export", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("buildActivePack returns a valid pack with expected shape", () => {
    const pack = buildActivePack();
    expect(pack.packId).toBeTruthy();
    expect(typeof pack.version).toBe("number");
    expect(pack.fields.length).toBeGreaterThan(0);
    expect(pack.grades.length).toBeGreaterThan(0);
    expect(pack.principles.length).toBeGreaterThan(0);
    expect(pack.rubric).toBeDefined();
    expect(pack.branding).toBeDefined();
    expect(pack.branding.frameworkName).toBeTruthy();
  });

  it("buildActivePack snapshots match the active accessors", () => {
    const pack = buildActivePack();
    expect(pack.fields).toEqual(getActiveFields());
    expect(pack.grades).toEqual(getActiveGrades());
    expect(pack.principles).toEqual(getActivePrinciples());
    expect(pack.branding).toEqual(getActiveBranding());
  });

  it("round-trip: buildActivePack → wipe → applyPack → buildActivePack equals original", () => {
    // Snapshot the original pack
    const originalPack = buildActivePack();

    // Apply the pack to a clean store
    applyPack(JSON.parse(JSON.stringify(originalPack)));

    // Snapshot again
    const afterPack = buildActivePack();

    // Fields should be structurally equal (deep equal)
    expect(afterPack.fields).toEqual(originalPack.fields);
    // Grades should be structurally equal
    expect(afterPack.grades).toEqual(originalPack.grades);
    // Principles should be structurally equal
    expect(afterPack.principles).toEqual(originalPack.principles);
    // Branding should be structurally equal
    expect(afterPack.branding).toEqual(originalPack.branding);
  });

  it("round-trip preserves rubric structure", () => {
    const originalPack = buildActivePack();
    const originalRubric = JSON.stringify(originalPack.rubric);

    applyPack(JSON.parse(JSON.stringify(originalPack)));
    const afterPack = buildActivePack();
    const afterRubric = JSON.stringify(afterPack.rubric);

    expect(afterRubric).toEqual(originalRubric);
  });

  it("round-trip works with customizations applied", () => {
    // Apply some customizations
    useFrameworkCustomizationStore
      .getState()
      .setFieldOverride("discipline", { label: "Subject Area" });
    useFrameworkCustomizationStore
      .getState()
      .setPrincipleOverride("TR", { fullName: "Transparency & Openness" });

    const customizedPack = buildActivePack();

    // Wipe and re-apply
    useFrameworkCustomizationStore.getState().resetAll();
    applyPack(JSON.parse(JSON.stringify(customizedPack)));
    const afterPack = buildActivePack();

    // The field label override should survive the round-trip
    const disciplineField = afterPack.fields.find((f) => f.id === "discipline");
    expect(disciplineField?.label).toBe("Subject Area");

    // The principle override should survive
    const trPrinciple = afterPack.principles.find((p) => p.id === "TR");
    expect(trPrinciple?.fullName).toBe("Transparency & Openness");
  });

  it("applyPack throws on malformed pack (missing packId)", () => {
    expect(() => applyPack({})).toThrow();
  });

  it("applyPack throws on malformed pack (fields is not array)", () => {
    expect(() =>
      applyPack({
        packId: "test",
        version: 1,
        fields: "not-array",
        rubric: {},
        principles: [],
        grades: [],
        branding: {},
      }),
    ).toThrow();
  });

  it("applyPack throws on malformed pack (missing rubric)", () => {
    expect(() =>
      applyPack({
        packId: "test",
        version: 1,
        fields: [],
        principles: [],
        grades: [],
        branding: {},
      }),
    ).toThrow();
  });
});
