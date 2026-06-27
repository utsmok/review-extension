import { FRAMEWORK_CONFIG, type FrameworkConfig } from "@/data/framework";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import type { FieldDescriptor } from "@/lib/types";

/** Return the shipped (un-customized) framework configuration. */
export function getFrameworkConfig(): FrameworkConfig {
  return FRAMEWORK_CONFIG;
}

/** Eager: reads the customization store on every call and merges fields + grades. */
export function getActiveFrameworkConfig(): FrameworkConfig {
  const c = useFrameworkCustomizationStore.getState().customization;
  const base = FRAMEWORK_CONFIG;

  const fields: FieldDescriptor[] = [
    ...base.fields,
    ...c.customFields.map((f) => ({ ...f, custom: true })),
  ]
    .map((f) => {
      const ov = c.fieldOverrides[f.id];
      const opts = mergeOptions(f, c);
      return { ...f, ...(ov ?? {}), ...(opts ? { options: opts } : {}) };
    })
    .filter((f) => f.enabled);

  const grades = base.grades.map((g) => {
    const o = c.gradeOverrides[g.id];
    return o ? { ...g, ...o } : g;
  });

  return { ...base, fields, grades };
}

/** Apply renames + extras + hides to a select/multi-select field's options. */
function mergeOptions(
  f: FieldDescriptor,
  c: {
    renames: Record<string, Record<string, string>>;
    extraOptions: Record<string, string[]>;
    hiddenOptions: Record<string, string[]>;
  },
): string[] | undefined {
  if (!f.options) return undefined;
  const renames = c.renames[f.id] ?? {};
  const hidden = new Set(c.hiddenOptions[f.id] ?? []);
  const renamed = f.options.filter((o) => !hidden.has(o)).map((o) => renames[o] ?? o);
  const extra = c.extraOptions[f.id] ?? [];
  return [...renamed, ...extra];
}

export { FIELD_IDS, GRADE_IDS } from "@/data/framework";
