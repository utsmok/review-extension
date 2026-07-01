// @vitest-environment jsdom

import { vi } from "vitest";

// dnd-kit uses ResizeObserver which jsdom doesn't provide — hoist before imports
vi.hoisted(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DragHandle } from "@/components/edit-mode/DragHandle";
import { SortableItem, useSortableItem } from "@/components/edit-mode/SortableItem";
import { SortableList } from "@/components/edit-mode/SortableList";

afterEach(cleanup);

function DummyList({
  ids,
  onReorder,
}: {
  ids: (string | number)[];
  onReorder: (nextIds: (string | number)[]) => void;
}) {
  return (
    <SortableList ids={ids} onReorder={onReorder}>
      {ids.map((id, index) => (
        <SortableItem key={id} id={id} index={index}>
          <div data-testid={`item-${id}`}>{String(id).toUpperCase()}</div>
          <DragHandle ariaLabel={`Reorder ${id}`} />
        </SortableItem>
      ))}
    </SortableList>
  );
}

describe("SortableList + SortableItem + DragHandle", () => {
  it("renders all items with correct content", () => {
    render(<DummyList ids={["a", "b", "c"]} onReorder={vi.fn()} />);
    expect(screen.getByTestId("item-a").textContent).toBe("A");
    expect(screen.getByTestId("item-b").textContent).toBe("B");
    expect(screen.getByTestId("item-c").textContent).toBe("C");
  });

  it("renders DragHandle buttons with correct aria-labels", () => {
    render(<DummyList ids={["a", "b"]} onReorder={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Reorder a" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reorder b" })).toBeDefined();
  });

  it("does not call onReorder on mount", () => {
    const onReorder = vi.fn();
    render(<DummyList ids={["a", "b", "c"]} onReorder={onReorder} />);
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("useSortableItem", () => {
  it("throws when used outside a SortableItem", () => {
    function BadConsumer() {
      useSortableItem();
      return null;
    }

    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(
      "useSortableItem must be used within a <SortableItem>",
    );
    spy.mockRestore();
  });
});
