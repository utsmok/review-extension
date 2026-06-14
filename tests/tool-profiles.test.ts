import { describe, expect, it } from "vitest";
import { getSuggestedQueries } from "@/lib/test-queries";
import { detectToolProfile, TOOL_PROFILES } from "@/lib/tool-profiles";

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

  it("detects a CSV-only tool (ChatGPT) via registry hostnames", () => {
    const p = detectToolProfile("https://chat.openai.com");
    expect(p).not.toBeNull();
    expect(p!.category).toBe("ai_assistant");
  });

  it("detects Google Gemini via registry hostnames", () => {
    const p = detectToolProfile("https://gemini.google.com");
    expect(p).not.toBeNull();
    expect(p!.category).toBe("ai_assistant");
  });

  it("returns null for unknown tool", () => {
    expect(detectToolProfile("https://unknown-tool.com")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(detectToolProfile("not a url")).toBeNull();
  });
});

describe("TOOL_PROFILES derived from registry", () => {
  it("includes tools from both profiles and CSV-only sources", () => {
    const hostnames = TOOL_PROFILES.flatMap((p) => p.hostnames);
    // From original profiles
    expect(hostnames).toContain("semanticscholar.org");
    expect(hostnames).toContain("elicit.com");
    // From CSV-only entries (now in registry with hostnames)
    expect(hostnames).toContain("chat.openai.com");
    expect(hostnames).toContain("gemini.google.com");
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
