import { describe, expect, it } from "vitest";
import { computeReorder } from "@/components/edit-mode/sortable-helpers";

describe("computeReorder", () => {
  it("moves a middle element to the first position", () => {
    expect(computeReorder(["a", "b", "c", "d"], "c", "a")).toEqual(["c", "a", "b", "d"]);
  });

  it("moves the first element to the last position", () => {
    expect(computeReorder(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
  });

  it("moves the last element to a middle position", () => {
    expect(computeReorder(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("returns a copy unchanged when source === target", () => {
    const original = ["a", "b", "c"];
    const result = computeReorder(original, "b", "b");
    expect(result).toEqual(original);
    expect(result).not.toBe(original);
  });

  it("returns a copy unchanged when source id is not found", () => {
    const original = ["a", "b", "c"];
    const result = computeReorder(original, "z", "a");
    expect(result).toEqual(original);
    expect(result).not.toBe(original);
  });

  it("returns a copy unchanged when target id is not found", () => {
    const original = ["a", "b", "c"];
    const result = computeReorder(original, "a", "z");
    expect(result).toEqual(original);
    expect(result).not.toBe(original);
  });

  it("does not mutate the input array", () => {
    const original = ["a", "b", "c"];
    const copy = [...original];
    computeReorder(original, "a", "c");
    expect(original).toEqual(copy);
  });

  it("handles a single-element list (noop)", () => {
    expect(computeReorder(["x"], "x", "x")).toEqual(["x"]);
  });

  it("handles a two-element swap", () => {
    expect(computeReorder(["a", "b"], "b", "a")).toEqual(["b", "a"]);
  });

  it("handles numeric ids", () => {
    expect(computeReorder([1, 2, 3, 4], 3, 1)).toEqual([3, 1, 2, 4]);
  });
});
