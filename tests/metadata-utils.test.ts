import { describe, expect, it } from "vitest";
import { ensureArray } from "@/lib/metadata-utils";

// Characterization tests for the import-coercion helper called by html-report on
// legacy exports that may store array fields as plain strings. A bug here would
// silently corrupt imported metadata.
describe("ensureArray", () => {
  it("returns [] for undefined", () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it("returns the array as-is", () => {
    expect(ensureArray(["PubMed", "arXiv"])).toEqual(["PubMed", "arXiv"]);
    expect(ensureArray([])).toEqual([]);
  });

  it("wraps a non-empty string as a single-element array", () => {
    expect(ensureArray("PubMed")).toEqual(["PubMed"]);
  });

  it("returns [] for an empty string", () => {
    expect(ensureArray("")).toEqual([]);
  });
});
