import PillField from "@/components/PillField";
import { ensureArray } from "@/lib/metadata-utils";
import type { FieldDescriptor } from "@/lib/types";

export default function SelectInput({
  desc,
  value,
  onChange,
}: {
  desc: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const options = desc.options ?? [];
  const isSingle = desc.type === "select";
  const allowCustom = desc.allowCustom !== false;

  if (isSingle) {
    // Single select: treat as string | undefined
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

  // Multi-select: string[]
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
