import { describe, expect, it } from "vitest";
import { generateMatrixBadgeHtml, generateMatrixBadgeSvg } from "@/lib/matrix-badge";
import {
  generateNutritionLabelHtml,
  generateReviewSummary,
} from "@/lib/nutrition-label";
import type { Evaluation, SessionMetadata } from "@/lib/types";

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    toolName: "TestSearch",
    toolUrl: "https://testsearch.example.com",
    startTime: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

function fullEvaluations(scores?: Record<string, number | "pass" | "fail">): Evaluation[] {
  const evals: Evaluation[] = [];
  const defaults: Record<string, number | "pass" | "fail"> = {
    "privacy_and_security.data_privacy": "pass",
    "privacy_and_security.training_policy": "pass",
    "traceability.citation_mechanism": "pass",
    "accessibility.compliance": "pass",
    "TR.data_source_clarity": 2,
    "TR.methodology_disclosure": 3,
    "RE.accuracy_and_hallucination": 1,
    "RE.variance_consistency": 2,
    "US.workflow_integration": 3,
    "US.cognitive_guardrails": 0,
    "SE.algorithmic_fairness": 2,
    "TC.source_attribution_depth": 1,
    "TC.bibliometric_credibility": 3,
  };
  const merged = { ...defaults, ...scores };
  for (const [rubricId, score] of Object.entries(merged)) {
    evals.push({ rubricId, score, notes: "", explicitEvidenceIds: [] });
  }
  return evals;
}

const PRINCIPLE_CODES = ["TR", "RE", "US", "SE", "TC"];
const PRINCIPLE_COLORS = ["#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0d9488"];

describe("generateMatrixBadgeSvg", () => {
  it("contains all 5 principle codes", () => {
    const svg = generateMatrixBadgeSvg(fullEvaluations());
    for (const code of PRINCIPLE_CODES) {
      expect(svg).toContain(`>${code}<`);
    }
  });

  it("contains all 5 principle colors", () => {
    const svg = generateMatrixBadgeSvg(fullEvaluations());
    for (const color of PRINCIPLE_COLORS) {
      expect(svg).toContain(color);
    }
  });

  it("contains score numbers for scored categories", () => {
    const svg = generateMatrixBadgeSvg(fullEvaluations());
    expect(svg).toContain(">5<"); // TR: 2+3=5
    expect(svg).toContain(">3<"); // RE: 1+2=3
    expect(svg).toContain(">3<"); // US: 3+0=3
    expect(svg).toContain(">2<"); // SE: 2
    expect(svg).toContain(">4<"); // TC: 1+3=4
  });

  it("shows dash for unscored categories", () => {
    const svg = generateMatrixBadgeSvg([]);
    expect(svg).toContain(">—<"); // em dash for unset
  });

  it("shows green quality gate strip when all pass", () => {
    const svg = generateMatrixBadgeSvg(fullEvaluations());
    expect(svg).toContain("#4a8355");
  });

  it("shows red quality gate strip when any fail", () => {
    const svg = generateMatrixBadgeSvg(
      fullEvaluations({ "privacy_and_security.data_privacy": "fail" }),
    );
    // Red strip color present
    expect(svg).toContain("#c60c30");
  });

  it("shows gray strip when no quality gates evaluated", () => {
    const svg = generateMatrixBadgeSvg([]);
    expect(svg).toContain("#bfc6cf");
  });

  it("is valid XML", () => {
    const svg = generateMatrixBadgeSvg(fullEvaluations());
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe("generateMatrixBadgeHtml", () => {
  it("produces a full HTML page", () => {
    const html = generateMatrixBadgeHtml(makeMetadata(), fullEvaluations());
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes tool name and date", () => {
    const html = generateMatrixBadgeHtml(makeMetadata(), fullEvaluations());
    expect(html).toContain("TestSearch");
    expect(html).toContain("2026-05-01");
  });

  it("embeds the SVG inline", () => {
    const html = generateMatrixBadgeHtml(makeMetadata(), fullEvaluations());
    expect(html).toContain("<svg");
    expect(html).toContain("</svg>");
  });

  it("includes framework version in footer", () => {
    const html = generateMatrixBadgeHtml(makeMetadata(), fullEvaluations());
    expect(html).toContain("v1.0");
  });
});

describe("generateNutritionLabelHtml", () => {
  it("produces a full HTML page with doctype", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<style>");
    expect(html).toContain("<body>");
  });

  it("contains tool name and date", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("TestSearch");
    expect(html).toContain("2026-05-01");
  });

  it("contains review ID", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("REV-26-05");
  });

  it("contains all category codes", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("TR");
    expect(html).toContain("RE");
    expect(html).toContain("US");
    expect(html).toContain("SE");
    expect(html).toContain("TC");
  });

  it("renders score boxes for scored items", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("2/3");
    expect(html).toContain("3/3");
    expect(html).toContain("0/3");
    expect(html).toContain("1/3");
  });

  it("renders individual quality gate results", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("Data privacy");
    expect(html).toContain("Training policy");
    expect(html).toContain("Citation mechanism");
    expect(html).toContain("Compliance");
  });

  it("shows ALL PASSED when quality gates pass", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("ALL PASSED");
  });

  it("shows GATE FAILED when any quality gate fails", () => {
    const html = generateNutritionLabelHtml(
      makeMetadata(),
      [],
      fullEvaluations({ "privacy_and_security.data_privacy": "fail" }),
    );
    expect(html).toContain("GATE FAILED");
  });

  it("computes correct aggregate score", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    // 2+3+1+2+3+0+2+1+3 = 17, max = 27
    expect(html).toContain("17/27");
  });

  it("includes provenance footer with framework version", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("v1.0");
    expect(html).toContain("https://testsearch.example.com");
  });

  it("has no box-shadow anywhere", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).not.toContain("box-shadow");
  });

  it("embeds matrix badge SVG", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("<svg");
  });

  it("renders category achieved level text", () => {
    const html = generateNutritionLabelHtml(makeMetadata(), [], fullEvaluations());
    expect(html).toContain("Key databases/indices identified");
    expect(html).toContain("Encourages passive automation bias");
  });
});

