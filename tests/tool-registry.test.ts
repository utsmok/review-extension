import { describe, expect, it } from "vitest";
import { TOOL_REGISTRY } from "@/data/tools";

describe("TOOL_REGISTRY well-formedness", () => {
  it("every entry has name, url, and category", () => {
    for (const entry of TOOL_REGISTRY) {
      expect(entry.name).toBeTruthy();
      expect(entry.url).toMatch(/^https?:\/\//);
      expect(entry.category).toMatch(
        /^(academic_search|general_search|ai_assistant|database|other)$/,
      );
    }
  });

  it("review scores are in valid range and total is bounded by totalMax", () => {
    for (const entry of TOOL_REGISTRY) {
      if (!entry.review) continue;
      const r = entry.review;
      for (const val of Object.values(r.scores)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(3);
      }
      expect(r.total).toBeGreaterThanOrEqual(0);
      expect(r.total).toBeLessThanOrEqual(r.totalMax);
    }
  });

  it("all reviewed entries have a non-empty verdict or status nominated", () => {
    for (const entry of TOOL_REGISTRY) {
      if (!entry.review) continue;
      const r = entry.review;
      // Nominated entries have empty verdict and zero scores by convention
      if (r.status === "nominated") {
        expect(r.verdict).toBeFalsy();
        expect(r.total).toBe(0);
      } else {
        expect(r.verdict).toBeTruthy();
        expect(r.total).toBeGreaterThan(0);
      }
    }
  });
});
