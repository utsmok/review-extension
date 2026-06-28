import { FRAMEWORK_CONFIG } from "@/data/framework";
import { RUBRIC_DATA, RUBRIC_VERSION } from "@/data/rubrics";
import { getActiveFields } from "@/lib/field-schema";
import { getActiveBranding, getActiveGrades, getActivePrinciples } from "@/lib/framework-config";
import { getActiveRubric } from "@/lib/rubric-schema";
import type {
  FieldDescriptor,
  FrameworkBranding,
  FrameworkGrade,
  FrameworkPrinciple,
} from "@/lib/types";
import type { FrameworkCustomization, GradeOverride } from "@/stores/framework-customization";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** A complete, self-contained framework pack for import/export. */
export interface FrameworkPack {
  packId: string;
  version: number;
  fields: FieldDescriptor[];
  rubric: Record<string, unknown>;
  principles: FrameworkPrinciple[];
  grades: FrameworkGrade[];
  branding: FrameworkBranding;
}

/**
 * Validate the shape of a pack object. Throws on malformed data.
 */
export function validatePack(data: unknown): asserts data is FrameworkPack {
  if (!data || typeof data !== "object") {
    throw new Error("Pack must be a non-null object");
  }
  const p = data as Record<string, unknown>;
  if (typeof p.packId !== "string" || !p.packId) {
    throw new Error("Pack must have a non-empty string packId");
  }
  if (typeof p.version !== "number") {
    throw new Error("Pack must have a numeric version");
  }
  if (!Array.isArray(p.fields)) {
    throw new Error("Pack fields must be an array");
  }
  if (!p.rubric || typeof p.rubric !== "object" || Array.isArray(p.rubric)) {
    throw new Error("Pack must have a rubric object");
  }
  if (!Array.isArray(p.principles)) {
    throw new Error("Pack principles must be an array");
  }
  if (!Array.isArray(p.grades)) {
    throw new Error("Pack grades must be an array");
  }
  if (!p.branding || typeof p.branding !== "object" || Array.isArray(p.branding)) {
    throw new Error("Pack must have a branding object");
  }
}

/**
 * Build a snapshot of the current active framework as a FrameworkPack.
 * Eager: reads the customization store on every call.
 */
export function buildActivePack(): FrameworkPack {
  return {
    packId: getActiveBranding().frameworkName,
    version: RUBRIC_VERSION,
    fields: getActiveFields(),
    rubric: structuredClone(getActiveRubric()) as unknown as Record<string, unknown>,
    principles: getActivePrinciples(),
    grades: getActiveGrades(),
    branding: getActiveBranding(),
  };
}

/**
 * Apply an imported framework pack by diffing against shipped defaults
 * and translating into customization-store mutations.
 *
 * For v1: uses a diff-based approach that produces field overrides for
 * changed labels/options, custom fields for added fields, rubric value
 * patches for changed questions, grade additions/removals, principle
 * overrides, and branding overrides.
 */
