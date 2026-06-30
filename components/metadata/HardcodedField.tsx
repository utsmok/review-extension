import type { ReactNode } from "react";
import { useEditMode } from "@/components/edit-mode/EditModeContext";
import PopupEditor from "@/components/edit-mode/PopupEditor";
import EditableText from "@/components/editor/EditableText";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/**
 * Wraps a HARDCODED metadata field (one with bespoke logic that can't become a
 * FieldDescriptor) so that — in Edit Mode — its label/help/visibility can be
 * customized inline, while the field's behaviour stays hardcoded.
 *
 * Overrides are stored under the existing fieldOverrides via a synthetic id
 * (e.g. "meta.description"). `enabled: false` hides the field in review mode.
 *
 * Props:
 * - fieldId: synthetic override key (prefix "meta." to avoid real-field collisions).
 * - defaultLabel / defaultHelp: the shipped wording.
 * - children: the field's control (input, toggle, etc.), WITHOUT its own label.
 * - as: wrapper element — "label" (default, for simple inputs) or "div" (when
 *   children already contain a label/interactive control, e.g. a toggle).
 */
export default function HardcodedField({
  fieldId,
  defaultLabel,
  defaultHelp,
  children,
  as = "label",
}: {
  fieldId: string;
  defaultLabel: string;
  defaultHelp?: string;
  children: ReactNode;
  as?: "label" | "div";
}) {
  const { editMode } = useEditMode();
  const override = useFrameworkCustomizationStore((s) => s.customization.fieldOverrides[fieldId]);
  const setFieldOverride = useFrameworkCustomizationStore((s) => s.setFieldOverride);

  const label = override?.label ?? defaultLabel;
  const help = override?.helpText ?? defaultHelp;
  const hidden = override?.enabled === false;

  // Review mode: hide hidden fields entirely.
  if (!editMode && hidden) return null;

  const labelClass = "text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy";
  const Tag = as;

  // Edit mode: affordances (editable label + help + visibility toggle), always
  // rendered so a hidden field can be un-hidden.
  if (editMode) {
    return (
      <div
        className={`flex flex-col gap-1 ${hidden ? "opacity-50" : ""}`}
        data-testid={`hardcoded-field-${fieldId}`}
      >
        <div className="flex items-center justify-between gap-ut-1">
          <EditableText
            multiline={false}
            value={label}
            onChange={(v) => setFieldOverride(fieldId, { label: v })}
            label={`${fieldId} label`}
            className={labelClass}
          />
          <PopupEditor ariaLabel={`Options for ${label}`}>
            <label className="flex items-center gap-ut-1">
              <input
                type="checkbox"
                checked={!hidden}
                onChange={(e) => setFieldOverride(fieldId, { enabled: e.target.checked })}
              />
              <span className="font-heading uppercase text-ut-xs">Visible</span>
            </label>
          </PopupEditor>
        </div>
        {children}
        <EditableText
          value={help ?? ""}
          onChange={(v) => setFieldOverride(fieldId, { helpText: v })}
          label={`${fieldId} help`}
          placeholder="Add a description / help text"
          className="text-ut-xs text-ut-muted"
        />
      </div>
    );
  }

  // Review mode (visible): standard labelled field.
  return (
    <Tag className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
      {help && <p className="text-ut-xs text-ut-muted">{help}</p>}
    </Tag>
  );
}
