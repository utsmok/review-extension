import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FRAMEWORK_CONFIG } from "@/data/framework";
import type {
  FieldDescriptor,
  FrameworkBranding,
  FrameworkGrade,
  FrameworkPrinciple,
  RubricOverride,
} from "@/lib/types";

/** Deep-partial branding for overrides — each sub-object is also partial. */
type PartialBranding = {
  [K in keyof FrameworkBranding]?: FrameworkBranding[K] extends object
    ? Partial<FrameworkBranding[K]>
    : FrameworkBranding[K];
};

export interface GradeOverride
  extends Partial<
    Pick<FrameworkGrade, "label" | "description" | "color" | "tint" | "reportColor" | "reportLabel">
  > {}
export interface FieldOverride
  extends Partial<Omit<FieldDescriptor, "id" | "storageKey" | "surface" | "type">> {}

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
  /** Rubric overrides — value patches, added/removed questions, reorder. */
  rubric: RubricOverride;
  /** Additional grades added by the user. */
  gradeAdditions: FrameworkGrade[];
  /** Grade ids removed by the user. */
  gradeRemovals: string[];
  /** principle id → partial override (color, fullName, etc.). */
  principleOverrides: Record<string, Partial<FrameworkPrinciple>>;
  /** Partial branding overrides (logos.framework data URL for custom uploads, etc.). */
  brandingOverrides: PartialBranding;
}

const EMPTY: FrameworkCustomization = {
  fieldOverrides: {},
  customFields: [],
  extraOptions: {},
  hiddenOptions: {},
  renames: {},
  gradeOverrides: {},
  rubric: { valuePatches: {}, addedQuestions: [], removedQuestions: [], order: {} },
  gradeAdditions: [],
  gradeRemovals: [],
  principleOverrides: {},
  brandingOverrides: {},
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
  addGrade: (grade: FrameworkGrade) => void;
  removeGrade: (gradeId: string) => void;
  resetField: (field: string) => void;
  resetGrades: () => void;
  resetAll: () => void;
  hasOverrides: () => boolean;
  exportCustomization: () => FrameworkCustomization;
  importCustomization: (data: unknown) => void;
  // Rubric
  setRubricOverride: (path: string[], value: unknown) => void;
  addRubricQuestion: (
    section: "quality_gate" | "scoring_rubric",
    parent: string,
    question: Record<string, unknown>,
  ) => void;
  removeRubricQuestion: (
    section: "quality_gate" | "scoring_rubric",
    parent: string,
    key: string,
  ) => void;
  reorderRubricQuestions: (parent: string, keys: string[]) => void;
  resetRubric: () => void;
  // Principles
  setPrincipleOverride: (id: string, patch: Partial<FrameworkPrinciple>) => void;
  resetPrinciple: (id: string) => void;
  // Branding
  setBrandingOverrides: (patch: PartialBranding) => void;
  resetBranding: () => void;
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
function normGrade(v: unknown): FrameworkGrade | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  return {
    id: o.id,
    label: typeof o.label === "string" ? o.label : o.id,
    description: typeof o.description === "string" ? o.description : "",
    color: typeof o.color === "string" ? o.color : "bg-gray-500",
    tint: typeof o.tint === "string" ? o.tint : "bg-gray-100",
    reportColor: typeof o.reportColor === "string" ? o.reportColor : "#4c5e74",
    reportLabel: typeof o.reportLabel === "string" ? o.reportLabel : o.id.toUpperCase(),
  };
}
function normRubricOverride(v: unknown): RubricOverride {
  if (!v || typeof v !== "object") return EMPTY.rubric;
  const o = v as Record<string, unknown>;
  const valuePatches =
    o.valuePatches && typeof o.valuePatches === "object"
      ? (o.valuePatches as Record<string, unknown>)
      : {};
  const addedQuestions = Array.isArray(o.addedQuestions)
    ? (o.addedQuestions as RubricOverride["addedQuestions"]).filter(
        (q) =>
          q &&
          typeof q.section === "string" &&
          typeof q.parent === "string" &&
          typeof q.key === "string" &&
          q.def &&
          typeof q.def === "object",
      )
    : [];
  const removedQuestions = Array.isArray(o.removedQuestions)
    ? (o.removedQuestions as RubricOverride["removedQuestions"]).filter(
        (q) =>
          q &&
          typeof q.section === "string" &&
          typeof q.parent === "string" &&
          typeof q.key === "string",
      )
    : [];
  const order: Record<string, string[]> = {};
  if (o.order && typeof o.order === "object") {
    for (const [k, val] of Object.entries(o.order as Record<string, unknown>)) {
      if (isStrArr(val)) order[k] = val;
    }
  }
  return { valuePatches, addedQuestions, removedQuestions, order };
}
function normPrincipleOverride(v: unknown): Partial<FrameworkPrinciple> {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: Partial<FrameworkPrinciple> = {};
  if (typeof o.color === "string") out.color = o.color;
  if (typeof o.reportColor === "string") out.reportColor = o.reportColor;
  if (typeof o.fullName === "string") out.fullName = o.fullName;
  return out;
}

