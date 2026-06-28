import { useCallback, useMemo, useRef, useState } from "react";
import { downloadBlob } from "@/lib/export";

import { getActiveFrameworkConfig, getActiveGrades } from "@/lib/framework-config";
import { migrateOptionRename } from "@/lib/framework-migrate";
import type { FieldDescriptor, FieldSurface, FrameworkGrade } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

// ─── downloadJSON helper ─────────────────────────────────────────────────

function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

// ─── Inline input ─────────────────────────────────────────────────────────

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
      className={`text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white ${className}`}
    />
  );
}

// ─── OptionRow ──────────────────────────────────────────────────────────

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
      hideOption(fieldId, option);
    } else {
      removeOption(fieldId, option);
    }
  }, [fieldId, option, isShipped, hideOption, removeOption]);

  return (
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
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────

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

  const handleRemove = useCallback(
    () => removeCustomField(field.id),
    [field.id, removeCustomField],
  );

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

  return (
    <div
      className={`border border-ut-border rounded p-ut-2 space-y-ut-1 ${!field.enabled ? "opacity-60" : ""}`}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-1 text-ut-xs">
          <input type="checkbox" checked={field.enabled} onChange={handleToggle} />
          <span className="font-bold">{field.id}</span>
        </label>
        <InlineInput value={field.label} onChange={handleLabelChange} className="w-36" />
        <span className="text-ut-xs text-ut-muted">{field.type}</span>
        <span className="text-ut-xs text-ut-muted">{field.surface}</span>

        <div className="flex gap-0.5 ml-auto">
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
              onClick={handleRemove}
              className="text-ut-xs text-ut-red hover:text-ut-red/80 px-1"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Sub-fields */}
      <div className="grid grid-cols-2 gap-x-ut-2 gap-y-ut-1 text-ut-xs">
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Placeholder</span>
          <InlineInput
            value={field.placeholder ?? ""}
            onChange={handlePlaceholderChange}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Help text</span>
          <InlineInput
            value={field.helpText ?? ""}
            onChange={handleHelpTextChange}
            className="flex-1 min-w-0"
          />
        </div>
        <label className="flex items-center gap-1 col-span-2">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={handleRequiredChange}
          />
          <span>Required</span>
        </label>
      </div>

      {/* Options sub-list for select/multi-select */}
      {hasOptions && (
        <div className="mt-1 space-y-1 border-t border-ut-border pt-ut-1">
          <h4 className="text-ut-xs font-bold text-ut-navy">Options</h4>
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
              className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
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
  );
}

// ─── GradeRow ─────────────────────────────────────────────────────────────

function GradeRow({ grade }: { grade: FrameworkGrade }) {
  const setGradeOverride = useFrameworkCustomizationStore((s) => s.setGradeOverride);

  const update = useCallback(
    (patch: Parameters<typeof setGradeOverride>[1]) => setGradeOverride(grade.id, patch),
    [grade.id, setGradeOverride],
  );

  return (
    <div className="border border-ut-border rounded p-ut-2 space-y-ut-1 text-ut-xs">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-sm ${grade.color}`} />
        <span className="font-bold">{grade.id}</span>
        <span className="text-ut-muted">{grade.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-ut-2 gap-y-ut-1">
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Label</span>
          <InlineInput
            value={grade.label}
            onChange={(v) => update({ label: v })}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Description</span>
          <InlineInput
            value={grade.description}
            onChange={(v) => update({ description: v })}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Color</span>
          <InlineInput
            value={grade.color}
            onChange={(v) => update({ color: v })}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Tint</span>
          <InlineInput
            value={grade.tint}
            onChange={(v) => update({ tint: v })}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Report color</span>
          <InlineInput
            value={grade.reportColor}
            onChange={(v) => update({ reportColor: v })}
            className="flex-1 min-w-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Report label</span>
          <InlineInput
            value={grade.reportLabel}
            onChange={(v) => update({ reportLabel: v })}
            className="flex-1 min-w-0"
          />
        </div>
      </div>
    </div>
  );
}

// ─── AddFieldForm ─────────────────────────────────────────────────────────

function AddFieldForm() {
  const addField = useFrameworkCustomizationStore((s) => s.addField);
  const [id, setId] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [label, setLabel] = useState("");
  const [surface, setSurface] = useState<FieldSurface>("metadata");
  const [type, setType] = useState<FieldDescriptor["type"]>("text");
  const [group, setGroup] = useState("");

  const handleSubmit = useCallback(() => {
    const desc: FieldDescriptor = {
      id: id.trim(),
      storageKey: storageKey.trim() || id.trim(),
      surface,
      label: label.trim(),
      type,
      group: group.trim() || undefined,
      order: 100,
      enabled: true,
      custom: true,
    };
    addField(desc);
    setId("");
    setStorageKey("");
    setLabel("");
    setGroup("");
  }, [id, storageKey, label, surface, type, group, addField]);

  return (
    <div className="border border-dashed border-ut-border rounded p-ut-2 space-y-ut-1 text-ut-xs">
      <h4 className="font-bold text-ut-navy">Add field</h4>
      <div className="grid grid-cols-2 gap-x-ut-2 gap-y-ut-1">
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">ID</span>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Storage key</span>
          <input
            type="text"
            value={storageKey}
            onChange={(e) => setStorageKey(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Surface</span>
          <select
            value={surface}
            onChange={(e) => setSurface(e.target.value as FieldSurface)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1"
          >
            <option value="metadata">Metadata</option>
            <option value="finalization">Finalization</option>
            <option value="settings">Settings</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FieldDescriptor["type"])}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1"
          >
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="url">URL</option>
            <option value="email">Email</option>
            <option value="boolean">Boolean</option>
            <option value="select">Select</option>
            <option value="multi-select">Multi-select</option>
            <option value="image">Image</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-20 shrink-0">Group</span>
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!id.trim() || !label.trim()}
        className="text-ut-xs text-trust-magenta hover:text-trust-magenta/80 font-bold disabled:opacity-30"
      >
        Add field
      </button>
    </div>
  );
}

// ─── SurfaceSection ───────────────────────────────────────────────────────

function SurfaceSection({ surface }: { surface: FieldSurface }) {
  const activeConfig = getActiveFrameworkConfig();

  const merged = useMemo(() => {
    const custom = useFrameworkCustomizationStore
      .getState()
      .customization.customFields.filter((f) => f.surface === surface);
    return [...activeConfig.fields.filter((f) => f.surface === surface), ...custom];
  }, [activeConfig, surface]);

  const grouped = useMemo(() => {
    const groups = new Map<string, FieldDescriptor[]>();
    for (const f of merged) {
      const g = f.group ?? "";
      const arr = groups.get(g) ?? [];
      arr.push(f);
      groups.set(g, arr);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.order - b.order);
    return groups;
  }, [merged]);

  return (
    <section>
      <h3 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1 capitalize">
        {surface}
      </h3>
      <div className="space-y-ut-3">
        {Array.from(grouped.entries()).map(([group, fields]) => (
          <div key={group}>
            {group && <h4 className="text-ut-xs font-bold text-trust-magenta mb-ut-1">{group}</h4>}
            <div className="space-y-ut-2">
              {fields.map((f, i) => (
                <FieldRow key={f.id} field={f} fieldsInGroup={fields} index={i} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Main FieldEditor ────────────────────────────────────────────────────

export default function FieldEditor({ onBack }: { onBack: () => void }) {
  const resetAll = useFrameworkCustomizationStore((s) => s.resetAll);
  const exportCustomization = useFrameworkCustomizationStore((s) => s.exportCustomization);
  const importCustomization = useFrameworkCustomizationStore((s) => s.importCustomization);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"fields" | "grades">("fields");

  const grades = getActiveGrades();

  const handleExport = useCallback(() => {
    downloadJSON("trust-framework-customization.json", exportCustomization());
  }, [exportCustomization]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importCustomization(JSON.parse(reader.result as string));
        } catch {
          // Invalid JSON — silently ignore
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [importCustomization],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-ut-border px-ut-4 py-ut-2 flex items-center gap-2">
        <button
          type="button"
          className="text-ut-muted hover:text-ut-navy transition-colors p-0.5"
          onClick={onBack}
          aria-label="Back"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="font-heading text-ut-sub font-bold uppercase tracking-ut-heading text-trust-magenta">
          Customize Fields
        </h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-ut-border px-ut-4 flex gap-ut-3">
        {(["fields", "grades"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`text-ut-xs font-bold pb-1 border-b-2 transition-colors ${
              tab === t
                ? "border-trust-magenta text-trust-magenta"
                : "border-transparent text-ut-muted hover:text-ut-navy"
            }`}
          >
            {t === "fields" ? "Fields" : "Grade Display"}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-5">
        {tab === "fields" && (
          <>
            <SurfaceSection surface="metadata" />
            <SurfaceSection surface="finalization" />
            <SurfaceSection surface="settings" />
            <AddFieldForm />
          </>
        )}

        {tab === "grades" && (
          <section>
            <h3 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
              Grades
            </h3>
            <div className="space-y-ut-2">
              {grades.map((g) => (
                <GradeRow key={g.id} grade={g} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-ut-border px-ut-4 py-ut-2 flex items-center gap-ut-3">
        <button
          type="button"
          onClick={resetAll}
          className="text-ut-xs text-ut-red hover:text-ut-red/80 font-bold"
        >
          Reset all
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="text-ut-xs text-ut-navy hover:text-ut-navy/80 font-bold"
        >
          Export customization
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-ut-xs text-ut-navy hover:text-ut-navy/80 font-bold"
        >
          Import customization
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  );
}
