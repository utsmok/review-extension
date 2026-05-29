import { useEffect, useRef } from "react";
import { useAutoFocus, useFocusTrap } from "@/hooks/useFocus";

interface ConfirmAction {
  label: string;
  handler: () => void;
  variant?: "danger" | "secondary" | "cancel";
}

interface ConfirmDialogProps {
  message: string;
  actions: ConfirmAction[];
}

export default function ConfirmDialog(props: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const actions = props.actions;
  const cancelAction = actions.find((a) => a.variant === "cancel")?.handler;

  useFocusTrap(panelRef);
  useAutoFocus(panelRef, "button");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelAction?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [cancelAction]);

  return (
    <button
      type="button"
      className="modal-backdrop"
      tabIndex={-1}
      onClick={cancelAction}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cancelAction?.();
        }
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-heading"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-heading" className="visually-hidden">
          Confirm action
        </h2>
        <p className="text-ut-sm text-ut-text">{props.message}</p>
        <div className="confirm-dialog-actions">
          {actions.map((action, i) => (
            <button
              key={action.label ?? action.variant ?? i}
              type="button"
              className={`btn-${action.variant ?? "secondary"}`}
              onClick={action.handler}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </button>
  );
}
