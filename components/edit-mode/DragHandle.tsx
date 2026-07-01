import { useSortableItem } from "./SortableItem";

interface DragHandleProps {
  ariaLabel: string;
  className?: string;
}

/**
 * A drag grip button that activates dnd-kit drag on the parent SortableItem.
 * The `handleRef` from `useSortable()` is attached so only this element
 * initiates a drag (not the entire item).
 */
export function DragHandle({ ariaLabel, className }: DragHandleProps) {
  const { handleRef } = useSortableItem();

  return (
    <button
      type="button"
      ref={handleRef}
      aria-label={ariaLabel}
      className={`cursor-grab active:cursor-grabbing text-ut-muted hover:text-ut-navy p-0.5 transition-colors touch-none ${className ?? ""}`}
    >
      <svg aria-hidden="true" className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
        <circle cx="3" cy="2.5" r="1" />
        <circle cx="9" cy="2.5" r="1" />
        <circle cx="3" cy="6" r="1" />
        <circle cx="9" cy="6" r="1" />
        <circle cx="3" cy="9.5" r="1" />
        <circle cx="9" cy="9.5" r="1" />
      </svg>
    </button>
  );
}
