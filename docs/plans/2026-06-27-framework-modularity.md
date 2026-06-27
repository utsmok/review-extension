# Framework Modularity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TRUST-specific content (principles, grades, metadata option-lists, quality-gate category codes) data-driven and in-extension editable, so the framework can be customized and shared without touching code — while keeping the TRUST review product intact.

**Architecture:** Introduce a single `framework.json` config that is the source of truth for everything currently hardcoded in `lib/principles.ts`, `lib/metadata-options.ts`, `lib/rubric.ts` maps, and the grade definitions. An accessor layer derives the existing constants from it (keeping the public API stable, so the ~6 import sites need no logic changes). A persisted customization store holds user overrides; an in-extension editor (linked from Settings) edits option-lists and grade labels/descriptions and imports/exports the customization as JSON.

**Tech Stack:** TypeScript, React 19, Zustand (+ `persist` middleware → localStorage, mirroring `stores/registry.ts`), WXT, Vitest + @testing-library/react.

## Scope boundaries (read before starting)

**In scope (this plan):**
- Data-ify: principles, QG category codes/labels, accent keys, category labels, **grade labels + descriptions**, metadata option-lists (data sources, search methods, disciplines, auth methods) + discipline default.
- Runtime override of option-lists (add/remove/reset per field) and grade label/description text, persisted + importable/exportable.
- Editor UI for the above, linked from Settings.

**Explicitly OUT of scope (deferred to Plan B — `docs/plans/*-framework-modularity-stage2.md`, to be written):**
- Adding/renaming/removing **grade IDs** (changes the `FinalizationGrade` union type — Plan A edits only label/description text, the IDs stay the shipped set).
- Editing **rubric questions** (titles, requirements, examples, scoring anchors) and question authoring UX.
- Rubric/pack **versioning & migration** (the `lib/migrations.ts` hook exists; wiring it to pack versions is Plan B — Plan A does not change the rubric, so no version issue arises).
- Branding/theming extraction (logos, `--trust-magenta`, TRUST literals in `report.css`/`sanitize.ts`/print headers).
- Repo split.

**Why:** the issue itself says "start with the smaller version; expand later." This plan delivers the visible "edit the TRUST questionnaire option-lists and grade wording" capability + community import/export, which is the high-leverage slice, without the type-extensibility and versioning rabbit holes.

## File Structure

**Create:**
- `data/framework/trust-framework.json` — the single source-of-truth config (principles, QG codes, accent keys, labels, grades, metadata schema).
- `data/framework/index.ts` — loader, `validateFrameworkShape`, `deepFreeze`, const contracts for TS types. Mirrors `data/rubrics/index.ts`.
- `lib/framework-config.ts` — accessors: `getFrameworkConfig()` (default), `getActiveFrameworkConfig()` (merged with customization), typed getters (`getPrinciples`, `getGradeDefinitions`, `getMetadataField`, `getQGCategoryCode`, `getAccentKey`, `getCategoryLabel`).
- `stores/framework-customization.ts` — Zustand+persist store for user overrides (option-list deltas + grade label/desc overrides).
- `hooks/useFrameworkConfig.ts` — React hooks (`usePrinciples`, `useGradeDefinitions`, `useMetadataFieldOptions`) that subscribe to the customization store.
- `components/FrameworkEditor.tsx` — the editor screen.
- Tests: `tests/framework-config.test.ts`, `tests/framework-customization.test.ts`, `tests/use-framework-config.test.ts`, `tests/framework-editor.test.tsx`, `tests/metadata-options-sourced.test.ts`.

**Modify (derivation — public exports stay stable):**
- `lib/principles.ts` — `PRINCIPLES` sourced from config.
- `lib/metadata-options.ts` — the 4 option arrays + `DISCIPLINE_DEFAULT` + `DISCIPLINE_OTHERS` sourced from config.
- `lib/rubric.ts` — `QG_CATEGORY_CODES`, `ACCENT_KEYS`, `CATEGORY_LABELS` sourced from config.
- `lib/types.ts` — add framework-config types; `FinalizationGrade` unchanged (IDs stable).
- `components/metadata/DisciplineField.tsx` — read options via `useMetadataFieldOptions("discipline")` instead of static imports.
- `components/Metadata.tsx` — `PillField` `options` via `useMetadataFieldOptions(...)`.
- `components/SettingsScreen.tsx` — add entry point to `FrameworkEditor`.

**No change** to scoring, export pipeline, html-report, comparison — they consume the same stable exports (`PRINCIPLES`, etc.), now backed by config.

---

## Task 1: Framework config data model + JSON + loader

**Files:**
- Create: `data/framework/trust-framework.json`
- Create: `data/framework/index.ts`
- Modify: `lib/types.ts` (append framework-config types)
- Test: `tests/framework-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/framework-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  FRAMEWORK_CONFIG,
  GRADE_IDS,
  validateFrameworkShape,
} from "@/data/framework";

describe("framework config", () => {
  it("exposes a frozen config with the TRUST id and version", () => {
    expect(FRAMEWORK_CONFIG.id).toBe("trust");
    expect(FRAMEWORK_CONFIG.version).toBe("1.1");
    expect(Object.isFrozen(FRAMEWORK_CONFIG)).toBe(true);
  });

  it("declares the 5 principle IDs in order", () => {
    expect(FRAMEWORK_CONFIG.principles.map((p) => p.id)).toEqual([
      "TR",
      "RE",
      "US",
      "SE",
      "TC",
    ]);
  });

  it("GRADE_IDS lists the 9 canonical grade identifiers", () => {
    expect(GRADE_IDS).toEqual([
      "pass",
      "conditional",
      "fail",
      "recommended",
      "recommended_with_caveats",
      "needs_review",
      "pilot_only",
      "not_recommended",
      "out_of_scope",
    ]);
  });

  it("every grade definition maps to a GRADE_IDS entry", () => {
    const ids = new Set(FRAMEWORK_CONFIG.grades.map((g) => g.id));
    for (const id of GRADE_IDS) expect(ids.has(id)).toBe(true);
  });

  it("validateFrameworkShape passes for the shipped config", () => {
    expect(() => validateFrameworkShape(FRAMEWORK_CONFIG)).not.toThrow();
  });

  it("validateFrameworkShape throws for a malformed config", () => {
    expect(() => validateFrameworkShape({ principles: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/framework-config.test.ts`
Expected: FAIL — `@/data/framework` does not exist.

- [ ] **Step 3: Create the framework config JSON**

Create `data/framework/trust-framework.json`. The option-list contents are copied verbatim from `lib/metadata-options.ts` (the four `as const` arrays). Grade labels/descriptions are copied verbatim from the existing UI in `components/finalization/GradeSelector.tsx` (read that file first and transcribe its label + subtitle/description strings into the matching `id`).

