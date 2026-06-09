import { describe, expect, it } from "vitest";
import type { ProgressState } from "@/lib/evaluation-state";
import { getProgressState } from "@/lib/evaluation-state";

describe("getProgressState", () => {
  it('returns "empty" when nothing is filled', () => {
    expect(getProgressState(false, false, false)).toBe<ProgressState>("empty");
  });

  it('returns "empty" when manualDone is false', () => {
    expect(getProgressState(false, false, false, false)).toBe("empty");
  });

  it('returns "partial" when only score is present', () => {
    expect(getProgressState(true, false, false)).toBe("partial");
  });

  it('returns "partial" when only evidence is present', () => {
    expect(getProgressState(false, true, false)).toBe("partial");
  });

  it('returns "partial" when only notes are present', () => {
    expect(getProgressState(false, false, true)).toBe("partial");
  });

  it('returns "partial" when only evidence and notes are present', () => {
    expect(getProgressState(false, true, true)).toBe("partial");
  });

  it('returns "complete" when score and evidence are present', () => {
    expect(getProgressState(true, true, false)).toBe("complete");
  });

  it('returns "complete" when score and notes are present', () => {
    expect(getProgressState(true, false, true)).toBe("complete");
  });

  it('returns "complete" when score, evidence, and notes are all present', () => {
    expect(getProgressState(true, true, true)).toBe("complete");
  });

  // manualDone override
  it('returns "complete" when manualDone is true even with no data', () => {
    expect(getProgressState(false, false, false, true)).toBe("complete");
  });

  it('returns "complete" when manualDone overrides empty state', () => {
    expect(getProgressState(false, false, false, true)).toBe("complete");
  });

  it('returns "complete" when manualDone overrides partial state', () => {
    expect(getProgressState(true, false, false, true)).toBe("complete");
  });

  it('returns "complete" when manualDone is true regardless of other flags', () => {
    expect(getProgressState(true, true, true, true)).toBe("complete");
  });

  it('returns "empty" when manualDone is undefined and nothing else', () => {
    expect(getProgressState(false, false, false, undefined)).toBe("empty");
  });
});
