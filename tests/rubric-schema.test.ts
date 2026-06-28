import { beforeEach, describe, expect, it } from "vitest";
import { RUBRIC_DATA } from "@/data/rubrics";
import { getActiveRubric } from "@/lib/rubric-schema";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("rubric authoring data-layer", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("active rubric equals shipped rubric with no overrides", () => {
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity.title).toBe(
      RUBRIC_DATA.scoring_rubric.TR.data_source_clarity.title,
    );
  });

  it("edits a scoring question title in place via a dot-path patch", () => {
    useFrameworkCustomizationStore
      .getState()
      .setRubricOverride(
        ["scoring_rubric", "TR", "data_source_clarity", "title"],
        "Data-source transparency",
      );
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity.title).toBe(
      "Data-source transparency",
    );
  });

  it("edits a quality-gate requirement and a pass example", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.setRubricOverride(
      ["quality_gate", "privacy_and_security", "data_privacy", "requirement"],
      "New req",
    );
    s.setRubricOverride(
      ["quality_gate", "privacy_and_security", "data_privacy", "examples", "pass"],
      "New pass example",
    );
    const q = getActiveRubric().quality_gate.privacy_and_security.data_privacy;
    expect(q.requirement).toBe("New req");
    expect(q.examples?.pass).toBe("New pass example");
  });

  it("toggles ai_only on a scoring question", () => {
    useFrameworkCustomizationStore
      .getState()
      .setRubricOverride(["scoring_rubric", "TR", "data_source_clarity", "ai_only"], true);
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity.ai_only).toBe(true);
  });

  it("adds a custom scoring question under a principle", () => {
    useFrameworkCustomizationStore.getState().addRubricQuestion("scoring_rubric", "TR", {
      key: "custom_q",
      title: "Custom",
      background: "...",
      "0": "low",
      "1": "ok",
      "2": "good",
      "3": "great",
      ai_only: false,
    });
    expect(getActiveRubric().scoring_rubric.TR.custom_q?.title).toBe("Custom");
  });

  it("removes a shipped question", () => {
    useFrameworkCustomizationStore
      .getState()
      .removeRubricQuestion("scoring_rubric", "TR", "data_source_clarity");
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity).toBeUndefined();
  });

  it("reorders questions within a principle, preserving unordered children at the tail", () => {
    const original = Object.keys(RUBRIC_DATA.scoring_rubric.TR);
    useFrameworkCustomizationStore
      .getState()
      .reorderRubricQuestions("scoring_rubric.TR", [...original.slice(1), original[0]]);
    const reordered = Object.keys(getActiveRubric().scoring_rubric.TR);
    expect(reordered[0]).toBe(original[1]);
    expect(reordered[reordered.length - 1]).toBe(original[0]);
    expect(reordered.sort()).toEqual([...original].sort());
  });
});
