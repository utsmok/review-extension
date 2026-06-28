import { useCallback, useMemo, useRef, useState } from "react";

import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CollapsibleRow,
  EditorShell,
  editorInputClass,
  LabeledField,
  Section,
} from "@/components/editor";
import { getActiveFrameworkConfig } from "@/lib/framework-config";
import { migrateOptionRename } from "@/lib/framework-migrate";
import type { FieldDescriptor, FieldSurface } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

// ─── Friendly-name maps ────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  textarea: "Long text",
  url: "URL",
  email: "Email",
  boolean: "Toggle",
  select: "Single select",
  "multi-select": "Multi-select",
  image: "Image",
};

const SURFACE_LABELS: Record<FieldSurface, string> = {
  metadata: "Tool details",
  finalization: "Finalize",
  settings: "Settings",
};

const SURFACE_DESCRIPTIONS: Record<FieldSurface, string> = {
  metadata: "Information about the tool itself — name, vendor, pricing, links.",
  finalization: "Decisions made at the end of the review — recommendation, notes.",
  settings: "Preferences that control how the review is conducted.",
};

// ─── Slug helper ───────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

// ─── InlineInput ───────────────────────────────────────────────────────

function InlineInput({
  value,
  onChange,
  className = "",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    // Sync when external value changes
    prevValue.current = value;
    setDraft(value);
  }

  const commit = useCallback(() => {
    if (draft !== value) onChange(draft);
  }, [draft, onChange, value]);

  return (
    <input
      type="text"
      value={focused ? draft : value}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      className={`${editorInputClass} ${className}`}
    />
  );
}

// ─── OptionRow ─────────────────────────────────────────────────────────

function OptionRow({
  fieldId,
  option,
  isShipped,
}: {
  fieldId: string;
  option: string;
  isShipped: boolean;
}) {
  const renameOption = useFrameworkCustomizationStore((s) => s.renameOption);
  const hideOption = useFrameworkCustomizationStore((s) => s.hideOption);
  const removeOption = useFrameworkCustomizationStore((s) => s.removeOption);

  const [confirmHide, setConfirmHide] = useState(false);

  const handleRename = useCallback(
    (newVal: string) => {
      const v = newVal.trim();
      if (!v || v === option) return;
      renameOption(fieldId, option, v);
      if (isShipped) {
        migrateOptionRename(fieldId, option, v).catch(() => {
          // Migration best-effort; rename itself is persisted
        });
      }
    },
    [fieldId, option, isShipped, renameOption],
  );

  const handleRemove = useCallback(() => {
    if (isShipped) {
      // Confirm before hiding shipped option
      setConfirmHide(true);
    } else {
      removeOption(fieldId, option);
    }
  }, [fieldId, option, isShipped, removeOption]);

  const confirmHideAction = useCallback(() => {
    hideOption(fieldId, option);
    setConfirmHide(false);
  }, [fieldId, option, hideOption]);

  return (
    <>
      {confirmHide && (
        <ConfirmDialog
          message={`Hide "${option}" from reviewers? They will no longer be able to select it.`}
          actions={[
            { label: "Cancel", handler: () => setConfirmHide(false), variant: "cancel" },
            { label: "Hide option", handler: confirmHideAction, variant: "danger" },
          ]}
        />
      )}
      <div className="flex items-center gap-1">
        <InlineInput value={option} onChange={handleRename} className="flex-1 min-w-0" />
        <button
          type="button"
          onClick={handleRemove}
          className="text-ut-red hover:text-ut-red/80 text-ut-xs font-bold px-1"
          aria-label={`Remove ${option}`}
        >
          ×
        </button>
      </div>
    </>
  );
}

// ─── FieldRow ──────────────────────────────────────────────────────────

