import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FRAMEWORK_CONFIG } from "@/data/framework";
import type { FieldDescriptor, FrameworkGrade } from "@/lib/types";

export interface GradeOverride extends Partial<Pick<FrameworkGrade, "label" | "description" | "color" | "tint">> {}
export interface FieldOverride extends Partial<Omit<FieldDescriptor, "id" | "storageKey" | "surface" | "type">> {}

export interface FrameworkCustomization {
  /** field id → override patch (label, required, enabled, order, group, placeholder, helpText). */
  fieldOverrides: Record<string, FieldOverride>;
  /** Fully user-created field descriptors. */
  customFields: FieldDescriptor[];
  /** select/multi-select field id → options added beyond defaults. */
  extraOptions: Record<string, string[]>;
  /** field id → shipped options hidden. */
  hiddenOptions: Record<string, string[]>;
  /** field id → { oldName: newName } for renamed shipped options. */
  renames: Record<string, Record<string, string>>;
  /** grade id → text/color override. */
  gradeOverrides: Record<string, GradeOverride>;
}

const EMPTY: FrameworkCustomization = {
  fieldOverrides: {},
  customFields: [],
  extraOptions: {},
  hiddenOptions: {},
  renames: {},
  gradeOverrides: {},
};

export interface FrameworkCustomizationState {
  customization: FrameworkCustomization;
  setFieldOverride: (id: string, patch: FieldOverride) => void;
  addField: (desc: FieldDescriptor) => void;
  removeCustomField: (id: string) => void;
  addOption: (field: string, option: string) => void;
  removeOption: (field: string, option: string) => void;
  hideOption: (field: string, option: string) => void;
  renameOption: (field: string, oldVal: string, newVal: string) => void;
  setGradeOverride: (gradeId: string, override: GradeOverride) => void;
  resetField: (field: string) => void;
  resetGrades: () => void;
  resetAll: () => void;
  hasOverrides: () => boolean;
  exportCustomization: () => FrameworkCustomization;
  importCustomization: (data: unknown) => void;
}

function isStrArr(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
function normStrArr(v: unknown): string[] {
  return isStrArr(v) ? v : [];
}
function normRenames(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>))
    if (typeof val === "string") out[k] = val;
  return out;
}
function normFieldOverride(v: unknown): FieldOverride {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: FieldOverride = {};
  if (typeof o.label === "string") out.label = o.label;
  if (typeof o.placeholder === "string") out.placeholder = o.placeholder;
  if (typeof o.helpText === "string") out.helpText = o.helpText;
  if (typeof o.required === "boolean") out.required = o.required;
  if (typeof o.enabled === "boolean") out.enabled = o.enabled;
  if (typeof o.group === "string") out.group = o.group;
  if (typeof o.order === "number") out.order = o.order;
  if (typeof o.maxLength === "number") out.maxLength = o.maxLength;
  return out;
}

function validateCustomization(data: unknown): FrameworkCustomization {
  if (!data || typeof data !== "object") throw new Error("Customization must be an object");
  const d = data as Record<string, unknown>;
  if (!d.fieldOverrides && !d.extraOptions && !d.gradeOverrides && !d.customFields)
    throw new Error("Customization has no recognized keys");
  const fieldOverrides: Record<string, FieldOverride> = {};
  const extraOptions: Record<string, string[]> = {};
  const hiddenOptions: Record<string, string[]> = {};
  const renames: Record<string, Record<string, string>> = {};
  const gradeOverrides: Record<string, GradeOverride> = {};
  const customFields: FieldDescriptor[] = Array.isArray(d.customFields)
    ? (d.customFields as FieldDescriptor[])
    : [];

  if (d.fieldOverrides && typeof d.fieldOverrides === "object")
    for (const [k, v] of Object.entries(d.fieldOverrides as Record<string, unknown>))
      fieldOverrides[k] = normFieldOverride(v);

  if (d.extraOptions && typeof d.extraOptions === "object")
    for (const [k, v] of Object.entries(d.extraOptions as Record<string, unknown>))
      extraOptions[k] = normStrArr(v);

  if (d.hiddenOptions && typeof d.hiddenOptions === "object")
    for (const [k, v] of Object.entries(d.hiddenOptions as Record<string, unknown>))
      hiddenOptions[k] = normStrArr(v);

  if (d.renames && typeof d.renames === "object")
    for (const [k, v] of Object.entries(d.renames as Record<string, unknown>))
      renames[k] = normRenames(v);

  if (d.gradeOverrides && typeof d.gradeOverrides === "object") {
    for (const [k, v] of Object.entries(d.gradeOverrides as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        gradeOverrides[k] = {
          ...(typeof o.label === "string" ? { label: o.label } : {}),
          ...(typeof o.description === "string" ? { description: o.description } : {}),
          ...(typeof o.color === "string" ? { color: o.color } : {}),
          ...(typeof o.tint === "string" ? { tint: o.tint } : {}),
        };
      }
    }
  }
  return { fieldOverrides, customFields, extraOptions, hiddenOptions, renames, gradeOverrides };
}

