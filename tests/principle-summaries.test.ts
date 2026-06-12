// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { generatePrincipleSummaries } from "@/lib/rubric";
import type { Evaluation, RubricData } from "@/lib/types";
import { useSessionStore } from "@/stores/session";
import { RUBRIC } from "./fixtures";

const TRUST_RUBRIC = RUBRIC as unknown as RubricData;

function makeEvaluation(overrides: Partial<Evaluation> & { rubricId: string }): Evaluation {
  return {
    score: "" as Evaluation["score"],
    notes: "",
    explicitEvidenceIds: [],
    ...overrides,
  };
}

describe("generatePrincipleSummaries", () => {
  it("returns 'No questions scored yet' for categories with no evaluations", () => {
    const summaries = generatePrincipleSummaries([], TRUST_RUBRIC);
    expect(summaries.length).toBeGreaterThan(0);
    for (const s of summaries) {
      expect(s.observations).toBe("No questions scored yet.");
    }
  });

  it("mentions strengths when all scores are 3", () => {
    const evals: Evaluation[] = [];
    const trQuestions = TRUST_RUBRIC.scoring_rubric.TR;
    if (trQuestions) {
      const keys = Object.keys(trQuestions);
      for (const qId of keys) {
        evals.push(makeEvaluation({ rubricId: `TR.${qId}`, score: 3, notes: "" }));
      }
    }
    const summaries = generatePrincipleSummaries(evals, TRUST_RUBRIC);
    const tr = summaries.find((s) => s.categoryId === "TR");
    expect(tr).toBeDefined();
    expect(tr!.observations).toContain("average score 3.0/3");
    expect(tr!.observations).toContain("Strengths");
  });

  it("mentions concerns when some scores are low", () => {
    const evals: Evaluation[] = [];
    const trQuestions = TRUST_RUBRIC.scoring_rubric.TR;
    if (trQuestions) {
      const keys = Object.keys(trQuestions);
      // First question gets 0, rest get 3
      evals.push(makeEvaluation({ rubricId: `TR.${keys[0]}`, score: 0, notes: "bad" }));
      for (let i = 1; i < keys.length; i++) {
        evals.push(makeEvaluation({ rubricId: `TR.${keys[i]}`, score: 3, notes: "" }));
      }
    }
    const summaries = generatePrincipleSummaries(evals, TRUST_RUBRIC);
    const tr = summaries.find((s) => s.categoryId === "TR");
    expect(tr).toBeDefined();
    expect(tr!.observations).toContain("Concerns");
    expect(tr!.observations).toContain("Reviewer notes");
  });

  it("filters ai_only questions when usesAi is false", () => {
    const summaries = generatePrincipleSummaries([], TRUST_RUBRIC, false);
    // Should still return categories but with "No questions scored yet"
    expect(summaries.length).toBeGreaterThan(0);
  });
});

describe("setPrincipleSummary store action", () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it("creates a new summary entry", () => {
    const { setPrincipleSummary } = useSessionStore.getState();
    setPrincipleSummary("TR", { categoryId: "TR", observations: "Test observation" });
    const { principleSummaries } = useSessionStore.getState();
    expect(principleSummaries).toHaveLength(1);
    expect(principleSummaries[0].categoryId).toBe("TR");
    expect(principleSummaries[0].observations).toBe("Test observation");
  });

  it("updates existing summary by categoryId", () => {
    const { setPrincipleSummary } = useSessionStore.getState();
    setPrincipleSummary("TR", { categoryId: "TR", observations: "First" });
    setPrincipleSummary("TR", { customObservations: "My custom text" });
    const { principleSummaries } = useSessionStore.getState();
    expect(principleSummaries).toHaveLength(1);
    expect(principleSummaries[0].observations).toBe("First");
    expect(principleSummaries[0].customObservations).toBe("My custom text");
  });

  it("handles multiple categories independently", () => {
    const { setPrincipleSummary } = useSessionStore.getState();
    setPrincipleSummary("TR", { categoryId: "TR", observations: "TR obs" });
    setPrincipleSummary("RE", { categoryId: "RE", observations: "RE obs" });
    const { principleSummaries } = useSessionStore.getState();
    expect(principleSummaries).toHaveLength(2);
    expect(principleSummaries.find((p) => p.categoryId === "TR")?.observations).toBe("TR obs");
    expect(principleSummaries.find((p) => p.categoryId === "RE")?.observations).toBe("RE obs");
  });

  it("clears resets principleSummaries to empty", () => {
    const { setPrincipleSummary } = useSessionStore.getState();
    setPrincipleSummary("TR", { categoryId: "TR", observations: "Test" });
    useSessionStore.getState().clear();
    expect(useSessionStore.getState().principleSummaries).toEqual([]);
  });
});
