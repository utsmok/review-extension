import { getActiveGrades, isValidGrade } from "@/lib/framework-config";

export { getActiveGrades, isValidGrade };

/**
 * Map a stored grade id that may have been removed/renamed back to a valid id,
 * or null when it no longer resolves. Callers decide the fallback (e.g. prompt
 * re-selection). Eager: reflects the active grade set at call time.
 */
export function normalizeGrade(id: string): string | null {
  return isValidGrade(id) ? id : null;
}
