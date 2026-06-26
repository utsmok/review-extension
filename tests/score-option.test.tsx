// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreOption } from "@/components/ScoreOption";

describe("ScoreOption", () => {
  let onClick = vi.fn();

  beforeEach(() => {
    onClick = vi.fn();
  });

  afterEach(cleanup);

  function renderOption(overrides = {}) {
    return render(
      <ScoreOption
        name="test-group"
        isActive={false}
        isDisabled={false}
        onClick={onClick}
        {...overrides}
      >
        <span>Good</span>
      </ScoreOption>,
    );
  }

  it("renders children content inside a label", () => {
    renderOption();
    expect(screen.getByText("Good")).toBeDefined();
  });

  it("sets data-active=true on the label when isActive is true", () => {
    renderOption({ isActive: true });
    const label = screen.getByText("Good").closest("label")!;
    expect(label.getAttribute("data-active")).toBe("true");
  });

  it("omits data-active attribute when isActive is false", () => {
    renderOption({ isActive: false });
    const label = screen.getByText("Good").closest("label")!;
    expect(label.hasAttribute("data-active")).toBe(false);
  });

  it("calls onClick when clicked and not disabled", () => {
    renderOption();
    const label = screen.getByText("Good").closest("label")!;
    fireEvent.click(label);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", () => {
    renderOption({ isDisabled: true });
    const label = screen.getByText("Good").closest("label")!;
    fireEvent.click(label);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("calls onClick on Enter key press on the label", () => {
    renderOption();
    const label = screen.getByText("Good").closest("label")!;
    fireEvent.keyDown(label, { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("calls onClick on Space key press on the label", () => {
    renderOption();
    const label = screen.getByText("Good").closest("label")!;
    fireEvent.keyDown(label, { key: " " });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders a hidden radio input with correct name and checked state", () => {
    renderOption({ isActive: true });
    const radio = document.querySelector('input[type="radio"]') as HTMLInputElement;
    expect(radio).toBeDefined();
    expect(radio.name).toBe("test-group");
    expect(radio.checked).toBe(true);
  });

  it("sets tabIndex to -1 on the label when disabled", () => {
    renderOption({ isDisabled: true });
    const label = screen.getByText("Good").closest("label")!;
    expect(label.getAttribute("tabindex")).toBe("-1");
  });

  it("passes data-score and data-judgment to the label", () => {
    render(
      <ScoreOption
        name="test-group"
        isActive={false}
        onClick={onClick}
        dataScore={2}
        dataJudgment="partial"
      >
        <span>Partial</span>
      </ScoreOption>,
    );
    const label = screen.getByText("Partial").closest("label")!;
    expect(label.getAttribute("data-score")).toBe("2");
    expect(label.getAttribute("data-judgment")).toBe("partial");
  });
});
