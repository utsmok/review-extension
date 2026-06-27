# Framework Modularity — Plan A: Schema-Driven Form Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan supersedes the earlier "option-lists only" draft.

**Goal:** Make every user-entry field in the extension (all ~25: metadata, finalization free-text, settings) data-driven via a declarative `FieldDescriptor` schema, and provide a full in-extension editor to toggle / modify / create / reorder fields, edit option-lists in place, and consolidate the triplicated grade definitions — all persisted locally and importable/exportable as JSON.

**Architecture:** A `fields` section is added to `data/framework/trust-framework.json` describing every entry field. A `FieldDescriptor`-driven renderer (`SchemaForm`) iterates the active schema (defaults merged with persisted user customizations) and dispatches to typed input components. The customization store generalizes the additive+hide+rename model to whole-field overrides (label, required, enabled, order, group) plus field additions/removals plus option-list edits plus grade text. Grade definitions — currently triplicated across `GradeSelector.tsx`, `compute-scores.ts`, and `types.ts` — consolidate into the config. Custom user-created fields persist into a `customFields` bag on `SessionMetadata`.

**Tech Stack:** TypeScript, React 19, Zustand (+ `persist` → localStorage, mirroring `stores/registry.ts`), WXT, Vitest + @testing-library/react.

## Scope

**In scope:**
- A declarative schema for ALL ~25 entry fields (type, label, placeholder, options, required, group, order, enabled, captureable, autoPopulate key).
- Schema-driven rendering of the Metadata form and the finalization free-text fields (conclusion, strengths, weaknesses, recommendations).
- Full editor: toggle fields on/off, edit label/placeholder/help, create new fields, remove fields, reorder, edit option-lists in place (add/rename/remove with rename-migration of stored reviews), edit grade label/description/color/tint.
- Consolidate the 3 grade-definition sites into one config source (unify `GRADE_LABELS`; keep `FinalizationGrade` id union stable).
- Fix the registry/options mismatch (registry defaults aligned to field option-lists).
- Import/export the customization as JSON.

**Out of scope (Plan B — `docs/plans/2026-06-27-framework-modularity-stage2.md`):**
- Adding/removing **grade IDs** (changes the `FinalizationGrade` union).
- **Rubric question** authoring (quality-gate + scoring titles/requirements/backgrounds/examples/anchors/ai_only).
- **Principle** name/code/color editing + token/report color-map propagation.
- **Branding** extraction (logos, `--trust-magenta`, "TRUST" literals in report/print/sanitize, export filenames).
- **Pack/rubric versioning & migration** of question-key renames.

**Why this scope:** the issue's own framing splits "fields" (now) from "questions" (next). Fields are the high-impact, low-risk, demoable surface; the schema descriptor, schema-driven renderer, editor framework, customization store, rename-migration helper, and import/export plumbing built here are exactly what Plan B reuses for rubric/grades/principles. Sequencing fields first de-risks the harder instrument work.

## File Structure

**Create:**
- `lib/field-schema.ts` — `FieldDescriptor` type, `getFieldValue`/`setFieldValue` helpers, field-config accessors (`getFields`, `getActiveFields`, `getField`).
- `components/SchemaForm.tsx` — iterates active descriptors; dispatches to input components by `type`.
- `components/field-inputs/` — typed input components (`TextInput.tsx`, `TextAreaInput.tsx`, `UrlInput.tsx`, `BooleanToggle.tsx`, `SelectInput.tsx`, `ImageInput.tsx`). Most wrap existing atoms; `SelectInput` wraps `PillField`.
- `components/FieldEditor.tsx` — full field + option + grade editor (replaces the narrower `FrameworkEditor` from the prior draft).
- `lib/framework-migrate.ts` — `migrateOptionRename` (stored-session rewrite on option rename).
- Tests: `tests/field-schema.test.ts`, `tests/schema-form.test.tsx`, `tests/framework-customization.test.ts`, `tests/field-editor.test.tsx`, `tests/grade-config-consolidation.test.ts`.

**Modify:**
- `data/framework/trust-framework.json` — add `fields: FieldDescriptor[]` (all ~25) and `grades` (consolidated, with color/tint).
- `data/framework/index.ts` — extend `validateFrameworkShape` for `fields` + `grades` shape; export `FIELD_IDS`.
- `lib/types.ts` — add `FieldDescriptor`, `FrameworkGrade` (add `color`/`tint`), `customFields?` bag on `SessionMetadata`; `FinalizationGrade` unchanged.
- `stores/framework-customization.ts` — generalize to field overrides + additions + removals + order + option overrides + grade overrides.
- `lib/framework-config.ts` — `getActiveFrameworkConfig` merges field/grade customizations.
- `components/Metadata.tsx` — render the metadata surface from `SchemaForm` (replace the hand-written field JSX).
- `components/finalization/GradeSelector.tsx` — derive grades from config (replace `GRADES`/`ENHANCED_GRADES` literals).
- `lib/report/compute-scores.ts` — derive `GRADE_COLORS`/`GRADE_LABELS` from config.
- `data/tools/registry.json` — align default values to the field option-lists.
- `components/SettingsScreen.tsx` — entry point to `FieldEditor`.

**No change** to scoring math, export ZIP assembly, html-report structure (field-iterative sections auto-adapt once data flows from the schema).

---

## Task 1: FieldDescriptor model + field/grade config + loader

**Files:**
- Modify: `lib/types.ts` (add `FieldDescriptor`, extend `FrameworkGrade`, add `customFields`)
- Modify: `data/framework/trust-framework.json` (add `fields`, `grades`)
- Modify: `data/framework/index.ts` (validate + export)
- Test: `tests/field-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/field-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FRAMEWORK_CONFIG, FIELD_IDS, validateFrameworkShape } from "@/data/framework";

describe("field schema config", () => {
  it("is frozen and valid", () => {
    expect(Object.isFrozen(FRAMEWORK_CONFIG)).toBe(true);
    expect(() => validateFrameworkShape(FRAMEWORK_CONFIG)).not.toThrow();
  });

  it("declares every builtin metadata field with a stable id and storageKey", () => {
    const ids = new Set(FRAMEWORK_CONFIG.fields.map((f) => f.id));
    for (const required of ["toolName", "toolUrl", "description", "dataSources", "grade", "conclusion"])
      expect(ids.has(required)).toBe(true);
  });

  it("dataSources is a multi-select with options and allowCustom", () => {
    const f = FRAMEWORK_CONFIG.fields.find((x) => x.id === "dataSources")!;
    expect(f.type).toBe("multi-select");
    expect(f.options?.length).toBeGreaterThan(10);
    expect(f.allowCustom).toBe(true);
  });

  it("discipline has a defaultOption", () => {
    const f = FRAMEWORK_CONFIG.fields.find((x) => x.id === "discipline")!;
    expect(f.defaultOption).toBe("Multidisciplinary");
  });

  it("FIELD_IDS is a stable ordered list of ids", () => {
    expect(Array.isArray(FIELD_IDS)).toBe(true);
    expect(new Set(FIELD_IDS).size).toBe(FIELD_IDS.length);
  });

  it("grades consolidated: 9 ids, each with label/description/color/tint", () => {
    expect(FRAMEWORK_CONFIG.grades).toHaveLength(9);
    for (const g of FRAMEWORK_CONFIG.grades) {
      expect(typeof g.label).toBe("string");
      expect(typeof g.color).toBe("string");
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/field-schema.test.ts`
Expected: FAIL — `fields`/consolidated `grades` not present.

