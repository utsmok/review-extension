import { describe, expect, it } from "vitest";
import { GRADE_IDS, getActiveFrameworkConfig } from "@/lib/framework-config";
import { GRADE_COLORS, GRADE_LABELS } from "@/lib/report/compute-scores";

describe("grade definitions are config-driven", () => {
  it("every FinalizationGrade id has a config definition with color + label", () => {
    const byId = new Map(getActiveFrameworkConfig().grades.map((g) => [g.id, g]));
    for (const id of GRADE_IDS) {
      const g = byId.get(id);
      expect(g, `grade ${id}`).toBeTruthy();
      expect(g!.label).toBeTruthy();
      // color is a Tailwind class (e.g. "bg-ut-green"), not hex
      expect(g!.color).toBeTruthy();
      // reportColor is hex for exported reports
      expect(g!.reportColor).toMatch(/^#/);
      expect(g!.reportLabel).toBeTruthy();
    }
  });

  it("compute-scores grade maps agree with config", () => {
    for (const g of getActiveFrameworkConfig().grades) {
      expect(GRADE_COLORS()[g.id]).toBe(g.reportColor);
      expect(GRADE_LABELS()[g.id]).toBe(g.reportLabel);
    }
  });
});
