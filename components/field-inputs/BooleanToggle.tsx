import type { FieldDescriptor } from "@/lib/types";

export default function BooleanToggle({
  desc,
  value,
  onChange,
}: {
  desc: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const checked = value === true;
  return (
    <label className="meta-toggle-label flex items-center gap-ut-2 min-h-[44px] cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="meta-checkbox w-4 h-4 rounded-ut-sm border-ut-border text-ut-blue focus:ring-ut-blue"
      />
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {desc.label}
      </span>
      {checked ? (
        <span className="meta-ai-badge text-ut-xs font-mono bg-state-success-tint text-ut-green border border-ut-green/30 rounded-ut-sm px-ut-1 ml-auto">
          ON
        </span>
      ) : (
        <span className="meta-ai-badge text-ut-xs font-mono bg-ut-offwhite text-ut-muted border border-ut-border rounded-ut-sm px-ut-1 ml-auto">
          OFF
        </span>
      )}
    </label>
  );
}