- [ ] **Step 3: Add types**

In `lib/types.ts`, add:

```ts
/** Input type for a schema-driven entry field. */
export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "email"
  | "boolean"
  | "select" // single-select pill field
  | "multi-select" // multi-select pill field
  | "image";

/** Which object a field's value is stored on. */
export type FieldSurface = "metadata" | "finalization" | "settings";

/** Declarative description of one user-entry field. Drives SchemaForm + the editor. */
export interface FieldDescriptor {
  /** Stable identifier; also the customization key. Builtin ids match the storage key. */
  id: string;
  /** Key on the storage object (SessionMetadata / ReviewFinalization / Settings). */
  storageKey: string;
  surface: FieldSurface;
  label: string;
  placeholder?: string;
  helpText?: string;
  type: FieldType;
  /** Options for select/multi-select. */
  options?: string[];
  /** Default option for select (e.g. discipline default). */
  defaultOption?: string;
  maxLength?: number;
  required?: boolean;
  /** Allow free-text custom entries in select/multi-select (default true). */
  allowCustom?: boolean;
  /** Form grouping label (e.g. "Profile", "Access", "Coverage"). */
  group?: string;
  /** Display order within the group. */
  order: number;
  /** Toggle the field on/off in the form. */
  enabled: boolean;
  /** Supports screenshot evidence linking (toolLogoUrl, termsConditionsUrl). */
  captureable?: boolean;
  /** data/tools/registry.json `defaults` key for auto-population. */
  autoPopulateKey?: string;
}

/** A finalization grade definition (Plan A: label/description/color/tint editable; id stable). */
export interface FrameworkGrade {
  id: string;
  label: string;
  description: string;
  color: string;
  tint: string;
}
```

Extend `SessionMetadata` (in `lib/types.ts`) with a custom-fields bag:

```ts
  /** User-created (schema-customized) field values keyed by FieldDescriptor.storageKey. */
  customFields?: Record<string, unknown>;
```

- [ ] **Step 4: Write the config**

In `data/framework/trust-framework.json`, add a `fields` array and replace `grades` with the consolidated set (transcribe label/description/color/tint verbatim from `components/finalization/GradeSelector.tsx` `GRADES` and `ENHANCED_GRADES`; ids come from the `FinalizationGrade` union in `lib/types.ts`). The field list — derived from the survey of `Metadata.tsx`, `FinalizationScreen.tsx`, `SettingsScreen.tsx`:

```jsonc
{
  // ...existing id/name/version/principles/qualityGateCategories/accentKeys/categoryLabels/metadataFields...
  "fields": [
    { "id": "toolName", "storageKey": "toolName", "surface": "metadata", "label": "Tool name", "type": "text", "required": true, "group": "Identity", "order": 1, "enabled": true },
    { "id": "toolUrl", "storageKey": "toolUrl", "surface": "metadata", "label": "Tool URL", "type": "url", "required": true, "group": "Identity", "order": 2, "enabled": true },
    { "id": "toolLogoUrl", "storageKey": "toolLogoUrl", "surface": "metadata", "label": "Tool logo", "type": "image", "captureable": true, "group": "Identity", "order": 3, "enabled": true },
    { "id": "faviconUrl", "storageKey": "faviconUrl", "surface": "metadata", "label": "Favicon", "type": "image", "group": "Identity", "order": 4, "enabled": false },
    { "id": "usesAi", "storageKey": "usesAi", "surface": "metadata", "label": "Uses AI", "type": "boolean", "autoPopulateKey": "usesAi", "group": "Identity", "order": 5, "enabled": true },
    { "id": "company", "storageKey": "company", "surface": "metadata", "label": "Company / vendor", "type": "text", "autoPopulateKey": "company", "group": "Identity", "order": 6, "enabled": true },
    { "id": "description", "storageKey": "description", "surface": "metadata", "label": "Description", "type": "textarea", "maxLength": 500, "group": "Identity", "order": 7, "enabled": true },
    { "id": "pricing", "storageKey": "pricing", "surface": "metadata", "label": "Pricing", "type": "text", "autoPopulateKey": "pricing", "group": "Access", "order": 1, "enabled": true },
    { "id": "availability", "storageKey": "availability", "surface": "metadata", "label": "Availability", "type": "text", "autoPopulateKey": "availability", "group": "Access", "order": 2, "enabled": true },
    { "id": "authenticationMethod", "storageKey": "authenticationMethod", "surface": "metadata", "label": "Authentication method", "type": "select", "allowCustom": false, "autoPopulateKey": "authenticationMethod", "options": ["SSO/SAML", "IP Authentication", "OpenAthens", "Proxy (EZproxy)", "LibKey", "Email-only", "API Key", "None required", "Personal account"], "group": "Access", "order": 3, "enabled": true },
    { "id": "termsConditionsUrl", "storageKey": "termsConditionsUrl", "surface": "metadata", "label": "Terms & Conditions URL", "type": "url", "captureable": true, "group": "Access", "order": 4, "enabled": true },
    { "id": "dataSources", "storageKey": "dataSources", "surface": "metadata", "label": "Data sources", "type": "multi-select", "allowCustom": true, "autoPopulateKey": "dataSources", "options": ["CrossRef", "OpenAlex", "OpenCitations", "DataCite", "Scopus", "Web of Science", "PubMed", "Semantic Scholar", "Google Scholar", "IEEE Xplore", "JSTOR", "arXiv", "bioRxiv", "MedRxiv", "ERIC", "PsycINFO", "ProQuest", "Dimensions", "BASE", "CORE", "Cochrane Library", "ACM Digital Library"], "group": "Coverage", "order": 1, "enabled": true },
    { "id": "searchMethods", "storageKey": "searchMethods", "surface": "metadata", "label": "Search methods", "type": "multi-select", "allowCustom": true, "autoPopulateKey": "searchMethods", "options": ["Keywords", "Semantic search", "Boolean queries", "Natural language", "Citation chaining", "Faceted filtering", "Vector search", "Hybrid search", "Controlled vocabulary / MeSH"], "group": "Coverage", "order": 2, "enabled": true },
    { "id": "discipline", "storageKey": "discipline", "surface": "metadata", "label": "Discipline", "type": "multi-select", "allowCustom": true, "defaultOption": "Multidisciplinary", "autoPopulateKey": "discipline", "options": ["Agricultural and Biological Sciences", "History and Archaeology", "Languages and Literature", "Philosophy and Ethics", "Performing Arts", "Visual Arts and Design", "Religious Studies", "Biochemistry, Genetics and Molecular Biology", "Business, Management and Accounting", "Chemical Engineering", "Chemistry", "Computer Science", "Decision Sciences", "Dentistry", "Earth and Planetary Sciences", "Economics, Econometrics and Finance", "Energy", "Engineering", "Environmental Science", "Health Professions", "Immunology and Microbiology", "Materials Science", "Mathematics", "Medicine", "Neuroscience", "Nursing", "Pharmacology, Toxicology and Pharmaceutics", "Physics and Astronomy", "Psychology", "Education and Educational Research", "Law, Policy, and Criminology", "Political Science and International Relations", "Sociology, Anthropology, and Social Work", "Veterinary", "Multidisciplinary", "Information Science and Library Science", "Communication and Media Studies", "Geography"], "group": "Coverage", "order": 3, "enabled": true },
    { "id": "notes", "storageKey": "notes", "surface": "metadata", "label": "Notes", "type": "textarea", "group": "Coverage", "order": 4, "enabled": true },
    { "id": "grade", "storageKey": "grade", "surface": "finalization", "label": "Final grade", "type": "select", "allowCustom": false, "group": "Verdict", "order": 1, "enabled": true },
    { "id": "conclusion", "storageKey": "conclusion", "surface": "finalization", "label": "Conclusion", "type": "textarea", "group": "Verdict", "order": 2, "enabled": true },
    { "id": "strengths", "storageKey": "strengths", "surface": "finalization", "label": "Strengths", "type": "multi-select", "allowCustom": true, "group": "Verdict", "order": 3, "enabled": true },
    { "id": "weaknesses", "storageKey": "weaknesses", "surface": "finalization", "label": "Weaknesses", "type": "multi-select", "allowCustom": true, "group": "Verdict", "order": 4, "enabled": true },
    { "id": "recommendations", "storageKey": "recommendations", "surface": "finalization", "label": "Recommendations", "type": "textarea", "group": "Verdict", "order": 5, "enabled": true },
    { "id": "reviewerName", "storageKey": "name", "surface": "settings", "label": "Reviewer name", "type": "text", "group": "Reviewer", "order": 1, "enabled": true },
    { "id": "reviewerEmail", "storageKey": "email", "surface": "settings", "label": "Reviewer email", "type": "email", "group": "Reviewer", "order": 2, "enabled": true },
    { "id": "enhancedRecommendation", "storageKey": "labs.enhancedRecommendation", "surface": "settings", "label": "Enhanced recommendation grades", "type": "boolean", "group": "Labs", "order": 1, "enabled": true }
  ],
  "grades": [
    { "id": "pass", "label": "Pass", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "conditional", "label": "Conditional", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "fail", "label": "Fail", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "recommended", "label": "Recommended", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "recommended_with_caveats", "label": "Recommended with caveats", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "needs_review", "label": "Needs review", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "pilot_only", "label": "Pilot only", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "not_recommended", "label": "Not recommended", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" },
    { "id": "out_of_scope", "label": "Out of scope", "description": "<from GradeSelector>", "color": "<from GradeSelector>", "tint": "<from GradeSelector>" }
  ]
}
```

