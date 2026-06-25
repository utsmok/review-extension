// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CaptureGridItem from "@/components/captures/CaptureGridItem";
import { makeCapture, TINY_PNG } from "@/tests/fixtures";

afterEach(cleanup);

vi.mock("@/hooks/useScreenshotUrl", () => ({
  useScreenshotUrl: (_id: string) => TINY_PNG,
}));

vi.mock("@/components/captures/RubricTaggingSection", () => ({
  default: () => <div data-testid="rubric-section">RubricTaggingSection</div>,
}));

const defaultProps = {
  index: 0,
  isExpanded: false,
  isRemoving: false,
  linkedRubricIds: [],
  onToggleExpand: vi.fn(),
  onAnnotate: vi.fn(),
  onDelete: vi.fn(),
  onNotesChange: vi.fn(),
  onToggleRubric: vi.fn(),
  onCollapseExpand: vi.fn(),
};

describe("CaptureGridItem", () => {
  it("renders the capture image with correct alt text", () => {
    const capture = makeCapture({ pageTitle: "Search Results" });
    render(<CaptureGridItem capture={capture} {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Screenshot of Search Results/ })).toBeTruthy();
  });

  it("displays pageTitle in the overlay, falling back to sourceUrl", () => {
    const { rerender } = render(
      <CaptureGridItem capture={makeCapture({ pageTitle: "Title" })} {...defaultProps} />,
    );
    expect(screen.getByText("Title")).toBeTruthy();

    rerender(
      <CaptureGridItem
        capture={makeCapture({ pageTitle: "", sourceUrl: "https://example.com" })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText("https://example.com")).toBeTruthy();
  });

  it("applies stagger animation delay based on index", () => {
    const { container } = render(
      <CaptureGridItem capture={makeCapture()} {...{ ...defaultProps, index: 3 }} />,
    );
    expect(container.querySelector("[style]")).toBeTruthy();
  });

  it("adds capture-card-removing class when isRemoving is true", () => {
    const { container } = render(
      <CaptureGridItem capture={makeCapture()} {...{ ...defaultProps, isRemoving: true }} />,
    );
    expect(container.firstElementChild!.className).toContain("capture-card-removing");
  });

  it("calls onToggleExpand when the thumbnail button is clicked", async () => {
    const onToggle = vi.fn();
    render(
      <CaptureGridItem
        capture={makeCapture()}
        {...{ ...defaultProps, onToggleExpand: onToggle }}
      />,
    );
    // The outer wrapper button — get all buttons with the matching name and pick the first
    const buttons = screen.getAllByRole("button", { name: /Screenshot of Test Page/ });
    await buttons[0].click();
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows RubricTaggingSection when expanded", () => {
    render(<CaptureGridItem capture={makeCapture()} {...{ ...defaultProps, isExpanded: true }} />);
    expect(screen.getByTestId("rubric-section")).toBeTruthy();
  });

  it("does not show RubricTaggingSection when collapsed", () => {
    render(<CaptureGridItem capture={makeCapture()} {...{ ...defaultProps, isExpanded: false }} />);
    expect(screen.queryByTestId("rubric-section")).toBeNull();
  });
});
