import EditableText from "@/components/editor/EditableText";
import PillField from "@/components/PillField";
import { ensureArray } from "@/lib/metadata-utils";
import type { FieldDescriptor } from "@/lib/types";

export default function SelectInput({
  desc,
  value,
  onChange,
  editable,
  onOverride,
}: {
  desc: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  editable?: boolean;
  onOverride?: (patch: Partial<FieldDescriptor>) => void;
}) {
  const options = desc.options ?? [];
  const isSingle = desc.type === "select";
  const allowCustom = desc.allowCustom !== false;

  // When editable, render label externally as EditableText and hide PillField's
  // internal legend. When not editable, keep the original structure unchanged.
  if (editable) {
    const label = (
      <EditableText
        disabled={false}
        multiline={false}
        value={desc.label}
        onChange={(v) => onOverride?.({ label: v })}
        label={`${desc.id} label`}
        className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy"
      />
    );

    const help = (
      <EditableText
        disabled={false}
        value={desc.helpText ?? ""}
        onChange={(v) => onOverride?.({ helpText: v })}
        label={`${desc.id} help`}
        className="text-ut-xs text-ut-muted"
      />
    );

    if (isSingle) {
      const current = typeof value === "string" ? value : "";
      return (
        <div className="flex flex-col gap-1">
          {label}
          <PillField
            label=""
            hideLabel
            options={options}
            selected={current ? [current] : []}
            onChange={(next) => onChange(next[0] ?? "")}
            placeholder={desc.placeholder ?? "Select one..."}
            allowCustom={allowCustom}
            single
          />
          {help}
        </div>
      );
    }

    const current = ensureArray(value as string | string[] | undefined);
    return (
      <div className="flex flex-col gap-1">
        {label}
        <PillField
          label=""
          hideLabel
          options={options}
          selected={current}
          onChange={(next) => onChange(next)}
          placeholder={desc.placeholder ?? "Add custom..."}
          allowCustom={allowCustom}
        />
        {help}
      </div>
    );
  }

  // Non-editable: preserve original rendering exactly
  if (isSingle) {
    const current = typeof value === "string" ? value : "";
    return (
      <PillField
        label={desc.label}
        options={options}
        selected={current ? [current] : []}
        onChange={(next) => onChange(next[0] ?? "")}
        placeholder={desc.placeholder ?? "Select one..."}
        allowCustom={allowCustom}
        single
      />
    );
  }

  const current = ensureArray(value as string | string[] | undefined);
  return (
    <PillField
      label={desc.label}
      options={options}
      selected={current}
      onChange={(next) => onChange(next)}
      placeholder={desc.placeholder ?? "Add custom..."}
      allowCustom={allowCustom}
    />
  );
}