function FieldRow({
  field,
  fieldsInGroup,
  index,
}: {
  field: FieldDescriptor;
  fieldsInGroup: FieldDescriptor[];
  index: number;
}) {
  const setFieldOverride = useFrameworkCustomizationStore((s) => s.setFieldOverride);
  const removeCustomField = useFrameworkCustomizationStore((s) => s.removeCustomField);
  const addOption = useFrameworkCustomizationStore((s) => s.addOption);

  const customization = useFrameworkCustomizationStore((s) => s.customization);
  const isEdited = !!customization.fieldOverrides[field.id] || !!field.custom;

  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleToggle = useCallback(() => {
    setFieldOverride(field.id, { enabled: !field.enabled });
  }, [field.id, field.enabled, setFieldOverride]);

  const handleLabelChange = useCallback(
    (label: string) => setFieldOverride(field.id, { label }),
    [field.id, setFieldOverride],
  );

  const handlePlaceholderChange = useCallback(
    (placeholder: string) => setFieldOverride(field.id, { placeholder }),
    [field.id, setFieldOverride],
  );

  const handleHelpTextChange = useCallback(
    (helpText: string) => setFieldOverride(field.id, { helpText }),
    [field.id, setFieldOverride],
  );

  const handleRequiredChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFieldOverride(field.id, { required: e.target.checked }),
    [field.id, setFieldOverride],
  );

  const handleMoveUp = useCallback(() => {
    if (index === 0) return;
    const prev = fieldsInGroup[index - 1];
    setFieldOverride(field.id, { order: prev.order });
    setFieldOverride(prev.id, { order: field.order });
  }, [index, field.id, field.order, fieldsInGroup, setFieldOverride]);

  const handleMoveDown = useCallback(() => {
    if (index === fieldsInGroup.length - 1) return;
    const next = fieldsInGroup[index + 1];
    setFieldOverride(field.id, { order: next.order });
    setFieldOverride(next.id, { order: field.order });
  }, [index, field.id, field.order, fieldsInGroup, setFieldOverride]);

  const handleRemoveClick = useCallback(() => {
    setConfirmRemove(true);
  }, []);

  const confirmRemoveAction = useCallback(() => {
    removeCustomField(field.id);
    setConfirmRemove(false);
  }, [field.id, removeCustomField]);

  // Current options after merge
  const activeConfig = getActiveFrameworkConfig();
  const activeField = activeConfig.fields.find((f) => f.id === field.id);
  const currentOptions = activeField?.options ?? field.options ?? [];
  const shippedOptions = field.options ?? [];

  const [newOptionDraft, setNewOptionDraft] = useState("");

  const handleAddOption = useCallback(() => {
    const v = newOptionDraft.trim();
    if (!v) return;
    addOption(field.id, v);
    setNewOptionDraft("");
  }, [field.id, newOptionDraft, addOption]);

  const hasOptions = field.type === "select" || field.type === "multi-select";
  const friendlyType = TYPE_LABELS[field.type] ?? field.type;

  // Summary line
  const summary = (
    <>
      <input
        type="checkbox"
        checked={field.enabled}
        onChange={handleToggle}
        className="shrink-0 accent-trust-magenta"
        aria-label={`Toggle ${field.label}`}
      />
      <span className={`font-bold ${!field.enabled ? "opacity-60" : ""}`}>{field.label}</span>
      <span className="text-ut-2xs text-ut-muted font-mono">{field.id}</span>
      <span className="text-ut-2xs text-ut-muted">{friendlyType}</span>

      <div className="flex gap-0.5 ml-auto shrink-0">
        <button
          type="button"
          onClick={handleMoveUp}
          disabled={index === 0}
          className="text-ut-xs text-ut-muted hover:text-ut-navy disabled:opacity-30 px-1"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={handleMoveDown}
          disabled={index === fieldsInGroup.length - 1}
          className="text-ut-xs text-ut-muted hover:text-ut-navy disabled:opacity-30 px-1"
          aria-label="Move down"
        >
          ↓
        </button>
        {field.custom && (
          <button
            type="button"
            onClick={handleRemoveClick}
            className="text-ut-xs text-ut-red hover:text-ut-red/80 px-1"
          >
            Remove
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {confirmRemove && (
        <ConfirmDialog
          message={`Remove "${field.label}" entirely? This cannot be undone.`}
          actions={[
            { label: "Cancel", handler: () => setConfirmRemove(false), variant: "cancel" },
            { label: "Remove field", handler: confirmRemoveAction, variant: "danger" },
          ]}
        />
      )}
      <CollapsibleRow summary={summary} edited={isEdited} testId={`field-row-${field.id}`}>
        <div className="space-y-ut-2">
          <LabeledField label="Label" hint="The name shown to reviewers on the form.">
            <InlineInput value={field.label} onChange={handleLabelChange} />
          </LabeledField>

          <LabeledField
            label="Placeholder"
            hint="Example text shown inside the field before anyone types."
          >
            <InlineInput value={field.placeholder ?? ""} onChange={handlePlaceholderChange} />
          </LabeledField>

          <LabeledField label="Help text" hint="Extra guidance shown beneath the field.">
            <InlineInput value={field.helpText ?? ""} onChange={handleHelpTextChange} />
          </LabeledField>

          <label className="flex items-center gap-2 text-ut-xs">
            <input
              type="checkbox"
              checked={field.required ?? false}
              onChange={handleRequiredChange}
              className="accent-trust-magenta"
            />
            <span>Required — reviewers must fill this in</span>
          </label>

          {hasOptions && (
            <div className="border-t border-ut-border pt-ut-2 space-y-ut-1">
              <h4 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
                Options
              </h4>
              {currentOptions.map((opt) => (
                <OptionRow
                  key={opt}
                  fieldId={field.id}
                  option={opt}
                  isShipped={shippedOptions.includes(opt)}
                />
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newOptionDraft}
                  onChange={(e) => setNewOptionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddOption();
                  }}
                  placeholder="New option…"
                  className={`${editorInputClass} flex-1 min-w-0`}
                />
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-ut-xs text-trust-magenta hover:text-trust-magenta/80 font-bold px-1"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleRow>
    </>
  );
}

// ─── AddFieldForm ──────────────────────────────────────────────────────

function AddFieldForm() {
  const addField = useFrameworkCustomizationStore((s) => s.addField);
  const [label, setLabel] = useState("");
  const [surface, setSurface] = useState<FieldSurface>("metadata");
  const [type, setType] = useState<FieldDescriptor["type"]>("text");
  const [group, setGroup] = useState("");

  const idSlug = slugify(label);

  const handleSubmit = useCallback(() => {
    const id = idSlug;
    if (!id || !label.trim()) return;
    const desc: FieldDescriptor = {
      id,
      storageKey: id,
      surface,
      label: label.trim(),
      type,
      group: group.trim() || undefined,
      order: 100,
      enabled: true,
      custom: true,
    };
    addField(desc);
    setLabel("");
    setGroup("");
  }, [idSlug, label, surface, type, group, addField]);

  const canSubmit = !!idSlug && !!label.trim();

  return (
    <Section
      title="Add a new field"
      description="Create a custom field that reviewers will see on this surface."
    >
      <div className="space-y-ut-2">
        <LabeledField label="Field label" hint="The name reviewers will see on the form.">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. License tier"
            className={editorInputClass}
          />
        </LabeledField>

        <LabeledField
          label="ID (auto-generated)"
          hint="Internal identifier. Created automatically from the label."
        >
          <input
            type="text"
            value={idSlug}
            readOnly
            className={`${editorInputClass} opacity-60 cursor-not-allowed font-mono`}
          />
        </LabeledField>

        <div className="grid grid-cols-2 gap-ut-2">
          <LabeledField label="Surface" hint="Where on the form this field appears.">
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value as FieldSurface)}
              className={editorInputClass}
            >
              <option value="metadata">Tool details</option>
              <option value="finalization">Finalize</option>
              <option value="settings">Settings</option>
            </select>
          </LabeledField>

          <LabeledField label="Field type" hint="What kind of answer the field collects.">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FieldDescriptor["type"])}
              className={editorInputClass}
            >
              <option value="text">Text</option>
              <option value="textarea">Long text</option>
              <option value="url">URL</option>
              <option value="email">Email</option>
              <option value="boolean">Toggle</option>
              <option value="select">Single select</option>
              <option value="multi-select">Multi-select</option>
              <option value="image">Image</option>
            </select>
          </LabeledField>
        </div>

        <LabeledField
          label="Group (optional)"
          hint="Group label to visually organize related fields."
        >
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="e.g. Profile"
            className={editorInputClass}
          />
        </LabeledField>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-trust-magenta text-white hover:bg-trust-magenta-strong disabled:opacity-30 rounded-ut-sm px-ut-3 py-ut-1 font-heading uppercase tracking-ut-label text-ut-xs"
        >
          Add field
        </button>
      </div>
    </Section>
  );
}

