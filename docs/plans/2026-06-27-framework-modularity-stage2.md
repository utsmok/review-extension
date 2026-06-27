# Framework Modularity — Plan B: Instrument & Identity (Rubric, Grades, Principles, Branding, Versioning)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **Depends on Plan A** (`docs/plans/2026-06-27-framework-modularity.md`) having landed the shared plumbing: `FieldDescriptor` + `SchemaForm`, the customization store, `framework-migrate.ts`, the editor framework (`FieldEditor`), and import/export.

**Goal:** Turn the TRUST review *instrument* itself into editable, shareable, versioned content — rubric questions (quality-gate + scoring), grade identity (add/remove grade types), principle metadata + colors, and the TRUST branding — so a non-TRUST team (or a TRUST team iterating) can fork the whole framework without touching code.

**Architecture:** The rubric (`data/rubrics/trust-full.json`) already has a clean schema; Plan B adds authoring CRUD on top of it through the same customization-store + edit-in-place patterns Plan A built. Grade IDs become runtime-configurable (the `FinalizationGrade` union is loosened to `string` with validation). Principle colors are injected as CSS custom properties at boot so `tokens.css` and the report derive from config without file edits. Branding (logos, magenta, ~15 report/print/sanitize literals, export filenames) moves into a `branding` config section. A pack version + question-rename migration extends the existing `lib/migrations.ts` session hook. A full "framework pack" (fields + rubric + grades + principles + branding) bundles for import/export.

**Tech Stack:** TypeScript, React 19, Zustand + persist, WXT, Vitest. Reuses Plan A's `SchemaForm`, customization store, `framework-migrate.ts`, editor UI patterns.

## Scope

**In scope:**
- **Rubric authoring:** CRUD on quality-gate categories + questions (type, title, requirement, background, examples, ai_only) and scoring principles + questions (0–3 anchors, title, background, examples, ai_only, reorder).
- **Grade identity:** add / remove / rename grade **IDs** (not just text — changes the grade set), with the `FinalizationGrade` type loosened to `string` + validation, and all 4 definition sites (`GradeSelector`, `compute-scores`, `types`, config) unified.
- **Principle editing:** names, codes, colors — injected as runtime CSS vars (`--tr`/`--re`/…) + feeding the report color maps.
- **Branding extraction:** logos (pack-supplied), `--trust-magenta`, and the ~15 "TRUST"/wordmark/QR/footer/print/sanitize literals + export filenames into config.
- **Pack versioning + migration:** a framework-pack version + question-key rename migration, extending `lib/migrations.ts`.
- **Full pack import/export:** bundle fields + rubric + grades + principles + branding as a named, shareable pack.

