// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RubricTaggingSection from "@/components/captures/RubricTaggingSection";
import { AllProviders } from "@/tests/helpers/render-utils";

describe("RubricTaggingSection", () => {
  let onToggle = vi.fn();

  beforeEach(() => {
    onToggle = vi.fn();
  });

  afterEach(cleanup);

  function renderSection(linkedIds: string[] = []) {
    return render(
      <AllProviders>
        <RubricTaggingSection linkedRubricIds={linkedIds} onToggle={onToggle} />
      </AllProviders>,
    );
  }

  it("renders section headers for Quality Gates and Scoring Rubric", () => {
    renderSection();
    expect(screen.getByText("Quality Gates")).toBeDefined();
    expect(screen.getByText("Scoring Rubric")).toBeDefined();
  });

  it("renders rubric chips with data-linked=false for unlinked items", () => {
    renderSection();
    const chips = screen.getAllByRole("button");
    expect(chips.length).toBeGreaterThan(0);
    // First chip should be unlinked
    expect(chips[0].getAttribute("data-linked")).toBe("false");
  });

  it("calls onToggle with rubricId and false when an unlinked chip is clicked", () => {
    renderSection();
    const firstChip = screen.getAllByRole("button")[0];
    fireEvent.click(firstChip);
    expect(onToggle).toHaveBeenCalledTimes(1);
    const [rubricId, wasLinked] = onToggle.mock.calls[0];
    expect(wasLinked).toBe(false);
    expect(rubricId).toMatch(/\./);
  });

  it("marks pre-linked chips with data-linked=true", () => {
    renderSection(["privacy_and_security.data_privacy"]);
    const linkedChip = screen.getByRole("button", { name: /PS1.*linked/ });
    expect(linkedChip.getAttribute("data-linked")).toBe("true");
  });

  it("shows linked count in the details summary", () => {
    renderSection(["privacy_and_security.data_privacy", "TR.data_source_clarity"]);
    const summary = document.querySelector("summary")!;
    expect(summary.textContent).toContain("(2)");
  });

  it("fires onDetailsToggle when the details element is toggled", () => {
    const onDetailsToggle = vi.fn();
    render(
      <AllProviders>
        <RubricTaggingSection
          linkedRubricIds={[]}
          onToggle={onToggle}
          showDetails={true}
          onDetailsToggle={onDetailsToggle}
        />
      </AllProviders>,
    );
    const details = document.querySelector("details")!;
    details.open = false;
    details.dispatchEvent(new Event("toggle", { bubbles: true }));
    expect(onDetailsToggle).toHaveBeenCalled();
  });
});
