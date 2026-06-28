import type { RubricData } from "@/lib/types";
import trustFull from "./trust-full.json";

/** Recursively freeze an object and all nested values. */
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    for (const val of Object.values(obj as object)) {
      deepFreeze(val);
    }
  }
  return obj;
}

/**
 * Validate that raw rubric JSON has the expected structural shape
 * before casting to RubricData. Catches malformed JSON at startup
 * rather than producing mysterious runtime errors deep in the app.
 */
function validateRubricShape(data: unknown): asserts data is RubricData {
  if (!data || typeof data !== "object") {
    throw new Error("Rubric data is not an object");
  }
  const d = data as Record<string, unknown>;

  if (typeof d.framework_name !== "string") {
    throw new Error("Rubric data missing string 'framework_name'");
  }
  if (typeof d.version !== "string") {
    throw new Error("Rubric data missing string 'version'");
  }
  if (!d.quality_gate || typeof d.quality_gate !== "object") {
    throw new Error("Rubric data missing object 'quality_gate'");
  }
  if (!d.scoring_rubric || typeof d.scoring_rubric !== "object") {
    throw new Error("Rubric data missing object 'scoring_rubric'");
  }
}

validateRubricShape(trustFull);
export const RUBRIC_DATA: RubricData = deepFreeze(trustFull) as RubricData;

/**
 * Numeric pack version derived from the rubric version string.
 * "1.1" → 1 (major). Used to stamp new sessions for pack migration.
 */
export const RUBRIC_VERSION: number = parseInt(trustFull.version.split(".")[0], 10) || 1;
