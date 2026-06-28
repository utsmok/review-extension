import type { FieldDescriptor } from "@/lib/types";

export default function TextAreaInput({
  desc,
  value,
  onChange,
}: {
  desc: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const strVal = typeof value === "string" ? value : "";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {desc.label}
      </span>
      <textarea
        className="meta-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
        rows={3}
        maxLength={desc.maxLength}
        placeholder={desc.placeholder ?? "e.g. Enter value"}
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
      />
      {desc.helpText && <p className="text-ut-xs text-ut-muted">{desc.helpText}</p>}
    </label>
  );
}