// ─── SurfaceSection ────────────────────────────────────────────────────

function SurfaceSection({ surface }: { surface: FieldSurface }) {
  const activeConfig = getActiveFrameworkConfig();
  const customFields = useFrameworkCustomizationStore((s) => s.customization.customFields);

  const merged = useMemo(() => {
    const custom = customFields.filter((f) => f.surface === surface);
    return [...activeConfig.fields.filter((f) => f.surface === surface), ...custom];
  }, [activeConfig, customFields, surface]);

  const grouped = useMemo(() => {
    const groups: Record<string, FieldDescriptor[]> = {};
    for (const f of merged) {
      const g = f.group ?? "";
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    for (const arr of Object.values(groups)) arr.sort((a, b) => a.order - b.order);
    return groups;
  }, [merged]);

  const surfaceLabel = SURFACE_LABELS[surface];

  return (
    <Section title={surfaceLabel} description={SURFACE_DESCRIPTIONS[surface]}>
      <div className="space-y-ut-3">
        {Object.entries(grouped).map(([group, fields]) => (
          <div key={group}>
            {group && (
              <h4 className="text-ut-2xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta mb-ut-1">
                {group}
              </h4>
            )}
            <div className="space-y-ut-2">
              {fields.map((f, i) => (
                <FieldRow key={f.id} field={f} fieldsInGroup={fields} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Main FieldEditor ──────────────────────────────────────────────────

export default function FieldEditor({ onBack }: { onBack: () => void }) {
  const resetField = useFrameworkCustomizationStore((s) => s.resetField);
  const removeCustomField = useFrameworkCustomizationStore((s) => s.removeCustomField);
  const customization = useFrameworkCustomizationStore((s) => s.customization);
  const [confirmReset, setConfirmReset] = useState(false);

  const hasFieldOverrides = useFrameworkCustomizationStore((s) => {
    const c = s.customization;
    return (
      Object.keys(c.fieldOverrides).length > 0 ||
      c.customFields.length > 0 ||
      Object.keys(c.extraOptions).length > 0 ||
      Object.keys(c.hiddenOptions).length > 0 ||
      Object.keys(c.renames).length > 0
    );
  });

  const handleResetFields = useCallback(() => {
    // Reset all field overrides
    for (const id of Object.keys(customization.fieldOverrides)) {
      resetField(id);
    }
    // Remove all custom fields
    for (const cf of customization.customFields) {
      removeCustomField(cf.id);
    }
    setConfirmReset(false);
  }, [customization.fieldOverrides, customization.customFields, resetField, removeCustomField]);

  const footer = hasFieldOverrides ? (
    <>
      {confirmReset && (
        <ConfirmDialog
          message="Reset all field changes? Custom fields, reorders, renames, and hidden options will be removed. This cannot be undone."
          actions={[
            { label: "Cancel", handler: () => setConfirmReset(false), variant: "cancel" },
            { label: "Reset fields", handler: handleResetFields, variant: "danger" },
          ]}
        />
      )}
      <button
        type="button"
        onClick={() => setConfirmReset(true)}
        className="text-trust-magenta hover:underline text-ut-xs font-heading uppercase tracking-ut-label"
      >
        Reset fields to default
      </button>
    </>
  ) : null;

  return (
    <EditorShell
      title="Fields & options"
      subtitle="Toggle, rename, reorder, or add the entry fields reviewers fill in. Changes apply to new reviews."
      onBack={onBack}
      footer={footer}
    >
      <div className="space-y-ut-6">
        <SurfaceSection surface="metadata" />
        <SurfaceSection surface="finalization" />
        <SurfaceSection surface="settings" />
        <AddFieldForm />
      </div>
    </EditorShell>
  );
}
