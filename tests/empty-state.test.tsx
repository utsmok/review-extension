// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmptyState from "@/components/EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Empty" description="Try adding something." />);
    expect(screen.getByText("Try adding something.")).toBeTruthy();
  });

  it("omits description paragraph when not provided", () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelectorAll("p").length).toBe(1);
  });

  it("renders the icon node", () => {
    render(<EmptyState title="No data" icon={<span data-testid="ico">icon</span>} />);
    expect(screen.getByTestId("ico")).toBeTruthy();
  });

  it("renders action button and fires onClick", async () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={{ label: "Add item", onClick }} />);
    const btn = screen.getByRole("button", { name: "Add item" });
    expect(btn).toBeTruthy();
    await btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables the action button when disabled is true", () => {
    const onClick = vi.fn();
    render(<EmptyState title="Empty" action={{ label: "Add item", onClick, disabled: true }} />);
    expect((screen.getByRole("button", { name: "Add item" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("applies extra className to the wrapper", () => {
    const { container } = render(<EmptyState title="Empty" className="my-extra" />);
    expect(container.firstElementChild!.className).toContain("my-extra");
  });
});
