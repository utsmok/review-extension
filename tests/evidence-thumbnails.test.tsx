// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EvidenceThumbnails from "@/components/EvidenceThumbnails";
import { makeCapture, TINY_PNG } from "@/tests/fixtures";

afterEach(cleanup);

vi.mock("@/hooks/useScreenshotUrl", () => ({
  useScreenshotUrl: (_id: string) => TINY_PNG,
}));

describe("EvidenceThumbnails", () => {
  it("returns null when captures is empty", () => {
    const { container } = render(
      <EvidenceThumbnails
        captures={[]}
        rubricId="r1"
        onConfirmRemove={vi.fn()}
        onViewEvidence={vi.fn()}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders evidence count heading", () => {
    const captures = [makeCapture(), makeCapture()];
    render(
      <EvidenceThumbnails
        captures={captures}
        rubricId="r1"
        onConfirmRemove={vi.fn()}
        onViewEvidence={vi.fn()}
      />,
    );
    expect(screen.getByText("Evidence (2)")).toBeTruthy();
  });

  it("renders thumbnails for each capture", () => {
    const captures = [makeCapture({ pageTitle: "Page A" }), makeCapture({ pageTitle: "Page B" })];
    render(
      <EvidenceThumbnails
        captures={captures}
        rubricId="r1"
        onConfirmRemove={vi.fn()}
        onViewEvidence={vi.fn()}
      />,
    );
    expect(document.querySelectorAll(".capture-card-stagger").length).toBe(2);
  });

  it("calls onConfirmRemove when remove button is clicked", async () => {
    const onRemove = vi.fn();
    const capture = makeCapture({ pageTitle: "Target" });
    render(
      <EvidenceThumbnails
        captures={[capture]}
        rubricId="r1"
        onConfirmRemove={onRemove}
        onViewEvidence={vi.fn()}
      />,
    );
    await screen.getByRole("button", { name: "Remove evidence" }).click();
    expect(onRemove).toHaveBeenCalledWith(capture, "r1");
  });

  it("calls onViewEvidence when view button is clicked", async () => {
    const onView = vi.fn();
    const capture = makeCapture({ pageTitle: "Target" });
    render(
      <EvidenceThumbnails
        captures={[capture]}
        rubricId="r1"
        onConfirmRemove={vi.fn()}
        onViewEvidence={onView}
      />,
    );
    await screen.getByRole("button", { name: "View and annotate evidence" }).click();
    expect(onView).toHaveBeenCalledWith(capture);
  });

  it("sets img alt to include pageTitle", () => {
    render(
      <EvidenceThumbnails
        captures={[makeCapture({ pageTitle: "My Page" })]}
        rubricId="r1"
        onConfirmRemove={vi.fn()}
        onViewEvidence={vi.fn()}
      />,
    );
    const imgs = document.querySelectorAll("img");
    const found = Array.from(imgs).some((img) => img.alt.includes("Evidence: My Page"));
    expect(found).toBe(true);
  });
});
