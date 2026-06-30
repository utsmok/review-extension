# Inline Edit Mode — Detailed Implementation Plan (Bundle 2: Approach A)

> **Scope decision:** Approach A — a live-review Edit Mode toggle. Edits target the **global**
> framework customization store (same semantics as the existing Settings editors) with prominent
> guardrails. **C3 per-session snapshots deferred**: every eager accessor reads
> `useFrameworkCustomizationStore.getState()` directly (`framework-config.ts:20,118`, `rubric-schema.ts`,
> `field-schema.ts`) and several are used in non-React report generation — making them source-injectable
> is a separate refactor. The hook points are noted in §C3-hook-points.
>
> **Branch:** `feat/inline-edit-mode` (forked from `feat/framework-modularity`).
> **Discipline:** each phase ships green (test + typecheck + biome) and commits. TDD where practical.

## Architecture

- `EditModeContext` (non-persistent React context, provided in `App.tsx` alongside `RubricContext`)
  exposes `{ editMode, setEditMode }`.
- Review components call `useEditMode()` and, when `editMode`, render affordances (click-to-edit,
  drag handles, +/−, popup). When off, the review is byte-identical to today.
- All edits dispatch the **existing** customization-store actions — no new mutations.
- A guardrail banner under the header ("Editing framework — affects all reviews") shows whenever
  `editMode` is on.

## Phase 0 — Reactivity fixes (prerequisites, pure bug fixes)

**Why:** the review path reads static `RUBRIC_DATA` (`App.tsx:38`) and `SchemaForm`/`GradeSelector`
call eager accessors in `useMemo` without subscribing to the store, so edits never appear live.

- `lib/rubric-schema.ts`: export a `useActiveRubric()` hook (subscribe to `s.customization.rubric`,
  return `getActiveRubric()`). (Mirror the local hook already in `RubricEditor.tsx:17-22`.)
- `App.tsx:38`: `rubric: RUBRIC_DATA` → `rubric: useActiveRubric()`.
- `SchemaForm.tsx:45`: add `useFrameworkCustomizationStore((s) => s.customization)` to the deps so
  `getActiveFields(surface)` recomputes on override.
- `GradeSelector.tsx`: add the same subscription so `getGradeOptions()` recomputes.
- Tests: a review-render test asserting a store override surfaces in the live review UI.

## Phase 1 — Edit Mode spine

- `components/edit-mode/EditModeContext.tsx`: `EditModeProvider` + `useEditMode()` (boolean + setter).
  Provider mounted in `App.tsx` wrapping `ActiveSession`.
- `components/edit-mode/EditModeToggle.tsx`: a small toggle button for the `AppShell` header
  (next to Settings); only renders when a session is active.
- `AppShell.tsx`: accept + render the toggle and the guardrail banner slot.
- `components/edit-mode/EditModeBanner.tsx`: the "Editing framework — affects all reviews" banner.
- Extend `EditableText` (`components/editor/EditableText.tsx`) with `disabled?: boolean` — when true,
  render as plain text (no click handler) so call sites are unconditional.
- Tests: toggle on/off mounts/removed; `EditableText disabled` renders plain text + no input on click.

## Phase 2 — Click-to-edit text (per surface)

Wire `EditableText` (disabled when off) to the matching `set*Override` action:

- **Rubric (`QuestionSection.tsx`):** question title (`summary` `<span>` → `EditableText`), requirement
  text (`:149`), score-level anchors + examples (inside `question-section/ScoringScoreInputs.tsx` and
  the examples foldout). `onChange` → `setRubricOverride([section, cat, qId, field], value)`.
- **Metadata (`SchemaForm.tsx` + field-inputs):** field label + help text. Because field-inputs bake
  the label in, add an optional `editable?` prop threaded from `SchemaForm` (gated by edit-mode) that
  swaps the label `<span>`/help `<p>` for `EditableText`. `onChange` → `setFieldOverride(id, {label|helpText})`.
- **Grades (`GradeSelector.tsx`):** grade label + description per chip. `onChange` →
  `setGradeOverride(id, {label|description})`.
- Tests: edit-in-place commits per surface (click display → type → blur → assert patch + live re-render).

## Phase 3 — Add / remove / reorder (dnd-kit)

- Install `@dnd-kit/core` + `@dnd-kit/sortable`.
- `components/edit-mode/DragHandle.tsx` (uses `useSortable` listeners; keyboard sensor for a11y).
- `components/edit-mode/InlineAddButton.tsx` (+ affordance; opens a title→slug prompt).
- `components/edit-mode/RemoveButton.tsx` (− ; wires to `ConfirmDialog`).
- **Rubric:** wrap each category/principle question list in `SortableContext`; reorder →
  `reorderRubricQuestions`; `InlineAddButton` → `addRubricQuestion`; `RemoveButton` →
  `removeRubricQuestion` (confirm).