describe("generateReviewSummary", () => {
  it("returns correctly structured object", () => {
    const summary = generateReviewSummary(makeMetadata(), [], fullEvaluations());
    expect(summary.schemaVersion).toBe(1);
    expect(summary.framework.name).toBe("TRUST - UT Embedded Information Services");
    expect(summary.framework.version).toBe("1.0");
    expect(summary.session.toolName).toBe("TestSearch");
  });

  it("computes correct aggregate", () => {
    const summary = generateReviewSummary(makeMetadata(), [], fullEvaluations());
    // 2+3+1+2+3+0+2+1+3 = 17
    expect(summary.scores.aggregate).toBe(17);
    expect(summary.scores.maxPossible).toBe(27);
  });

  it("has correct maxPossible per category", () => {
    const summary = generateReviewSummary(makeMetadata(), [], fullEvaluations());
    expect(summary.scores.categories["TR"].maxPossible).toBe(6);
    expect(summary.scores.categories["RE"].maxPossible).toBe(6);
    expect(summary.scores.categories["US"].maxPossible).toBe(6);
    expect(summary.scores.categories["SE"].maxPossible).toBe(3);
    expect(summary.scores.categories["TC"].maxPossible).toBe(6);
  });

  it("reports allPassed correctly", () => {
    const passing = generateReviewSummary(makeMetadata(), [], fullEvaluations());
    expect(passing.qualityGates.allPassed).toBe(true);

    const failing = generateReviewSummary(
      makeMetadata(),
      [],
      fullEvaluations({ "privacy_and_security.data_privacy": "fail" }),
    );
    expect(failing.qualityGates.allPassed).toBe(false);
  });

  it("includes all question IDs in categories", () => {
    const summary = generateReviewSummary(makeMetadata(), [], fullEvaluations());
    const allIds = Object.values(summary.scores.categories).flatMap((c) => c.items.map((i) => i.id));
    expect(allIds).toContain("TR.data_source_clarity");
    expect(allIds).toContain("TR.methodology_disclosure");
    expect(allIds).toContain("RE.accuracy_and_hallucination");
    expect(allIds).toContain("RE.variance_consistency");
    expect(allIds).toContain("US.workflow_integration");
    expect(allIds).toContain("US.cognitive_guardrails");
    expect(allIds).toContain("SE.algorithmic_fairness");
    expect(allIds).toContain("TC.source_attribution_depth");
    expect(allIds).toContain("TC.bibliometric_credibility");
    expect(allIds).toHaveLength(9);
  });

  it("includes score levels for scored items", () => {
    const summary = generateReviewSummary(makeMetadata(), [], fullEvaluations());
    const dsc = summary.scores.categories["TR"].items.find(
      (i) => i.id === "TR.data_source_clarity",
    );
    expect(dsc?.score).toBe(2);
    expect(dsc?.level).toBe("Key databases/indices identified.");
  });

  it("null scores for unscored items", () => {
    const summary = generateReviewSummary(makeMetadata(), [], []);
    for (const cat of Object.values(summary.scores.categories)) {
      for (const item of cat.items) {
        expect(item.score).toBeNull();
        expect(item.level).toBeNull();
      }
    }
    expect(summary.scores.aggregate).toBe(0);
  });
});

describe("visual artifacts", () => {
  it("writes all artifacts to tests/artifacts/ for manual inspection", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const outDir = path.resolve(import.meta.dirname, "artifacts");
    await fs.mkdir(outDir, { recursive: true });

    const meta = makeMetadata();
    const evals = fullEvaluations();

    // Nutrition label HTML
    const html = generateNutritionLabelHtml(meta, [], evals);
    await fs.writeFile(path.join(outDir, "nutrition-label.html"), html);

    // Matrix badge SVG
    const svg = generateMatrixBadgeSvg(evals);
    await fs.writeFile(path.join(outDir, "matrix-badge.svg"), svg);

    // Matrix badge HTML
    const badgeHtml = generateMatrixBadgeHtml(meta, evals);
    await fs.writeFile(path.join(outDir, "matrix-badge.html"), badgeHtml);

    // Review summary JSON
    const summary = generateReviewSummary(meta, [], evals);
    await fs.writeFile(path.join(outDir, "review-summary.json"), JSON.stringify(summary, null, 2));

    // Also generate a failed-gate variant for comparison
    const failEvals = fullEvaluations({ "privacy_and_security.data_privacy": "fail" });
    const failHtml = generateNutritionLabelHtml(meta, [], failEvals);
    await fs.writeFile(path.join(outDir, "nutrition-label-failed.html"), failHtml);
    const failSvg = generateMatrixBadgeSvg(failEvals);
    await fs.writeFile(path.join(outDir, "matrix-badge-failed.svg"), failSvg);

    // Sanity: all files exist and have content
    for (const name of [
      "nutrition-label.html",
      "matrix-badge.svg",
      "matrix-badge.html",
      "review-summary.json",
      "nutrition-label-failed.html",
      "matrix-badge-failed.svg",
    ]) {
      const stat = await fs.stat(path.join(outDir, name));
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});
