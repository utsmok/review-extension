import { LISA_EIS_LOGO, TRUST_LOGO, UT_LOGO } from "@/lib/logos";
import { PRINCIPLES } from "@/lib/principles";
import type {
  FieldDescriptor,
  FrameworkBranding,
  FrameworkGrade,
  FrameworkPrinciple,
} from "@/lib/types";
import rawConfig from "./trust-framework.json";

export interface FrameworkConfig {
  readonly frameworkName: string;
  readonly frameworkFullName: string;
  readonly version: string;
  readonly fields: readonly FieldDescriptor[];
  readonly grades: readonly FrameworkGrade[];
  readonly principles: readonly FrameworkPrinciple[];
  readonly branding: FrameworkBranding;
}

export function validateFrameworkShape(d: FrameworkConfig): void {
  if (typeof d.frameworkName !== "string") throw new Error("frameworkName must be a string");
  if (typeof d.version !== "string") throw new Error("version must be a string");
  if (!Array.isArray(d.fields)) throw new Error("fields must be an array");
  if (!Array.isArray(d.grades)) throw new Error("grades must be an array");
  if (!Array.isArray(d.principles)) throw new Error("principles must be an array");
  if (typeof d.branding !== "object" || d.branding === null)
    throw new Error("branding must be an object");
}

/** Frozen, validated shipped configuration — logos injected from lib/logos.ts at module load. */
const { branding: rawBranding, ...restConfig } = rawConfig;
// rawConfig is from a trusted JSON file validated at import; narrow to domain types
const config = restConfig as unknown as FrameworkConfig;
export const FRAMEWORK_CONFIG: FrameworkConfig = Object.freeze({
  ...config,
  principles: Object.freeze([...PRINCIPLES] as FrameworkPrinciple[]),
  branding: Object.freeze({
    ...rawBranding,
    logos: {
      framework: TRUST_LOGO,
      secondary: LISA_EIS_LOGO,
      institution: UT_LOGO,
    },
  }),
});
validateFrameworkShape(FRAMEWORK_CONFIG);

/** Stable ordered list of builtin field ids. */
export const FIELD_IDS = FRAMEWORK_CONFIG.fields.map((f) => f.id) as readonly string[];
/** Stable ordered list of canonical grade ids (the FinalizationGrade contract). */
export const GRADE_IDS = FRAMEWORK_CONFIG.grades.map((g) => g.id) as readonly string[];
