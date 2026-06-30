import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

/**
 * Inline remove (−) affordance with built-in confirmation. Renders a small button;
 * on click it opens a ConfirmDialog and calls `onRemove` only after confirmation.
 * Render only when editMode is on.
 */
export default function RemoveButton({
  onRemove,
  confirmMessage,
  confirmLabel = "Remove",
  ariaLabel,
}: {
  onRemove: () => void;
  confirmMessage: string;
  confirmLabel?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        title="Remove"
        className="text-ut-red hover:text-ut-red/80 p-0.5 rounded-ut-sm transition-colors"
      >
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {open && (
        <ConfirmDialog
          message={confirmMessage}
          actions={[
            { label: "Cancel", handler: () => setOpen(false), variant: "cancel" },
            {
              label: confirmLabel,
              handler: () => {
                onRemove();
                setOpen(false);
              },
              variant: "danger",
            },
          ]}
        />
      )}
    </>
  );
}
