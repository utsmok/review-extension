import EditableText from "@/components/editor/EditableText";
import type { FieldDescriptor } from "@/lib/types";

export default function BooleanToggle({
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
  const checked = value === true;

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

  if (editable) {
    return (
      <div className="meta-toggle-label flex items-center gap-ut-2 min-h-[44px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="meta-checkbox w-4 h-4 rounded-ut-sm border-ut-border text-ut-blue focus:ring-ut-blue"
          id={`cb-${desc.id}`}
        />
        {label}
        {checked ? (
          <span className="meta-ai-badge text-ut-xs font-mono bg-state-success-tint text-ut-green border border-ut-green/30 rounded-ut-sm px-ut-1 ml-auto">
            ON
          </span>
        ) : (
          <span className="meta-ai-badge text-ut-xs font-mono bg-ut-offwhite text-ut-muted border border-ut-border rounded-ut-sm px-ut-1 ml-auto">
            OFF
          </span>
        )}
      </div>
    );
  }

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
