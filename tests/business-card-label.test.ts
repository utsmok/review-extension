// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { buildBusinessCardLabel, buildBusinessCardSheet } from "@/lib/html-report";
import type { Evaluation } from "@/lib/types";
import { makeEvaluation, makeFinalization, makeMetadata, RUBRIC } from "@/tests/fixtures";

vi.mock("@/lib/logos", () => ({
  TRUST_LOGO: "data:image/svg+xml,trust",
  LISA_EIS_LOGO: "data:image/svg+xml,lisa",
  UT_LOGO: "data:image/svg+xml,ut",
}));

/** Helper: build evaluations that pass all quality gates and score high on every scoring question. */
function allHighScoringEvaluations(): Evaluation[] {
  const qgIds = [
    "privacy_and_security.data_privacy",
    "privacy_and_security.training_policy",
    "intellectual_property.ip_preservation",
    "accessibility.compliance",
  ];
  const scoringIds = [
    "TR.data_source_clarity",
    "TR.methodology_disclosure",
    "RE.accuracy_and_hallucination",
    "RE.variance_consistency",
    "US.workflow_integration",
    "US.cognitive_guardrails",
    "SE.algorithmic_fairness",
    "SE.data_handling",
    "TC.source_attribution_depth",
    "TC.bibliometric_credibility",
  ];
  const evals = qgIds.map((id) => makeEvaluation({ rubricId: id, score: "pass" }));
  for (const id of scoringIds) {
    evals.push(makeEvaluation({ rubricId: id, score: 3 }));
  }
  return evals;
}

/** Helper: build evaluations that fail a quality gate. */
function failQGEvaluations(): Evaluation[] {
  return [
    makeEvaluation({ rubricId: "privacy_and_security.data_privacy", score: "fail" }),
    makeEvaluation({ rubricId: "privacy_and_security.training_policy", score: "pass" }),
    makeEvaluation({ rubricId: "intellectual_property.ip_preservation", score: "pass" }),
    makeEvaluation({ rubricId: "accessibility.compliance", score: "pass" }),
  ];
}

describe("buildBusinessCardLabel", () => {
  it("returns a non-empty HTML document", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toBeTruthy();
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("renders both a front and a back face", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-face bc-front"');
    expect(html).toContain('class="bc-face bc-back"');
    expect((html.match(/class="bc-card"/g) || []).length).toBe(2);
  });

  it("puts the tool name in the seal and the back header", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata({ toolName: "ChatGPT" }),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-seal-name">ChatGPT');
    expect(html).toContain('class="bc-back-tool">ChatGPT');
  });

  it("stamps the verdict in the seal, coloured by the verdict color", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-seal-verdict"');
    expect(html).toContain("RECOMMENDED");
    // verdictColor flows into --vc on both seal and final-score
    expect(html).toMatch(/class="bc-seal" style="--vc:#3d7249"/);
  });

  it("contains all five principle codes with score circles + numeric", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    // principles render as names with a coloured first letter (code merged in);
    // the initial is wrapped in .bc-pinit so the full name is split — check tails
    for (const tail of ["ransparency", "eliability", "sability", "oundness", "raceability"]) {
      expect(html).toContain(tail);
    }
    expect(html).toContain('class="bc-pinit"');
    // every principle row carries CSS-drawn circles (no glyph reintroduced)
    expect(html).toContain('class="circle filled"');
  });

  it("does not render an average/final-score row on the back", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    // the back lists principles only — no average/total row
    expect(html).not.toContain("bc-pavg");
    expect(html).not.toContain(">Average<");
  });

  it("shows every quality gate with a pass mark when all gates pass", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain("bc-gates");
    expect(html).toContain('class="bc-g-ic pass"');
    expect(html).not.toContain('class="bc-g-ic fail"');
  });

  it("marks a failed quality gate with a red fail indicator", async () => {
    const html = await buildBusinessCardLabel(makeMetadata(), failQGEvaluations(), RUBRIC, null);
    expect(html).toContain('class="bc-g-ic fail"');
  });

  it("embeds an inline QR svg pointing at the trust hub", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('<svg class="bc-qr"');
    expect(html).toContain("trust.samuelmok.cc");
    expect(html).toContain("view full report at");
  });

  it("carries the static reviewer line + hub in the footer", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain("Reviewed by UTwente librarians");
    expect(html).toContain("utwente.nl/library");
  });

  it("contains bc-card CSS class", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    expect(html).toContain('class="bc-card"');
  });

  it("with finalization grade 'fail' → verdict is NOT RECOMMENDED", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({ grade: "fail" }),
    );
    expect(html).toContain("NOT RECOMMENDED");
  });

  it("with no evaluations → verdict is NOT EVALUATED", async () => {
    const html = await buildBusinessCardLabel(makeMetadata(), [], RUBRIC, null);
    expect(html).toContain("NOT EVALUATED");
  });

  it("shows the top strength (+) and weakness (!) on the back", async () => {
    const html = await buildBusinessCardLabel(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      makeFinalization({
        grade: "pass",
        strengths: ["Great tool"],
        weaknesses: ["Expensive"],
      }),
    );
    expect(html).toContain('class="bc-find-box up"');
    expect(html).toContain("Great tool");
    expect(html).toContain('class="bc-find-box dn"');
    expect(html).toContain("Expensive");
  });
});

describe("buildBusinessCardSheet", () => {
  it("returns separate front + back A3 documents, each tiling 21 cards of one face", async () => {
    const result = await buildBusinessCardSheet(
      makeMetadata(),
      allHighScoringEvaluations(),
      RUBRIC,
      null,
    );
    const cases: Array<[string, string, string]> = [
      ["front", result.front, "bc-front"],
      ["back", result.back, "bc-back"],
    ];
    for (const [, html, face] of cases) {
      // exactly one A3 page per document
      expect(html).toContain("@page { size: 297mm 420mm");
      expect((html.match(/class="a3-sheet"/g) || []).length).toBe(1);
      // 21 cards, all of the correct face
      expect((html.match(/class="bc-card"/g) || []).length).toBe(21);
      expect((html.match(new RegExp(`class="bc-face ${face}"`, "g")) || []).length).toBe(21);
      // fully standalone (report stylesheet inlined)
      expect(html).toContain("<style>");
    }
  });
});
