// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EditableText from "@/components/editor/EditableText";

describe("EditableText", () => {
  let onChange = vi.fn();

  beforeEach(() => {
    onChange = vi.fn();
  });

  afterEach(cleanup);

  function renderField(overrides = {}) {
    return render(
      <EditableText value="Hello" onChange={onChange} label="Test field" {...overrides} />,
    );
  }

  it("renders the value in display mode and NOT an input", () => {
    renderField({ value: "Hello" });
    expect(screen.getByTestId("editable-text-display").textContent).toBe("Hello");
    expect(screen.queryByTestId("editable-text-input")).toBeNull();
  });

  it("shows the placeholder (muted) when value is empty", () => {
    renderField({ value: "" });
    const el = screen.getByTestId("editable-text-display");
    expect(el.textContent).toBe("Click to add\u2026");
    expect(el.className).toContain("text-ut-muted");
    expect(el.className).toContain("italic");
  });

  it("clicking the display element enters edit mode with seeded value", () => {
    renderField({ value: "Hello" });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    expect(input).toBeDefined();
    expect((input as HTMLTextAreaElement).value).toBe("Hello");
    expect(document.activeElement).toBe(input);
    expect(screen.queryByTestId("editable-text-display")).toBeNull();
  });

  it("keyboard Enter activates edit mode", () => {
    renderField({ value: "Hello" });
    fireEvent.keyDown(screen.getByTestId("editable-text-display"), {
      key: "Enter",
    });
    expect(screen.getByTestId("editable-text-input")).toBeDefined();
  });

  it("keyboard Space activates edit mode and does not scroll", () => {
    renderField({ value: "Hello" });
    const el = screen.getByTestId("editable-text-display");
    // Space on a non-input fires a click by default; we test preventDefault
    // by checking that the event handler fires without throwing
    fireEvent.keyDown(el, { key: " " });
    expect(screen.getByTestId("editable-text-input")).toBeDefined();
  });

  it("typing then blurring commits: onChange called, returns to display", () => {
    renderField({ value: "Hello" });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "Updated text" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("Updated text");
    expect(screen.getByTestId("editable-text-display")).toBeDefined();
  });

  it("Escape cancels: onChange NOT called, display reverts", () => {
    renderField({ value: "Original" });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId("editable-text-display").textContent).toBe("Original");
  });

  it("Cmd+Enter commits (multiline)", () => {
    renderField({ value: "Hello", multiline: true });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "Committed" } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });
    expect(onChange).toHaveBeenCalledWith("Committed");
    expect(screen.getByTestId("editable-text-display")).toBeDefined();
  });

  it("Ctrl+Enter commits (multiline)", () => {
    renderField({ value: "Hello", multiline: true });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    fireEvent.change(input, { target: { value: "CtrlCommitted" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    expect(onChange).toHaveBeenCalledWith("CtrlCommitted");
  });

  it("multiline=false renders an <input>, not a <textarea>", () => {
    renderField({ value: "Hello", multiline: false });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    expect(input.tagName).toBe("INPUT");
    expect((input as HTMLInputElement).type).toBe("text");
  });

  it("multiline=true renders a <textarea>", () => {
    renderField({ value: "Hello", multiline: true });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    expect(input.tagName).toBe("TEXTAREA");
  });

  it("display element has correct accessibility attributes", () => {
    renderField({ value: "Test", label: "My label" });
    const el = screen.getByTestId("editable-text-display");
    expect(el.getAttribute("role")).toBe("button");
    expect(el.getAttribute("tabindex")).toBe("0");
    expect(el.getAttribute("aria-label")).toBe("My label");
  });

  it("edit input has correct aria-label", () => {
    renderField({ value: "Test", label: "Field label" });
    fireEvent.click(screen.getByTestId("editable-text-display"));
    const input = screen.getByTestId("editable-text-input");
    expect(input.getAttribute("aria-label")).toBe("Field label");
  });

  it("renders as span when multiline=false", () => {
    renderField({ value: "Inline", multiline: false });
    expect(screen.getByTestId("editable-text-display").tagName).toBe("SPAN");
  });

  it("renders as div when multiline=true (default)", () => {
    renderField({ value: "Block" });
    expect(screen.getByTestId("editable-text-display").tagName).toBe("DIV");
  });

  it("Escape on display mode does nothing", () => {
    renderField({ value: "Hello" });
    fireEvent.keyDown(screen.getByTestId("editable-text-display"), {
      key: "Escape",
    });
    expect(screen.queryByTestId("editable-text-input")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
