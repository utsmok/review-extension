import { describe, expect, it } from "vitest";
import { PRINCIPLES } from "@/lib/principles";

describe("PRINCIPLES", () => {
  it("has exactly 5 principles", () => {
    expect(PRINCIPLES).toHaveLength(5);
  });

  it("each principle has required fields", () => {
    for (const p of PRINCIPLES) {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("code");
      expect(p).toHaveProperty("color");
      expect(p).toHaveProperty("reportColor");
      expect(p).toHaveProperty("fullName");
      expect(p.id).toBe(p.code);
    }
  });

  it("contains expected principle codes in order", () => {
    const codes = PRINCIPLES.map((p) => p.code);
    expect(codes).toEqual(["TR", "RE", "US", "SE", "TC"]);
  });

  it("has distinct colors for each principle", () => {
    const colors = PRINCIPLES.map((p) => p.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("has distinct reportColors for each principle", () => {
    const reportColors = PRINCIPLES.map((p) => p.reportColor);
    expect(new Set(reportColors).size).toBe(reportColors.length);
  });

  it("colors are valid hex strings", () => {
    for (const p of PRINCIPLES) {
      expect(p.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(p.reportColor).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("has expected full names", () => {
    const names = PRINCIPLES.map((p) => p.fullName);
    expect(names).toEqual([
      "Transparency",
      "Reliability",
      "User-centric",
      "Soundness",
      "Traceability",
    ]);
  });
});