- **Fields:** sortable within a surface group; reorder via `order` swaps (`setFieldOverride`); add →
  `addField`; remove → `removeCustomField` (confirm).
- **Grades:** add (`addGrade`) / remove (`removeGrade`, confirm) / recolor. (No reorder — grade order
  is semantic via `CORE_GRADE_IDS`/`ALL_GRADE_IDS`.)
- Tests: drag-reorder updates store order; add-via-(+); remove-via-confirm per surface.

## Phase 4 — Popup styling editor

- `components/edit-mode/PopupEditor.tsx`: absolute-positioned panel anchored to a gear button;
  click-outside + Escape to close.
- **Grades/Principles:** color/tint swatch palette (reuse `COLOR_PALETTE`/`TINT_PALETTE` from
  `GradeIdEditor.tsx`) → `setGradeOverride(id,{color,tint})` / `setPrincipleOverride(id,{color})`.
- **Fields:** type, required, enabled, group controls → `setFieldOverride`.
- Tests: popup opens on gear, commits swatch/type changes.

## Phase 5 — Metadata migration + polish

- Migrate hardcoded `Metadata.tsx` fields (toolName, toolUrl, logo, usesAi, discipline) into
  `SchemaForm` descriptors so they share the inline edit affordances.
- Empty-state polish, hover affordances, keyboard a11y pass.

## §C3-hook-points (deferred)

To later add per-session snapshots: introduce a `CustomizationSource` abstraction behind the eager
accessors (`getActiveRubric/Fields/Grades/...`) so a session-scoped source can override the global
store; add `frameworkCustomization` to the session store + a publish flow. The review-path
subscriptions added in Phase 0 are the reactive prerequisite.

## Verification (every phase)
`pnpm vitest run <touched test>` → then centrally `pnpm typecheck && pnpm exec biome check --write . && pnpm test && pnpm build`.

---

## Implementation Status (2026-06-30)

**Shipped on `feat/inline-edit-mode`** (forked from `feat/framework-modularity`):

- **Phase 0 ✅** — Reactivity fixes: `useActiveRubric()` reactive hook; `SchemaForm` +
  `GradeSelector` subscribe to the customization store. Closed the long-standing
  `RUBRIC_DATA` desync (review now reflects rubric edits live).
- **Phase 1 ✅** — Edit Mode spine: `EditModeContext` (provider at app root, `initialEditMode`
  for tests), `AppShell` toggle + guardrail banner, `EditableText.disabled`.
- **Phase 2 ✅** — Click-to-edit text on all three surfaces (rubric title/requirement/guidance/
  examples; field label + help; grade label + description).
- **Phase 3 ✅** — Reorder + add + remove via `ReorderHandle`, `InlineAddButton`, `RemoveButton`
  (rubric reorder/add/remove per group; fields reorder/add/remove; grades add/remove).
- **Phase 4 ✅** — Styling popups: grade color/tint swatches, field required/enabled, and
  principle color picker (scoring section headers).

**1132 tests, typecheck + biome + build green.** Every affordance is gated behind `editMode`
(off = byte-identical review).

### Deliberately deferred (with rationale)

- **True drag reorder (`@dnd-kit`)** — the npm registry was unreachable in the build environment
  (DNS errors), so `ReorderHandle` ships as accessible up/down arrows. Swap to `@dnd-kit` drag is a
  drop-in behind the same interface once the dependency is installable.
- **Rubric score-level anchor texts inline** — the `<label>`/radio semantics in `ScoringScoreInputs`
  conflict with inline `EditableText`; marked `TODO(phase4)` in the source. Editable via the
  dedicated Rubric editor today.
- **Hardcoded Metadata fields → schema migration** — `toolName`/`toolUrl`/`logo`/`usesAi`/
  `discipline` have bespoke UI (logo capture, AI-confirm flow, discipline pills) that doesn't map
  cleanly to `SchemaForm` field-inputs. Migration is a separate, higher-risk refactor; the dynamic
  metadata fields already have full inline edit. Left as-is and functional.
- **C3 per-session snapshots** — every eager accessor reads the global store directly and several
  are used in non-React report generation, so source-injection is a separate refactor. Edits target
  the global framework (same semantics as the existing Settings editors) with a prominent guardrail
  banner. The Phase-0 reactivity fixes are the prerequisite for any future snapshot work.
- **Field TYPE in the styling popup** — `FieldOverride` deliberately excludes `type` (changing a
  shipped field's type would invalidate stored values); type is fixed at creation via `addField`.
