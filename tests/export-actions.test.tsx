// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExportActions from "@/components/finalization/ExportActions";

describe("ExportActions", () => {
  let onFinalize = vi.fn();
  let onClear = vi.fn();

  beforeEach(() => {
    onFinalize = vi.fn();
    onClear = vi.fn();
  });

  afterEach(cleanup);

  function renderComponent(overrides = {}) {
    return render(
      <ExportActions
        onFinalize={onFinalize}
        onClear={onClear}
        canFinalize={true}
        saved={false}
        showClear={false}
        {...overrides}
      />,
    );
  }

  it("shows 'Lock & Finalize Review' and fires onFinalize on click", () => {
    renderComponent();
    const btn = screen.getByRole("button", { name: /lock & finalize/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(onFinalize).toHaveBeenCalledOnce();
  });

  it("disables the finalize button when canFinalize is false", () => {
    renderComponent({ canFinalize: false });
    expect(
      (screen.getByRole("button", { name: /lock & finalize/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("shows 'Re-finalize Review' text and 'Saved' badge when saved is true", () => {
    renderComponent({ saved: true });
    expect(screen.getByRole("button", { name: /re-finalize/i })).toBeDefined();
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("renders 'Clear Finalization' button when showClear is true", () => {
    renderComponent({ showClear: true });
    const clearBtn = screen.getByRole("button", { name: /clear finalization/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("omits 'Clear Finalization' button when showClear is false", () => {
    renderComponent({ showClear: false });
    expect(screen.queryByRole("button", { name: /clear finalization/i })).toBeNull();
  });
});