function validateCustomization(data: unknown): FrameworkCustomization {
  if (!data || typeof data !== "object") throw new Error("Customization must be an object");
  const d = data as Record<string, unknown>;
  const fieldOverrides: Record<string, FieldOverride> = {};
  const extraOptions: Record<string, string[]> = {};
  const hiddenOptions: Record<string, string[]> = {};
  const renames: Record<string, Record<string, string>> = {};
  const gradeOverrides: Record<string, GradeOverride> = {};
  const customFields: FieldDescriptor[] = Array.isArray(d.customFields)
    ? (d.customFields as FieldDescriptor[])
    : [];
  const gradeAdditions: FrameworkGrade[] = Array.isArray(d.gradeAdditions)
    ? (d.gradeAdditions as unknown[]).map(normGrade).filter((g): g is FrameworkGrade => g !== null)
    : [];
  const gradeRemovals: string[] = isStrArr(d.gradeRemovals) ? d.gradeRemovals : [];
  const principleOverrides: Record<string, Partial<FrameworkPrinciple>> = {};
  const brandingOverrides: PartialBranding = {};

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
          ...(typeof o.reportColor === "string" ? { reportColor: o.reportColor } : {}),
          ...(typeof o.reportLabel === "string" ? { reportLabel: o.reportLabel } : {}),
        };
      }
    }
  }

  if (d.principleOverrides && typeof d.principleOverrides === "object")
    for (const [k, v] of Object.entries(d.principleOverrides as Record<string, unknown>))
      principleOverrides[k] = normPrincipleOverride(v);

  if (d.brandingOverrides && typeof d.brandingOverrides === "object") {
    const b = d.brandingOverrides as Record<string, unknown>;
    if (typeof b.frameworkName === "string") brandingOverrides.frameworkName = b.frameworkName;
    if (typeof b.frameworkFullName === "string")
      brandingOverrides.frameworkFullName = b.frameworkFullName;
    if (typeof b.wordmark === "string") brandingOverrides.wordmark = b.wordmark;
    if (typeof b.magenta === "string") brandingOverrides.magenta = b.magenta;
    // shallow merge logos sub-object
    if (b.logos && typeof b.logos === "object") {
      const l = b.logos as Record<string, unknown>;
      brandingOverrides.logos = {
        ...(typeof l.framework === "string" ? { framework: l.framework } : {}),
        ...(typeof l.secondary === "string" ? { secondary: l.secondary } : {}),
        ...(typeof l.institution === "string" ? { institution: l.institution } : {}),
      };
    }
    if (b.report && typeof b.report === "object") {
      const r = b.report as Record<string, unknown>;
      const report: Partial<FrameworkBranding["report"]> = {};
      if (typeof r.title === "string") report.title = r.title;
      if (typeof r.nutritionTitle === "string") report.nutritionTitle = r.nutritionTitle;
      if (typeof r.cardTitle === "string") report.cardTitle = r.cardTitle;
      if (typeof r.footerFramework === "string") report.footerFramework = r.footerFramework;
      if (typeof r.reviewedBy === "string") report.reviewedBy = r.reviewedBy;
      if (typeof r.archiveNotice === "string") report.archiveNotice = r.archiveNotice;
      if (typeof r.qrUrl === "string") report.qrUrl = r.qrUrl;
      if (Object.keys(report).length) brandingOverrides.report = report;
    }
    if (b.export && typeof b.export === "object") {
      const e = b.export as Record<string, unknown>;
      const exp: Partial<FrameworkBranding["export"]> = {};
      if (typeof e.labelFilenamePrefix === "string")
        exp.labelFilenamePrefix = e.labelFilenamePrefix;
      if (typeof e.frameworkLogoFilename === "string")
        exp.frameworkLogoFilename = e.frameworkLogoFilename;
      if (Object.keys(exp).length) brandingOverrides.export = exp;
    }
  }

  const rubric = normRubricOverride(d.rubric);

  return {
    fieldOverrides,
    customFields,
    extraOptions,
    hiddenOptions,
    renames,
    gradeOverrides,
    rubric,
    gradeAdditions,
    gradeRemovals,
    principleOverrides,
    brandingOverrides,
  };
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

      addGrade: (grade) =>
        set((s) => ({
          customization: {
            ...s.customization,
            gradeAdditions: [
              ...s.customization.gradeAdditions.filter((g) => g.id !== grade.id),
              grade,
            ],
          },
        })),

      removeGrade: (gradeId) =>
        set((s) => ({
          customization: {
            ...s.customization,
            gradeRemovals: s.customization.gradeRemovals.includes(gradeId)
              ? s.customization.gradeRemovals
              : [...s.customization.gradeRemovals, gradeId],
          },
        })),

      resetField: (field) =>
        set((s) => {
          const { [field]: _fo, ...fieldOverrides } = s.customization.fieldOverrides;
          const { [field]: _e, ...extraOptions } = s.customization.extraOptions;
          const { [field]: _h, ...hiddenOptions } = s.customization.hiddenOptions;
          const { [field]: _r, ...renames } = s.customization.renames;
          return {
            customization: {
              ...s.customization,
              fieldOverrides,
              extraOptions,
              hiddenOptions,
              renames,
            },
          };
        }),

      resetGrades: () =>
        set((s) => ({
          customization: {
            ...s.customization,
            gradeOverrides: {},
            gradeAdditions: [],
            gradeRemovals: [],
          },
        })),

      resetAll: () => set({ customization: EMPTY }),

      hasOverrides: () => {
        const c = get().customization;
        const r = c.rubric;
        return (
          Object.keys(c.fieldOverrides).length > 0 ||
          c.customFields.length > 0 ||
          Object.keys(c.extraOptions).length > 0 ||
          Object.keys(c.hiddenOptions).length > 0 ||
          Object.keys(c.renames).length > 0 ||
          Object.keys(c.gradeOverrides).length > 0 ||
          Object.keys(r.valuePatches).length > 0 ||
          r.addedQuestions.length > 0 ||
          r.removedQuestions.length > 0 ||
          Object.keys(r.order).length > 0 ||
          c.gradeAdditions.length > 0 ||
          c.gradeRemovals.length > 0 ||
          Object.keys(c.principleOverrides).length > 0 ||
          (c.brandingOverrides !== undefined && Object.keys(c.brandingOverrides).length > 0)
        );
      },

      exportCustomization: () => structuredClone(get().customization),
      importCustomization: (data) => set({ customization: validateCustomization(data) }),

      // ─── Rubric ───────────────────────────────────────────────────────
      setRubricOverride: (path, value) =>
        set((s) => ({
          customization: {
            ...s.customization,
            rubric: {
              ...s.customization.rubric,
              valuePatches: {
                ...s.customization.rubric.valuePatches,
                [path.join(".")]: value,
              },
            },
          },
        })),

      addRubricQuestion: (section, parent, question) => {
        const key = (question as { key?: string }).key;
        if (!key || typeof key !== "string") return;
        const { key: _k, ...def } = question as Record<string, unknown>;
        set((s) => ({
          customization: {
            ...s.customization,
            rubric: {
              ...s.customization.rubric,
              addedQuestions: [
                ...s.customization.rubric.addedQuestions.filter(
                  (q) => !(q.section === section && q.parent === parent && q.key === key),
                ),
                { section, parent, key, def },
              ],
              // If previously removed, un-remove
              removedQuestions: s.customization.rubric.removedQuestions.filter(
                (q) => !(q.section === section && q.parent === parent && q.key === key),
              ),
            },
          },
        }));
      },

      removeRubricQuestion: (section, parent, key) =>
        set((s) => ({
          customization: {
            ...s.customization,
            rubric: {
              ...s.customization.rubric,
              removedQuestions: [
                ...s.customization.rubric.removedQuestions.filter(
                  (q) => !(q.section === section && q.parent === parent && q.key === key),
                ),
                { section, parent, key },
              ],
              // If previously added, drop the addition
              addedQuestions: s.customization.rubric.addedQuestions.filter(
                (q) => !(q.section === section && q.parent === parent && q.key === key),
              ),
            },
          },
        })),

      reorderRubricQuestions: (parent, keys) =>
        set((s) => ({
          customization: {
            ...s.customization,
            rubric: {
              ...s.customization.rubric,
              order: { ...s.customization.rubric.order, [parent]: keys },
            },
          },
        })),

      resetRubric: () =>
        set((s) => ({
          customization: { ...s.customization, rubric: EMPTY.rubric },
        })),

      // ─── Principles ──────────────────────────────────────────────────
      setPrincipleOverride: (id, patch) =>
        set((s) => ({
          customization: {
            ...s.customization,
            principleOverrides: {
              ...s.customization.principleOverrides,
              [id]: { ...s.customization.principleOverrides[id], ...patch },
            },
          },
        })),

      resetPrinciple: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.customization.principleOverrides;
          return { customization: { ...s.customization, principleOverrides: rest } };
        }),

      // ─── Branding ────────────────────────────────────────────────────
      setBrandingOverrides: (patch) =>
        set((s) => ({
          customization: {
            ...s.customization,
            brandingOverrides: { ...s.customization.brandingOverrides, ...patch },
          },
        })),

      resetBranding: () =>
        set((s) => ({
          customization: { ...s.customization, brandingOverrides: {} },
        })),
    }),
    {
      name: "trust-framework-customization",
      partialize: (s) => ({ customization: s.customization }),
    },
  ),
);
