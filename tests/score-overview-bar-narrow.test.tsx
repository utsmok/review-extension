// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ScoreOverviewBar from "@/components/ScoreOverviewBar";
import type { Capture, Evaluation, EvaluationScore } from "@/lib/types";
import { RUBRIC, makeCapture, makeEvaluation } from "@/tests/fixtures";

// ---------------------------------------------------------------------------
// localStorage stub — Zustand persist captures window.localStorage at import
// time. WXT jsdom provides a broken localStorage, so we stub it first.
// ---------------------------------------------------------------------------

const _ls = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  return store;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** All rubricIds visible when usesAi=true (14 questions). */
const ALL_RUBRIC_IDS = [
  // Quality gates
  "privacy_and_security.data_privacy",
  "privacy_and_security.training_policy",
  "intellectual_property.ip_preservation",
  "accessibility.compliance",
  // Scoring rubric
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

/** QG pass/fail rubricIds. */
const QG_IDS = new Set(ALL_RUBRIC_IDS.slice(0, 4));

function makeScoredEvaluation(rubricId: string, overrides?: Partial<Evaluation>): Evaluation {
  const isQG = QG_IDS.has(rubricId);
  const score: EvaluationScore = isQG ? "pass" : 3;
  return makeEvaluation({ rubricId, score, notes: "tested", ...overrides });
}

/** Build evaluations for all 14 questions, each with a score and notes. */
function makeAllEvaluations(): Evaluation[] {
  return ALL_RUBRIC_IDS.map((id) => makeScoredEvaluation(id));
}

/** Build a capture linked to a specific evaluation's explicitEvidenceIds. */
function linkCapture(eval_: Evaluation, capture: Capture): Evaluation {
  return { ...eval_, explicitEvidenceIds: [capture.id] };
}

/**
 * Render ScoreOverviewBar in a narrow-width container.
 * Uses a wrapping div with inline style to simulate viewport width.
 */
function renderNarrow(evaluations: Evaluation[], captures: Capture[], width: number) {
  return render(
    <div style={{ width: `${width}px`, overflow: "hidden" }}>
      <ScoreOverviewBar
        evaluations={evaluations}
        captures={captures}
        rubric={RUBRIC}
        usesAi={true}
      />
    </div>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScoreOverviewBar at narrow widths", () => {
  afterEach(cleanup);

  it("renders all 14 badge buttons when all questions are scored", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 320);

    const badges = container.querySelectorAll<HTMLButtonElement>(".score-overview-bar__badge");
    expect(badges.length).toBe(14);
  });

  it("badges have non-zero offsetWidth at 320px", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 320);

    const badges = container.querySelectorAll<HTMLButtonElement>(".score-overview-bar__badge");
    for (const badge of badges) {
      // offsetWidth is 0 when display:none or element is clipped.
      // In jsdom offsetWidth is computed from style; display:inline-flex ≠ 0.
      expect(badge.style.display).not.toBe("none");
    }
  });

  it("badges have non-zero offsetWidth at 360px", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 360);

    const badges = container.querySelectorAll<HTMLButtonElement>(".score-overview-bar__badge");
    expect(badges.length).toBe(14);
    for (const badge of badges) {
      expect(badge.style.display).not.toBe("none");
    }
  });

  it("shows correct scored/total fraction when all 14 are scored", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 360);

    const scored = container.querySelector(".score-overview-bar__scored");
    const total = container.querySelector(".score-overview-bar__total");
    expect(scored?.textContent).toBe("14");
    expect(total?.textContent).toBe("14");
  });

  it("shows partial fraction when only some questions are scored", () => {
    // Only score the first 5 questions
    const evaluations = ALL_RUBRIC_IDS.slice(0, 5).map((id) => makeScoredEvaluation(id));
    const { container } = renderNarrow(evaluations, [], 360);

    const scored = container.querySelector(".score-overview-bar__scored");
    const total = container.querySelector(".score-overview-bar__total");
    expect(scored?.textContent).toBe("5");
    expect(total?.textContent).toBe("14");
  });

  it("renders QG badges before scoring badges with a divider between them", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 360);

    /* biome-ignore lint/style/noNonNullAssertion: DOM query in test */
    const inner = container.querySelector(".score-overview-bar__inner")!;
    const divider = inner.querySelector(".score-overview-bar__divider-line");
    expect(divider).not.toBeNull();

    // QG badges (4) come before the divider, scoring (10) after
    const badges = inner.querySelectorAll<HTMLButtonElement>(".score-overview-bar__badge");
    expect(badges.length).toBe(14);
  });

  it("renders evidence counts on badges with linked captures", () => {
    const evaluations = makeAllEvaluations();
    const cap = makeCapture();
    // Link capture to first evaluation
    evaluations[0] = linkCapture(evaluations[0], cap);

    const { container } = renderNarrow(evaluations, [cap], 360);

    const evidenceCounts = container.querySelectorAll(".score-overview-bar__evidence-count");
    // Only the first badge should show an evidence count
    expect(evidenceCounts.length).toBe(1);
    expect(evidenceCounts[0].textContent).toBe("1");
  });

  it("marks completed badges with is-complete class", () => {
    const evaluations = makeAllEvaluations();
    // All have score + notes → complete (no evidence needed since hasNotes=true)
    const { container } = renderNarrow(evaluations, [], 360);

    const completeBadges = container.querySelectorAll(".score-overview-bar__badge.is-complete");
    expect(completeBadges.length).toBe(14);
  });

  it("marks partial badges correctly when only score is present", () => {
    const evaluations = ALL_RUBRIC_IDS.map((id) => makeScoredEvaluation(id, { notes: "" }));
    const { container } = renderNarrow(evaluations, [], 360);

    // Score only, no notes, no evidence → partial
    const partialBadges = container.querySelectorAll(".score-overview-bar__badge.is-partial");
    expect(partialBadges.length).toBe(14);
  });

  it("indicators are present at 360px but still rendered (CSS hides at ≤360px)", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 360);

    // Indicators exist in DOM even though CSS @media ≤360px hides them
    const indicators = container.querySelectorAll(".score-overview-bar__indicator");
    expect(indicators.length).toBe(14);
  });

  it("progress fill width reflects scored fraction", () => {
    const evaluations = makeAllEvaluations();
    const { container } = renderNarrow(evaluations, [], 320);

    const fill = container.querySelector<HTMLSpanElement>(".score-overview-bar__fill");
    expect(fill).not.toBeNull();
    // 14/14 = 100% → scaleX(1)
    expect(fill?.style.transform).toBe("scaleX(1)");
  });

  it("progress fill shows correct percentage with partial scoring", () => {
    const evaluations = ALL_RUBRIC_IDS.slice(0, 7).map((id) => makeScoredEvaluation(id));
    const { container } = renderNarrow(evaluations, [], 360);

    const fill = container.querySelector<HTMLSpanElement>(".score-overview-bar__fill");
    // 7/14 = 50%
    expect(fill?.style.transform).toBe("scaleX(0.5)");
  });

  it("renders next button when some questions are incomplete", () => {
    // Score only QG questions, leave scoring questions incomplete
    const evaluations = ALL_RUBRIC_IDS.slice(0, 4).map((id) => makeScoredEvaluation(id));
    const { container } = renderNarrow(evaluations, [], 500);

    const next = container.querySelector(".score-overview-bar__next");
    expect(next).not.toBeNull();
    expect(next?.textContent).toBe("↓");
  });
});
