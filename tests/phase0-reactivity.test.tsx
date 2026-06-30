// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getActiveRubric as activeRubric, useActiveRubric } from "@/lib/rubric-schema";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Harness that exercises the reactive useActiveRubric hook. */
function Harness() {
  const rubric = useActiveRubric();
  const firstPrinciple = Object.keys(rubric.scoring_rubric)[0];
  const firstKey = Object.keys(rubric.scoring_rubric[firstPrinciple])[0];
  const title = rubric.scoring_rubric[firstPrinciple][firstKey].title;
  return <p data-testid="rubric-title">{title}</p>;
}

describe("Phase 0 — review-path reactivity", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });
  afterEach(cleanup);

  it("useActiveRubric reflects a rubric title override live (the RUBRIC_DATA desync fix)", () => {
    render(<Harness />);
    const principle = Object.keys(activeRubric().scoring_rubric)[0];
    const qKey = Object.keys(activeRubric().scoring_rubric[principle])[0];
    const original = activeRubric().scoring_rubric[principle][qKey].title;
    expect(screen.getByTestId("rubric-title").textContent).toBe(original);

    // Apply an override — the harness must re-render with the new title.
    act(() => {
      useFrameworkCustomizationStore
        .getState()
        .setRubricOverride(["scoring_rubric", principle, qKey, "title"], "Patched title live");
    });
    expect(screen.getByTestId("rubric-title").textContent).toBe("Patched title live");
  });
});
