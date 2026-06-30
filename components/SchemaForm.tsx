import { useCallback } from "react";
import { useEditMode } from "@/components/edit-mode/EditModeContext";
import InlineAddButton from "@/components/edit-mode/InlineAddButton";
import PopupEditor from "@/components/edit-mode/PopupEditor";
import RemoveButton from "@/components/edit-mode/RemoveButton";
import ReorderHandle from "@/components/edit-mode/ReorderHandle";
import {
  BooleanToggle,
  EmailInput,
  ImageInput,
  SelectInput,
  TextAreaInput,
  TextInput,
  UrlInput,
} from "@/components/field-inputs";
import { getActiveFields, getFieldValue, setFieldValue } from "@/lib/field-schema";
import type { FieldDescriptor, FieldSurface, SessionMetadata } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

// ---------------------------------------------------------------------------
// SchemaForm — renders fields driven by FieldDescriptor[] from the schema.
// Supports metadata, finalization, and settings surfaces.
// ---------------------------------------------------------------------------

export interface SchemaFormProps {
  /** Which surface to render (filters getActiveFields). */
  surface: FieldSurface;
  /** Current session data (mutated in-place on change). */
  session: SessionMetadata | Record<string, unknown>;
  /** Called after every field mutation (session already updated). */
  onChange: (desc: FieldDescriptor) => void;
  /** Optional: render extra UI (e.g. capture panel) for a given descriptor. */
  renderFieldExtra?: (desc: FieldDescriptor) => React.ReactNode;
  /** Optional: callback for image-capture actions. */
  onCapture?: (desc: FieldDescriptor) => void;
  /** Optional: field IDs to exclude from rendering. */
  excludeFields?: string[];
  /** Optional: only render these field IDs (takes precedence over excludeFields). */
  includeFields?: string[];
}

export default function SchemaForm({
  surface,
  session,
  onChange,
  renderFieldExtra,
  onCapture,
  excludeFields,
  includeFields,
}: SchemaFormProps) {
  const { editMode } = useEditMode();
  const addField = useFrameworkCustomizationStore((s) => s.addField);
  const removeCustomField = useFrameworkCustomizationStore((s) => s.removeCustomField);
  const setFieldOverride = useFrameworkCustomizationStore((s) => s.setFieldOverride);
  // Re-render when field customization changes so edits appear live; fields
  // are recomputed each render from the eager accessor.
  useFrameworkCustomizationStore((s) => s.customization);
  const allFields = getActiveFields(surface);
  const fields = includeFields
    ? allFields.filter((f) => includeFields.includes(f.id))
    : excludeFields
      ? allFields.filter((f) => !excludeFields.includes(f.id))
      : allFields;

  // Sort by group then order
  const sorted = [...fields].sort((a, b) => {
    const groupCmp = (a.group ?? "").localeCompare(b.group ?? "");
    return groupCmp !== 0 ? groupCmp : a.order - b.order;
  });
  // Add-field handler: build a FieldDescriptor from the user-supplied title
  const handleAddField = useCallback(
    (title: string) => {
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 48);
      const maxOrder = sorted.reduce((m, f) => Math.max(m, f.order), 0);
      addField({
        id,
        storageKey: id,
        surface,
        label: title,
        type: "text" as const,
        group: "",
        order: maxOrder + 1,
        enabled: true,
        custom: true,
      });
    },
    [addField, sorted, surface],
  );

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-ut-4">
      {sorted.map((desc, idx) => (
        <div key={desc.id} className="meta-field" data-testid={`field-${desc.id}`}>
          {editMode && (
            <div className="flex items-center justify-between mb-ut-1">
              <ReorderHandle
                canUp={idx > 0}
                canDown={idx < sorted.length - 1}
                onUp={() => {
                  const prev = sorted[idx - 1];
                  setFieldOverride(desc.id, { order: prev.order });
                  setFieldOverride(prev.id, { order: desc.order });
                }}
                onDown={() => {
                  const next = sorted[idx + 1];
                  setFieldOverride(desc.id, { order: next.order });
                  setFieldOverride(next.id, { order: desc.order });
                }}
                ariaLabelPrefix={desc.label}
              />
              <div className="flex items-center gap-ut-1">
                <PopupEditor ariaLabel={`Style ${desc.id} field`}>
                  <div className="flex flex-col gap-ut-2">
                    <label className="flex items-center gap-ut-1">
                      <input
                        type="checkbox"
                        checked={desc.required ?? false}
                        onChange={(e) => setFieldOverride(desc.id, { required: e.target.checked })}
                      />
                      <span className="font-heading uppercase text-ut-xs">Required</span>
                    </label>
                    <label className="flex items-center gap-ut-1">
                      <input
                        type="checkbox"
                        checked={desc.enabled}
                        onChange={(e) => setFieldOverride(desc.id, { enabled: e.target.checked })}
                      />
                      <span className="font-heading uppercase text-ut-xs">Enabled</span>
                    </label>
                  </div>
                </PopupEditor>
                {desc.custom && (
                  <RemoveButton
                    onRemove={() => removeCustomField(desc.id)}
                    confirmMessage="Remove this field? This changes the form for all reviews."
                    ariaLabel={`Remove ${desc.id}`}
                  />
                )}
              </div>
            </div>
          )}
          <FieldRenderer
            desc={desc}
            session={session}
            onChange={() => onChange(desc)}
            onCapture={onCapture}
            renderFieldExtra={renderFieldExtra}
            editable={editMode}
            onOverride={(patch) => setFieldOverride(desc.id, patch)}
          />
        </div>
      ))}
      {editMode && (
        <InlineAddButton noun="field" onAdd={handleAddField} placeholder="New field title" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal field renderer — dispatches to the correct input component
// ---------------------------------------------------------------------------
function FieldRenderer({
  desc,
  session,
  onChange,
  onCapture,
  renderFieldExtra,
  editable,
  onOverride,
}: {
  desc: FieldDescriptor;
  session: SessionMetadata | Record<string, unknown>;
  onChange: () => void;
  onCapture?: (desc: FieldDescriptor) => void;
  renderFieldExtra?: (desc: FieldDescriptor) => React.ReactNode;
  editable?: boolean;
  onOverride?: (patch: Partial<FieldDescriptor>) => void;
}) {
  const value = getFieldValue(session as SessionMetadata, desc);

  const handleChange = (v: unknown) => {
    setFieldValue(session as SessionMetadata, desc, v);
    onChange();
  };

  switch (desc.type) {
    case "text":
      return (
        <>
          <TextInput
            desc={desc}
            value={value}
            onChange={handleChange}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "textarea":
      return (
        <>
          <TextAreaInput
            desc={desc}
            value={value}
            onChange={handleChange}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "url":
      return (
        <>
          <UrlInput
            desc={desc}
            value={value}
            onChange={handleChange}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "email":
      return (
        <>
          <EmailInput
            desc={desc}
            value={value}
            onChange={handleChange}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "boolean":
      return (
        <>
          <BooleanToggle
            desc={desc}
            value={value}
            onChange={handleChange}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "image":
      return (
        <>
          <ImageInput
            desc={desc}
            value={value}
            onChange={handleChange}
            onCapture={onCapture}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "select":
    case "multi-select":
      return (
        <>
          <SelectInput
            desc={desc}
            value={value}
            onChange={handleChange}
            editable={editable}
            onOverride={onOverride}
          />
          {renderFieldExtra?.(desc)}
        </>
      );
    default:
      return null;
  }
}
