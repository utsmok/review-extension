import trustFull from "@/data/rubrics/trust-full.json";
import type {
  Capture,
  Evaluation,
  EvaluationScore,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "@/lib/types";

export const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

export const RUBRIC = trustFull as unknown as RubricData;

export function makeMetadata(
  overrides?: Partial<SessionMetadata>,
): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "TestSearch",
    toolUrl: "https://testsearch.example.com",
    startTime: "2025-06-15T10:00:00.000Z",
    status: "started",
    ...overrides,
  };
}

export function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: crypto.randomUUID(),
    timestamp: "2025-06-15T10:01:00.000Z",
    sourceUrl: "https://testsearch.example.com/results?q=test",
    pageTitle: "Test Page",
    screenshotBase64: TINY_PNG,
    htmlContent: "<html><body>Test page</body></html>",
    notes: "",
    ...overrides,
  };
}

export function makeEvaluation(
  overrides?: Partial<Evaluation>,
): Evaluation {
  return {
    rubricId: "TR-1",
    score: "" as EvaluationScore,
    notes: "",
    explicitEvidenceIds: [],
    ...overrides,
  };
}

export function makeFinalization(
  overrides?: Partial<ReviewFinalization>,
): ReviewFinalization {
  return {
    conclusion: "Test conclusion",
    grade: "pass",
    strengths: ["Good"],
    weaknesses: ["Bad"],
    recommendations: "Improve",
    finalizedAt: "2025-06-15T12:00:00.000Z",
    ...overrides,
  };
}
