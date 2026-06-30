import EditableText from "@/components/editor/EditableText";
import type { FieldDescriptor } from "@/lib/types";

export default function EmailInput({
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
  const strVal = typeof value === "string" ? value : "";

  const label = (
    <EditableText
      disabled={!editable}
      multiline={false}
      value={desc.label}
      onChange={(v) => onOverride?.({ label: v })}
      label={`${desc.id} label`}
      className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy"
    />
  );

  const input = (
    <input
      id={desc.id}
      type="email"
      className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue overflow-hidden text-ellipsis"
      maxLength={desc.maxLength}
      placeholder={desc.placeholder ?? "e.g. user@example.com"}
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const help =
    editable || desc.helpText ? (
      <EditableText
        disabled={!editable}
        value={desc.helpText ?? ""}
        onChange={(v) => onOverride?.({ helpText: v })}
        label={`${desc.id} help`}
        className="text-ut-xs text-ut-muted"
      />
    ) : null;

  if (editable) {
    return (
      <div className="flex flex-col gap-1">
        {label}
        {input}
        {help}
      </div>
    );
  }

  return (
    <label htmlFor={desc.id} className="flex flex-col gap-1">
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {desc.label}
      </span>
      {input}
      {desc.helpText && <p className="text-ut-xs text-ut-muted">{desc.helpText}</p>}
    </label>
  );
}
