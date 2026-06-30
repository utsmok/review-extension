import { useEditMode } from "./EditModeContext";

/**
 * Header toggle that enters/exits Edit Mode. Renders a compact "Edit"/"Editing" pill.
 * Shown only on an active review (the parent gates it via `showEditModeToggle`).
 */
export default function EditModeToggle() {
  const { editMode, toggleEditMode } = useEditMode();
  return (
    <button
      type="button"
      onClick={toggleEditMode}
      aria-pressed={editMode}
      aria-label={editMode ? "Exit edit mode" : "Edit framework"}
      title={editMode ? "Exit edit mode" : "Edit the framework inline (affects all reviews)"}
      data-testid="edit-mode-toggle"
      className={`text-ut-xs font-heading font-bold uppercase tracking-ut-label px-ut-2 py-ut-1 rounded-ut-sm transition-colors ${
        editMode
          ? "bg-trust-magenta text-white"
          : "text-ut-muted hover:text-trust-magenta border border-ut-border"
      }`}
    >
      {editMode ? "Editing" : "Edit"}
    </button>
  );
}