export function applyPack(data: unknown): void {
  validatePack(data);
  const pack = data as FrameworkPack;
  const store = useFrameworkCustomizationStore.getState();

  // Wipe existing customization before applying the pack
  store.resetAll();

  const customization: FrameworkCustomization = {
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

  // --- Fields ---
  const shippedFieldIds = new Set(FRAMEWORK_CONFIG.fields.map((f) => f.id));
  const packFieldIds = new Set(pack.fields.map((f) => f.id));

  for (const field of pack.fields) {
    if (!shippedFieldIds.has(field.id)) {
      // New field not in shipped defaults → add as custom field
      customization.customFields.push(field);
    } else {
      // Existing field → diff against shipped default
      const shipped = FRAMEWORK_CONFIG.fields.find((f) => f.id === field.id);
      if (!shipped) continue;
      const overrides: Record<string, unknown> = {};
      for (const key of Object.keys(field) as (keyof FieldDescriptor)[]) {
        if (key === "id" || key === "storageKey" || key === "surface" || key === "type") continue;
        if (JSON.stringify(shipped[key]) !== JSON.stringify(field[key])) {
          overrides[key] = field[key];
        }
      }
      if (Object.keys(overrides).length > 0) {
        customization.fieldOverrides[field.id] = overrides as Record<string, unknown>;
      }
    }
  }

  // Detect removed shipped fields (in shipped but not in pack)
  for (const shipped of FRAMEWORK_CONFIG.fields) {
    if (!packFieldIds.has(shipped.id) && shipped.enabled) {
      customization.fieldOverrides[shipped.id] = { enabled: false };
    }
  }

  // --- Grades ---
  const shippedGradeIds = new Set(FRAMEWORK_CONFIG.grades.map((g) => g.id));
  const packGradeIds = new Set(pack.grades.map((g) => g.id));

  for (const grade of pack.grades) {
    if (!shippedGradeIds.has(grade.id)) {
      customization.gradeAdditions.push(grade);
    } else {
      const shipped = FRAMEWORK_CONFIG.grades.find((g) => g.id === grade.id);
      if (!shipped) continue;
      const overrides: Partial<FrameworkGrade> = {};
      for (const key of Object.keys(shipped) as (keyof FrameworkGrade)[]) {
        if (key === "id") continue;
        if (JSON.stringify(shipped[key]) !== JSON.stringify(grade[key])) {
          overrides[key] = grade[key];
        }
      }
      if (Object.keys(overrides).length > 0) {
        customization.gradeOverrides[grade.id] = overrides as GradeOverride;
      }
    }
  }

  // Detect removed shipped grades
  for (const shipped of FRAMEWORK_CONFIG.grades) {
    if (!packGradeIds.has(shipped.id)) {
      customization.gradeRemovals.push(shipped.id);
    }
  }

  // --- Principles ---
  for (const principle of pack.principles) {
    const shipped = FRAMEWORK_CONFIG.principles.find((p) => p.id === principle.id);
    if (!shipped) continue;
    const overrides: Partial<FrameworkPrinciple> = {};
    for (const key of Object.keys(shipped) as (keyof FrameworkPrinciple)[]) {
      if (key === "id") continue;
      if (JSON.stringify(shipped[key]) !== JSON.stringify(principle[key])) {
        overrides[key] = principle[key];
      }
    }
    if (Object.keys(overrides).length > 0) {
      customization.principleOverrides[principle.id] = overrides;
    }
  }

  // --- Rubric (diff shipped rubric against pack rubric) ---
  diffRubric(RUBRIC_DATA as unknown as Record<string, unknown>, pack.rubric, [], customization);

  // --- Branding ---
  diffBranding(FRAMEWORK_CONFIG.branding, pack.branding, customization);

  // Apply via store importCustomization
  store.importCustomization(customization);
}

/**
 * Recursively diff the shipped rubric against the pack rubric.
 * Produces valuePatches for changed leaves and tracks added/removed questions.
 */
function diffRubric(
  shipped: Record<string, unknown>,
  pack: Record<string, unknown>,
  path: string[],
  customization: FrameworkCustomization,
): void {
  if (
    !shipped ||
    !pack ||
    typeof shipped !== "object" ||
    typeof pack !== "object" ||
    Array.isArray(shipped) ||
    Array.isArray(pack)
  ) {
    return;
  }

  const shippedKeys = Object.keys(shipped);
  const packKeys = Object.keys(pack);
  const allKeys = new Set([...shippedKeys, ...packKeys]);
  const sameKeys =
    shippedKeys.length === packKeys.length && shippedKeys.every((k) => packKeys.includes(k));

  // At question-child level (depth >= 2), detect additions, removals, and order changes
  if (path.length >= 2 && !sameKeys) {
    const parentPath = path.join(".");
    for (const k of shippedKeys) {
      if (!(k in pack)) {
        customization.rubric.removedQuestions.push({
          section: path[0] as "quality_gate" | "scoring_rubric",
          parent: parentPath,
          key: k,
        });
      }
    }
    for (const k of packKeys) {
      if (!(k in shipped)) {
        customization.rubric.addedQuestions.push({
          section: path[0] as "quality_gate" | "scoring_rubric",
          parent: parentPath,
          key: k,
          def: pack[k] as Record<string, unknown>,
        });
      }
    }
    // Track order of remaining shared keys
    const remainingKeys = packKeys.filter((k) => k in shipped);
    if (remainingKeys.length > 0) {
      customization.rubric.order[parentPath] = remainingKeys;
    }
    // Also recurse into shared children for leaf-value changes
    for (const k of remainingKeys) {
      const s = shipped[k] as Record<string, unknown>;
      const p = pack[k] as Record<string, unknown>;
      if (
        s &&
        p &&
        typeof s === "object" &&
        typeof p === "object" &&
        !Array.isArray(s) &&
        !Array.isArray(p)
      ) {
        diffRubric(s, p, [...path, k], customization);
      } else if (JSON.stringify(s) !== JSON.stringify(p)) {
        customization.rubric.valuePatches[[...path, k].join(".")] = p;
      }
    }
    return;
  }

  // Same key set at question-child level — check for reordering
  if (sameKeys && path.length >= 2 && shippedKeys.some((k, i) => k !== packKeys[i])) {
    customization.rubric.order[path.join(".")] = packKeys;
  }

  // Recurse into all keys
  for (const key of allKeys) {
    const shippedVal = shipped[key];
    const packVal = pack[key];

    if (shippedVal === undefined && packVal !== undefined) {
      // Added at non-question level
      continue;
    }
    if (shippedVal !== undefined && packVal === undefined) {
      continue;
    }
    if (
      shippedVal !== undefined &&
      packVal !== undefined &&
      typeof shippedVal === "object" &&
      shippedVal !== null &&
      typeof packVal === "object" &&
      packVal !== null &&
      !Array.isArray(shippedVal) &&
      !Array.isArray(packVal)
    ) {
      diffRubric(
        shippedVal as Record<string, unknown>,
        packVal as Record<string, unknown>,
        [...path, key],
        customization,
      );
    } else if (
      shippedVal !== undefined &&
      packVal !== undefined &&
      JSON.stringify(shippedVal) !== JSON.stringify(packVal)
    ) {
      customization.rubric.valuePatches[[...path, key].join(".")] = packVal;
    }
  }
}

/**
 * Diff branding and produce branding overrides.
 */
function diffBranding(
  shipped: FrameworkBranding,
  pack: FrameworkBranding,
  customization: FrameworkCustomization,
): void {
  const skipKeys = new Set(["logos", "report", "export"]);
  const brandingOverrides: Record<string, unknown> = {};

  for (const key of Object.keys(shipped) as (keyof FrameworkBranding)[]) {
    if (skipKeys.has(key)) continue;
    if (JSON.stringify(shipped[key]) !== JSON.stringify(pack[key])) {
      brandingOverrides[key] = pack[key];
    }
  }

  // Nested: logos
  if (shipped.logos && pack.logos) {
    const logoOverrides: Record<string, unknown> = {};
    const sLogos = shipped.logos as Record<string, unknown>;
    const pLogos = pack.logos as Record<string, unknown>;
    for (const key of Object.keys(sLogos)) {
      if (JSON.stringify(sLogos[key]) !== JSON.stringify(pLogos[key])) {
        logoOverrides[key] = pLogos[key];
      }
    }
    if (Object.keys(logoOverrides).length > 0) {
      brandingOverrides.logos = logoOverrides;
    }
  }

  // Nested: report
  if (shipped.report && pack.report) {
    const reportOverrides: Record<string, unknown> = {};
    const sReport = shipped.report as Record<string, unknown>;
    const pReport = pack.report as Record<string, unknown>;
    for (const key of Object.keys(sReport)) {
      if (JSON.stringify(sReport[key]) !== JSON.stringify(pReport[key])) {
        reportOverrides[key] = pReport[key];
      }
    }
    if (Object.keys(reportOverrides).length > 0) {
      brandingOverrides.report = reportOverrides;
    }
  }

  // Nested: export
  if (shipped.export && pack.export) {
    const exportOverrides: Record<string, unknown> = {};
    const sExport = shipped.export as Record<string, unknown>;
    const pExport = pack.export as Record<string, unknown>;
    for (const key of Object.keys(sExport)) {
      if (JSON.stringify(sExport[key]) !== JSON.stringify(pExport[key])) {
        exportOverrides[key] = pExport[key];
      }
    }
    if (Object.keys(exportOverrides).length > 0) {
      brandingOverrides.export = exportOverrides;
    }
  }

  if (Object.keys(brandingOverrides).length > 0) {
    customization.brandingOverrides = brandingOverrides as Record<string, unknown>;
  }
}
