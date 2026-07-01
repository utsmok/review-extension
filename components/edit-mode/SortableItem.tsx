import { useSortable } from "@dnd-kit/react/sortable";
import { createContext, type ReactNode, useContext } from "react";

interface SortableItemContextValue {
  handleRef: (element: Element | null) => void;
  isDragging: boolean;
}

const SortableItemContext = createContext<SortableItemContextValue | null>(null);

interface SortableItemProps {
  id: string | number;
  /** Position index within the list. Required by @dnd-kit's sortable system. */
  index: number;
  children: ReactNode;
}

/**
 * Per-item wrapper that registers with dnd-kit's sortable system.
 * Provides `handleRef` and `isDragging` to descendants via context.
 */
export function SortableItem({ id, index, children }: SortableItemProps) {
  const { ref, handleRef, isDragging } = useSortable({ id, index });
  return (
    <SortableItemContext.Provider value={{ handleRef, isDragging }}>
      <div ref={ref} className={isDragging ? "opacity-50" : undefined}>
        {children}
      </div>
    </SortableItemContext.Provider>
  );
}

/**
 * Hook to read the SortableItem context from within a SortableItem subtree.
 * Throws if used outside of a SortableItem.
 */
export function useSortableItem(): SortableItemContextValue {
  const ctx = useContext(SortableItemContext);
  if (!ctx) {
    throw new Error("useSortableItem must be used within a <SortableItem>");
  }
  return ctx;
}