> The `<from GradeSelector>` markers instruct transcribing the real strings from `components/finalization/GradeSelector.tsx` (`GRADES` lines 10–27 and `ENHANCED_GRADES` lines 31–66). Before committing, `grep -n '<from' data/framework/trust-framework.json` must return nothing.

- [ ] **Step 5: Extend the loader**

In `data/framework/index.ts`, extend `validateFrameworkShape` to assert `Array.isArray(d.fields)` and `Array.isArray(d.grades)`, and add:

```ts
/** Stable ordered list of builtin field ids. */
export const FIELD_IDS = FRAMEWORK_CONFIG.fields.map((f) => f.id) as readonly string[];
/** Stable ordered list of canonical grade ids (the FinalizationGrade contract). */
export const GRADE_IDS = FRAMEWORK_CONFIG.grades.map((g) => g.id) as readonly string[];
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test tests/field-schema.test.ts && pnpm typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts data/framework/trust-framework.json data/framework/index.ts tests/field-schema.test.ts
git commit -m "feat(framework): declarative FieldDescriptor schema + consolidated grades"
```

---

## Task 2: Field-schema accessor layer + value binding

**Files:**
- Create: `lib/field-schema.ts`
- Test: extend `tests/field-schema.test.ts`

- [ ] **Step 1: Add failing accessor/binding tests**

Append to `tests/field-schema.test.ts`:

```ts
import {
  getFields,
  getActiveFields,
  getField,
  getFieldsBySurface,
  getFieldValue,
  setFieldValue,
} from "@/lib/field-schema";
import type { SessionMetadata } from "@/lib/types";

describe("field-schema accessors + binding", () => {
  it("getFields returns builtin fields; getActiveFields filtered by enabled + sorted", () => {
    expect(getFields().length).toBeGreaterThan(15);
    const active = getActiveFields();
    expect(active.every((f) => f.enabled)).toBe(true);
    // faviconUrl is disabled by default
    expect(active.find((f) => f.id === "faviconUrl")).toBeUndefined();
  });

  it("getFieldsBySurface partitions metadata vs finalization", () => {
    expect(getFieldsBySurface("metadata").find((f) => f.id === "conclusion")).toBeUndefined();
    expect(getFieldsBySurface("finalization").find((f) => f.id === "conclusion")).toBeTruthy();
  });

  it("getFieldValue reads a builtin metadata key", () => {
    const s = { toolName: "Asta" } as SessionMetadata;
    expect(getFieldValue(s, getField("toolName"))).toBe("Asta");
  });

  it("getFieldValue reads custom fields from the customFields bag", () => {
    const s = { customFields: { region: "EU" } } as SessionMetadata;
    const desc = { id: "region", storageKey: "region", surface: "metadata", label: "Region", type: "text", order: 1, enabled: true, custom: true } as any;
    expect(getFieldValue(s, desc)).toBe("EU");
  });

  it("setFieldValue writes builtins to the top-level key, custom to customFields", () => {
    const s = {} as SessionMetadata;
    setFieldValue(s, getField("company"), "AI2");
    expect(s.company).toBe("AI2");
    const custom = { id: "region", storageKey: "region", surface: "metadata", label: "Region", type: "text", order: 1, enabled: true, custom: true } as any;
    setFieldValue(s, custom, "EU");
    expect(s.customFields?.region).toBe("EU");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/field-schema.test.ts`
Expected: FAIL — accessors not exported.

- [ ] **Step 3: Implement accessors + binding**

Create `lib/field-schema.ts`:

```ts
import { FRAMEWORK_CONFIG } from "@/data/framework";
import type { FieldDescriptor, FieldSurface, SessionMetadata } from "@/lib/types";
import { getActiveFrameworkConfig } from "./framework-config";

/** All shipped field descriptors (no customization). */
export function getFields(): readonly FieldDescriptor[] {
  return FRAMEWORK_CONFIG.fields;
}

/** Active descriptors: customization-merged, enabled-only, ordered within group. */
export function getActiveFields(surface?: FieldSurface): FieldDescriptor[] {
  const fields = getActiveFrameworkConfig().fields
    .filter((f) => f.enabled)
    .filter((f) => (surface ? f.surface === surface : true));
  return [...fields].sort((a, b) =>
    a.group === b.group ? a.order - b.order : String(a.group).localeCompare(String(b.group)),
  );
}

export function getFieldsBySurface(surface: FieldSurface): FieldDescriptor[] {
  return getActiveFields(surface);
}

export function getField(id: string): FieldDescriptor {
  const f = getActiveFrameworkConfig().fields.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown field: ${id}`);
  return f;
}

