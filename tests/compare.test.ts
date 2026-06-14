import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock IndexedDB repository
const mockStore = new Map<string, unknown>();

vi.mock("@/lib/session-repository", () => ({
  getRepository: () => ({
    load: (id: string) => Promise.resolve(mockStore.get(id) ?? null),
    save: vi.fn(),
    delete: vi.fn(),
    isAvailable: () => Promise.resolve(true),
  }),
}));

import { buildSessionComparison } from "@/lib/session-lifecycle";
import type { ComparisonEntry, SessionData } from "@/lib/types";
import { makeEvaluation, makeFinalization, makeMetadata } from "@/tests/fixtures";

function makeSessionData(overrides?: Partial<SessionData>): SessionData {
  return {
    metadata: makeMetadata(),
    captures: [],
    evaluations: [],
    finalization: null,
    schemaVersion: 2,
    ...overrides,
  };
}

describe("buildSessionComparison", () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it("returns entries with correct principleAverages and totals for 2 sessions", async () => {
    const meta1 = makeMetadata({ toolName: "ToolA" });
    const meta2 = makeMetadata({ toolName: "ToolB" });
    const evals1 = [
      makeEvaluation({ rubricId: "TR.data_source_clarity", score: 3 }),
      makeEvaluation({ rubricId: "TR.methodology_disclosure", score: 2 }),
      makeEvaluation({ rubricId: "RE.accuracy_and_hallucination", score: 1 }),
    ];
    const evals2 = [
      makeEvaluation({ rubricId: "TR.data_source_clarity", score: 1 }),
      makeEvaluation({ rubricId: "TR.methodology_disclosure", score: 0 }),
      makeEvaluation({ rubricId: "RE.accuracy_and_hallucination", score: 3 }),
    ];
    const fin1 = makeFinalization({
      conclusion: "Great tool",
      strengths: ["Fast", "Accurate"],
      weaknesses: ["Expensive"],
    });
    const fin2 = makeFinalization({
      conclusion: "Decent tool",
      strengths: ["Cheap"],
      weaknesses: ["Slow"],
    });
    mockStore.set(
      meta1.id,
      makeSessionData({ metadata: meta1, evaluations: evals1, finalization: fin1 }),
    );
    mockStore.set(
      meta2.id,
      makeSessionData({ metadata: meta2, evaluations: evals2, finalization: fin2 }),
    );

    const result = await buildSessionComparison([meta1.id, meta2.id]);

    expect(result).toHaveLength(2);

    // ToolA: TR avg = (3+2)/2 = 2.5, RE avg = 1/1 = 1.0
    const entryA = result.find((e) => e.toolName === "ToolA")!;
    expect(entryA.toolName).toBe("ToolA");
    expect(entryA.conclusion).toBe("Great tool");
    expect(entryA.strengths).toEqual(["Fast", "Accurate"]);
    expect(entryA.weaknesses).toEqual(["Expensive"]);
    expect(entryA.principleAverages.TR).toBeCloseTo(2.5);
    expect(entryA.principleAverages.RE).toBeCloseTo(1.0);
    expect(entryA.total[0]).toBeGreaterThan(0);
    expect(entryA.total[1]).toBeGreaterThan(0);

    // ToolB: TR avg = (1+0)/2 = 0.5, RE avg = 3/1 = 3.0
    const entryB = result.find((e) => e.toolName === "ToolB")!;
    expect(entryB.conclusion).toBe("Decent tool");
    expect(entryB.strengths).toEqual(["Cheap"]);
    expect(entryB.weaknesses).toEqual(["Slow"]);
    expect(entryB.principleAverages.TR).toBeCloseTo(0.5);
    expect(entryB.principleAverages.RE).toBeCloseTo(3.0);
  });

  it("yields null averages and [0,0,0] total for sessions with no evaluations", async () => {
    const meta = makeMetadata({ toolName: "EmptyTool" });
    mockStore.set(
      meta.id,
      makeSessionData({ metadata: meta, evaluations: [], finalization: null }),
    );

    const result = await buildSessionComparison([meta.id]);

    expect(result).toHaveLength(1);
    const entry = result[0]!;
    expect(entry.principleAverages.TR).toBeNull();
    expect(entry.principleAverages.RE).toBeNull();
    expect(entry.principleAverages.US).toBeNull();
    expect(entry.principleAverages.SE).toBeNull();
    expect(entry.principleAverages.TC).toBeNull();
    expect(entry.total).toEqual([0, 0, 0]);
  });

  it("skips sessions not found in storage", async () => {
    const meta = makeMetadata({ toolName: "Existing" });
    mockStore.set(
      meta.id,
      makeSessionData({
        metadata: meta,
        evaluations: [makeEvaluation({ rubricId: "TR-1", score: 2 })],
        finalization: null,
      }),
    );

    const result = await buildSessionComparison([meta.id, "nonexistent-id"]);

    expect(result).toHaveLength(1);
    expect(result[0]!.toolName).toBe("Existing");
  });
});

describe("bestValue helper", () => {
  function computeBestValues(entries: ComparisonEntry[]): Record<string, number> {
    const best: Record<string, number> = {};
    for (const e of entries) {
      if (e.total[0] > (best.total ?? 0)) best.total = e.total[0];
      for (const [key, val] of Object.entries(e.principleAverages)) {
        if (val !== null && val > (best[key] ?? 0)) best[key] = val;
      }
    }
    return best;
  }

  it("computes highest total and per-principle averages across entries", () => {
    const entries: ComparisonEntry[] = [
      {
        toolName: "A",
        conclusion: "",
        strengths: [],
        weaknesses: [],
        principleAverages: { TR: 2.5, RE: 1.0, US: null, SE: 2.0, TC: 0.5 },
        total: [10, 15, 10 / 15],
      },
      {
        toolName: "B",
        conclusion: "",
        strengths: [],
        weaknesses: [],
        principleAverages: { TR: 0.5, RE: 3.0, US: 2.5, SE: null, TC: 1.5 },
        total: [12, 15, 12 / 15],
      },
    ];

    const best = computeBestValues(entries);

    expect(best.total).toBe(12);
    expect(best.TR).toBeCloseTo(2.5);
    expect(best.RE).toBeCloseTo(3.0);
    expect(best.US).toBeCloseTo(2.5);
    expect(best.SE).toBeCloseTo(2.0);
    expect(best.TC).toBeCloseTo(1.5);
  });
});