```json
{
  "id": "trust",
  "name": "TRUST Framework",
  "version": "1.1",
  "principles": [
    { "id": "TR", "code": "TR", "color": "#2563eb", "reportColor": "#2563eb", "fullName": "Transparency" },
    { "id": "RE", "code": "RE", "color": "#16a34a", "reportColor": "#127035", "fullName": "Reliability" },
    { "id": "US", "code": "US", "color": "#9333ea", "reportColor": "#9333ea", "fullName": "User-centric" },
    { "id": "SE", "code": "SE", "color": "#ea580c", "reportColor": "#c2410c", "fullName": "Soundness" },
    { "id": "TC", "code": "TC", "color": "#0d9488", "reportColor": "#0f766e", "fullName": "Traceability" }
  ],
  "qualityGateCategories": [
    { "key": "privacy_and_security", "code": "PS", "label": "Privacy & Security" },
    { "key": "intellectual_property", "code": "IP", "label": "Intellectual Property" },
    { "key": "accessibility", "code": "AC", "label": "Accessibility" }
  ],
  "accentKeys": { "TR": "tr", "RE": "re", "US": "uc", "SE": "se", "TC": "tc" },
  "categoryLabels": {
    "privacy_and_security": "Privacy & Security",
    "intellectual_property": "Intellectual Property",
    "accessibility": "Accessibility",
    "TR": "TR — Transparent",
    "RE": "RE — Reliable",
    "US": "US — User-Centric",
    "SE": "SE — Sound",
    "TC": "TC — Traceable"
  },
  "grades": [
    { "id": "pass", "label": "Pass", "description": "<copy from GradeSelector.tsx>" },
    { "id": "conditional", "label": "Conditional", "description": "<copy from GradeSelector.tsx>" },
    { "id": "fail", "label": "Fail", "description": "<copy from GradeSelector.tsx>" },
    { "id": "recommended", "label": "Recommended", "description": "<copy from GradeSelector.tsx>" },
    { "id": "recommended_with_caveats", "label": "Recommended with caveats", "description": "<copy from GradeSelector.tsx>" },
    { "id": "needs_review", "label": "Needs review", "description": "<copy from GradeSelector.tsx>" },
    { "id": "pilot_only", "label": "Pilot only", "description": "<copy from GradeSelector.tsx>" },
    { "id": "not_recommended", "label": "Not recommended", "description": "<copy from GradeSelector.tsx>" },
    { "id": "out_of_scope", "label": "Out of scope", "description": "<copy from GradeSelector.tsx>" }
  ],
  "metadataFields": {
    "dataSources": { "label": "Data sources", "options": ["CrossRef", "OpenAlex", "OpenCitations", "DataCite", "Scopus", "Web of Science", "PubMed", "Semantic Scholar", "Google Scholar", "IEEE Xplore", "JSTOR", "arXiv", "bioRxiv", "MedRxiv", "ERIC", "PsycINFO", "ProQuest", "Dimensions", "BASE", "CORE", "Cochrane Library", "ACM Digital Library"] },
    "searchMethods": { "label": "Search methods", "options": ["Keywords", "Semantic search", "Boolean queries", "Natural language", "Citation chaining", "Faceted filtering", "Vector search", "Hybrid search", "Controlled vocabulary / MeSH"] },
    "discipline": { "label": "Discipline", "default": "Multidisciplinary", "options": ["Agricultural and Biological Sciences", "History and Archaeology", "Languages and Literature", "Philosophy and Ethics", "Performing Arts", "Visual Arts and Design", "Religious Studies", "Biochemistry, Genetics and Molecular Biology", "Business, Management and Accounting", "Chemical Engineering", "Chemistry", "Computer Science", "Decision Sciences", "Dentistry", "Earth and Planetary Sciences", "Economics, Econometrics and Finance", "Energy", "Engineering", "Environmental Science", "Health Professions", "Immunology and Microbiology", "Materials Science", "Mathematics", "Medicine", "Neuroscience", "Nursing", "Pharmacology, Toxicology and Pharmaceutics", "Physics and Astronomy", "Psychology", "Education and Educational Research", "Law, Policy, and Criminology", "Political Science and International Relations", "Sociology, Anthropology, and Social Work", "Veterinary", "Multidisciplinary", "Information Science and Library Science", "Communication and Media Studies", "Geography"] },
    "authenticationMethod": { "label": "Authentication method", "options": ["SSO/SAML", "IP Authentication", "OpenAthens", "Proxy (EZproxy)", "LibKey", "Email-only", "API Key", "None required", "Personal account"] }
  }
}
```

> The `<copy from GradeSelector.tsx>` markers are an instruction to transcribe the real strings from that file, NOT shipped placeholders. Before committing, `grep -n 'description' data/framework/trust-framework.json` must return zero `<` characters inside string values.

- [ ] **Step 4: Add the framework-config types**

Append to `lib/types.ts`:

```ts
// ── Framework config (data-driven content) ─────────────────────────────

/** A TRUST principle with display metadata. Order matters (tab/column order). */
export interface FrameworkPrinciple {
  id: string;
  code: string;
  color: HexColor;
  reportColor: HexColor;
  fullName: string;
}

/** Quality-gate category → short code + human label. */
export interface FrameworkQGCategory {
  key: string;
  code: string;
  label: string;
}

/** A finalization grade definition (id is stable; label/description are editable). */
export interface FrameworkGrade {
  id: string;
  label: string;
  description: string;
}

/** A metadata field's option-list schema. */
export interface FrameworkMetadataField {
  label: string;
  options: string[];
  default?: string;
}

/** The full framework config loaded from data/framework/*.json. */
export interface FrameworkConfig {
  id: string;
  name: string;
  version: string;
  principles: FrameworkPrinciple[];
  qualityGateCategories: FrameworkQGCategory[];
  accentKeys: Record<string, string>;
  categoryLabels: Record<string, string>;
  grades: FrameworkGrade[];
  metadataFields: Record<string, FrameworkMetadataField>;
}
```

- [ ] **Step 5: Create the loader**

Create `data/framework/index.ts`:

