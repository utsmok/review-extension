import { DragDropProvider } from "@dnd-kit/react";
import type { ReactNode } from "react";
import { computeReorder } from "./sortable-helpers";

export interface SortableListProps {
  ids: (string | number)[];
  onReorder: (nextIds: (string | number)[]) => void;
  children: ReactNode;
  className?: string;
}

/**
 * List-level wrapper that provides drag-and-drop reorder context.
 * Edit-mode-agnostic — surfaces decide when to render it.
 *
 * Relies on @dnd-kit/react's default sensor preset (PointerSensor +
 * KeyboardSensor), which ships as `defaultPreset.sensors` inside
 * DragDropProvider. Reorder works via both pointer drag and keyboard
 * (Space to pick up, arrows to move).
 */
export function SortableList({ ids, onReorder, children, className }: SortableListProps) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) return;
        const sourceId = event.operation.source?.id;
        const targetId = event.operation.target?.id;
        if (sourceId == null || targetId == null || sourceId === targetId) return;
        onReorder(computeReorder(ids, sourceId, targetId));
      }}
    >
      <div className={className}>{children}</div>
    </DragDropProvider>
  );
}
