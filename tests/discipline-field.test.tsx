// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DisciplineField from "@/components/metadata/DisciplineField";
import { DISCIPLINE_DEFAULT, DISCIPLINE_OTHERS } from "@/lib/metadata-options";
import { AllProviders } from "@/tests/helpers/render-utils";

afterEach(cleanup);

function renderField(selected: string[], onChange = vi.fn()) {
  return render(
    <AllProviders>
      <DisciplineField selected={selected} onChange={onChange} />
    </AllProviders>,
  );
}

describe("DisciplineField", () => {
  it("renders the default discipline button", () => {
    renderField([DISCIPLINE_DEFAULT]);
    expect(screen.getByTitle(DISCIPLINE_DEFAULT)).toBeTruthy();
  });

  it("shows default as active when selected", () => {
    renderField([DISCIPLINE_DEFAULT]);
    const btn = screen.getByTitle(DISCIPLINE_DEFAULT);
    expect(btn.className).toContain("bg-trust-magenta");
  });

  it("calls onChange to toggle the default discipline", () => {
    const onChange = vi.fn();
    renderField([DISCIPLINE_DEFAULT], onChange);
    fireEvent.click(screen.getByTitle(DISCIPLINE_DEFAULT));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("expands to show additional options on click", () => {
    renderField([DISCIPLINE_DEFAULT]);
    expect(screen.queryByText(DISCIPLINE_OTHERS[0])).toBeNull();

    fireEvent.click(screen.getByText("more options ↓"));
    expect(screen.getByText(DISCIPLINE_OTHERS[0])).toBeTruthy();
  });

  it("calls onChange to add a non-default discipline", () => {
    const onChange = vi.fn();
    renderField([DISCIPLINE_DEFAULT], onChange);

    fireEvent.click(screen.getByText("more options ↓"));
    fireEvent.click(screen.getByText(DISCIPLINE_OTHERS[0]));

    expect(onChange).toHaveBeenCalledWith([DISCIPLINE_DEFAULT, DISCIPLINE_OTHERS[0]]);
  });

  it("auto-expands when non-default disciplines are pre-selected", () => {
    renderField(["Computer Science"]);
    expect(screen.getByText(DISCIPLINE_OTHERS[0])).toBeTruthy();
  });

  it("allows adding a custom discipline via text input", () => {
    const onChange = vi.fn();
    renderField([DISCIPLINE_DEFAULT], onChange);

    fireEvent.click(screen.getByText("more options ↓"));
    const input = screen.getByPlaceholderText(/add custom discipline/i);
    fireEvent.change(input, { target: { value: "My Custom Field" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith([DISCIPLINE_DEFAULT, "My Custom Field"]);
  });

  it("does not add empty or duplicate custom discipline", () => {
    const onChange = vi.fn();
    // "My Custom Field" is non-default → auto-expands on mount, input is visible
    renderField(["My Custom Field"], onChange);

    const input = screen.getByPlaceholderText(/add custom discipline/i);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "My Custom Field" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes a custom discipline when its pill is clicked", () => {
    const onChange = vi.fn();
    renderField(["Computer Science", "My Custom"], onChange);

    const customPill = screen.getByTitle("My Custom");
    fireEvent.click(customPill);

    expect(onChange).toHaveBeenCalledWith(["Computer Science"]);
  });
});
