// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PillField from "@/components/PillField";

describe("PillField", () => {
  const options = ["Speed", "Accuracy", "Relevance"] as const;
  let onChange = vi.fn();

  beforeEach(() => {
    onChange = vi.fn();
  });

  afterEach(cleanup);

  function renderField(overrides = {}) {
    return render(
      <PillField
        label="Traits"
        options={options}
        selected={[]}
        onChange={onChange}
        placeholder="Add custom…"
        {...overrides}
      />,
    );
  }

  it("renders predefined options as clickable buttons", () => {
    renderField();
    expect(screen.getByRole("button", { name: "Speed" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Accuracy" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Relevance" })).toBeDefined();
  });

  it("adds a predefined option via onChange on click", () => {
    renderField();
    fireEvent.click(screen.getByRole("button", { name: "Speed" }));
    expect(onChange).toHaveBeenCalledWith(["Speed"]);
  });

  it("removes a predefined option when already selected (controlled)", () => {
    // Simulate controlled state where Speed is already in selected
    renderField({ selected: ["Speed"] });
    fireEvent.click(screen.getByRole("button", { name: "Speed" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("adds a custom pill via Enter key and ignores blank input", () => {
    renderField();
    const input = screen.getByPlaceholderText("Add custom…");

    // Blank input — should not call onChange
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();

    // Valid input
    fireEvent.change(input, { target: { value: "Custom Trait" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(["Custom Trait"]);
  });

  it("removes a custom pill when its button is clicked", () => {
    renderField({ selected: ["Custom Trait"] });
    // Custom pills render as buttons with the value text
    const customBtn = screen.getByRole("button", { name: "Custom Trait" });
    fireEvent.click(customBtn);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("rejects duplicate custom entry when value already in selected", () => {
    renderField({ selected: ["Speed"] });
    const input = screen.getByPlaceholderText("Add custom…");
    fireEvent.change(input, { target: { value: "Speed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Already selected");
  });
});
