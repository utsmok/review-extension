import { useEditMode } from "./EditModeContext";

/**
 * Guardrail banner shown beneath the header whenever Edit Mode is active. Makes the
 * global blast radius explicit: framework edits affect every review.
 */
export default function EditModeBanner() {
  const { editMode } = useEditMode();
  if (!editMode) return null;
  return (
    <div
      data-testid="edit-mode-banner"
      role="status"
      aria-live="polite"
      className="bg-trust-magenta/10 border-b border-trust-magenta/30 px-ut-4 py-ut-2 flex items-center gap-ut-2"
    >
      <span className="text-ut-xs text-trust-magenta-strong font-heading font-bold uppercase tracking-ut-label">
        Editing framework
      </span>
      <span className="text-ut-xs text-ut-text">
        Changes to the rubric, fields, and grades apply to <strong>all</strong> reviews.
      </span>
    </div>
  );
}
