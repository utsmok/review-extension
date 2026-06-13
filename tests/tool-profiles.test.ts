import { describe, expect, it } from "vitest";
import { getSuggestedQueries } from "@/lib/test-queries";
import { detectToolProfile } from "@/lib/tool-profiles";

describe("detectToolProfile", () => {
  it("detects Semantic Scholar", () => {
    const p = detectToolProfile("https://www.semanticscholar.org/paper/xxx");
    expect(p).not.toBeNull();
    expect(p!.defaults.company).toBe("Allen Institute for AI");
  });

  it("detects Elicit", () => {
    const p = detectToolProfile("https://elicit.com/search");
    expect(p).not.toBeNull();
    expect(p!.defaults.company).toBe("Elicit");
  });

  it("returns null for unknown tool", () => {
    expect(detectToolProfile("https://unknown-tool.com")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(detectToolProfile("not a url")).toBeNull();
  });
});

describe("getSuggestedQueries", () => {
  it("returns queries for academic_search", () => {
    const queries = getSuggestedQueries("academic_search");
    expect(queries.length).toBe(6);
    expect(queries[0]).toHaveProperty("query");
    expect(queries[0]).toHaveProperty("purpose");
  });

  it("returns queries for ai_assistant", () => {
    const queries = getSuggestedQueries("ai_assistant");
    expect(queries.length).toBe(4);
  });

  it("returns queries for database (aliased to academic_search)", () => {
    const queries = getSuggestedQueries("database");
    expect(queries.length).toBe(6);
  });

  it("returns default queries for general_search", () => {
    const queries = getSuggestedQueries("general_search");
    expect(queries.length).toBe(4);
  });

  it("returns default queries for other", () => {
    const queries = getSuggestedQueries("other");
    expect(queries.length).toBe(4);
  });
});
