import { describe, expect, it, vi } from "vitest";
import { buildReportModel } from "@/lib/report-model";
import type {
  Capture,
  Evaluation,
  FinalizationGrade,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "@/lib/types";

// ── Minimal rubric fixture ──────────────────────────────────────────────

const minimalRubric: RubricData = {
  framework_name: "TRUST Test",
  version: "0.1",
  scoring_rubric: {
    TR: {
      q1: {
        title: "Transparency Q1",
        "0": "No transparency",
        "1": "Minimal transparency",
        "2": "Moderate transparency",
        "3": "Full transparency",
      },
      q2_ai: {
        title: "AI Disclosure",
        "0": "No disclosure",
        "1": "Minimal disclosure",
        "2": "Moderate disclosure",
        "3": "Full disclosure",
        ai_only: true,
      },
    },
  },
  quality_gate: {
    TR: {
      qg1: {
        type: "pass_fail",
        title: "Gate: AI Usage Disclosure",
        requirement: "Tool must disclose AI usage",
      },
      qg2_ai: {
        type: "pass_fail",
        title: "Gate: AI Model Transparency",
        requirement: "AI model must be identified",
        ai_only: true,
      },
    },
  },
};

// ── Mock PRINCIPLES to match minimal rubric ─────────────────────────────

vi.mock("@/lib/principles", () => ({
  PRINCIPLES: [{ id: "TR", code: "TR", fullName: "Transparency", reportColor: "#2563eb" }],
}));

// ── Helpers ─────────────────────────────────────────────────────────────

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: "sess-1",
    toolName: "TestTool",
    toolUrl: "https://test.example.com",
    startTime: "2025-06-15T10:00:00.000Z",
    status: "in-progress",
    usesAi: true,
    ...overrides,
  };
}

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: "cap-1",
    timestamp: "2025-06-15T10:01:00.000Z",
    sourceUrl: "https://test.example.com/page",
    pageTitle: "Test Page",
    screenshotBase64: "data:image/png;base64,abc",
    htmlContent: "<html></html>",
    notes: "",
    ...overrides,
  };
}

function makeEvaluation(overrides?: Partial<Evaluation>): Evaluation {
  return {
    rubricId: "TR.q1",
    score: "",
    notes: "",
    explicitEvidenceIds: [],
    ...overrides,
  };
}

function makeFinalization(overrides?: Partial<ReviewFinalization>): ReviewFinalization {
  return {
    grade: "pass" as FinalizationGrade,
    conclusion: "Test conclusion",
    strengths: ["Good"],
    weaknesses: ["Bad"],
    recommendations: "Improve",
    finalizedAt: "2025-06-15T12:00:00.000Z",
    ...overrides,
  };
}

