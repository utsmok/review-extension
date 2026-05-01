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
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
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
