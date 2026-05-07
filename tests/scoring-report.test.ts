import { describe, expect, it } from "vitest";
import { buildHtmlReport } from "@/lib/html-report";
import trustFull from "@/data/rubrics/trust-full.json";
import type { Evaluation, RubricData, SessionMetadata } from "@/lib/types";

const RUBRIC = trustFull as unknown as RubricData;

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "TestTool",
    toolUrl: "https://example.com",
    startTime: "2025-06-15T10:00:00.000Z",
    status: "started",
    ...overrides,
  };
}

describe("buildHtmlReport completion tracking (I11)", () => {
  it("shows INCOMPLETE verdict when scoring questions are unanswered", async () => {
    // Only answer 1 out of many scoring questions
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "", explicitEvidenceIds: [] },
    ];
    const html = await buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC);
    expect(html).toContain("INCOMPLETE");
    expect(html).toContain("questions answered");
  });

  it("shows RECOMMENDED verdict when all questions are answered with high scores", async () => {
    // Answer all quality gate questions as pass
    const evaluations: Evaluation[] = [];
    for (const [cat, questions] of Object.entries(RUBRIC.quality_gate)) {
      for (const qId of Object.keys(questions)) {
        evaluations.push({
          rubricId: `${cat}.${qId}`,
          score: "pass",
          notes: "",
          explicitEvidenceIds: [],
        });
      }
    }
    // Answer all scoring rubric questions with score 3
    for (const [cat, questions] of Object.entries(RUBRIC.scoring_rubric)) {
      for (const qId of Object.keys(questions)) {
        evaluations.push({
          rubricId: `${cat}.${qId}`,
          score: 3,
          notes: "",
          explicitEvidenceIds: [],
        });
      }
    }
    const html = await buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC);
    expect(html).toContain("RECOMMENDED");
    // Should show completion info
    expect(html).toContain("Score");
  });

  it("shows NOT RECOMMENDED verdict when quality gate fails, even with all questions answered", async () => {
    const evaluations: Evaluation[] = [];
    for (const [cat, questions] of Object.entries(RUBRIC.quality_gate)) {
      for (const qId of Object.keys(questions)) {
        evaluations.push({
          rubricId: `${cat}.${qId}`,
          score: "fail",
          notes: "",
          explicitEvidenceIds: [],
        });
      }
    }
    for (const [cat, questions] of Object.entries(RUBRIC.scoring_rubric)) {
      for (const qId of Object.keys(questions)) {
        evaluations.push({
          rubricId: `${cat}.${qId}`,
          score: 3,
          notes: "",
          explicitEvidenceIds: [],
        });
      }
    }
    const html = await buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC);
    expect(html).toContain("NOT RECOMMENDED");
  });

  it("shows score among answered questions, not against total possible", async () => {
    // Answer 2 scoring questions with 3/3 each
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "", explicitEvidenceIds: [] },
      { rubricId: "RE.accuracy_and_hallucination", score: 3, notes: "", explicitEvidenceIds: [] },
    ];
    const html = await buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC);
    // Incomplete: shows answered/total in conclusion
    expect(html).toContain("2/14 questions answered");
    expect(html).toContain("INCOMPLETE");
  });

  it("uses finalized grade when finalization is provided, even if incomplete", async () => {
    const evaluations: Evaluation[] = [
      { rubricId: "TR.data_source_clarity", score: 3, notes: "", explicitEvidenceIds: [] },
    ];
    const finalization = {
      grade: "pass" as const,
      conclusion: "Looks good",
      strengths: [],
      weaknesses: [],
      recommendations: "",
      finalizedAt: "2025-06-01T12:00:00.000Z",
    };
    const html = await buildHtmlReport(makeMetadata(), [], evaluations, RUBRIC, finalization);
    // Finalized grade takes precedence
    expect(html).toContain("RECOMMENDED");
  });
});