```ts
import type { FrameworkConfig } from "@/lib/types";
import trustFramework from "./trust-framework.json";

/** Recursively freeze an object and all nested values. */
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    for (const val of Object.values(obj as object)) deepFreeze(val);
  }
  return obj;
}

/** Validate raw framework JSON shape before casting. Catches malformed JSON at startup. */
export function validateFrameworkShape(data: unknown): asserts data is FrameworkConfig {
  if (!data || typeof data !== "object") throw new Error("Framework config is not an object");
  const d = data as Record<string, unknown>;
  if (typeof d.id !== "string") throw new Error("Framework config missing string 'id'");
  if (typeof d.name !== "string") throw new Error("Framework config missing string 'name'");
  if (typeof d.version !== "string") throw new Error("Framework config missing string 'version'");
  if (!Array.isArray(d.principles)) throw new Error("Framework config missing array 'principles'");
  if (!Array.isArray(d.qualityGateCategories)) throw new Error("Framework config missing array 'qualityGateCategories'");
  if (!d.accentKeys || typeof d.accentKeys !== "object") throw new Error("Framework config missing object 'accentKeys'");
  if (!d.categoryLabels || typeof d.categoryLabels !== "object") throw new Error("Framework config missing object 'categoryLabels'");
  if (!Array.isArray(d.grades)) throw new Error("Framework config missing array 'grades'");
  if (!d.metadataFields || typeof d.metadataFields !== "object") throw new Error("Framework config missing object 'metadataFields'");
}

validateFrameworkShape(trustFramework);

/** The shipped, frozen framework config. */
export const FRAMEWORK_CONFIG: FrameworkConfig = deepFreeze(
  structuredClone(trustFramework),
) as FrameworkConfig;

/** Canonical grade IDs (the FinalizationGrade union contract). Stable across customizations. */
export const GRADE_IDS = FRAMEWORK_CONFIG.grades.map((g) => g.id) as readonly string[];
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test tests/framework-config.test.ts`
Expected: PASS (all 6 assertions).

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add data/framework/ lib/types.ts tests/framework-config.test.ts
git commit -m "feat(framework): add data-driven framework config + loader"
```

---

## Task 2: Framework-config accessor layer

**Files:**
- Create: `lib/framework-config.ts`
- Test: extend `tests/framework-config.test.ts`

- [ ] **Step 1: Add failing accessor tests**

Append to `tests/framework-config.test.ts`:

```ts
import {
  getFrameworkConfig,
  getPrinciples,
  getGradeDefinitions,
  getMetadataField,
  getMetadataFieldOptions,
  getQGCategoryCode,
  getAccentKey,
  getCategoryLabel,
} from "@/lib/framework-config";

