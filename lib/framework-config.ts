import { FRAMEWORK_CONFIG, type FrameworkConfig } from "@/data/framework";
import { PRINCIPLES } from "@/lib/principles";
import type {
  FieldDescriptor,
  FrameworkBranding,
  FrameworkGrade,
  FrameworkPrinciple,
} from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Return the shipped (un-customized) framework configuration. */
export function getFrameworkConfig(): FrameworkConfig {
  return FRAMEWORK_CONFIG;
}

// ─── Grades ──────────────────────────────────────────────────────────────

/** Eager: shipped grades minus removals, plus user additions, each with overrides applied. */
export function getActiveGrades(): FrameworkGrade[] {
  const c = useFrameworkCustomizationStore.getState().customization;
  const removed = new Set(c.gradeRemovals);
  const shipped = FRAMEWORK_CONFIG.grades.filter((g) => !removed.has(g.id));
  return [...shipped, ...c.gradeAdditions].map((g) => {
    const o = c.gradeOverrides[g.id];
    return o ? { ...g, ...o } : g;
  });
}

/** True when `id` is in the active grade set (shipped + additions − removals). */
export function isValidGrade(id: string): boolean {
  return getActiveGrades().some((g) => g.id === id);
}

// ─── Principles ──────────────────────────────────────────────────────────

/** Eager: shipped PRINCIPLES merged with principleOverrides (color / reportColor / fullName). */
export function getActivePrinciples(): FrameworkPrinciple[] {
  const c = useFrameworkCustomizationStore.getState().customization;
  return PRINCIPLES.map((p) => ({ ...p, ...(c.principleOverrides[p.id] ?? {}) }));
}

// ─── Branding ────────────────────────────────────────────────────────────

/** Eager: shipped branding (logos injected from lib/logos.ts) merged with brandingOverrides. */
export function getActiveBranding(): FrameworkBranding {
  const c = useFrameworkCustomizationStore.getState().customization;
  const base = FRAMEWORK_CONFIG.branding;
  const ov = c.brandingOverrides;
  return {
    ...base,
    ...ov,
    logos: { ...base.logos, ...(ov.logos ?? {}) },
    report: { ...base.report, ...(ov.report ?? {}) },
    export: { ...base.export, ...(ov.export ?? {}) },
  };
}

/** Report-facing branding flattened for the html-report / export consumers. */
export function getReportBranding() {
  const b = getActiveBranding();
  return {
    frameworkName: b.frameworkName,
    wordmark: b.wordmark,
    magenta: b.magenta,
    logos: b.logos,
    title: b.report.title,
    nutritionTitle: b.report.nutritionTitle,
    cardTitle: b.report.cardTitle,
    footerFramework: b.report.footerFramework,
    reviewedBy: b.report.reviewedBy,
    archiveNotice: b.report.archiveNotice,
    qrUrl: b.report.qrUrl,
    labelFilenamePrefix: b.export.labelFilenamePrefix,
    frameworkLogoFilename: b.export.frameworkLogoFilename,
  };
}

// ─── Runtime CSS-token injection ─────────────────────────────────────────

/** Maps principle id → the lowercase CSS custom-property segment. (US renders as --uc.) */
const PRINCIPLE_CSS_VAR: Record<string, string> = {
  TR: "tr",
  RE: "re",
  US: "uc",
  SE: "se",
  TC: "tc",
};

/** Inject active principle colors as CSS custom properties on :root. */
export function applyPrincipleTokens(root: HTMLElement = document.documentElement): void {
  for (const p of getActivePrinciples()) {
    const key = PRINCIPLE_CSS_VAR[p.id] ?? p.code.toLowerCase();
    root.style.setProperty(`--${key}`, p.color);
    root.style.setProperty(`--section-${key}-accent`, p.color);
  }
}

/** Inject active branding (magenta + print-footer framework name) as CSS custom properties. */
export function applyBrandingTokens(root: HTMLElement = document.documentElement): void {
  const b = getActiveBranding();
  root.style.setProperty("--trust-magenta", b.magenta);
  root.style.setProperty("--report-footer-framework", b.report.footerFramework);
}

// ─── Active config (merged) ──────────────────────────────────────────────

/** Eager: reads the customization store on every call and merges every dimension. */
export function getActiveFrameworkConfig(): FrameworkConfig {
  const base = FRAMEWORK_CONFIG;

  const fields: FieldDescriptor[] = [
    ...base.fields,
    ...useFrameworkCustomizationStore
      .getState()
      .customization.customFields.map((f) => ({ ...f, custom: true })),
  ]
    .map((f) => {
      const c = useFrameworkCustomizationStore.getState().customization;
      const ov = c.fieldOverrides[f.id];
      const opts = mergeOptions(f, c);
      return { ...f, ...(ov ?? {}), ...(opts ? { options: opts } : {}) };
    })
    .filter((f) => f.enabled);

  return {
    ...base,
    fields,
    grades: getActiveGrades(),
    principles: getActivePrinciples(),
    branding: getActiveBranding(),
  };
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