**Out of scope (future / Plan C+):**
- The consensus comparison app (#4) — separate branch.
- Report *layout* templating (section order/visibility beyond what field/rubric iteration already provides).
- Multi-pack switching UI polish beyond active-pack selection.

## Dependency on Plan A (read first)

Plan B **extends**, does not duplicate:
- `FieldDescriptor` / `lib/field-schema.ts` accessors — reused as-is.
- `SchemaForm` + `field-inputs/` — reused; new rubric editors mirror `FieldEditor` patterns.
- `stores/framework-customization.ts` — **extended** with `rubricOverrides`, `principleOverrides`, `brandingOverrides`, and `gradeAdditions`/`gradeRemovals`.
- `lib/framework-migrate.ts` — **extended** with `migrateQuestionRename`.
- `lib/framework-config.ts` `getActiveFrameworkConfig()` — **extended** to merge rubric/principle/branding/grade-id customizations.
- Import/export plumbing — **extended** to a full pack.

If Plan A's contracts shifted during implementation, reconcile before starting each task below (re-read the landed store + accessor signatures).

## File Structure

**Create:**
- `lib/rubric-schema.ts` — rubric authoring accessors (`getActiveRubric`, CRUD helpers) + types for authoring patches.
- `lib/branding.ts` — branding config accessors + `applyBrandingTokens()` (runtime CSS var injection) + `getReportBranding()`.
- `components/RubricEditor.tsx` — QG + scoring authoring UI.
- `components/PrincipleEditor.tsx` — principle name/code/color editor.
- `components/BrandingEditor.tsx` — logo upload, magenta, wordmark/report-literal editor.
- `components/GradeIdEditor.tsx` — add/remove/rename grade IDs.
- `components/PackManager.tsx` — active-pack selection + full-pack import/export.
- Tests: `tests/rubric-schema.test.ts`, `tests/branding.test.ts`, `tests/pack-versioning.test.ts`, `tests/grade-identity.test.ts`, plus editor tests.

**Modify:**
- `lib/types.ts` — loosen `ReviewFinalization.grade` to `string`; add pack/rubric version fields on `SessionMetadata` (`packId`, `packVersion`); add authoring types.
- `data/framework/trust-framework.json` — add `branding` section (logos, magenta, wordmark, report literals, export filenames); the rubric stays in `data/rubrics/` but gains authoring through overrides.
- `data/framework/index.ts` — export `BRANDING`, `validate` extended.
- `stores/framework-customization.ts` — extend with rubric/principle/branding/grade-id overrides.
- `lib/framework-config.ts` — merge rubric/principle/branding/grade-id.
- `lib/migrations.ts` — add `runPackMigrations` (question-key renames) on session load.
- `lib/report/compute-scores.ts`, `lib/html-report.ts`, `lib/report.css`, `lib/capture/sanitize.ts`, `lib/export-pipeline.ts`, `lib/logos.ts`, `lib/tokens.css` — replace TRUST literals / hardcoded colors with branding-config accessors or runtime vars.
- `entrypoints/sidepanel/main.tsx` (or `App.tsx`) — call `applyBrandingTokens()` at boot.

---

## Task 1: Rubric authoring data model + store extension

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/rubric-schema.ts`
- Modify: `stores/framework-customization.ts` (add `rubricOverrides`)
- Modify: `lib/framework-config.ts` (merge rubric)
- Test: `tests/rubric-schema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/rubric-schema.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { getActiveRubric } from "@/lib/rubric-schema";
import { RUBRIC_DATA } from "@/data/rubrics";

describe("rubric authoring", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("active rubric equals shipped rubric with no overrides", () => {
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity.title)
      .toBe(RUBRIC_DATA.scoring_rubric.TR.data_source_clarity.title);
  });

  it("edits a scoring question title in place", () => {
    useFrameworkCustomizationStore.getState().setRubricOverride(
      ["scoring_rubric", "TR", "data_source_clarity", "title"],
      "Data-source transparency",
    );
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity.title).toBe("Data-source transparency");
  });

  it("edits a quality-gate requirement + an example", () => {
    const s = useFrameworkCustomizationStore.getState();
    s.setRubricOverride(["quality_gate", "privacy_and_security", "data_privacy", "requirement"], "New req");
    s.setRubricOverride(["quality_gate", "privacy_and_security", "data_privacy", "examples", "pass"], "New pass ex");
    const q = getActiveRubric().quality_gate.privacy_and_security.data_privacy;
    expect(q.requirement).toBe("New req");
    expect(q.examples?.pass).toBe("New pass ex");
  });

  it("toggles ai_only on a scoring question", () => {
    useFrameworkCustomizationStore.getState().setRubricOverride(
      ["scoring_rubric", "TR", "data_source_clarity", "ai_only"], true,
    );
    expect(getActiveRubric().scoring_rubric.TR.data_source_clarity.ai_only).toBe(true);
  });

  it("adds a new custom scoring question under a principle", () => {
    useFrameworkCustomizationStore.getState().addRubricQuestion("scoring_rubric", "TR", {
      key: "custom_q", title: "Custom", background: "...", "0": "...", "1": "...", "2": "...", "3": "...", ai_only: false,
    });
    expect(getActiveRubric().scoring_rubric.TR.custom_q).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails** → `pnpm test tests/rubric-schema.test.ts` → FAIL.

- [ ] **Step 3: Add authoring types + loosen grade**

In `lib/types.ts`, add:

```ts
/** Path into a rubric, e.g. ["scoring_rubric","TR","data_source_clarity","title"]. */
export type RubricPath = readonly string[];

/** Additive customization of the rubric: path → value, plus added/removed questions. */
export interface RubricOverride {
  valuePatches: Record<string, unknown>; // JSON-pointer-stringified path → value
  addedQuestions: { section: "quality_gate" | "scoring_rubric"; parent: string; key: string; def: Record<string, unknown> }[];
  removedQuestions: { section: "quality_gate" | "scoring_rubric"; parent: string; key: string }[];
  /** ordering: parent → ordered child keys */
  order: Record<string, string[]>;
}
```

Loosen the grade type so Plan B can add/remove IDs:

```ts
export interface ReviewFinalization {
  conclusion: string;
  /** Grade id. Loosened to string in Plan B so custom grade IDs are storable; validate via isValidGrade. */
  grade: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  finalizedAt: string;
}
```

> `FinalizationGrade` (the union) is kept and exported for autocomplete, but `ReviewFinalization.grade` no longer requires it. Add `packId?` and `packVersion?` to `SessionMetadata`.

- [ ] **Step 4: Extend the customization store**

In `stores/framework-customization.ts`, add to `FrameworkCustomization`:

```ts
  rubric: RubricOverride;
  /** added grade ids (full definitions) beyond the shipped set. */
  gradeAdditions: FrameworkGrade[];
  /** shipped grade ids the user removed. */
  gradeRemovals: string[];
  principleOverrides: Record<string, Partial<FrameworkPrinciple>>;
  brandingOverrides: Partial<FrameworkBranding>;
```

and to the state: `setRubricOverride(path, value)`, `addRubricQuestion(section, parent, def)`, `removeRubricQuestion(section, parent, key)`, `reorderRubric(parent, keys)`, plus `addGrade(def)`, `removeGrade(id)`, `setPrincipleOverride(id, patch)`, `setBrandingOverride(patch)`. `EMPTY` and `validateCustomization` gain empty defaults for each. `setRubricOverride` stores under `rubric.valuePatches[path.join(".")] = value`.

- [ ] **Step 5: Implement `lib/rubric-schema.ts`**

```ts
import { RUBRIC_DATA } from "@/data/rubrics";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import type { RubricData } from "@/lib/types";

/** Deep-clone the shipped rubric, then apply patches + additions + removals + order. */
export function getActiveRubric(): RubricData {
  const r = structuredClone(RUBRIC_DATA) as unknown as Record<string, unknown>;
  const { rubric } = useFrameworkCustomizationStore.getState().customization;
  applyPatches(r, rubric.valuePatches);
  for (const add of rubric.addedQuestions) insertQuestion(r, add.section, add.parent, add.key, add.def);
  for (const rem of rubric.removedQuestions) deleteQuestion(r, rem.section, rem.parent, rem.key);
  for (const [parent, keys] of Object.entries(rubric.order)) reorderChildren(r, parent, keys);
  return r as unknown as RubricData;
}

function applyPatches(root: Record<string, unknown>, patches: Record<string, unknown>) {
  for (const [path, value] of Object.entries(patches)) {
    const parts = path.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) node = (node as Record<string, unknown>)[parts[i]] as Record<string, unknown>;
    node[parts[parts.length - 1]] = value;
  }
}
function insertQuestion(root: Record<string, unknown>, section: string, parent: string, key: string, def: Record<string, unknown>) {
  const parentObj = ((root[section] as Record<string, unknown>)[parent] ??= {}) as Record<string, unknown>;
  parentObj[key] = def;
}
function deleteQuestion(root: Record<string, unknown>, section: string, parent: string, key: string) {
  delete ((root[section] as Record<string, unknown>)[parent] as Record<string, unknown>)[key];
}
function reorderChildren(root: Record<string, unknown>, parent: string, keys: string[]) {
  // parent path like "scoring_rubric.TR"; rebuild an ordered object preserving values
  const parts = parent.split(".");
  let node = root;
  for (const p of parts) node = (node as Record<string, unknown>)[p] as Record<string, unknown>;
  const src = { ...(node as Record<string, unknown>) };
  const ordered: Record<string, unknown> = {};
  for (const k of keys) if (k in src) ordered[k] = src[k];
  for (const k of Object.keys(src)) if (!(k in ordered)) ordered[k] = src[k];
  for (const k of Object.keys(node as Record<string, unknown>)) delete (node as Record<string, unknown>)[k];
  Object.assign(node as Record<string, unknown>, ordered);
}
```

- [ ] **Step 6: Wire consumers to `getActiveRubric()`**

The app currently imports `RUBRIC_DATA` directly in a few places. Find them: `grep -rn "RUBRIC_DATA" lib/ components/ entrypoints/`. Replace runtime *use* (rendering/scoring) with `getActiveRubric()`. Keep `RUBRIC_DATA` as the shipped default for the validator and migration baseline. The `RubricContext` provider (`components/contexts.tsx`) should provide `getActiveRubric()` so all consumers re-render on customization change.

- [ ] **Step 7: Run tests + typecheck** → `pnpm test && pnpm typecheck` → PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/rubric-schema.ts stores/framework-customization.ts lib/framework-config.ts tests/rubric-schema.test.ts
git commit -m "feat(framework): rubric authoring model + store (edit/add/remove/reorder questions)"
```

---

## Task 2: Rubric editor UI

**Files:**
- Create: `components/RubricEditor.tsx`
- Modify: `components/SettingsScreen.tsx` (entry)
- Test: `tests/rubric-editor.test.tsx`

- [ ] **Step 1: Write the failing test** (sketch):

```tsx
it("edits a scoring question title in place", () => {
  render(<RubricEditor onBack={() => {}} />, { wrapper: AllProviders });
  fireEvent.change(screen.getByDisplayValue("Data source clarity"), { target: { value: "Source clarity" } });
  expect(useFrameworkCustomizationStore.getState().customization.rubric.valuePatches["scoring_rubric.TR.data_source_clarity.title"]).toBe("Source clarity");
});
it("adds a quality-gate question and toggles ai_only", () => { /* ... */ });
it("reorders questions within a principle via ↑/↓", () => { /* ... */ });
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `RubricEditor`**

Mirror `FieldEditor` structure (Plan A Task 8): two sections (Quality Gates, Scoring). For each category/principle, list its questions; each question row exposes editable `title`, `requirement` (QG) / `0`–`3` anchors (scoring), `background` (textarea), `examples.{pass,fail,na}` / `examples.{0..3,na}` (textareas), an `ai_only` toggle, ↑/↓ reorder, and a remove button. An "Add question" row under each principle/category creates a new key (prompt for a slug) → `addRubricQuestion`. All edits call `setRubricOverride(path, value)` / `addRubricQuestion` / `removeRubricQuestion` / `reorderRubric`. The user just edits text; the store routes patches.

- [ ] **Step 4: Wire entry** in `SettingsScreen.tsx` (a "Customize rubric" button → `<RubricEditor onBack={…}/>`).

- [ ] **Step 5: Run tests + full suite** → PASS.

- [ ] **Step 6: Commit**

```bash
git add components/RubricEditor.tsx components/SettingsScreen.tsx tests/rubric-editor.test.tsx
git commit -m "feat(framework): rubric authoring editor (QG + scoring CRUD)"
```

---

## Task 3: Grade identity (add/remove/rename IDs)

**Files:**
- Modify: `lib/framework-config.ts` (active grades include additions, exclude removals)
- Create: `lib/grade-validation.ts`
- Modify: `components/finalization/GradeSelector.tsx` (active grade set, no Labs hardcode)
- Test: `tests/grade-identity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/grade-identity.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { getActiveGrades, isValidGrade } from "@/lib/framework-config";

describe("grade identity", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());

  it("adds a custom grade id that becomes valid + selectable", () => {
    useFrameworkCustomizationStore.getState().addGrade({
      id: "pilot_recommended", label: "Pilot", description: "Try in a pilot", color: "#3b82f6", tint: "#dbeafe",
    });
    expect(getActiveGrades().map((g) => g.id)).toContain("pilot_recommended");
    expect(isValidGrade("pilot_recommended")).toBe(true);
  });

  it("removes a shipped grade id (no longer valid)", () => {
    useFrameworkCustomizationStore.getState().removeGrade("out_of_scope");
    expect(isValidGrade("out_of_scope")).toBe(false);
    expect(getActiveGrades().find((g) => g.id === "out_of_scope")).toBeUndefined();
  });

  it("existing stored grade that was removed reports invalid (does not throw)", () => {
    useFrameworkCustomizationStore.getState().removeGrade("fail");
    expect(isValidGrade("fail")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Active grades + validation**

In `lib/framework-config.ts`:

```ts
export function getActiveGrades(): FrameworkGrade[] {
  const c = useFrameworkCustomizationStore.getState().customization;
  const removed = new Set(c.gradeRemovals);
  const shipped = FRAMEWORK_CONFIG.grades.filter((g) => !removed.has(g.id));
  return [...shipped, ...c.gradeAdditions].map((g) => {
    const o = c.gradeOverrides[g.id];
    return o ? { ...g, ...o } : g;
  });
}
export function isValidGrade(id: string): boolean {
  return getActiveGrades().some((g) => g.id === id);
}
```

Export `getActiveFrameworkConfig()`'s `grades` from `getActiveGrades()`. Create `lib/grade-validation.ts` re-exporting `isValidGrade` plus a `normalizeGrade(id)` that maps a stored-but-removed grade to `null` (callers decide fallback).

- [ ] **Step 4: GradeSelector from active set**

In `GradeSelector.tsx`, the Labs `enhancedRecommendation` toggle is now a *user preference*, not a hardcode: `useGradeOptions` returns `getActiveGrades()`; the core-vs-enhanced split becomes a default customization (Plan A's `gradeRemovals` can hide the 6 enhanced ones when Labs is off). Render all active grades; on a stored-but-removed grade, show a "grade no longer available" note and prompt re-selection.

- [ ] **Step 5: Run tests + full suite** → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/framework-config.ts lib/grade-validation.ts components/finalization/GradeSelector.tsx tests/grade-identity.test.ts
git commit -m "feat(framework): grade identity add/remove (FinalizationGrade loosened to validated string)"
```

---

## Task 4: Principle editing + runtime color tokens

**Files:**
- Modify: `lib/framework-config.ts` (merge `principleOverrides`)
- Create: `lib/branding.ts` (`applyPrincipleTokens()`)
- Create: `components/PrincipleEditor.tsx`
- Modify: app boot (`entrypoints/sidepanel/main.tsx` or `App.tsx`) to call `applyPrincipleTokens()`
- Test: `tests/principle-tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/principle-tokens.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { getActivePrinciples, applyPrincipleTokens } from "@/lib/framework-config";
import { PRINCIPLES } from "@/lib/principles";

describe("principle editing + tokens", () => {
  beforeEach(() => useFrameworkCustomizationStore.getState().resetAll());
  afterEach(() => document.documentElement.style.cssText = "");

  it("overrides a principle color + fullName", () => {
    useFrameworkCustomizationStore.getState().setPrincipleOverride("TR", { color: "#ff0000", fullName: "Openness" });
    const tr = getActivePrinciples().find((p) => p.id === "TR")!;
    expect(tr.color).toBe("#ff0000");
    expect(tr.fullName).toBe("Openness");
  });

  it("applyPrincipleTokens injects CSS vars on :root", () => {
    useFrameworkCustomizationStore.getState().setPrincipleOverride("TR", { color: "#ff0000" });
    applyPrincipleTokens();
    expect(getComputedStyle(document.documentElement).getPropertyValue("--tr").trim()).toBe("#ff0000");
  });

  it("report color maps follow overrides", () => {
    useFrameworkCustomizationStore.getState().setPrincipleOverride("TR", { reportColor: "#000000" });
    const tr = getActivePrinciples().find((p) => p.id === "TR")!;
    expect(tr.reportColor).toBe("#000000");
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Active principles + token injection**

In `lib/framework-config.ts`:

```ts
export function getActivePrinciples(): FrameworkPrinciple[] {
  const c = useFrameworkCustomizationStore.getState().customization;
  return FRAMEWORK_CONFIG.principles.map((p) => ({ ...p, ...(c.principleOverrides[p.id] ?? {}) }));
}
export function applyPrincipleTokens() {
  const accent = { TR: "tr", RE: "re", US: "uc", SE: "se", TC: "tc" } as Record<string, string>;
  for (const p of getActivePrinciples()) {
    const key = accent[p.id] ?? p.code.toLowerCase();
    document.documentElement.style.setProperty(`--${key}`, p.color);
    document.documentElement.style.setProperty(`--section-${key}-accent`, p.color);
  }
}
```

`lib/principles.ts` `PRINCIPLES` now sources from `getActivePrinciples()` (plan A accessor already). `REPORT_COLORS`/`REPORT_SCORE_COLORS` in `html-report.ts`/`compute-scores.ts` already derive from `PRINCIPLES` — confirm they call the accessor (not a cached constant).

- [ ] **Step 4: Call at boot**

In the sidepanel entry (`entrypoints/sidepanel/main.tsx`) before `createRoot`, call `applyPrincipleTokens()`, and re-apply on customization store changes:

```ts
import { applyPrincipleTokens } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
applyPrincipleTokens();
useFrameworkCustomizationStore.subscribe(applyPrincipleTokens);
```

- [ ] **Step 5: `PrincipleEditor` UI** — per principle: editable `fullName`, `code`, `color`, `reportColor` (color inputs). Mirror `FieldEditor` patterns.

- [ ] **Step 6: Run tests + full suite + typecheck** → PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/framework-config.ts lib/principles.ts entrypoints/sidepanel/main.tsx components/PrincipleEditor.tsx tests/principle-tokens.test.ts
git commit -m "feat(framework): principle editing + runtime color-token injection"
```

---

## Task 5: Branding extraction

**Files:**
- Modify: `data/framework/trust-framework.json` (add `branding`)
- Modify: `lib/types.ts` (`FrameworkBranding`), `data/framework/index.ts`
- Create: `lib/branding.ts` (accessors + `applyBrandingTokens` for magenta + `getReportBranding`)
- Modify: `lib/logos.ts`, `lib/export-pipeline.ts`, `lib/html-report.ts`, `lib/report.css`, `lib/capture/sanitize.ts`, `lib/tokens.css`
- Create: `components/BrandingEditor.tsx`
- Test: `tests/branding.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/branding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BRANDING, getReportBranding } from "@/lib/branding";

describe("branding config", () => {
  it("declares framework name, wordmark, magenta, and report literals", () => {
    expect(BRANDING.frameworkName).toBeTruthy();
    expect(BRANDING.magenta).toMatch(/^#/);
    expect(BRANDING.report.title).toBeTruthy();
    expect(BRANDING.report.footerFramework).toBeTruthy();
    expect(BRANDING.export.labelFilenamePrefix).toBeTruthy();
  });
  it("getReportBranding returns the strings html-report needs", () => {
    const b = getReportBranding();
    expect(b.title).toBeTruthy();
    expect(b.archiveNotice).toContain("Archived by");
  });
  it("logos resolve to data URLs", () => {
    expect(BRANDING.logos.framework).toMatch(/^data:image\//);
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Define branding config**

In `lib/types.ts`:

```ts
export interface FrameworkBranding {
  frameworkName: string;       // "TRUST"
  frameworkFullName: string;   // "TRUST - UT Embedded Information Services"
  wordmark: string;            // footer/wordmark text
  magenta: string;             // --trust-magenta
  logos: { framework: string; secondary?: string; institution?: string }; // data URLs
  report: {
    title: string;             // report <title>
    nutritionTitle: string;
    cardTitle: string;
    footerFramework: string;   // print @page header
    reviewedBy: string;        // "Reviewed by UTwente librarians"
    archiveNotice: string;     // sanitize.ts comment
    qrUrl?: string;            // trust.samuelmok.cc
  };
  export: {
    labelFilenamePrefix: string;  // "TRUST_Label_"
    frameworkLogoFilename: string;// "trust-logo.jpg"
  };
}
```

In `trust-framework.json`, add a `branding` block transcribing the current values (framework name, magenta `#8e036c`, the ~15 report literals from `html-report.ts`, `sanitize.ts:170`'s "Archived by TRUST Review Extension", export prefixes). Move `lib/logos.ts`'s three base64 PNGs into `branding.logos`.

- [ ] **Step 4: Branding accessors**

Create `lib/branding.ts`:

```ts
import { FRAMEWORK_CONFIG } from "@/data/framework";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import type { FrameworkBranding } from "@/lib/types";

export const BRANDING: FrameworkBranding = FRAMEWORK_CONFIG.branding;
export function getActiveBranding(): FrameworkBranding {
  return { ...BRANDING, ...useFrameworkCustomizationStore.getState().customization.brandingOverrides };
}
export function getReportBranding() {
  const b = getActiveBranding();
  return { ...b.report, title: b.report.title, archiveNotice: b.report.archiveNotice };
}
export function applyBrandingTokens() {
  document.documentElement.style.setProperty("--trust-magenta", getActiveBranding().magenta);
}
```

- [ ] **Step 5: Replace hardcoded literals**

- `lib/logos.ts` → re-export from branding: `export const TRUST_LOGO = BRANDING.logos.framework;` etc. (keep the export names so `export-pipeline.ts`/`html-report.ts` imports don't change shape; they now read branding-sourced values).
- `lib/html-report.ts` → replace the ~15 "TRUST" string literals with `getReportBranding()` fields (title, nutritionTitle, cardTitle, footerFramework, reviewedBy, qrUrl, alt text).
- `lib/export-pipeline.ts` → `TRUST_Label_` → `getActiveBranding().export.labelFilenamePrefix`; `trust-logo.jpg` → `frameworkLogoFilename`.
- `lib/capture/sanitize.ts:170` → `getActiveBranding().report.archiveNotice`.
- `lib/report.css` → the print `@top-right { content: "TRUST Framework" }` can't read JS; replace with a CSS var `content: var(--report-footer-framework)` and set `--report-footer-framework` in `applyBrandingTokens()`. The `--magenta:#8e036c` literal → remove (runtime var from `applyBrandingTokens`).
- `lib/tokens.css` → keep `--trust-magenta` as a fallback default value (so unbooted contexts still render), but the runtime var overrides it.

> `content: var(--…)` works in `@top-right`. Verify in the report dev preview (`pnpm report:dev`).

- [ ] **Step 6: `BrandingEditor` UI** — framework name/wordmark text inputs, magenta color picker, logo upload (FileReader → data URL → `setBrandingOverride({ logos: { framework: dataUrl } })`), report-literal text edits. Plus call `applyBrandingTokens()` on change.

- [ ] **Step 7: Run tests + full suite + report:build smoke** → `pnpm test && pnpm typecheck && pnpm report:build` → PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts data/framework/trust-framework.json data/framework/index.ts lib/branding.ts lib/logos.ts lib/export-pipeline.ts lib/html-report.ts lib/report.css lib/capture/sanitize.ts components/BrandingEditor.tsx tests/branding.test.ts
git commit -m "feat(framework): extract TRUST branding (logos/magenta/literals/filenames) into config"
```

---

## Task 6: Pack versioning + question-rename migration

**Files:**
- Modify: `lib/types.ts` (`SessionMetadata.packId`, `packVersion`)
- Modify: `lib/migrations.ts` (add `runPackMigrations`)
- Modify: `lib/session-repository.ts` (call pack migration after session migration)
- Modify: `data/rubrics/index.ts` (export `RUBRIC_VERSION`)
- Test: `tests/pack-versioning.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/pack-versioning.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runPackMigrations } from "@/lib/migrations";
import type { SessionData } from "@/lib/types";

describe("pack versioning", () => {
  it("renames a rubric question key in evaluations when the pack renamed it", () => {
    const data: SessionData = {
      metadata: { id: "s", toolName: "T", toolUrl: "", startTime: "", status: "in-progress", packVersion: 1 },
      captures: [],
      evaluations: [{ rubricId: "TR.data_source_clarity", score: 3, notes: "", explicitEvidenceIds: [] }],
      finalization: null,
    };
    const renamed = runPackMigrations(data, { fromVersion: 1, toVersion: 2, questionRenames: { "TR.data_source_clarity": "TR.source_clarity" } });
    expect(renamed.evaluations[0].rubricId).toBe("TR.source_clarity");
  });

  it("is idempotent when already at the target version", () => {
    const data = { metadata: { packVersion: 2 } } as unknown as SessionData;
    expect(runPackMigrations(data, { fromVersion: 1, toVersion: 2, questionRenames: {} })).toBe(data);
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement pack migration**

In `lib/migrations.ts`, add:

```ts
import type { SessionData } from "@/lib/types";

export interface PackMigration {
  fromVersion: number;
  toVersion: number;
  /** old rubricId → new rubricId, derived from question-key renames. */
  questionRenames: Record<string, string>;
}

/** Apply question-key renames to a session's evaluations if its packVersion is behind. */
export function runPackMigrations(data: SessionData, m: PackMigration): SessionData {
  const v = (data.metadata as { packVersion?: number }).packVersion;
  if (v == null || v >= m.toVersion) return data;
  const renamed = structuredClone(data);
  for (const e of renamed.evaluations) {
    if (e.rubricId in m.questionRenames) e.rubricId = m.questionRenames[e.rubricId];
  }
  (renamed.metadata as { packVersion?: number }).packVersion = m.toVersion;
  return renamed;
}
```

In `data/rubrics/index.ts`, export `export const RUBRIC_VERSION = FRAMEWORK_CONFIG.version;` (parse to a number where needed). In `session-repository.ts` load path, after `runMigrations(data)`, the active pack's migration map (derived from `_note`/`questionRenames` in the active pack config) is applied via `runPackMigrations`. For Plan B, ship one forward migration (v1.1 → next) only if a real question rename lands; otherwise the machinery is in place and tested.

- [ ] **Step 4: Stamp new sessions with the active pack id/version**

In session creation (`lib/session-lifecycle.ts` `createSession`), set `metadata.packId = getActiveBranding().frameworkName` (or a pack id field) and `metadata.packVersion = RUBRIC_VERSION`.

- [ ] **Step 5: Run tests + full suite** → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/migrations.ts lib/session-repository.ts data/rubrics/index.ts lib/session-lifecycle.ts tests/pack-versioning.test.ts
git commit -m "feat(framework): pack versioning + question-rename migration on session load"
```

---

## Task 7: Full pack import/export + pack manager

**Files:**
- Create: `lib/pack.ts` (`buildActivePack()`, `applyPack(data)`, validate)
- Create: `components/PackManager.tsx`
- Test: `tests/pack.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/pack.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildActivePack, applyPack, type FrameworkPack } from "@/lib/pack";

describe("framework pack", () => {
  it("buildActivePack snapshots the full active framework", () => {
    const pack = buildActivePack();
    expect(pack.fields.length).toBeGreaterThan(15);
    expect(pack.rubric.scoring_rubric.TR).toBeTruthy();
    expect(pack.grades.length).toBe(9);
    expect(pack.branding.magenta).toMatch(/^#/);
  });
  it("applyPack round-trips into the customization store", () => {
    const pack = buildActivePack();
    // wipe, then re-apply
    applyPack(pack);
    const again = buildActivePack();
    expect(again.fields).toEqual(pack.fields);
    expect(again.grades).toEqual(pack.grades);
  });
  it("applyPack rejects a malformed pack", () => {
    expect(() => applyPack({ nope: true } as unknown as FrameworkPack)).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL.

- [ ] **Step 3: Implement `lib/pack.ts`**

```ts
import type { FieldDescriptor, FrameworkBranding, FrameworkGrade, FrameworkPrinciple, RubricData } from "@/lib/types";
import { getActiveRubric } from "@/lib/rubric-schema";
import { getActiveFields, getActiveGrades, getActivePrinciples, getActiveBranding } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { FRAMEWORK_CONFIG } from "@/data/framework";

export interface FrameworkPack {
  packId: string;
  version: string;
  fields: FieldDescriptor[];
  rubric: RubricData;
  principles: FrameworkPrinciple[];
  grades: FrameworkGrade[];
  branding: FrameworkBranding;
}

export function buildActivePack(): FrameworkPack {
  return {
    packId: getActiveBranding().frameworkName,
    version: FRAMEWORK_CONFIG.version,
    fields: getActiveFields(),
    rubric: getActiveRubric(),
    principles: getActivePrinciples(),
    grades: getActiveGrades(),
    branding: getActiveBranding(),
  };
}

export function applyPack(data: unknown): void {
  // validate shape, then translate the resolved pack back into customization deltas
  // against the shipped defaults. For a TRUST-default pack this is a no-op; for an
  // edited pack it reconstructs fieldOverrides/customFields/rubric/grades/principles/branding.
  if (!data || typeof data !== "object") throw new Error("Pack must be an object");
  const p = data as Partial<FrameworkPack>;
  if (!Array.isArray(p.fields) || !p.rubric || !Array.isArray(p.grades)) throw new Error("Malformed pack");
  // Replace customization wholesale with a pack-derived customization:
  useFrameworkCustomizationStore.getState().importCustomization(packToCustomization(p as FrameworkPack));
}
```

> `packToCustomization` diffs the imported pack against shipped defaults to produce the minimal customization (field overrides for changed labels, customFields for added fields, rubric valuePatches for changed questions, gradeAdditions/Removals, principleOverrides, brandingOverrides). Implement as a focused helper; for v1 a simple "override-everything" translation is acceptable (set every field's override to the pack value), refinable later.

- [ ] **Step 4: `PackManager` UI** — shows active pack summary (name, version, field/grade/question counts), "Export pack" (downloads `buildActivePack()` as JSON), "Import pack" (file → `applyPack`). Wire into Settings alongside the other editors.

- [ ] **Step 5: Run tests + full suite + typecheck** → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/pack.ts components/PackManager.tsx tests/pack.test.ts
git commit -m "feat(framework): full framework pack import/export + pack manager"
```

---

## Task 8: Docs + CHANGELOG

- [ ] **Step 1: Update `CLAUDE.md`** — rubric authoring, grade-identity model (`grade` is now a validated string), principle runtime tokens, branding config, pack versioning/migration, full pack import/export. Note the Plan A → Plan B reuse seam.
- [ ] **Step 2: CHANGELOG entry** (unreleased) summarizing instrument/identity editability.
- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs(framework): document instrument & identity layer (Plan B)"
```

---

## Definition of Done

- [ ] `pnpm test` green; coverage ≥ ratcheted thresholds.
- [ ] `pnpm typecheck` + `pnpm check` + `pnpm report:build` clean.
- [ ] A reviewer can: rename a rubric question (and an existing review's score follows the rename via pack migration), add a custom grade ID and select it in finalization, recolor a principle (live in the UI + exported report), upload a logo + change the framework wordmark (reflected in the exported report/print header/archive notice/filename), and export the whole customized framework as a pack that re-applies on a fresh profile.
- [ ] All "TRUST" literals in `lib/` are gone (config-driven); `grep -rn 'TRUST' lib/ components/` returns only legitimate, config-sourced references.
- [ ] CLAUDE.md + CHANGELOG updated.

## Notes on Plan A → Plan B reconciliation

If Plan A's landed contracts differ from what this plan assumes (e.g. accessor names, store shape), reconcile each task's imports against the landed code before implementing — do not assume. The reuse seam (schema model, `SchemaForm`, customization store, `framework-migrate.ts`, editor framework, import/export) is the load-bearing dependency; the rubric/principle/branding/grade-id/pack layers extend it.