describe("framework-config accessors", () => {
  it("getPrinciples returns principles in order", () => {
    expect(getPrinciples().map((p) => p.id)).toEqual(["TR", "RE", "US", "SE", "TC"]);
  });

  it("getGradeDefinitions returns all grades", () => {
    expect(getGradeDefinitions()).toHaveLength(9);
  });

  it("getMetadataFieldOptions returns the discipline options", () => {
    expect(getMetadataFieldOptions("discipline")).toContain("Multidisciplinary");
  });

  it("getMetadataField returns the discipline default", () => {
    expect(getMetadataField("discipline").default).toBe("Multidisciplinary");
  });

  it("getQGCategoryCode maps known and falls back for unknown", () => {
    expect(getQGCategoryCode("privacy_and_security")).toBe("PS");
    expect(getQGCategoryCode("unknown_cat")).toBe("UN"); // uppercased first 2 chars
  });

  it("getAccentKey maps known and defaults to control", () => {
    expect(getAccentKey("TR")).toBe("tr");
    expect(getAccentKey("zzz")).toBe("control");
  });

  it("getCategoryLabel maps known and falls back to the id", () => {
    expect(getCategoryLabel("TR")).toBe("TR — Transparent");
    expect(getCategoryLabel("nope")).toBe("nope");
  });

  it("getFrameworkConfig returns the frozen config", () => {
    expect(getFrameworkConfig()).toBe(FRAMEWORK_CONFIG);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/framework-config.test.ts`
Expected: FAIL — `@/lib/framework-config` does not export the accessors.

- [ ] **Step 3: Implement the accessors**

Create `lib/framework-config.ts`. `getActiveFrameworkConfig()` (used from Task 4 onward once the customization store exists) initially returns the default config unchanged:

```ts
import { FRAMEWORK_CONFIG } from "@/data/framework";
import type { FrameworkConfig, FrameworkGrade, FrameworkPrinciple } from "@/lib/types";

/** The shipped framework config (no user overrides applied). */
export function getFrameworkConfig(): FrameworkConfig {
  return FRAMEWORK_CONFIG;
}

/**
 * The active framework config: shipped defaults merged with any persisted user
 * customization. Until the customization store is wired (Task 4), this equals
 * the shipped config. Customization only overrides option-lists and grade
 * label/description text — never principle/grade identity.
 */
export function getActiveFrameworkConfig(): FrameworkConfig {
  return FRAMEWORK_CONFIG;
}

export function getPrinciples(): readonly FrameworkPrinciple[] {
  return getActiveFrameworkConfig().principles;
}

export function getGradeDefinitions(): readonly FrameworkGrade[] {
  return getActiveFrameworkConfig().grades;
}

export function getMetadataField(field: string) {
  return getActiveFrameworkConfig().metadataFields[field];
}

export function getMetadataFieldOptions(field: string): readonly string[] {
  return getMetadataField(field)?.options ?? [];
}

export function getQGCategoryCode(categoryKey: string): string {
  const cat = getActiveFrameworkConfig().qualityGateCategories.find(
    (c) => c.key === categoryKey,
  );
  return cat?.code ?? categoryKey.toUpperCase().slice(0, 2);
}

export function getAccentKey(categoryId: string): string {
  return getActiveFrameworkConfig().accentKeys[categoryId] ?? "control";
}

export function getCategoryLabel(categoryId: string): string {
  return getActiveFrameworkConfig().categoryLabels[categoryId] ?? categoryId;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test tests/framework-config.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/framework-config.ts tests/framework-config.test.ts
git commit -m "feat(framework): add config accessor layer"
```

---

## Task 3: Derive existing constants from the config

Public exports (`PRINCIPLES`, the metadata-option arrays, the rubric maps) keep their names and shapes; only their source changes from literals to the config. This keeps the ~6 downstream import sites (`report-model.ts`, `compute-scores.ts`, `session-lifecycle.ts`, `html-report.ts`, `CompareModal.tsx`, `Metadata.tsx`, `DisciplineField.tsx`) unchanged in this task.

**Files:**
- Modify: `lib/principles.ts`
- Modify: `lib/metadata-options.ts`
- Modify: `lib/rubric.ts` (the three maps)
- Test: `tests/metadata-options-sourced.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/metadata-options-sourced.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DATA_SOURCE_OPTIONS,
  SEARCH_METHOD_OPTIONS,
  DISCIPLINE_OPTIONS,
  AUTH_METHOD_OPTIONS,
  DISCIPLINE_DEFAULT,
  DISCIPLINE_OTHERS,
} from "@/lib/metadata-options";
import { PRINCIPLES } from "@/lib/principles";

describe("constants are sourced from framework config", () => {
  it("PRINCIPLES matches the config principles", () => {
    expect(PRINCIPLES.map((p) => p.id)).toEqual(["TR", "RE", "US", "SE", "TC"]);
    expect(PRINCIPLES[0].color).toBe("#2563eb");
  });

  it("metadata option arrays are non-empty and match known first entries", () => {
    expect(DATA_SOURCE_OPTIONS[0]).toBe("CrossRef");
    expect(SEARCH_METHOD_OPTIONS[0]).toBe("Keywords");
    expect(DISCIPLINE_OPTIONS).toContain("Multidisciplinary");
    expect(AUTH_METHOD_OPTIONS[0]).toBe("SSO/SAML");
  });

  it("DISCIPLINE_DEFAULT is Multidisciplinary and excluded from DISCIPLINE_OTHERS", () => {
    expect(DISCIPLINE_DEFAULT).toBe("Multidisciplinary");
    expect(DISCIPLINE_OTHERS).not.toContain(DISCIPLINE_DEFAULT);
    expect(DISCIPLINE_OTHERS.length).toBe(DISCIPLINE_OPTIONS.length - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it passes already (baseline)**

Run: `pnpm test tests/metadata-options-sourced.test.ts`
Expected: PASS — current hardcoded values already satisfy these. (This test is a regression guard: it must still pass after the derivation refactor.)

- [ ] **Step 3: Rewrite `lib/principles.ts` to source from config**

Replace the entire file content of `lib/principles.ts` with:

```ts
import { getPrinciples } from "./framework-config";

/**
 * TRUST framework principles with display codes, accent colors, and full names.
 * Now derived from the data-driven framework config (see data/framework/).
 * Order matters — drives tab/column ordering.
 */
export const PRINCIPLES = getPrinciples().map((p) => ({
  id: p.id,
  code: p.code,
  color: p.color,
  reportColor: p.reportColor,
  fullName: p.fullName,
})) as unknown as {
  readonly id: "TR" | "RE" | "US" | "SE" | "TC";
  readonly code: string;
  readonly color: `#${string}`;
  readonly reportColor: `#${string}`;
  readonly fullName: string;
}[];
```

> The `as unknown as` cast preserves the narrow literal-typed shape the existing consumers (e.g. `PRINCIPLES[0].id` used as a key) rely on, so no downstream type breaks.

- [ ] **Step 4: Rewrite `lib/metadata-options.ts` to source from config**

Replace the entire file content of `lib/metadata-options.ts` with:

```ts
import { getFrameworkConfig } from "./framework-config";

const cfg = getFrameworkConfig();

export const DATA_SOURCE_OPTIONS = cfg.metadataFields.dataSources.options;
export const SEARCH_METHOD_OPTIONS = cfg.metadataFields.searchMethods.options;
export const DISCIPLINE_OPTIONS = cfg.metadataFields.discipline.options ?? [];
export const AUTH_METHOD_OPTIONS = cfg.metadataFields.authenticationMethod.options;

export const DISCIPLINE_DEFAULT = cfg.metadataFields.discipline.default ?? "Multidisciplinary";
export const DISCIPLINE_OTHERS = DISCIPLINE_OPTIONS.filter((d) => d !== DISCIPLINE_DEFAULT);
export const MAX_CUSTOM_LENGTH = 120;
```

> These remain plain array exports so every current import site keeps working. They reflect the *default* config; runtime overrides are handled in Task 5 via hooks (the static exports stay the build-time defaults).

- [ ] **Step 5: Rewrite the three maps in `lib/rubric.ts`**

In `lib/rubric.ts`, replace the three hardcoded maps (`QG_CATEGORY_CODES`, `ACCENT_KEYS`, `CATEGORY_LABELS`) and their helper bodies so they delegate to the accessors. Replace the `QG_CATEGORY_CODES` const + `getQGCategoryCode` body, the `ACCENT_KEYS` const + `getAccentKey` body, and the `CATEGORY_LABELS` const + `getCategoryLabel` body with thin delegations:

```ts
import { getAccentKey as cfgAccentKey, getCategoryLabel as cfgCategoryLabel, getQGCategoryCode as cfgQGCode } from "./framework-config";

// …existing code…

/** Map quality gate category keys to short display codes (delegates to framework config). */
export function getQGCategoryCode(categoryKey: string): string {
  return cfgQGCode(categoryKey);
}

/** Build a quality-gate question code like "PS1" using the category code mapping. */
export function getQGQuestionCode(categoryKey: string, questionIndex: number): string {
  return `${getQGCategoryCode(categoryKey)}${questionIndex + 1}`;
}

/** Resolve the accent color key for a category, defaulting to "control". */
export function getAccentKey(categoryId: string): string {
  return cfgAccentKey(categoryId);
}

/** Human-readable label for a category ID. */
export function getCategoryLabel(categoryId: string): string {
  return cfgCategoryLabel(categoryId);
}
```

Delete the now-unused `QG_CATEGORY_CODES`, `ACCENT_KEYS`, and `CATEGORY_LABELS` const declarations from `lib/rubric.ts` (they are module-private and have no external consumers).

- [ ] **Step 6: Run the full test suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all tests PASS (including the existing `tests/principles.test.ts`, `tests/rubric-tagging-section.test.tsx`, etc.), no type errors. The regression guard from Step 1 confirms values are unchanged.

- [ ] **Step 7: Commit**

```bash
git add lib/principles.ts lib/metadata-options.ts lib/rubric.ts tests/metadata-options-sourced.test.ts
git commit -m "refactor(framework): source principles/options/rubric-maps from config"
```

---

## Task 4: Framework customization store

A persisted store holding user overrides. It overrides option-lists (per field, the user may add/remove entries relative to defaults) and grade label/description text. It does NOT touch principle/grade identity.

**Files:**
- Create: `stores/framework-customization.ts`
- Modify: `lib/framework-config.ts` (`getActiveFrameworkConfig` merges overrides)
- Test: `tests/framework-customization.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/framework-customization.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { getMetadataFieldOptions, getGradeDefinitions } from "@/lib/framework-config";

describe("framework customization store", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });

  it("starts with no overrides (active config equals defaults)", () => {
    expect(getMetadataFieldOptions("dataSources")).toContain("CrossRef");
    expect(useFrameworkCustomizationStore.getState().hasOverrides()).toBe(false);
  });

  it("adds and removes a custom data-source option", () => {
    const store = useFrameworkCustomizationStore.getState();
    store.addOption("dataSources", "My Local Repo");
    expect(getMetadataFieldOptions("dataSources")).toContain("My Local Repo");

    store.removeOption("dataSources", "My Local Repo");
    expect(getMetadataFieldOptions("dataSources")).not.toContain("My Local Repo");
  });

  it("resetField restores a single field's defaults", () => {
    const store = useFrameworkCustomizationStore.getState();
    store.addOption("dataSources", "X");
    store.addOption("searchMethods", "Y");
    store.resetField("dataSources");
    expect(getMetadataFieldOptions("dataSources")).not.toContain("X");
    expect(getMetadataFieldOptions("searchMethods")).toContain("Y");
  });

  it("overrides a grade's label and description", () => {
    const store = useFrameworkCustomizationStore.getState();
    store.setGradeOverride("pass", { label: "Go", description: "Ship it" });
    const pass = getGradeDefinitions().find((g) => g.id === "pass");
    expect(pass?.label).toBe("Go");
    expect(pass?.description).toBe("Ship it");
  });

  it("exportCustomization then importCustomization round-trips", () => {
    const store = useFrameworkCustomizationStore.getState();
    store.addOption("dataSources", "Round");
    store.setGradeOverride("fail", { label: "Nope" });
    const exported = store.exportCustomization();

    store.resetAll();
    expect(getMetadataFieldOptions("dataSources")).not.toContain("Round");

    store.importCustomization(exported);
    expect(getMetadataFieldOptions("dataSources")).toContain("Round");
    expect(getGradeDefinitions().find((g) => g.id === "fail")?.label).toBe("Nope");
  });

  it("importCustomization rejects malformed payloads", () => {
    const store = useFrameworkCustomizationStore.getState();
    expect(() => store.importCustomization({ garbage: true })).toThrow();
    expect(() => store.importCustomization("not an object")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/framework-customization.test.ts`
Expected: FAIL — store module does not exist.

- [ ] **Step 3: Create the customization store**

Create `stores/framework-customization.ts`. The shape mirrors `stores/registry.ts` (Zustand + `persist` → localStorage):

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/** A grade label/description override (ids are stable; only text changes). */
export interface GradeOverride {
  label?: string;
  description?: string;
}

/** Serializable customization. `extraOptions` are additive to defaults; `hiddenOptions` remove defaults. */
export interface FrameworkCustomization {
  /** field → options the user added beyond the shipped defaults. */
  extraOptions: Record<string, string[]>;
  /** field → shipped options the user hid. */
  hiddenOptions: Record<string, string[]>;
  /** grade id → label/description text override. */
  gradeOverrides: Record<string, GradeOverride>;
}

const EMPTY: FrameworkCustomization = {
  extraOptions: {},
  hiddenOptions: {},
  gradeOverrides: {},
};

export interface FrameworkCustomizationState {
  customization: FrameworkCustomization;
  addOption: (field: string, option: string) => void;
  removeOption: (field: string, option: string) => void;
  /** Mark a shipped default option as hidden (restorable via resetField). */
  hideOption: (field: string, option: string) => void;
  setGradeOverride: (gradeId: string, override: GradeOverride) => void;
  resetField: (field: string) => void;
  resetGrades: () => void;
  resetAll: () => void;
  hasOverrides: () => boolean;
  exportCustomization: () => FrameworkCustomization;
  /** Validate and merge a previously exported customization, replacing the current one. */
  importCustomization: (data: unknown) => void;
}

function validateCustomization(data: unknown): FrameworkCustomization {
  if (!data || typeof data !== "object") throw new Error("Customization must be an object");
  const d = data as Record<string, unknown>;
  const isStrArr = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");
  const norm = (v: unknown): string[] => (isStrArr(v) ? v : []);
  const extraOptions: Record<string, string[]> = {};
  const hiddenOptions: Record<string, string[]> = {};
  const gradeOverrides: Record<string, GradeOverride> = {};
  if (d.extraOptions && typeof d.extraOptions === "object") {
    for (const [k, v] of Object.entries(d.extraOptions as object)) extraOptions[k] = norm(v);
  }
  if (d.hiddenOptions && typeof d.hiddenOptions === "object") {
    for (const [k, v] of Object.entries(d.hiddenOptions as object)) hiddenOptions[k] = norm(v);
  }
  if (d.gradeOverrides && typeof d.gradeOverrides === "object") {
    for (const [k, v] of Object.entries(d.gradeOverrides as object)) {
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        gradeOverrides[k] = {
          ...(typeof o.label === "string" ? { label: o.label } : {}),
          ...(typeof o.description === "string" ? { description: o.description } : {}),
        };
      }
    }
  }
  return { extraOptions, hiddenOptions, gradeOverrides };
}

export const useFrameworkCustomizationStore = create<FrameworkCustomizationState>()(
  persist(
    (set, get) => ({
      customization: EMPTY,

      addOption: (field, option) =>
        set((s) => {
          const existing = s.customization.extraOptions[field] ?? [];
          if (existing.includes(option)) return {};
          return {
            customization: {
              ...s.customization,
              extraOptions: { ...s.customization.extraOptions, [field]: [...existing, option] },
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
              extraOptions: { ...s.customization.extraOptions, [field]: extra.filter((o) => o !== option) },
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
              hiddenOptions: { ...s.customization.hiddenOptions, [field]: [...hidden, option] },
            },
          };
        }),

      setGradeOverride: (gradeId, override) =>
        set((s) => ({
          customization: {
            ...s.customization,
            gradeOverrides: { ...s.customization.gradeOverrides, [gradeId]: override },
          },
        })),

      resetField: (field) =>
        set((s) => {
          const { [field]: _e, ...extra } = s.customization.extraOptions;
          const { [field]: _h, ...hidden } = s.customization.hiddenOptions;
          return {
            customization: { ...s.customization, extraOptions: extra, hiddenOptions: hidden },
          };
        }),

      resetGrades: () =>
        set((s) => ({ customization: { ...s.customization, gradeOverrides: {} } })),

      resetAll: () => set({ customization: EMPTY }),

      hasOverrides: () => {
        const c = get().customization;
        return (
          Object.keys(c.extraOptions).length > 0 ||
          Object.keys(c.hiddenOptions).length > 0 ||
          Object.keys(c.gradeOverrides).length > 0
        );
      },

      exportCustomization: () => structuredClone(get().customization),

      importCustomization: (data) => set({ customization: validateCustomization(data) }),
    }),
    {
      name: "trust-framework-customization",
      partialize: (s) => ({ customization: s.customization }),
    },
  ),
);
```

- [ ] **Step 4: Wire `getActiveFrameworkConfig` to merge overrides**

In `lib/framework-config.ts`, replace the `getActiveFrameworkConfig` body to merge the customization store's current state. Import the store lazily (the accessor runs both in the extension and in tests; the store is safe to import at module load):

```ts
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

export function getActiveFrameworkConfig(): FrameworkConfig {
  const c = useFrameworkCustomizationStore.getState().customization;
  const base = FRAMEWORK_CONFIG;

  const metadataFields: FrameworkConfig["metadataFields"] = {};
  for (const [field, def] of Object.entries(base.metadataFields)) {
    const extra = c.extraOptions[field] ?? [];
    const hidden = new Set(c.hiddenOptions[field] ?? []);
    const merged = [...def.options, ...extra].filter((o) => !hidden.has(o));
    metadataFields[field] = { ...def, options: merged };
  }

  const grades = base.grades.map((g) => {
    const o = c.gradeOverrides[g.id];
    return o ? { ...g, ...o } : g;
  });

  return { ...base, metadataFields, grades };
}
```

> `getFrameworkConfig()` still returns the frozen default (no overrides) — use it anywhere that must reflect the shipped config (e.g. default-reset UI). `getActiveFrameworkConfig()` is what all the other accessors already call, so they now reflect overrides automatically.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/framework-customization.test.ts`
Expected: PASS (all 6 assertions).

- [ ] **Step 6: Run full suite + typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add stores/framework-customization.ts lib/framework-config.ts tests/framework-customization.test.ts
git commit -m "feat(framework): add persisted customization store + active-config merge"
```

---

## Task 5: React hooks + wire metadata option consumers

The static exports from Task 3 stay (build-time defaults). The live UI must reflect runtime overrides, so the `PillField` option sources and `DisciplineField` switch to hooks that subscribe to the customization store.

**Files:**
- Create: `hooks/useFrameworkConfig.ts`
- Modify: `components/Metadata.tsx` (3 `PillField` option props)
- Modify: `components/metadata/DisciplineField.tsx` (option source)
- Test: `tests/use-framework-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/use-framework-config.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useMetadataFieldOptions } from "@/hooks/useFrameworkConfig";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

describe("useMetadataFieldOptions", () => {
  beforeEach(() => {
    useFrameworkCustomizationStore.getState().resetAll();
  });

  it("returns default options initially", () => {
    const { result } = renderHook(() => useMetadataFieldOptions("dataSources"));
    expect(result.current).toContain("CrossRef");
  });

  it("reactively includes a newly added option", () => {
    const { result } = renderHook(() => useMetadataFieldOptions("dataSources"));
    expect(result.current).not.toContain("Live");
    act(() => {
      useFrameworkCustomizationStore.getState().addOption("dataSources", "Live");
    });
    expect(result.current).toContain("Live");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/use-framework-config.test.ts`
Expected: FAIL — hook does not exist.

- [ ] **Step 3: Create the hooks**

Create `hooks/useFrameworkConfig.ts`:

```ts
import { useMemo } from "react";
import { getMetadataField } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Subscribe to a metadata field's option list, re-rendering when customization changes. */
export function useMetadataFieldOptions(field: string): string[] {
  // Subscribe so the hook re-runs on any customization change.
  useFrameworkCustomizationStore((s) => s.customization);
  return useMemo(() => [...getMetadataField(field)?.options ?? []], [field]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/use-framework-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire `components/Metadata.tsx`**

In `components/Metadata.tsx`, replace the static import usage with the hook. Remove `DATA_SOURCE_OPTIONS`, `SEARCH_METHOD_OPTIONS`, `AUTH_METHOD_OPTIONS` from the `@/lib/metadata-options` import, and add a hook import + three calls at the top of the component body:

```ts
import { useMetadataFieldOptions } from "@/hooks/useFrameworkConfig";
```

Inside the component function, before the JSX:

```ts
const dataSources = useMetadataFieldOptions("dataSources");
const searchMethods = useMetadataFieldOptions("searchMethods");
const authMethods = useMetadataFieldOptions("authenticationMethod");
```

Then update the three `PillField` usages:
- `options={DATA_SOURCE_OPTIONS}` → `options={dataSources}`
- `options={SEARCH_METHOD_OPTIONS}` → `options={searchMethods}`
- `options={AUTH_METHOD_OPTIONS}` → `options={authMethods}`

- [ ] **Step 6: Wire `components/metadata/DisciplineField.tsx`**

In `components/metadata/DisciplineField.tsx`: replace the `DISCIPLINE_OPTIONS` import with the hook, and derive `DISCIPLINE_DEFAULT` / `DISCIPLINE_OTHERS` locally. Update imports:

```ts
import { useMetadataFieldOptions } from "@/hooks/useFrameworkConfig";
import { MAX_CUSTOM_LENGTH } from "@/lib/metadata-options";
```

Inside the component:

```ts
const disciplineOptions = useMetadataFieldOptions("discipline");
const config = getMetadataField("discipline"); // import getMetadataField from @/lib/framework-config
const DISCIPLINE_DEFAULT = config?.default ?? "Multidisciplinary";
const DISCIPLINE_OTHERS = disciplineOptions.filter((d) => d !== DISCIPLINE_DEFAULT);
```

Replace every `DISCIPLINE_OPTIONS` → `disciplineOptions`, and keep the existing `DISCIPLINE_DEFAULT` / `DISCIPLINE_OTHERS` references pointing at the local consts.

- [ ] **Step 7: Run the full suite + typecheck + lint**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: all PASS, no errors. (The existing `pill-field.test.tsx` and metadata tests must still pass.)

- [ ] **Step 8: Commit**

```bash
git add hooks/useFrameworkConfig.ts components/Metadata.tsx components/metadata/DisciplineField.tsx tests/use-framework-config.test.ts
git commit -m "feat(framework): wire metadata option consumers to live customization hooks"
```

---

## Task 6: Framework editor UI

A screen reachable from Settings that lets the user edit each metadata field's option list (add/remove entries) and each grade's label/description, with per-field reset and "reset all". (Import/export buttons are added in Task 7.)

**Files:**
- Create: `components/FrameworkEditor.tsx`
- Modify: `components/SettingsScreen.tsx` (add entry point)
- Test: `tests/framework-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/framework-editor.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import FrameworkEditor from "@/components/FrameworkEditor";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { getMetadataFieldOptions } from "@/lib/framework-config";
import { AllProviders } from "@/tests/helpers/render-utils";

describe("FrameworkEditor", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());
  afterEach(cleanup);

  it("renders a section per metadata field and the grades section", () => {
    render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
    expect(screen.getByText(/data sources/i)).toBeTruthy();
    expect(screen.getByText(/discipline/i)).toBeTruthy();
    expect(screen.getByText(/finalization grades/i)).toBeTruthy();
  });

  it("adds a custom option that becomes live in the metadata field", () => {
    render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
    const input = screen.getByPlaceholderText(/add.*data sources/i);
    fireEvent.change(input, { target: { value: "Repo X" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(getMetadataFieldOptions("dataSources")).toContain("Repo X");
  });

  it("edits a grade label", () => {
    render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
    const passLabelInput = screen.getByLabelText(/label.*pass/i);
    fireEvent.change(passLabelInput, { target: { value: "Approved" } });
    expect(
      useFrameworkCustomizationStore.getState().customization.gradeOverrides.pass?.label,
    ).toBe("Approved");
  });

  it("reset all clears overrides", () => {
    useFrameworkCustomizationStore.getState().addOption("dataSources", "Temp");
    render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
    fireEvent.click(screen.getByRole("button", { name: /reset all/i }));
    expect(useFrameworkCustomizationStore.getState().hasOverrides()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/framework-editor.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the editor**

Create `components/FrameworkEditor.tsx`. Use the existing design tokens (Tailwind utility classes mirroring `SettingsScreen.tsx`):

```tsx
import { useState } from "react";
import { getFrameworkConfig, getMetadataField } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

const FIELDS = ["dataSources", "searchMethods", "discipline", "authenticationMethod"] as const;

export default function FrameworkEditor({ onBack }: { onBack: () => void }) {
  const cfg = getFrameworkConfig();
  const store = useFrameworkCustomizationStore();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const commitOption = (field: string) => {
    const v = (drafts[field] ?? "").trim();
    if (v) store.addOption(field, v);
    setDrafts((d) => ({ ...d, [field]: "" }));
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading uppercase text-ut-lg">Customize framework</h2>
        <button type="button" className="text-ut-sm text-trust-magenta underline" onClick={onBack}>
          Back to settings
        </button>
      </div>
      <p className="text-ut-sm text-ut-muted">
        Edit the option lists and grade wording for this framework. Changes are stored locally and
        apply to new and open reviews. Import/export is on this screen too.
      </p>

      {FIELDS.map((field) => {
        const def = getMetadataField(field);
        const live = cfg.metadataFields[field].options;
        return (
          <section key={field} className="border border-ut-border rounded-ut-sm p-ut-3">
            <h3 className="font-heading uppercase text-ut-sm mb-ut-2">{def?.label ?? field}</h3>
            <ul className="flex flex-wrap gap-ut-1 mb-ut-2">
              {live.map((opt) => (
                <li
                  key={opt}
                  className="flex items-center gap-ut-1 border border-ut-border rounded-ut-full px-ut-2 py-ut-1 text-ut-xs"
                >
                  <span>{opt}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${opt}`}
                    className="text-ut-muted hover:text-trust-magenta"
                    onClick={() => store.removeOption(field, opt)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <input
              className="border border-ut-border rounded-ut-sm px-ut-2 py-ut-1 text-ut-sm w-full"
              list={`${field}-suggestions`}
              placeholder={`Add ${def?.label ?? field}…`}
              value={drafts[field] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [field]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitOption(field);
                }
              }}
            />
            <datalist id={`${field}-suggestions`}>
              {def?.options.map((o) => <option key={o} value={o} />)}
            </datalist>
          </section>
        );
      })}

      <section className="border border-ut-border rounded-ut-sm p-ut-3">
        <h3 className="font-heading uppercase text-ut-sm mb-ut-2">Finalization grades</h3>
        <div className="flex flex-col gap-ut-2">
          {cfg.grades.map((g) => {
            const live = getFrameworkConfig().grades.find((x) => x.id === g.id) ?? g;
            return (
              <div key={g.id} className="flex flex-col gap-ut-1">
                <label className="text-ut-xs text-ut-muted" htmlFor={`label-${g.id}`}>
                  Label — {g.id}
                </label>
                <input
                  id={`label-${g.id}`}
                  className="border border-ut-border rounded-ut-sm px-ut-2 py-ut-1 text-ut-sm"
                  value={live.label}
                  onChange={(e) => store.setGradeOverride(g.id, { label: e.target.value })}
                />
                <textarea
                  className="border border-ut-border rounded-ut-sm px-ut-2 py-ut-1 text-ut-sm"
                  rows={2}
                  value={live.description}
                  onChange={(e) => store.setGradeOverride(g.id, { description: e.target.value })}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex gap-ut-2">
        <button
          type="button"
          className="text-ut-sm border border-ut-border rounded-ut-sm px-ut-3 py-ut-1"
          onClick={() => store.resetAll()}
        >
          Reset all
        </button>
      </div>
    </div>
  );
}
```

> The grade label/description inputs use `getFrameworkConfig()` (defaults) as their base display value; the store override is written on change. `aria-label`s match the test selectors. Refine class names to match the project's actual Tailwind utility naming if `rounded-ut-full` differs — verify with `grep 'rounded-ut' components/`.

- [ ] **Step 4: Wire the entry point in Settings**

In `components/SettingsScreen.tsx`, add a button that swaps to the editor. Add a `useState` for the sub-view and a render branch (mirroring how `SettingsScreen` already toggles sub-screens if any exist; otherwise add a simple local state):

```tsx
import { useState } from "react";
import FrameworkEditor from "./FrameworkEditor";

// inside the component:
const [editingFramework, setEditingFramework] = useState(false);
if (editingFramework) return <FrameworkEditor onBack={() => setEditingFramework(false)} />;
```

Add a button in the settings body:

```tsx
<button
  type="button"
  className="w-full text-left border border-ut-border rounded-ut-sm px-ut-3 py-ut-2 hover:border-trust-magenta"
  onClick={() => setEditingFramework(true)}
>
  Customize framework
</button>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/framework-editor.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run full suite + typecheck + lint**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add components/FrameworkEditor.tsx components/SettingsScreen.tsx tests/framework-editor.test.tsx
git commit -m "feat(framework): add in-extension framework editor"
```

---

## Task 7: Import / export customization

Adds export-to-JSON-file and import-from-JSON-file buttons to the editor, completing the community-sharing loop.

**Files:**
- Modify: `components/FrameworkEditor.tsx`
- Test: extend `tests/framework-editor.test.tsx`

- [ ] **Step 1: Add failing tests**

Append to `tests/framework-editor.test.tsx`:

```tsx
import { getMetadataFieldOptions } from "@/lib/framework-config";

it("exports the customization as a downloadable JSON blob", () => {
  useFrameworkCustomizationStore.getState().addOption("dataSources", "Shared");
  const urlCreations: string[] = [];
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = (b: Blob) => {
    urlCreations.push("created");
    return "blob:mock";
  };
  const revoke = URL.revokeObjectURL;
  URL.revokeObjectURL = () => {};
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = () => {};

  render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
  fireEvent.click(screen.getByRole("button", { name: /export customization/i }));
  expect(urlCreations).toHaveLength(1);

  URL.createObjectURL = origCreate;
  URL.revokeObjectURL = revoke;
  HTMLAnchorElement.prototype.click = anchorClick;
});

it("imports a customization from a JSON file", async () => {
  const payload = {
    extraOptions: { dataSources: ["Imported"] },
    hiddenOptions: {},
    gradeOverrides: {},
  };
  render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
  const input = screen.getByLabelText(/import customization/i) as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File([JSON.stringify(payload)], "cust.json", { type: "application/json" })] },
  });
  // let the async FileReader / JSON.parse settle
  await Promise.resolve();
  expect(getMetadataFieldOptions("dataSources")).toContain("Imported");
});

it("shows an error toast on malformed import", async () => {
  render(<FrameworkEditor onBack={() => {}} />, { wrapper: AllProviders });
  const input = screen.getByLabelText(/import customization/i) as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["{not json", "bad.json", { type: "application/json" }])] },
  });
  await Promise.resolve();
  expect(await screen.findByText(/could not import/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test tests/framework-editor.test.tsx`
Expected: FAIL — no export/import buttons.

- [ ] **Step 3: Add export/import handlers + buttons**

In `components/FrameworkEditor.tsx`, add the handlers and two buttons in the bottom action row:

```tsx
function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// inside the component:
const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  file
    .text()
    .then((txt) => {
      try {
        store.importCustomization(JSON.parse(txt));
      } catch {
        toastError("Could not import customization file — invalid JSON.");
      }
    })
    .catch(() => toastError("Could not import customization file."));
  e.target.value = "";
};
```

Add `import { toastError } from "@/stores/toast";` at the top. In the bottom action `<div className="flex gap-ut-2">`:

```tsx
<button
  type="button"
  className="text-ut-sm border border-ut-border rounded-ut-sm px-ut-3 py-ut-1"
  onClick={() => downloadJSON("trust-framework-customization.json", store.exportCustomization())}
>
  Export customization
</button>
<label className="text-ut-sm border border-ut-border rounded-ut-sm px-ut-3 py-ut-1 cursor-pointer">
  Import customization
  <input type="file" accept="application/json,.json" hidden onChange={onImport} />
</label>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test tests/framework-editor.test.tsx`
Expected: PASS (including the 3 new tests).

- [ ] **Step 5: Run full suite + typecheck + lint**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add components/FrameworkEditor.tsx tests/framework-editor.test.tsx
git commit -m "feat(framework): import/export framework customization as JSON"
```

---

## Task 8: Docs + CHANGELOG

**Files:**
- Modify: `CLAUDE.md` (rubric-structure section → mention framework config)
- Modify: `CHANGELOG.md` (unreleased entry)

- [ ] **Step 1: Update CLAUDE.md architecture section**

In `CLAUDE.md`, under the "Key Decisions" / "Rubric Structure" area, add a bullet and a short subsection documenting the new config layer:

```markdown
- Framework content (principles, quality-gate category codes, grade definitions, metadata
  option-lists) is data-driven via `data/framework/trust-framework.json`, accessed through
  `lib/framework-config.ts`. User customizations persist via `stores/framework-customization.ts`
  and are editable in Settings → Customize framework.
```

- [ ] **Step 2: Add CHANGELOG entry**

In `CHANGELOG.md`, under the top unreleased section (create one if absent):

```markdown
### New
- **Framework customization (Labs)** — the metadata option-lists (data sources, search methods,
  disciplines, authentication methods) and finalization grade labels/descriptions are now
  data-driven (`data/framework/trust-framework.json`) and editable in-extension via Settings →
  Customize framework. Customizations persist locally and can be imported/exported as JSON for
  sharing. Principles, quality-gate codes, and accent maps are now derived from this config too.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs(framework): document framework config + customization"
```

---

## Definition of Done (this plan)

- [ ] `pnpm test` green, coverage not below the ratcheted thresholds (73/66/66/75).
- [ ] `pnpm typecheck` and `pnpm check` (biome) clean.
- [ ] A reviewer can open Settings → Customize framework, add a custom data source, rename a grade's label, and see both reflected in an open review's Metadata and Finalization screens.
- [ ] Export → import of a customization JSON round-trips on a fresh profile.
- [ ] No downstream export pipeline / report / comparison behavior changed (they consume the same stable exports).
- [ ] CLAUDE.md + CHANGELOG updated.

## Follow-up plans (not in scope here)

- **Plan B — Framework modularity, full:** grade-ID authoring (extends `FinalizationGrade`), rubric-question authoring, rubric/pack versioning + migration via `lib/migrations.ts`, branding/theming extraction (logos, `--trust-magenta`, TRUST literals in `report.css`/`sanitize.ts`/print headers).
- **Plan C — Consensus comparison app (#4):** new static offline app under `consensus/` (replicating the `web/` → `site/try/` build pattern → `site/consensus/`), a `ConsensusModel` that mirrors finalization's expert-overrides-scores pattern (manual consensus, tool highlights agreement/diffs across 2–3 reviews), and an exportable standalone consensus-report HTML.

## Self-Review Notes

- **Spec coverage:** issue #5's "make all content easily user-modifiable by editing plain .json files" → Task 1 (JSON). "interface inside the extension to easily modify the .json files" + "export/import" → Tasks 4–7. "name their question set, and export/import them" → Task 7 (customization-level; full pack naming is Plan B). The issue's broader repo-split and full-rubric-authoring goals are explicitly scoped to Plan B with a stated reason.
- **Type consistency:** `FrameworkConfig` / `FrameworkPrinciple` / `FrameworkGrade` / `FrameworkMetadataField` defined once (Task 1) and reused everywhere. Accessor names (`getPrinciples`, `getGradeDefinitions`, `getMetadataField`, `getMetadataFieldOptions`, `getQGCategoryCode`, `getAccentKey`, `getCategoryLabel`) are identical across Tasks 2–6. Store method names (`addOption`/`removeOption`/`hideOption`/`setGradeOverride`/`resetField`/`resetGrades`/`resetAll`/`hasOverrides`/`exportCustomization`/`importCustomization`) are identical across Tasks 4–7.
- **Placeholder scan:** the only `<copy from GradeSelector.tsx>` markers are an explicit transcription instruction for real strings that live in that file (not invented content); a grep gate in Task 1 Step 3 enforces none ship as literal angle-bracket placeholders.
