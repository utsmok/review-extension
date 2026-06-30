// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import AppShell from "@/components/AppShell";
import { EditModeProvider } from "@/components/edit-mode/EditModeContext";
import EditableText from "@/components/editor/EditableText";

function wrap(children: ReactNode) {
  return render(
    <EditModeProvider>
      <AppShell showEditModeToggle>{children}</AppShell>
    </EditModeProvider>,
  );
}

describe("Phase 1 — edit mode spine", () => {
  afterEach(cleanup);

  it("renders the Edit toggle when showEditModeToggle is on", () => {
    wrap(<div />);
    expect(screen.getByTestId("edit-mode-toggle")).toBeDefined();
    expect(screen.getByTestId("edit-mode-toggle").textContent).toBe("Edit");
  });

  it("the guardrail banner is absent until the toggle is clicked", () => {
    wrap(<div />);
    expect(screen.queryByTestId("edit-mode-banner")).toBeNull();
    fireEvent.click(screen.getByTestId("edit-mode-toggle"));
    expect(screen.getByTestId("edit-mode-banner")).toBeDefined();
    expect(screen.getByTestId("edit-mode-toggle").textContent).toBe("Editing");
  });

  it("EditableText disabled renders plain text and is not clickable into edit mode", () => {
    let committed: string | null = null;
    render(<EditableText value="Static" onChange={(v) => (committed = v)} label="x" disabled />);
    expect(screen.queryByTestId("editable-text-display")).toBeNull();
    expect(screen.queryByTestId("editable-text-input")).toBeNull();
    fireEvent.click(screen.getByText("Static"));
    expect(screen.queryByTestId("editable-text-input")).toBeNull();
    expect(committed).toBeNull();
  });

  it("EditableText disabled renders nothing when empty (no placeholder leak)", () => {
    const { container } = render(<EditableText value="" onChange={() => {}} label="x" disabled />);
    expect(container.textContent).toBe("");
  });
});
