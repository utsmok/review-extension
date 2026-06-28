// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CollapsibleRow,
  EditorShell,
  editorInputClass,
  LabeledField,
  PreviewBox,
  Section,
} from "@/components/editor";

afterEach(cleanup);

describe("EditorShell", () => {
  it("renders title, subtitle and a back button that calls onBack", () => {
    const onBack = vi.fn();
    render(
      <EditorShell title="Fields & options" subtitle="adapt entry fields" onBack={onBack}>
        body
      </EditorShell>,
    );
    expect(screen.getByText("Fields & options")).toBeTruthy();
    expect(screen.getByText("adapt entry fields")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /back to framework/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("omits subtitle node when not provided", () => {
    const { container } = render(
      <EditorShell title="Grades" onBack={() => {}}>
        body
      </EditorShell>,
    );
    expect(container.querySelector("header > p")).toBeNull();
  });

  it("renders footer when provided", () => {
    render(
      <EditorShell title="X" onBack={() => {}} footer={<button type="button">reset</button>}>
        body
      </EditorShell>,
    );
    expect(screen.getByText("reset")).toBeTruthy();
  });
});

describe("CollapsibleRow", () => {
  it("hides detail until the summary is clicked", () => {
    render(
      <CollapsibleRow summary={<span>field-one</span>}>
        <span>detail-body</span>
      </CollapsibleRow>,
    );
    expect(screen.queryByText("detail-body")).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("detail-body")).toBeTruthy();
  });

  it("respects defaultOpen", () => {
    render(
      <CollapsibleRow summary="s" defaultOpen>
        <span>open-body</span>
      </CollapsibleRow>,
    );
    expect(screen.getByText("open-body")).toBeTruthy();
  });

  it("shows an edited marker only when edited", () => {
    const { rerender } = render(<CollapsibleRow summary="s">x</CollapsibleRow>);
    expect(screen.queryByLabelText(/edited/i)).toBeNull();
    rerender(
      <CollapsibleRow summary="s" edited>
        x
      </CollapsibleRow>,
    );
    expect(screen.getByLabelText(/edited/i)).toBeTruthy();
  });
});

describe("Section", () => {
  it("renders title, description and trailing action", () => {
    render(
      <Section title="Identity" description="names" action={<button type="button">add</button>}>
        <span>content</span>
      </Section>,
    );
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("names")).toBeTruthy();
    expect(screen.getByText("add")).toBeTruthy();
  });
});

describe("PreviewBox", () => {
  it("renders the default label and children", () => {
    render(
      <PreviewBox>
        <span>preview-content</span>
      </PreviewBox>,
    );
    expect(screen.getByText("Preview")).toBeTruthy();
    expect(screen.getByText("preview-content")).toBeTruthy();
  });

  it("honours a custom label", () => {
    render(<PreviewBox label="Live">x</PreviewBox>);
    expect(screen.getByText("Live")).toBeTruthy();
  });
});

describe("LabeledField", () => {
  it("renders label, optional hint and the input", () => {
    render(
      <LabeledField label="Full name" hint="shown on the report header">
        <input className={editorInputClass} />
      </LabeledField>,
    );
    expect(screen.getByText("Full name")).toBeTruthy();
    expect(screen.getByText("shown on the report header")).toBeTruthy();
  });
});
