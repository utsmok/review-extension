import type { FieldDescriptor, FrameworkGrade } from "@/lib/types";
import rawConfig from "./trust-framework.json";

export interface FrameworkConfig {
  readonly frameworkName: string;
  readonly frameworkFullName: string;
  readonly version: string;
  readonly fields: readonly FieldDescriptor[];
  readonly grades: readonly FrameworkGrade[];
}

export function validateFrameworkShape(d: FrameworkConfig): void {
  if (typeof d.frameworkName !== "string") throw new Error("frameworkName must be a string");
  if (typeof d.version !== "string") throw new Error("version must be a string");
  if (!Array.isArray(d.fields)) throw new Error("fields must be an array");
  if (!Array.isArray(d.grades)) throw new Error("grades must be an array");
}

/** Frozen, validated shipped configuration. */
export const FRAMEWORK_CONFIG: FrameworkConfig = Object.freeze(rawConfig as unknown as FrameworkConfig);
validateFrameworkShape(FRAMEWORK_CONFIG);

/** Stable ordered list of builtin field ids. */
export const FIELD_IDS = FRAMEWORK_CONFIG.fields.map((f) => f.id) as readonly string[];
/** Stable ordered list of canonical grade ids (the FinalizationGrade contract). */
export const GRADE_IDS = FRAMEWORK_CONFIG.grades.map((g) => g.id) as readonly string[];
