import { PRINCIPLES } from "../principles";

/** Darkened report-local colors for WCAG AA contrast with white text */
export const REPORT_COLORS: Record<string, string> = Object.fromEntries(
  PRINCIPLES.map((p) => [p.id, p.reportColor]),
);

/** Principle full names for display */
export const PRINCIPLE_NAMES: Record<string, string> = Object.fromEntries(
  PRINCIPLES.map((p) => [p.id, p.fullName]),
);

/** Grade colors used in finalization verdict */
export const GRADE_COLORS: Record<string, string> = {
  pass: "#4a8355",
  conditional: "#ea580c",
  fail: "#c60c30",
};

/** Grade labels used in finalization verdict */
export const GRADE_LABELS: Record<string, string> = {
  pass: "PASSED",
  conditional: "CONDITIONAL",
  fail: "FAILED",
};

/** Fallback UI colors */
export const MUTED_COLOR = "#6b7f94";
export const DEFAULT_COLOR = "#4f5e73";