function shippedFieldHas(id: string): boolean {
  return FRAMEWORK_CONFIG.fields.some((f) => f.id === id);
}
function shippedOption(fieldId: string, option: string): boolean {
  return FRAMEWORK_CONFIG.fields.find((f) => f.id === fieldId)?.options?.includes(option) ?? false;
}

export const useFrameworkCustomizationStore = create<FrameworkCustomizationState>()(
  persist(
    (set, get) => ({
      customization: EMPTY,

      setFieldOverride: (id, patch) =>
        set((s) => ({
          customization: {
            ...s.customization,
            fieldOverrides: {
              ...s.customization.fieldOverrides,
              [id]: { ...s.customization.fieldOverrides[id], ...patch },
            },
          },
        })),

      addField: (desc) =>
        set((s) => ({
          customization: {
            ...s.customization,
            customFields: [
              ...s.customization.customFields.filter((f) => f.id !== desc.id),
              { ...desc, custom: true },
            ],
          },
        })),

      removeCustomField: (id) =>
        set((s) => ({
          customization: {
            ...s.customization,
            customFields: s.customization.customFields.filter((f) => f.id !== id),
          },
        })),

      addOption: (field, option) =>
        set((s) => {
          const existing = s.customization.extraOptions[field] ?? [];
          if (existing.includes(option)) return {};
          return {
            customization: {
              ...s.customization,
              extraOptions: {
                ...s.customization.extraOptions,
                [field]: [...existing, option],
              },
            },
          };
        }),

      removeOption: (field, option) =>
        set((s) => {
          const extra = s.customization.extraOptions[field] ?? [];
          if (!extra.includes(option)) return {};
          return {
            customization: {
              ...s.customization,
              extraOptions: {
                ...s.customization.extraOptions,
                [field]: extra.filter((o) => o !== option),
              },
            },
          };
        }),

      hideOption: (field, option) =>
        set((s) => {
          const hidden = s.customization.hiddenOptions[field] ?? [];
          if (hidden.includes(option)) return {};
          return {
            customization: {
              ...s.customization,
              hiddenOptions: {
                ...s.customization.hiddenOptions,
                [field]: [...hidden, option],
              },
            },
          };
        }),

      renameOption: (field, oldVal, newVal) => {
        const v = newVal.trim();
        if (!v || v === oldVal) return;
        set((s) => {
          if (shippedOption(field, oldVal)) {
            const fr = s.customization.renames[field] ?? {};
            return {
              customization: {
                ...s.customization,
                renames: { ...s.customization.renames, [field]: { ...fr, [oldVal]: v } },
              },
            };
          }
          const extra = s.customization.extraOptions[field] ?? [];
          if (!extra.includes(oldVal)) return {};
          return {
            customization: {
              ...s.customization,
              extraOptions: {
                ...s.customization.extraOptions,
                [field]: extra.map((o) => (o === oldVal ? v : o)),
              },
            },
          };
        });
      },

      setGradeOverride: (gradeId, override) =>
        set((s) => ({
          customization: {
            ...s.customization,
            gradeOverrides: {
              ...s.customization.gradeOverrides,
              [gradeId]: { ...s.customization.gradeOverrides[gradeId], ...override },
            },
          },
        })),

      resetField: (field) =>
        set((s) => {
          const { [field]: _fo, ...fieldOverrides } = s.customization.fieldOverrides;
          const { [field]: _e, ...extraOptions } = s.customization.extraOptions;
          const { [field]: _h, ...hiddenOptions } = s.customization.hiddenOptions;
          const { [field]: _r, ...renames } = s.customization.renames;
          return {
            customization: { ...s.customization, fieldOverrides, extraOptions, hiddenOptions, renames },
          };
        }),

      resetGrades: () =>
        set((s) => ({ customization: { ...s.customization, gradeOverrides: {} } })),

      resetAll: () => set({ customization: EMPTY }),

      hasOverrides: () => {
        const c = get().customization;
        return Object.values(c).some((v) =>
          Array.isArray(v) ? v.length > 0 : Object.keys(v as Record<string, unknown>).length > 0,
        );
      },

      exportCustomization: () => structuredClone(get().customization),
      importCustomization: (data) => set({ customization: validateCustomization(data) }),
    }),
    { name: "trust-framework-customization", partialize: (s) => ({ customization: s.customization }) },
  ),
);
