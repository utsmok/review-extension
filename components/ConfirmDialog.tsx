import { useEffect, useRef } from "react";
import { useAutoFocus, useFocusTrap } from "@/lib/hooks";

interface ConfirmDialogProps {
  message: string;
  onRemoveTag: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  message,
  onRemoveTag,
  onDelete,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef);
  useAutoFocus(panelRef, "button");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-heading" className="visually-hidden">Confirm action</h2>
        <p className="text-ut-sm text-ut-text">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onRemoveTag}>
            Remove tag
          </button>
          <button type="button" className="btn-danger" onClick={onDelete}>
            Delete
          </button>
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