function build(opts?: {
  metadata?: Partial<SessionMetadata>;
  captures?: Capture[];
  evaluations?: Evaluation[];
  rubric?: RubricData;
  finalization?: ReviewFinalization | null;
  compressedScreenshots?: Map<string, string>;
}) {
  return buildReportModel(
    makeMetadata(opts?.metadata),
    opts?.captures ?? [],
    opts?.evaluations ?? [],
    opts?.rubric ?? minimalRubric,
    opts?.finalization === undefined ? null : opts.finalization,
    opts?.compressedScreenshots ?? new Map(),
  );
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("buildReportModel", () => {
  it("returns correct metadata", () => {
    const meta = makeMetadata({ toolName: "MyTool" });
    const model = buildReportModel(meta, [], [], minimalRubric, null, new Map());
    expect(model.metadata).toBe(meta);
    expect(model.metadata.toolName).toBe("MyTool");
  });

  it("builds principle scores from evaluations with numeric score", () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: 2 })],
    });
    expect(model.principleScores).toHaveLength(1);
    const tr = model.principleScores[0]!;
    expect(tr.id).toBe("TR");
    expect(tr.fullName).toBe("Transparency");
    expect(tr.questions).toHaveLength(2); // q1 + q2_ai (usesAi=true)
    const q1 = tr.questions.find((q) => q.rubricId === "TR.q1")!;
    expect(q1.score).toBe(2);
    expect(q1.isNa).toBe(false);
    expect(q1.isUnsure).toBe(false);
    expect(q1.code).toBe("TR1");
    expect(q1.levelDescription).toBe("Moderate transparency");
    expect(q1.notes).toBe("");
  });

  it('handles "na" score', () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: "na" })],
    });
    const q1 = model.principleScores[0]?.questions[0];
    expect(q1.isNa).toBe(true);
    expect(q1.levelDescription).toBe("Not applicable");
    expect(q1.score).toBe(-1);
  });

  it('handles "unsure" score', () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: "unsure" })],
    });
    const q1 = model.principleScores[0]?.questions[0];
    expect(q1.isUnsure).toBe(true);
    expect(q1.levelDescription).toBe("Insufficient information");
  });

  it("uses custom reasoning as level description", () => {
    const model = build({
      evaluations: [
        makeEvaluation({
          rubricId: "TR.q1",
          score: 3,
          customScore: { score: 3, reasoning: "Custom explanation" },
        }),
      ],
    });
    const q1 = model.principleScores[0]?.questions[0];
    expect(q1?.levelDescription).toBe("Custom explanation");
    expect(q1?.customReasoning).toBe("Custom explanation");
  });

  it("computes evidence count per principle", () => {
    const model = build({
      evaluations: [
        makeEvaluation({ rubricId: "TR.q1", explicitEvidenceIds: ["cap-1", "cap-2"] }),
        makeEvaluation({ rubricId: "TR.q2_ai", explicitEvidenceIds: ["cap-1", "cap-3"] }),
      ],
    });
    // cap-1, cap-2, cap-3 → 3 unique
    expect(model.principleScores[0]?.evidenceCount).toBe(3);
  });

  it("builds quality gate rows with pass result", () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.qg1", score: "pass", notes: "All good" })],
    });
    const qg1 = model.qualityGateRows.find((r) => r.rubricId === "TR.qg1")!;
    expect(qg1).toBeDefined();
    expect(qg1.result).toBe("pass");
    expect(qg1.label).toBe("PASS");
    expect(qg1.color).toBe("#3d7249");
    expect(qg1.requirement).toBe("Tool must disclose AI usage");
    expect(qg1.notes).toBe("All good");
  });

  it("builds quality gate rows with fail result", () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.qg1", score: "fail" })],
    });
    const qg1 = model.qualityGateRows.find((r) => r.rubricId === "TR.qg1")!;
    expect(qg1.result).toBe("fail");
    expect(qg1.label).toBe("FAIL");
    expect(qg1.color).toBe("#c60c30");
  });

  it("handles null quality gate result when no evaluation exists", () => {
    const model = build({ evaluations: [] });
    const qg1 = model.qualityGateRows.find((r) => r.rubricId === "TR.qg1")!;
    expect(qg1.result).toBeNull();
    expect(qg1.label).toBe("—");
    expect(qg1.color).toBe("#6b7f94");
  });

  it("builds capture info with correct fields", () => {
    const cap = makeCapture({
      id: "cap-99",
      pageTitle: "My Page",
      notes: "Some notes",
      annotatedScreenshotBase64: "data:image/png;base64,annotated",
    });
    const compressed = new Map([["cap-99", "compressed-data"]]);
    const model = build({ captures: [cap], compressedScreenshots: compressed });

    expect(model.captures).toHaveLength(1);
    const info = model.captures[0]!;
    expect(info.id).toBe("cap-99");
    expect(info.pageTitle).toBe("My Page");
    expect(info.notes).toBe("Some notes");
    expect(info.compressedScreenshot).toBe("compressed-data");
    expect(info.screenshotBase64).toBe("data:image/png;base64,abc");
    expect(info.annotatedScreenshotBase64).toBe("data:image/png;base64,annotated");
  });

  it("falls back to screenshotBase64 when no compressed version", () => {
    const cap = makeCapture();
    const model = build({ captures: [cap], compressedScreenshots: new Map() });
    expect(model.captures[0]?.compressedScreenshot).toBe(cap.screenshotBase64);
  });

  it("tracks linked capture IDs from evaluations", () => {
    const model = build({
      evaluations: [
        makeEvaluation({ rubricId: "TR.q1", explicitEvidenceIds: ["cap-1", "cap-2"] }),
        makeEvaluation({ rubricId: "TR.q2_ai", explicitEvidenceIds: ["cap-1", "cap-3"] }),
      ],
    });
    expect(model.linkedCaptureIds.has("cap-1")).toBe(true);
    expect(model.linkedCaptureIds.has("cap-2")).toBe(true);
    expect(model.linkedCaptureIds.has("cap-3")).toBe(true);
    expect(model.linkedCaptureIds.has("cap-999")).toBe(false);
    expect(model.linkedCaptureIds.size).toBe(3);
  });

  it("builds finalization section when provided", () => {
    const fin = makeFinalization({
      grade: "conditional",
      conclusion: "Mixed results",
      strengths: ["Good UX"],
      weaknesses: ["Poor docs"],
      recommendations: "Add docs",
    });
    const model = build({ finalization: fin });

    expect(model.finalization).not.toBeNull();
    expect(model.finalization?.grade).toBe("conditional");
    expect(model.finalization?.conclusion).toBe("Mixed results");
    expect(model.finalization?.strengths).toEqual(["Good UX"]);
    expect(model.finalization?.weaknesses).toEqual(["Poor docs"]);
    expect(model.finalization?.recommendations).toBe("Add docs");
    expect(model.finalization?.finalizedAt).toBe("2025-06-15T12:00:00.000Z");
  });

  it("handles null finalization", () => {
    const model = build({ finalization: null });
    expect(model.finalization).toBeNull();
  });

  it("filters ai_only questions when usesAi is false", () => {
    const model = build({
      metadata: { usesAi: false },
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: 2 })],
    });
    expect(model.usesAi).toBe(false);
    // q2_ai and qg2_ai should be filtered out
    const tr = model.principleScores[0]!;
    expect(tr.questions).toHaveLength(1);
    expect(tr.questions[0]?.rubricId).toBe("TR.q1");

    const aiQg = model.qualityGateRows.find((r) => r.rubricId === "TR.qg2_ai");
    expect(aiQg).toBeUndefined();
  });

  it("includes ai_only questions when usesAi is true", () => {
    const model = build({
      metadata: { usesAi: true },
    });
    const tr = model.principleScores[0]!;
    expect(tr.questions).toHaveLength(2);
    expect(model.qualityGateRows).toHaveLength(2);
  });

  it("builds empty session with no captures, evaluations, or finalization", () => {
    const model = build({ captures: [], evaluations: [], finalization: null });

    expect(model.captures).toHaveLength(0);
    expect(model.principleScores).toHaveLength(1); // TR principle still present
    expect(model.principleScores[0]?.questions).toHaveLength(2);
    expect(model.principleScores[0]?.evidenceCount).toBe(0);
    expect(model.principleScores[0]?.total).toBe(0);
    expect(model.principleScores[0]?.avg).toBe("—");
    expect(model.qualityGateRows).toHaveLength(2);
    expect(model.finalization).toBeNull();
    expect(model.linkedCaptureIds.size).toBe(0);
    expect(model.evalMap.size).toBe(0);
  });

  it("stores rubric and evalMap on the model", () => {
    const evals = [makeEvaluation({ rubricId: "TR.q1", score: 3 })];
    const model = build({ evaluations: evals });

    expect(model.rubric).toBe(minimalRubric);
    expect(model.evalMap.get("TR.q1")).toBeDefined();
    expect(model.evalMap.get("TR.q1")?.score).toBe(3);
  });

  it("computes principle total and max from numeric scores", () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: 2 })],
    });
    const tr = model.principleScores[0]!;
    // Only q1 scored (q2_ai unscored); catScores filtered to visible
    expect(typeof tr.total).toBe("number");
    expect(typeof tr.max).toBe("number");
    expect(tr.max).toBeGreaterThanOrEqual(tr.total);
  });

  it("includes verdict from scores", () => {
    const model = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: 3 })],
      finalization: makeFinalization({ grade: "pass" }),
    });
    expect(model.verdict).toHaveProperty("label");
    expect(model.verdict).toHaveProperty("color");
    expect(typeof model.verdict.label).toBe("string");
    expect(typeof model.verdict.color).toBe("string");
  });

  it("defaults usesAi to true when metadata.usesAi is undefined", () => {
    const model = build({ metadata: { usesAi: undefined } });
    expect(model.usesAi).toBe(true);
  });

  it("marks score 0–1 as weak evidence", () => {
    const modelWeak = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: 0 })],
    });
    expect(modelWeak.principleScores[0]?.questions[0]?.isWeakEvidence).toBe(true);

    const modelStrong = build({
      evaluations: [makeEvaluation({ rubricId: "TR.q1", score: 2 })],
    });
    expect(modelStrong.principleScores[0]?.questions[0]?.isWeakEvidence).toBe(false);
  });

  it("preserves evaluation notes on quality gate rows", () => {
    const model = build({
      evaluations: [
        makeEvaluation({ rubricId: "TR.qg1", score: "fail", notes: "Missing disclosure" }),
      ],
    });
    const qg1 = model.qualityGateRows.find((r) => r.rubricId === "TR.qg1")!;
    expect(qg1.notes).toBe("Missing disclosure");
  });

  it("passes background and examples through from rubric when present", () => {
    const rubricWithExtras: RubricData = {
      framework_name: "TRUST Test",
      version: "0.1",
      scoring_rubric: {
        TR: {
          q1: {
            title: "Q1",
            "0": "None",
            "1": "Low",
            "2": "Mid",
            "3": "High",
            background: "Some background text",
            examples: { "0": "ex0", "1": "ex1", "2": "ex2", "3": "ex3" },
          },
        },
      },
      quality_gate: {
        TR: {
          qg1: {
            type: "pass_fail",
            title: "Gate 1",
            requirement: "Req",
            background: "Gate background",
            examples: { pass: "good", fail: "bad" },
          },
        },
      },
    };
    const model = build({ rubric: rubricWithExtras });

    const q1 = model.principleScores[0]?.questions[0];
    expect(q1?.background).toBe("Some background text");
    expect(q1?.examples).toEqual({ "0": "ex0", "1": "ex1", "2": "ex2", "3": "ex3" });

    const qg1 = model.qualityGateRows.find((r) => r.rubricId === "TR.qg1")!;
    expect(qg1.background).toBe("Gate background");
    expect(qg1.examples).toEqual({ pass: "good", fail: "bad" });
  });
});
