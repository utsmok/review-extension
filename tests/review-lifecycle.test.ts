import { describe, it, expect } from "vitest";
import { RUBRIC, makeMetadata, makeCapture, makeEvaluation, makeFinalization } from "./fixtures";
import { computeReportScores } from "@/lib/report/compute-scores";
import { exportSession, importSessionFromZip } from "@/lib/export";
import type { Capture, Evaluation, ReviewFinalization, SessionMetadata } from "@/lib/types";

// Helper: unzip to file map
async function unzipToFiles(blob: Blob): Promise<Map<string, string | Uint8Array>> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const files = new Map<string, string | Uint8Array>();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (
      path.endsWith(".csv") ||
      path.endsWith(".html") ||
      path.endsWith(".json") ||
      path.endsWith(".css")
    ) {
      files.set(path, await entry.async("string"));
    } else {
      files.set(path, await entry.async("uint8array"));
    }
  }
  return files;
}

describe("review lifecycle", () => {
  // 1. Create session metadata
  const metadata: SessionMetadata = makeMetadata({ toolName: "LifeCycleTest" });

  // 2. Add captures
  const capture1 = makeCapture({ notes: "Privacy policy screenshot" });
  const capture2 = makeCapture({ notes: "Data sources page" });
  const captures: Capture[] = [capture1, capture2];

  // 3. Score quality gates (all non-ai_only gates)
  const qgEvaluations: Evaluation[] = [
    // quality_gate: privacy_and_security.data_privacy, intellectual_property.ip_preservation, accessibility.compliance
    makeEvaluation({
      rubricId: "privacy_and_security.data_privacy",
      score: "pass",
      notes: "Privacy policy is clear",
    }),
    makeEvaluation({
      rubricId: "privacy_and_security.training_policy",
      score: "na",
      notes: "Non-AI tool",
    }),
    makeEvaluation({
      rubricId: "intellectual_property.ip_preservation",
      score: "pass",
      notes: "IP preserved",
    }),
    makeEvaluation({
      rubricId: "accessibility.compliance",
      score: "pass",
      notes: "WCAG 2.1 AA",
    }),
  ];

  // Score scoring questions across all 5 principles
  const scoringEvaluations: Evaluation[] = [
    // TR (Transparency)
    makeEvaluation({
      rubricId: "TR.data_source_clarity",
      score: 3,
      notes: "Sources clearly listed",
      explicitEvidenceIds: [capture2.id],
    }),
    makeEvaluation({
      rubricId: "TR.methodology_disclosure",
      score: 2,
      notes: "Partial methodology",
    }),
    // RE (Reliability)
    makeEvaluation({
      rubricId: "RE.accuracy_and_hallucination",
      score: 2,
      notes: "Some hallucinations",
    }),
    makeEvaluation({
      rubricId: "RE.variance_consistency",
      score: 3,
      notes: "Very consistent",
    }),
    // US (Usability)
    makeEvaluation({
      rubricId: "US.workflow_integration",
      score: 3,
      notes: "Excellent integration",
      explicitEvidenceIds: [capture1.id],
    }),
    makeEvaluation({
      rubricId: "US.cognitive_guardrails",
      score: 2,
      notes: "Some prompts",
    }),
    // SE (Soundness)
    makeEvaluation({
      rubricId: "SE.algorithmic_fairness",
      score: 2,
      notes: "Decent diversity",
    }),
    makeEvaluation({
      rubricId: "SE.data_handling",
      score: 3,
      notes: "Good data practices",
    }),
    // TC (Traceability)
    makeEvaluation({
      rubricId: "TC.source_attribution_depth",
      score: 3,
      notes: "Deep attribution",
    }),
    makeEvaluation({
      rubricId: "TC.bibliometric_credibility",
      score: 2,
      notes: "Reasonable indicators",
    }),
  ];

  const evaluations: Evaluation[] = [...qgEvaluations, ...scoringEvaluations];

  // 5. Finalize
  const finalization: ReviewFinalization = makeFinalization({
    grade: "pass",
    conclusion: "Tool meets trust criteria",
    strengths: ["Transparent data sources", "Good accessibility"],
    weaknesses: ["Some hallucination risk"],
    recommendations: "Monitor AI accuracy improvements",
  });

  it("computes scores correctly for a fully-evaluated session", () => {
    const usesAi = true;
    const scores = computeReportScores(evaluations, RUBRIC, finalization, undefined, usesAi);

    // All quality gates answered (4)
    expect(scores.totalQGQuestions).toBe(4);
    expect(scores.answeredQGQuestions).toBe(4);

    // All scoring questions answered (10)
    expect(scores.totalScoringQuestions).toBe(10);
    expect(scores.answeredScoringQuestions).toBe(10);

    // Total
    expect(scores.totalQuestions).toBe(14);
    expect(scores.answeredQuestions).toBe(14);
    expect(scores.isComplete).toBe(true);

    // Scores: 3+2+2+3+3+2+2+3+3+2 = 25, max = 30
    expect(scores.totalActual).toBe(25);
    expect(scores.totalMax).toBe(30);
    expect(scores.ratio).toBeCloseTo(25 / 30);

    // No failed gates (3 pass + 1 na), all visible passed
    expect(scores.anyFail).toBe(false);

    // No principle average < 1.0
    // TR: (3+2)/2=2.5, RE: (2+3)/2=2.5, US: (3+2)/2=2.5, SE: (2+3)/2=2.5, TC: (3+2)/2=2.5
    expect(scores.principleFail).toBe(false);

    // Verdict from finalization
    expect(scores.verdict).toBe("RECOMMENDED");
    expect(scores.verdictColor).toBe("#3d7249");

    // Category scores present
    expect(scores.catScores.size).toBe(5);
    expect(scores.catScores.get("TR")).toEqual([3, 2]);
    expect(scores.catScores.get("RE")).toEqual([2, 3]);
    expect(scores.catScores.get("US")).toEqual([3, 2]);
    expect(scores.catScores.get("SE")).toEqual([2, 3]);
    expect(scores.catScores.get("TC")).toEqual([3, 2]);
  });

  it("marks session incomplete when evaluations are missing", () => {
    // Only answer one scoring question and one gate
    const partial: Evaluation[] = [
      makeEvaluation({ rubricId: "privacy_and_security.data_privacy", score: "pass" }),
      makeEvaluation({ rubricId: "TR.data_source_clarity", score: 2 }),
    ];
    const scores = computeReportScores(partial, RUBRIC, null, undefined, true);

    expect(scores.isComplete).toBe(false);
    expect(scores.verdict).toBe("INCOMPLETE");
    expect(scores.noEvaluation).toBe(false);
  });

  it("marks not evaluated when no evaluations provided", () => {
    const scores = computeReportScores([], RUBRIC, null, undefined, true);

    expect(scores.noEvaluation).toBe(true);
    expect(scores.verdict).toBe("NOT EVALUATED");
    expect(scores.totalQuestions).toBeGreaterThan(0);
    expect(scores.answeredQuestions).toBe(0);
  });

  it("computes NOT RECOMMENDED when a gate fails", () => {
    const failEvals: Evaluation[] = evaluations.map((e) =>
      e.rubricId === "privacy_and_security.data_privacy"
        ? { ...e, score: "fail" as const }
        : { ...e },
    );
    const scores = computeReportScores(failEvals, RUBRIC, null, undefined, true);

    expect(scores.anyFail).toBe(true);
    expect(scores.computedFailed).toBe(true);
    expect(scores.verdict).toBe("NOT RECOMMENDED");
  });

  it("computes NOT RECOMMENDED when ratio < 0.6", () => {
    // All scoring questions get score 0 → ratio = 0
    const lowEvals: Evaluation[] = [
      ...qgEvaluations,
      ...scoringEvaluations.map((e) =>
        typeof e.score === "number" ? { ...e, score: 0 as const } : { ...e },
      ),
    ];
    const scores = computeReportScores(lowEvals, RUBRIC, null, undefined, true);

    expect(scores.ratio).toBe(0);
    expect(scores.computedFailed).toBe(true);
    expect(scores.verdict).toBe("NOT RECOMMENDED");
  });

  it("exports to ZIP and re-imports with matching data (round-trip)", async () => {
    // 8. Export
    const zipBlob = await exportSession(metadata, captures, evaluations, RUBRIC, finalization);

    // Verify blob is a valid ZIP
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);

    // Verify ZIP contains expected files
    const files = await unzipToFiles(zipBlob);
    const fileNames = [...files.keys()];

    // Required files
    expect(fileNames).toContain("session.json");
    expect(fileNames).toContain("report.css");
    expect(fileNames).toContain("session_metadata.csv");
    expect(fileNames).toContain("rubric_scores.csv");
    expect(fileNames).toContain("capture_log.csv");
    expect(fileNames).toContain("review_conclusions.csv");

    // HTML reports with sanitized tool name
    expect(fileNames).toContain("Evaluation_Report_LifeCycleTest.html");
    expect(fileNames).toContain("TRUST_Label_LifeCycleTest.html");

    // Verify session.json content
    const sessionJson = files.get("session.json") as string;
    const sessionData = JSON.parse(sessionJson);
    expect(sessionData.metadata.toolName).toBe("LifeCycleTest");
    expect(sessionData.metadata.toolUrl).toBe("https://testsearch.example.com");
    expect(sessionData.evaluations).toHaveLength(evaluations.length);
    expect(sessionData.finalization.grade).toBe("pass");

    // 9. Import
    const imported = await importSessionFromZip((await zipBlob.arrayBuffer()) as unknown as Blob);

    // 10. Verify round-trip
    // Metadata
    expect(imported.metadata.id).toBe(metadata.id);
    expect(imported.metadata.toolName).toBe("LifeCycleTest");
    expect(imported.metadata.toolUrl).toBe("https://testsearch.example.com");
    expect(imported.metadata.startTime).toBe("2025-06-15T10:00:00.000Z");

    // Evaluations — order preserved, scores match
    expect(imported.evaluations).toHaveLength(evaluations.length);
    for (const orig of evaluations) {
      const imp = imported.evaluations.find((e) => e.rubricId === orig.rubricId);
      expect(imp).toBeDefined();
      /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
      expect(imp!.score).toBe(orig.score);
      /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
      expect(imp!.rubricId).toBe(orig.rubricId);
      // Evidence IDs preserved
      /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
      expect(imp!.explicitEvidenceIds).toEqual(orig.explicitEvidenceIds);
    }

    // Captures — IDs and metadata match
    expect(imported.captures).toHaveLength(captures.length);
    for (const orig of captures) {
      const imp = imported.captures.find((c) => c.id === orig.id);
      expect(imp).toBeDefined();
      /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
      expect(imp!.pageTitle).toBe(orig.pageTitle);
      /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
      expect(imp!.sourceUrl).toBe(orig.sourceUrl);
      // Screenshots reassembled from ZIP images
      /* biome-ignore lint/style/noNonNullAssertion: guarded by toDefined above */
      expect(imp!.screenshotBase64).toBeTruthy();
    }

    // Finalization preserved
    expect(imported.finalization).not.toBeNull();
    /* biome-ignore lint/style/noNonNullAssertion: guarded by not.toBeNull above */
    expect(imported.finalization!.grade).toBe("pass");
    /* biome-ignore lint/style/noNonNullAssertion: guarded by not.toBeNull above */
    expect(imported.finalization!.conclusion).toBe("Tool meets trust criteria");
    /* biome-ignore lint/style/noNonNullAssertion: guarded by not.toBeNull above */
    expect(imported.finalization!.strengths).toEqual([
      "Transparent data sources",
      "Good accessibility",
    ]);
    /* biome-ignore lint/style/noNonNullAssertion: guarded by not.toBeNull above */
    expect(imported.finalization!.weaknesses).toEqual(["Some hallucination risk"]);
  });
});
