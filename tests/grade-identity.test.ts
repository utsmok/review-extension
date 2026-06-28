import { beforeEach, describe, expect, it } from "vitest";
import { getActiveGrades, isValidGrade } from "@/lib/framework-config";
import { normalizeGrade } from "@/lib/grade-validation";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("grade identity data-layer", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("adds a custom grade id that becomes valid and selectable", () => {
    useFrameworkCustomizationStore.getState().addGrade({
      id: "pilot_recommended",
      label: "Pilot",
      description: "Try in a pilot",
      color: "bg-ut-blue",
      tint: "bg-blue-100",
      reportColor: "#3b82f6",
      reportLabel: "PILOT RECOMMENDED",
    });
    expect(getActiveGrades().map((g) => g.id)).toContain("pilot_recommended");
    expect(isValidGrade("pilot_recommended")).toBe(true);
  });

  it("removes a shipped grade id so it is no longer valid", () => {
    useFrameworkCustomizationStore.getState().removeGrade("out_of_scope");
    expect(isValidGrade("out_of_scope")).toBe(false);
    expect(getActiveGrades().find((g) => g.id === "out_of_scope")).toBeUndefined();
  });

  it("a stored grade that was removed reports invalid without throwing", () => {
    useFrameworkCustomizationStore.getState().removeGrade("fail");
    expect(isValidGrade("fail")).toBe(false);
  });

  it("normalizeGrade returns the id when valid, null when removed", () => {
    expect(normalizeGrade("pass")).toBe("pass");
    useFrameworkCustomizationStore.getState().removeGrade("pass");
    expect(normalizeGrade("pass")).toBeNull();
  });

  it("getActiveGrades applies text overrides on shipped grades", () => {
    useFrameworkCustomizationStore
      .getState()
      .setGradeOverride("pass", { label: "Approved", reportColor: "#00ff00" });
    const pass = getActiveGrades().find((g) => g.id === "pass");
    expect(pass?.label).toBe("Approved");
    expect(pass?.reportColor).toBe("#00ff00");
  });
});