/** Read a field's value from a session. Custom fields read from `customFields`. */
export function getFieldValue(session: SessionMetadata, desc: FieldDescriptor): unknown {
  if ((desc as { custom?: boolean }).custom) return session.customFields?.[desc.storageKey];
  return (session as Record<string, unknown>)[desc.storageKey];
}

/** Mutate a session's field value. Custom fields write to `customFields`. */
export function setFieldValue(session: SessionMetadata, desc: FieldDescriptor, value: unknown): void {
  if ((desc as { custom?: boolean }).custom) {
    session.customFields = { ...(session.customFields ?? {}), [desc.storageKey]: value };
    return;
  }
  (session as Record<string, unknown>)[desc.storageKey] = value;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test tests/field-schema.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/field-schema.ts tests/field-schema.test.ts
git commit -m "feat(framework): field-schema accessors + value binding"
```

---

## Task 3: Generalize the customization store (fields + options + grades)

The store from the earlier draft (additive+hide+rename for option-lists) generalizes to whole-field overrides, field additions/removals, order, and grade overrides.

**Files:**
- Modify: `stores/framework-customization.ts`
- Modify: `lib/framework-config.ts` (`getActiveFrameworkConfig` merges fields + grades)
- Create: `lib/framework-migrate.ts`
- Test: `tests/framework-customization.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/framework-customization.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { getActiveFields, getActiveFrameworkConfig } from "@/lib/framework-config";
import { getField } from "@/lib/field-schema";

describe("customization store", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("toggles a field off (removed from active set)", () => {
    expect(getActiveFields().find((f) => f.id === "pricing")).toBeTruthy();
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { enabled: false });
    expect(getActiveFields().find((f) => f.id === "pricing")).toBeUndefined();
  });

  it("overrides a field label and required", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("company", { label: "Vendor", required: true });
    expect(getField("company").label).toBe("Vendor");
    expect(getField("company").required).toBe(true);
  });

  it("creates a custom field that appears in the active set", () => {
    useFrameworkCustomizationStore.getState().addField({
      id: "region", storageKey: "region", surface: "metadata", label: "Region",
      type: "text", group: "Identity", order: 99, enabled: true,
    });
    expect(getActiveFields().find((f) => f.id === "region")).toBeTruthy();
  });

  it("reorders fields within a group", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { order: 99 });
    const group = getActiveFields("metadata").filter((f) => f.group === "Access");
    expect(group[group.length - 1].id).toBe("pricing");
  });

  it("option edit-in-place: add / rename shipped default / hide", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.addOption("dataSources", "Local Repo");
    s.renameOption("dataSources", "CrossRef", "Crossref API");
    s.hideOption("dataSources", "Google Scholar");
    const opts = getField("dataSources").options ?? [];
    expect(opts).toContain("Local Repo");
    expect(opts).toContain("Crossref API");
    expect(opts).not.toContain("CrossRef");
    expect(opts).not.toContain("Google Scholar");
  });

  it("overrides a grade label + color", () => {
    useFrameworkCustomizationStore.getState().setGradeOverride("pass", { label: "Approved", color: "#00ff00" });
    const pass = getActiveFrameworkConfig().grades.find((g) => g.id === "pass")!;
    expect(pass.label).toBe("Approved");
    expect(pass.color).toBe("#00ff00");
  });

  it("export/import round-trips field + option + grade overrides", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.setFieldOverride("company", { label: "Vendor" });
    s.addOption("dataSources", "X");
    s.setGradeOverride("fail", { label: "Nope" });
    const exported = s.exportCustomization();
    s.resetAll();
    s.importCustomization(exported);
    expect(getField("company").label).toBe("Vendor");
    expect(getField("dataSources").options).toContain("X");
    expect(getActiveFrameworkConfig().grades.find((g) => g.id === "fail")?.label).toBe("Nope");
  });

  it("import rejects malformed payloads", () => {
    expect(() => useFrameworkCustomizationStore.getState().importCustomization("nope")).toThrow();
    expect(() => useFrameworkCustomizationStore.getState().importCustomization({ x: 1 })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/framework-customization.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the generalized store**

Create `stores/framework-customization.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getFrameworkConfig } from "@/lib/framework-config";
import type { FieldDescriptor, FrameworkGrade } from "@/lib/types";

export interface GradeOverride extends Partial<Pick<FrameworkGrade, "label" | "description" | "color" | "tint">> {}
export interface FieldOverride extends Partial<Omit<FieldDescriptor, "id" | "storageKey" | "surface" | "type">> {}

export interface FrameworkCustomization {
  /** field id → override patch (label, required, enabled, order, group, placeholder, helpText). */
  fieldOverrides: Record<string, FieldOverride>;
  /** fully user-created field descriptors. */
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
  fieldOverrides: {}, customFields: [], extraOptions: {}, hiddenOptions: {}, renames: {}, gradeOverrides: {},
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
  for (const [k, val] of Object.entries(v as object)) if (typeof val === "string") out[k] = val;
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
  const customFields: FieldDescriptor[] = Array.isArray(d.customFields) ? (d.customFields as FieldDescriptor[]) : [];
  if (d.fieldOverrides && typeof d.fieldOverrides === "object")
    for (const [k, v] of Object.entries(d.fieldOverrides as object)) fieldOverrides[k] = normFieldOverride(v);
  if (d.extraOptions && typeof d.extraOptions === "object")
    for (const [k, v] of Object.entries(d.extraOptions as object)) extraOptions[k] = normStrArr(v);
  if (d.hiddenOptions && typeof d.hiddenOptions === "object")
    for (const [k, v] of Object.entries(d.hiddenOptions as object)) hiddenOptions[k] = normStrArr(v);
  if (d.renames && typeof d.renames === "object")
    for (const [k, v] of Object.entries(d.renames as object)) renames[k] = normRenames(v);
  if (d.gradeOverrides && typeof d.gradeOverrides === "object") {
    for (const [k, v] of Object.entries(d.gradeOverrides as object)) {
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
  return getFrameworkConfig().fields.some((f) => f.id === id);
}
function shippedOption(fieldId: string, option: string): boolean {
  return getFrameworkConfig().fields.find((f) => f.id === fieldId)?.options?.includes(option) ?? false;
}

export const useFrameworkCustomizationStore = create<FrameworkCustomizationState>()(
  persist(
    (set, get) => ({
      customization: EMPTY,

      setFieldOverride: (id, patch) =>
        set((s) => ({
          customization: {
            ...s.customization,
            fieldOverrides: { ...s.customization.fieldOverrides, [id]: { ...s.customization.fieldOverrides[id], ...patch } },
          },
        })),

      addField: (desc) =>
        set((s) => ({
          customization: { ...s.customization, customFields: [...s.customization.customFields.filter((f) => f.id !== desc.id), { ...desc, custom: true }] },
        })),

      removeCustomField: (id) =>
        set((s) => ({ customization: { ...s.customization, customFields: s.customization.customFields.filter((f) => f.id !== id) } })),

      addOption: (field, option) =>
        set((s) => {
          const existing = s.customization.extraOptions[field] ?? [];
          if (existing.includes(option)) return {};
          return { customization: { ...s.customization, extraOptions: { ...s.customization.extraOptions, [field]: [...existing, option] } } };
        }),

      removeOption: (field, option) => set((s) => {
        // custom option → drop from extraOptions; shipped → ignore here (use hideOption)
        const extra = s.customization.extraOptions[field] ?? [];
        if (!extra.includes(option)) return {};
        return { customization: { ...s.customization, extraOptions: { ...s.customization.extraOptions, [field]: extra.filter((o) => o !== option) } } };
      }),

      hideOption: (field, option) => set((s) => {
        const hidden = s.customization.hiddenOptions[field] ?? [];
        if (hidden.includes(option)) return {};
        return { customization: { ...s.customization, hiddenOptions: { ...s.customization.hiddenOptions, [field]: [...hidden, option] } } };
      }),

      renameOption: (field, oldVal, newVal) => {
        const v = newVal.trim();
        if (!v || v === oldVal) return;
        set((s) => {
          if (shippedOption(field, oldVal)) {
            const fr = s.customization.renames[field] ?? {};
            return { customization: { ...s.customization, renames: { ...s.customization.renames, [field]: { ...fr, [oldVal]: v } } } };
          }
          const extra = s.customization.extraOptions[field] ?? [];
          if (!extra.includes(oldVal)) return {};
          return { customization: { ...s.customization, extraOptions: { ...s.customization.extraOptions, [field]: extra.map((o) => (o === oldVal ? v : o)) } } };
        });
      },

      setGradeOverride: (gradeId, override) =>
        set((s) => ({ customization: { ...s.customization, gradeOverrides: { ...s.customization.gradeOverrides, [gradeId]: { ...s.customization.gradeOverrides[gradeId], ...override } } } })),

      resetField: (field) => set((s) => {
        const { [field]: _fo, ...fieldOverrides } = s.customization.fieldOverrides;
        const { [field]: _e, ...extraOptions } = s.customization.extraOptions;
        const { [field]: _h, ...hiddenOptions } = s.customization.hiddenOptions;
        const { [field]: _r, ...renames } = s.customization.renames;
        return { customization: { ...s.customization, fieldOverrides, extraOptions, hiddenOptions, renames } };
      }),

      resetGrades: () => set((s) => ({ customization: { ...s.customization, gradeOverrides: {} } })),
      resetAll: () => set({ customization: EMPTY }),

      hasOverrides: () => {
        const c = get().customization;
        return Object.values(c).some((v) => (Array.isArray(v) ? v.length > 0 : Object.keys(v as object).length > 0));
      },

      exportCustomization: () => structuredClone(get().customization),
      importCustomization: (data) => set({ customization: validateCustomization(data) }),
    }),
    { name: "trust-framework-customization", partialize: (s) => ({ customization: s.customization }) },
  ),
);
```

- [ ] **Step 4: Merge fields + grades in `getActiveFrameworkConfig`**

In `lib/framework-config.ts`, replace `getActiveFrameworkConfig`:

```ts
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import type { FieldDescriptor } from "@/lib/types";

export function getActiveFrameworkConfig(): FrameworkConfig {
  const c = useFrameworkCustomizationStore.getState().customization;
  const base = FRAMEWORK_CONFIG;

  const fields: FieldDescriptor[] = [...base.fields, ...c.customFields.map((f) => ({ ...f, custom: true }))]
    .map((f) => {
      const ov = c.fieldOverrides[f.id];
      const opts = mergeOptions(f, c);
      return { ...f, ...(ov ?? {}), ...(opts ? { options: opts } : {}) };
    })
    .filter((f) => f.enabled); // active = enabled; getFields() still returns all incl. disabled

  const grades = base.grades.map((g) => {
    const o = c.gradeOverrides[g.id];
    return o ? { ...g, ...o } : g;
  });

  return { ...base, fields, grades };
}

/** Apply renames + extras + hides to a select/multi-select field's options. */
function mergeOptions(f: FieldDescriptor, c: { renames: Record<string, Record<string, string>>; extraOptions: Record<string, string[]>; hiddenOptions: Record<string, string[]> }): string[] | undefined {
  if (!f.options) return undefined;
  const renames = c.renames[f.id] ?? {};
  const hidden = new Set(c.hiddenOptions[f.id] ?? []);
  const renamed = f.options.filter((o) => !hidden.has(o)).map((o) => renames[o] ?? o);
  const extra = c.extraOptions[f.id] ?? [];
  return [...renamed, ...extra];
}
```

> `getFields()` (shipped, all incl. disabled) stays backed by `FRAMEWORK_CONFIG`. `getActiveFields()` calls `getActiveFrameworkConfig().fields` (enabled-only, merged). `getField(id)` must look in the active config too so overrides are visible — update `lib/field-schema.ts` `getField` to read from `getActiveFrameworkConfig().fields`, falling back to shipped.

- [ ] **Step 5: Session migration on option rename**

Create `lib/framework-migrate.ts` (same as prior draft — rewrites a renamed option across all stored sessions):

```ts
import { getRepository } from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";

/** Rewrite oldVal → newVal in one metadata array field across every stored session. */
export async function migrateOptionRename(field: string, oldVal: string, newVal: string): Promise<number> {
  const repo = getRepository();
  const { sessionIndex } = useRegistryStore.getState();
  let touched = 0;
  for (const id of Object.keys(sessionIndex)) {
    const data: SessionData | null = await repo.load(id);
    if (!data) continue;
    const arr = (data.metadata as Record<string, unknown>)[field];
    if (!Array.isArray(arr) || !arr.includes(oldVal)) continue;
    const next = arr.map((v) => (v === oldVal ? newVal : v));
    (data.metadata as Record<string, unknown>)[field] = next;
    await repo.save(id, data);
    useRegistryStore.getState().updateSessionMetadata(id, { [field]: next } as Partial<SessionMetadata>);
    touched++;
  }
  return touched;
}
```

- [ ] **Step 6: Run tests + typecheck**

Run: `pnpm test tests/framework-customization.test.ts && pnpm test && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add stores/framework-customization.ts lib/framework-config.ts lib/framework-migrate.ts lib/field-schema.ts tests/framework-customization.test.ts
git commit -m "feat(framework): generalized customization store (fields/options/grades) + rename migration"
```

---

## Task 4: Consolidate grade definitions to config

Remove the triplication. `GradeSelector` and `compute-scores` derive from `getActiveFrameworkConfig().grades`.

**Files:**
- Modify: `components/finalization/GradeSelector.tsx`
- Modify: `lib/report/compute-scores.ts`
- Test: `tests/grade-config-consolidation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/grade-config-consolidation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GRADE_IDS, getActiveFrameworkConfig } from "@/lib/framework-config";

describe("grade definitions are config-driven", () => {
  it("every FinalizationGrade id has a config definition with color + label", () => {
    const byId = new Map(getActiveFrameworkConfig().grades.map((g) => [g.id, g]));
    for (const id of GRADE_IDS) {
      const g = byId.get(id);
      expect(g, `grade ${id}`).toBeTruthy();
      expect(g!.label).toBeTruthy();
      expect(g!.color).toMatch(/^#/);
    }
  });

  it("GradeSelector source and compute-scores source agree with config", async () => {
    const { GRADE_COLORS, GRADE_LABELS } = await import("@/lib/report/compute-scores");
    for (const g of getActiveFrameworkConfig().grades) {
      expect(GRADE_COLORS[g.id]).toBe(g.color);
      expect(GRADE_LABELS[g.id]).toBe(g.label);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/grade-config-consolidation.test.ts`
Expected: FAIL — `GRADE_COLORS`/`GRADE_LABELS` still hardcoded.

- [ ] **Step 3: Derive `compute-scores` grade maps from config**

In `lib/report/compute-scores.ts`, delete the literal `GRADE_COLORS` and `GRADE_LABELS` objects and replace with config-derived lazy accessors:

```ts
import { getActiveFrameworkConfig } from "@/lib/framework-config";

export const GRADE_COLORS: Record<string, string> = Object.fromEntries(
  getActiveFrameworkConfig().grades.map((g) => [g.id, g.color]),
);
export const GRADE_LABELS: Record<string, string> = Object.fromEntries(
  getActiveFrameworkConfig().grades.map((g) => [g.id, g.label]),
);
```

> These are read at module load; if a grade override should affect already-imported report code, the report builders call `getActiveFrameworkConfig()` directly. Acceptable for Plan A (overrides are uncommon mid-export); note as a known limitation.

- [ ] **Step 4: Derive `GradeSelector` from config**

In `components/finalization/GradeSelector.tsx`, delete the `GRADES` and `ENHANCED_GRADES` literal arrays. The Labs `enhancedRecommendation` flag selects which **subset of ids** is shown (core 3 vs all 9). Replace with:

```ts
import { getActiveFrameworkConfig } from "@/lib/framework-config";

const CORE_GRADE_IDS = ["pass", "conditional", "fail"];
const ALL_GRADE_IDS = getActiveFrameworkConfig().grades.map((g) => g.id);

export function useGradeOptions(enhanced: boolean) {
  const ids = enhanced ? ALL_GRADE_IDS : CORE_GRADE_IDS;
  const byId = new Map(getActiveFrameworkConfig().grades.map((g) => [g.id, g]));
  return ids.map((id) => byId.get(id)!).filter(Boolean);
}
```

Render from `useGradeOptions(settings.labs.enhancedRecommendation)`; keep the existing button/styling, just feed `{value: g.id, label: g.label, description: g.description, color: g.color, tint: g.tint}`.

- [ ] **Step 5: Run tests + full suite**

Run: `pnpm test && pnpm typecheck`
Expected: PASS (existing finalization tests still green; grades render identically).

- [ ] **Step 6: Commit**

```bash
git add components/finalization/GradeSelector.tsx lib/report/compute-scores.ts tests/grade-config-consolidation.test.ts
git commit -m "refactor(framework): consolidate triplicated grade definitions into config"
```

---

## Task 5: Schema-driven Metadata form

Refactor `Metadata.tsx` to render from `SchemaForm` instead of hand-written fields. Incremental: keep the existing capture-linking and auto-populate behavior; just source the field list + bindings from the schema.

**Files:**
- Create: `components/SchemaForm.tsx`
- Create: `components/field-inputs/SelectInput.tsx` (wraps `PillField`), and thin wrappers for text/textarea/url/boolean/image as needed (reuse existing inputs in `Metadata.tsx`)
- Modify: `components/Metadata.tsx`
- Test: `tests/schema-form.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/schema-form.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SchemaForm from "@/components/SchemaForm";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { AllProviders } from "@/tests/helpers/render-utils";
import type { SessionMetadata } from "@/lib/types";

function renderForm() {
  const session: SessionMetadata = { id: "s1", toolName: "Asta", toolUrl: "https://asta", startTime: "", status: "in-progress" };
  const onChange = vi.fn();
  render(
    <AllProviders>
      <SchemaForm surface="metadata" session={session} onChange={onChange} />
    </AllProviders>,
  );
  return { session, onChange };
}

describe("SchemaForm", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());
  afterEach(cleanup);

  it("renders all enabled metadata fields grouped", () => {
    renderForm();
    expect(screen.getByLabelText(/tool name/i)).toBeTruthy();
    expect(screen.getByText(/coverage/i)).toBeTruthy(); // group heading
  });

  it("respects a toggled-off field (not rendered)", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { enabled: false });
    renderForm();
    expect(screen.queryByLabelText(/pricing/i)).toBeNull();
  });

  it("renders a custom-created field", () => {
    useFrameworkCustomizationStore.getState().addField({
      id: "region", storageKey: "region", surface: "metadata", label: "Region", type: "text", group: "Identity", order: 99, enabled: true,
    });
    renderForm();
    expect(screen.getByLabelText(/region/i)).toBeTruthy();
  });

  it("edits propagate via onChange using the storageKey", () => {
    const { onChange } = renderForm();
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: "AI2" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ company: "AI2" }));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/schema-form.test.tsx`
Expected: FAIL — `SchemaForm` does not exist.

- [ ] **Step 3: Build input components**

Create `components/field-inputs/SelectInput.tsx` (wraps the existing `PillField`):

```tsx
import PillField from "@/components/PillField";
import type { FieldDescriptor } from "@/lib/types";

export default function SelectInput({ desc, value, onChange }: { desc: FieldDescriptor; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <PillField
      label={desc.label}
      options={desc.options ?? []}
      selected={value}
      onChange={onChange}
      placeholder={desc.placeholder ?? `Add ${desc.label}…`}
      allowCustom={desc.allowCustom ?? true}
      single={desc.type === "select"}
    />
  );
}
```

Create thin wrappers for the other types by extracting the existing JSX in `Metadata.tsx` (text/textarea/url inputs and the usesAi toggle) into `TextInput.tsx`, `TextAreaInput.tsx`, `UrlInput.tsx`, `BooleanToggle.tsx`, `ImageInput.tsx` under `components/field-inputs/`. Each takes `{ desc, value, onChange }` and renders the same markup `Metadata.tsx` uses today.

- [ ] **Step 4: Build `SchemaForm`**

Create `components/SchemaForm.tsx`:

```tsx
import { getFieldsBySurface } from "@/lib/field-schema";
import { getFieldValue, setFieldValue } from "@/lib/field-schema";
import type { FieldSurface, SessionMetadata } from "@/lib/types";
import TextInput from "./field-inputs/TextInput";
import TextAreaInput from "./field-inputs/TextAreaInput";
import UrlInput from "./field-inputs/UrlInput";
import BooleanToggle from "./field-inputs/BooleanToggle";
import SelectInput from "./field-inputs/SelectInput";
import ImageInput from "./field-inputs/ImageInput";

export default function SchemaForm({
  surface,
  session,
  onChange,
}: {
  surface: FieldSurface;
  session: SessionMetadata;
  onChange: (next: SessionMetadata) => void;
}) {
  const fields = getFieldsBySurface(surface);
  const groups = new Map<string, typeof fields>();
  for (const f of fields) {
    const g = f.group ?? "Other";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }

  const renderField = (desc: (typeof fields)[number]) => {
    const value = getFieldValue(session, desc) as never;
    const update = (v: unknown) => {
      const next = structuredClone(session) as SessionMetadata;
      setFieldValue(next, desc, v);
      onChange(next);
    };
    switch (desc.type) {
      case "textarea": return <TextAreaInput key={desc.id} desc={desc} value={value} onChange={update} />;
      case "url": return <UrlInput key={desc.id} desc={desc} value={value} onChange={update} />;
      case "boolean": return <BooleanToggle key={desc.id} desc={desc} value={!!value} onChange={update} />;
      case "image": return <ImageInput key={desc.id} desc={desc} value={value} onChange={update} />;
      case "select":
      case "multi-select": return <SelectInput key={desc.id} desc={desc} value={Array.isArray(value) ? value : value ? [value] : []} onChange={update} />;
      default: return <TextInput key={desc.id} desc={desc} value={value} onChange={update} />;
    }
  };

  return (
    <div className="flex flex-col gap-ut-4">
      {[...groups.entries()].map(([group, flds]) => (
        <section key={group}>
          <h3 className="font-heading uppercase text-ut-xs text-ut-muted mb-ut-2">{group}</h3>
          <div className="flex flex-col gap-ut-3">{flds.map(renderField)}</div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Refactor `Metadata.tsx` to use `SchemaForm`**

In `components/Metadata.tsx`, replace the hand-written field JSX with `<SchemaForm surface="metadata" session={session} onChange={(next) => updateMetadata(next)} />`. Preserve the non-field chrome that stays (e.g. the capture-linking UI for captureable fields, tool-profile auto-detect button) by keeping those as siblings or passing a render-prop; the captureable-field evidence linking can stay in `ImageInput`/`UrlInput` via an `onCapture` callback threaded from `Metadata.tsx`. Run `grep -n 'DATA_SOURCE_OPTIONS\|SEARCH_METHOD_OPTIONS\|AUTH_METHOD_OPTIONS\|captureForMetadataField' components/Metadata.tsx` to confirm no stale static imports remain.

- [ ] **Step 6: Run tests + full suite + typecheck**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: PASS. The existing `pill-field.test.tsx` and any metadata tests still green (behavior unchanged; fields now schema-sourced).

- [ ] **Step 7: Commit**

```bash
git add components/SchemaForm.tsx components/field-inputs/ components/Metadata.tsx tests/schema-form.test.tsx
git commit -m "feat(framework): schema-driven metadata form"
```

---

## Task 6: Finalization free-text fields via schema

Wire `conclusion`, `strengths`, `weaknesses`, `recommendations` through `SchemaForm` (surface `finalization`). `strengths`/`weaknesses` render as multi-select pill fields backed by the existing `BulletListEditor` behavior.

**Files:**
- Modify: `components/FinalizationScreen.tsx`
- Test: extend `tests/schema-form.test.tsx`

- [ ] **Step 1: Add a finalization-surface test**

Append to `tests/schema-form.test.tsx`:

```tsx
it("renders finalization free-text fields from the schema", () => {
  const fin = { conclusion: "", grade: "pass", strengths: [], weaknesses: [], recommendations: "", finalizedAt: "" };
  render(
    <AllProviders>
      <SchemaForm surface="finalization" session={fin as any} onChange={() => {}} />
    </AllProviders>,
  );
  expect(screen.getByLabelText(/conclusion/i)).toBeTruthy();
  expect(screen.getByLabelText(/strengths/i)).toBeTruthy();
  expect(screen.getByLabelText(/recommendations/i)).toBeTruthy();
});
```

> `SchemaForm` currently types `session` as `SessionMetadata`. Generalize its props to accept `SessionMetadata | ReviewFinalization` (both are plain record-like objects) by loosening the prop type to `Record<string, unknown>` internally and casting at the binding layer. Update the test's `onChange` expectation accordingly.

- [ ] **Step 2: Run to verify it fails** → `pnpm test tests/schema-form.test.tsx` → FAIL.

- [ ] **Step 3: Generalize + wire `FinalizationScreen`**

Loosen `SchemaForm`'s `session` prop to `Record<string, unknown>`; `getFieldValue`/`setFieldValue` already operate on `Record`-like objects. In `components/FinalizationScreen.tsx`, replace the hand-written conclusion/strengths/weaknesses/recommendations inputs with `<SchemaForm surface="finalization" session={finalization} onChange={setFinalization} />`. Keep the grade selector (Task 4 already config-driven) and the export-actions section as-is.

- [ ] **Step 4: Run tests + full suite** → `pnpm test && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/SchemaForm.tsx components/FinalizationScreen.tsx tests/schema-form.test.tsx
git commit -m "feat(framework): finalization free-text fields via schema"
```

---

## Task 7: Fix the registry / options mismatch

Align `data/tools/registry.json` default values with the field option-lists so auto-populated values are never orphan "custom" pills. `detectToolProfile` already maps `autoPopulateKey` → storage key; the field schema now owns the canonical option spelling.

**Files:**
- Modify: `data/tools/registry.json`
- Modify: `lib/tool-profiles.ts` (if it hardcodes option strings)
- Test: `tests/tool-profile-options.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tool-profile-options.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import tools from "@/data/tools/registry.json";
import { getFrameworkConfig } from "@/lib/framework-config";

describe("registry defaults match field option-lists", () => {
  const optionFields = new Map(
    getFrameworkConfig().fields.filter((f) => f.options).map((f) => [f.autoPopulateKey ?? f.storageKey, f.options!]),
  );

  for (const tool of tools) {
    for (const [key, value] of Object.entries(tool.defaults ?? {})) {
      const allowed = optionFields.get(key);
      if (!allowed || value == null) continue;
      const vals = Array.isArray(value) ? value : [value];
      for (const v of vals) {
        it(`${tool.name}: "${v}" is a valid option for ${key}`, () => {
          expect(allowed).toContain(v);
        });
      }
    }
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/tool-profile-options.test.ts`
Expected: FAIL — e.g. Semantic Scholar `searchMethods: ["Semantic search", "Keyword search"]` vs canonical `"Keywords"`.

- [ ] **Step 3: Align registry values**

In `data/tools/registry.json`, edit every `defaults.{dataSources,searchMethods,discipline,authenticationMethod}` value to match the canonical spelling in `data/framework/trust-framework.json` (e.g. `"Keyword search"` → `"Keywords"`, `"Semantic search"` stays). Re-run the test until green.

- [ ] **Step 4: Run full suite** → `pnpm test && pnpm typecheck` → PASS.

- [ ] **Step 5: Commit**

```bash
git add data/tools/registry.json tests/tool-profile-options.test.ts
git commit -m "fix(framework): align tool-profile defaults with field option-lists"
```

---

## Task 8: Full FieldEditor UI

Settings → "Customize fields": per-surface (Metadata / Finalization / Settings) editable field list (toggle on/off, edit label/placeholder/help/required, create new field, remove custom, reorder up/down), option-list edit-in-place (add/rename/remove with rename-migration for shipped defaults), and a grade text/color editor. Plus export/import.

**Files:**
- Create: `components/FieldEditor.tsx`
- Modify: `components/SettingsScreen.tsx` (entry point)
- Test: `tests/field-editor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/field-editor.test.tsx` (sketch — assert the key flows: toggle, edit label, add custom field, reorder, rename option triggers migration, export/import):

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FieldEditor from "@/components/FieldEditor";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { AllProviders } from "@/tests/helpers/render-utils";

describe("FieldEditor", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());
  afterEach(cleanup);

  it("toggles a field off", () => {
    render(<FieldEditor onBack={() => {}} />, { wrapper: AllProviders });
    fireEvent.click(screen.getByRole("switch", { name: /enable pricing/i }));
    expect(useFrameworkCustomizationStore.getState().customization.fieldOverrides.pricing?.enabled).toBe(false);
  });

  it("edits a field label in place", () => {
    render(<FieldEditor onBack={() => {}} />, { wrapper: AllProviders });
    fireEvent.change(screen.getByLabelText(/label.*company/i), { target: { value: "Vendor" } });
    expect(useFrameworkCustomizationStore.getState().customization.fieldOverrides.company?.label).toBe("Vendor");
  });

  it("creates a custom field", () => {
    render(<FieldEditor onBack={() => {}} />, { wrapper: AllProviders });
    fireEvent.change(screen.getByPlaceholderText(/new field label/i), { target: { value: "Region" } });
    fireEvent.click(screen.getByRole("button", { name: /add field/i }));
    expect(useFrameworkCustomizationStore.getState().customization.customFields.some((f) => f.label === "Region")).toBe(true);
  });

  it("renaming a shipped option calls migrateOptionRename", () => {
    const migrate = vi.fn().mockResolvedValue(0);
    vi.doMock("@/lib/framework-migrate", () => ({ migrateOptionRename: migrate }));
    render(<FieldEditor onBack={() => {}} />, { wrapper: AllProviders });
    fireEvent.change(screen.getByDisplayValue("CrossRef"), { target: { value: "Crossref API" } });
    fireEvent.blur(screen.getByDisplayValue("Crossref API"));
    expect(migrate).toHaveBeenCalledWith("dataSources", "CrossRef", "Crossref API");
  });

  it("exports and imports customization", () => {
    useFrameworkCustomizationStore.getState().setFieldOverride("pricing", { label: "Cost" });
    render(<FieldEditor onBack={() => {}} />, { wrapper: AllProviders });
    fireEvent.click(screen.getByRole("button", { name: /export customization/i }));
    // (assert URL.createObjectURL called — pattern from prior draft)
  });
});
```

- [ ] **Step 2: Run to verify it fails** → `pnpm test tests/field-editor.test.tsx` → FAIL.

- [ ] **Step 3: Implement `FieldEditor`**

Create `components/FieldEditor.tsx`. For each surface, iterate `getFields()` (all, incl. disabled) grouped; each row: enabled toggle (switch), label input (in-place → `setFieldOverride(id,{label})`), placeholder/help/required inputs, ↑/↓ reorder buttons (`setFieldOverride(id,{order})`), and for custom fields a remove button (`removeCustomField`). For select/multi-select fields, render an editable options sub-list: each option in an `<input>` (blur → `renameOption` + `migrateOptionRename` when shipped), a × (`hideOption` if shipped / `removeOption` if custom), and an add row (`addOption`). A grades section edits each grade's label/description/color/tint (`setGradeOverride`). Footer: Reset all, Export customization, Import customization (file input → `importCustomization`). Reuse the `downloadJSON` + import-file helpers from the prior draft's Task 7.

> The rename handler decides migration: if the option is a shipped default (check `getFrameworkConfig().fields...options`), call `migrateOptionRename` after `renameOption`; custom options skip migration. This is the edit-in-place abstraction — the user just edits the text; the backend routes to add/hide/rename/migrate.

- [ ] **Step 4: Wire entry point**

In `components/SettingsScreen.tsx`, add `const [editing, setEditing] = useState(false)` and a render branch returning `<FieldEditor onBack={() => setEditing(false)} />`, plus a "Customize fields" button.

- [ ] **Step 5: Run tests + full suite + typecheck + lint**

Run: `pnpm test && pnpm typecheck && pnpm check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/FieldEditor.tsx components/SettingsScreen.tsx tests/field-editor.test.tsx
git commit -m "feat(framework): full field editor (toggle/edit/create/reorder/options/grades) + import/export"
```

---

## Task 9: Docs + CHANGELOG

- [ ] **Step 1: Update `CLAUDE.md`** — document the field-schema layer (`data/framework/trust-framework.json` `fields`), `SchemaForm`, the customization store, and the Settings → Customize fields entry. Note that grade definitions are now config-driven and the FinalizationGrade id union is still the type contract (Plan B loosens it).

- [ ] **Step 2: Add CHANGELOG entry** (unreleased):

```markdown
### New
- **Schema-driven, customizable review fields (Labs)** — every entry field (metadata, finalization, settings) is
  now described by a declarative `FieldDescriptor` schema and rendered from it. Settings → Customize fields lets
  reviewers toggle fields on/off, edit labels/placeholders, create new fields, reorder, edit option-lists in place
  (with rename migration of existing reviews), and edit grade wording/color. Customizations persist locally and
  export/import as JSON. Grade definitions are consolidated into one config source. Tool-profile auto-populate
  values are aligned to the canonical option spellings.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs(framework): document schema-driven field layer"
```

---

## Definition of Done

- [ ] `pnpm test` green; coverage ≥ ratcheted thresholds (73/66/66/75).
- [ ] `pnpm typecheck` + `pnpm check` clean.
- [ ] A reviewer can, from Settings → Customize fields: turn the "Pricing" field off, rename the "Company" field to "Vendor", add a custom "Region" text field, reorder a group, rename "CrossRef"→"Crossref API" (and an existing review using CrossRef follows), and edit the "Pass" grade label/color — all reflected live in Metadata/Finalization.
- [ ] Export → import round-trips on a fresh profile.
- [ ] No scoring/export/report regression (field-iterative report sections adapt automatically; grade maps derive from config).
- [ ] CLAUDE.md + CHANGELOG updated.

## Shared plumbing handed off to Plan B

Plan B reuses, unchanged: the `FieldDescriptor` model + accessors, `SchemaForm` + `field-inputs/`, the customization store (extended for rubric/principle/grade-id overrides), `framework-migrate.ts` (extended for question-key renames), the editor framework (`FieldEditor` patterns → `RubricEditor`), and the import/export plumbing (extended to a full pack).
