# Inline Edit Mode — Feasibility & High-Level Implementation Plan

**Status:** Draft for review (not yet implemented)
**Branch target:** `feat/framework-modularity` → new branch e.g. `feat/inline-edit-mode`
**Date:** 2026-06-30

---

## 0. TL;DR — Feasibility Verdict

**Yes, feasible — and architecturally well-suited.** The extension is already schema-driven
(`FieldDescriptor` → `SchemaForm`; rubric via `getActiveRubric()`; grades via the framework config),
and the customization **mutation API is already complete** — every inline action we'd need (edit a
label, add/remove/reorder a question or field, recolor a grade) has a corresponding store method
today. `EditableText` (our click-to-edit primitive) is ready to drop in. The component mapping is
clean: each review `<details>` row / `SchemaForm` field / grade chip maps 1:1 to one editable entity.

**Three things must be decided/fixed first** (in priority order):

1. **The scope problem (decision):** framework customization is *global and persisted* — editing a
   rubric question while reviewing Tool A changes the framework for *every* review. This is the
   single most important design decision (see §3).
2. **A pre-existing desync bug (must fix):** the review path reads `RUBRIC_DATA` (static shipped
   data) at `App.tsx:38`, **not** `getActiveRubric()`. Edits to the rubric are currently invisible in
   the live review UI. Likewise `SchemaForm` (`:45`) and `GradeSelector` (`:8`) don't subscribe to
   the customization store, so they won't re-render on edit. These reactivity fixes are prerequisites.
3. **~16 touch points** across the review components — contained, not sprawling.

Reference precedents: Microsoft Forms / Power Apps WYSIWYG model-driven designer, Notion, Webflow,
PatternFly's **Inline Edit** pattern, the "In-place Editor" UI pattern, Drupal's in-place editing,
and open-source React form builders (SurveyJS, FormEngine, coltorapps **Builder**). For
drag/reorder, **dnd-kit** is the 2026 default (react-beautiful-dnd is abandoned) — lightweight,
accessible, handle-based.

---

## 1. Scope

### In scope
- An **Edit Mode toggle** on the live review interface that, when active, reveals inline editing
  affordances directly on the rendered review:
  - **Click-to-edit text** (question titles, requirements, score-level anchors, field labels/help,
    grade labels/descriptions) — reusing `EditableText`.
  - **Drag handles** to reorder questions within a principle/category, fields within a surface, and
    grade chips.
  - **(+) insert buttons** before/after each item to add a question / field / grade.
  - **(−) remove** per item (confirm-gated, reusing `ConfirmDialog`).
  - **A "styling" popup** (gear/✎ button) for multi-property edits that don't fit inline — e.g.
    grade color/tint, principle color, field type/required/enabled, question ai-only flag.
- Coverage of the three schema-driven surfaces: **Evaluation** (rubric questions + principles),
  **Metadata** (form fields), **Finalize** (grades + finalization fields).
- The reactivity/desync fixes required to make edits visible live.

### Out of scope (for v1)
- **Captures** tab — pure session data, no framework affordances.
- Editing **session values** (the tool's name, scores, evidence, conclusion). Edit Mode edits the
  *framework schema/wording/identity*, never the review data. This distinction is load-bearing.
- A full rewrite on a third-party form-builder library (considered, rejected — see §4 Approach C).
- Per-session framework snapshoting as a *v1 deliverable* (it's the recommended follow-up — see §3).
- Removing the existing Settings → Framework customization hub (it stays as the power-user surface
  for pack import/export, reset-all, and versioning — operations that don't fit inline).

### Non-goals / things we explicitly will NOT break
- The normal review flow must be byte-identical when Edit Mode is **off** (zero new affordances
  render; zero perf cost from edit primitives mounting).
- Existing finalized reviews and session data must not be altered by entering/leaving Edit Mode.

---

## 2. Current Architecture (grounding)

Mapped from the codebase (exact refs):

- **Tabs:** `ActiveSession.tsx:20` — Evaluation / Metadata / Finalize / Captures, managed by
  `useRovingTabIndex`. **No global "mode" state exists today** — a clean place to add one.
- **Rubric data path (the desync):** `App.tsx:38` wraps `ActiveSession` in
  `RubricContext.Provider value={{ rubric: RUBRIC_DATA, … }}` — **static shipped data**, not
  `getActiveRubric()`. `lib/rubric-schema.ts:13` `getActiveRubric()` clones + patches, but the review
  path never calls it.
- **Field path:** `SchemaForm.tsx:46` `getActiveFields(surface)` in `useMemo`, **no store
  subscription** → won't re-render on field overrides. Field *values* come from the session store
  (per-review).
- **Grade path:** `GradeSelector.tsx:10` `getGradeOptions()` → `getActiveFrameworkConfig().grades`,
  `useMemo`, **no store subscription**.
- **Customization store:** `stores/framework-customization.ts:305` — Zustand **+ persist**
  (`trust-framework-customization`, `:605`). **Global**, one instance, persisted across all contexts.
  **Full mutation API present** (see §5) — no gaps.
- **Session store:** `stores/session.ts` — per-review. `SessionMetadata` (`types.ts:49-51`) already
  carries `packId?` / `packVersion?` — unused today, but signals prior intent for per-session
  framework versioning.
- **Reusable now:** `EditableText` (drop-in, needs an edit-mode guard), `Section`, `ConfirmDialog`.
- **Missing primitives (to build):** `EditModeContext`, `DragHandle`, `InlineAddButton`,
  `RemoveButton`, a small `PopupEditor`.

---

## 3. The Central Decision — Global Scope

This is the one thing that must be settled before any code, because it shapes the whole design.

**The problem:** Framework customization is global + persisted. If a reviewer enters Edit Mode while
reviewing Tool A and rewords a rubric question, that rewording now applies to Tool B's review, and
to every future review. Today the dedicated editor screens have the same property — but there, the
user is *manifestly* in a "configure the framework" mindset. On a live review, the mental model is
"this review," so the global blast radius is surprising and dangerous.

**Three options:**

| Option | What it does | Pros | Cons |
|---|---|---|---|
| **C1 — Design surface only** | Edit Mode is only enterable when **no review session is active** (or in a dedicated "Design" tab that hosts the real review components with sample data). | Zero risk to live reviews. Cleanest mental model. Sidesteps the global problem entirely. | Loses some of the "edit while looking at *this* tool" magic. Needs sample/preview data to look real. |
| **C2 — Edit on live review + loud guardrails** | Edit Mode works on an active review; mutations hit the global store, but with: a prominent banner ("Editing the framework — affects all reviews"), per-action confirm for destructive ops, an Undo stack, and a visible "Customizations active" indicator. | Matches the user's stated vision directly. Most powerful. | A careless edit still silently changes other reviews. Undo complexity. |
| **C3 — Per-session framework snapshots** | Entering Edit Mode on a review forks the framework into a session-scoped snapshot (`packId`/`packVersion` already hinted). The live review uses the snapshot; "Publish to framework" promotes it global. | Most correct. Edit-on-live with no cross-review blast radius. Aligns with the existing `packId` design intent. | Most work (snapshot model, promotion flow, migration of the store). A v2 in its own right. |

**Recommendation:** **C1 for v1, C3 as the strategic follow-up.** C1 delivers the inline-editing UX
the user wants at low risk (you design the framework on a real, fully-rendered review surface — just
not one that's an in-flight review). C3 is the right long-term answer and the codebase already
gestures at it. C2 is tempting but the silent cross-review mutation is a sharp edge I'd avoid
shipping.

> **This is the primary open question for you (§9, Q1).** The rest of the plan assumes **C1** unless
> noted; the architecture is the same for C3 (the only addition is snapshot plumbing).

---

## 4. Approaches

### Approach A — Edit-Mode overlay on the live review UI
A toggle in `AppShell` flips a non-persistent `EditModeContext`. Review components read `editMode`
and conditionally swap read-only spans for `EditableText`, and reveal drag/(+)/−/gear affordances.
The dedicated Settings editors are retained for pack IO / reset / versioning.

- **Pros:** Exactly the user's vision. One source of truth (the real review components). The
  click-to-edit work we just shipped on the editors directly transfers. Zero change to review flow
  when off.
- **Cons:** Edit affordances threaded through ~6 review components; must fix the desync + reactivity
  first; the global-scope decision (§3) is live.

### Approach B — Dedicated "Design" surface embedding the real review components
A new top-level "Design" entry that mounts the *actual* `Evaluation`/`Metadata`/`Finalize` components
in an editable shell with sample data — entered from Settings, not toggled on a live review.

- **Pros:** Naturally implements **C1**. Zero risk to the review flow. Same component reuse.
- **Cons:** Slightly less "magical" than toggling in-place; needs representative sample/preview data.

### Approach C — Rebuild on a form-builder library (SurveyJS / FormEngine / coltorapps Builder)
Discard the current editors + renderers and rebuild on a library.

- **Rejected.** We already have a schema-driven renderer (`SchemaForm`) and a complete mutation API.
  A library buy-in would throw away the framework-modularity work, fight our `as const` principles
  and branding-token styling, and add a heavy dependency to a browser extension where bundle size
  matters. The pattern is worth copying; the dependency is not.

**These two choices are coupled, not independent** — the scope option (§3) dictates which entry
point is safe. Two coherent bundles to choose between:

- **Bundle 1 — Low-risk (recommended for v1): C1 + Approach B.** A dedicated Design surface hosts the
  real review components (editable, with sample data), reachable from Settings. Zero risk to live
  reviews; delivers the full inline-edit UX; Approach B naturally realizes C1.
- **Bundle 2 — Full vision: C3 (or C2) + Approach A.** Toggle Edit Mode directly on a live review.
  This is exactly the user's stated vision, but it is only *safe* with C3 (per-session snapshots) —
  C2's guardrails still leak cross-review mutations. So Approach A really implies committing to C3,
  a larger build. Recommend landing Bundle 1 first, then promoting to Bundle 2 (C3) as Phase 6.

The architecture in §5 is identical for both bundles; only the entry point + the snapshot plumbing
differ.

---

## 5. Proposed Architecture

### 5.1 New context + hook
- `components/edit-mode/EditModeContext.tsx` — `EditModeProvider` + `useEditMode()` returning
  `{ editMode: boolean, setEditMode, enterWithGuard() }`. Provider mounted in `App.tsx` alongside
  `RubricContext`. **Non-persistent** (transient UI state, not in any store).
- Entering Edit Mode runs a guard: under C1, blocks if a review session is active (offers "go to
  Design surface" instead); under C2, shows the §3 banner.

### 5.2 New inline primitives (`components/edit-mode/`)
- `DragHandle` — thin wrapper over `@dnd-kit/sortable`'s `useSortable` listeners; renders a grip
  icon; `aria-label` + keyboard reorder (dnd-kit ships keyboard sensor).
- `InlineAddButton` — the (+) affordance; renders between/after items; opens a minimal
  "title → slug" prompt (reuse the slugify + confirm pattern from the editors).
- `RemoveButton` — (−) per item; wires to `ConfirmDialog`.
- `PopupEditor` — a small popover (Popper-free; absolute-positioned panel) that hosts multi-property
  edits: grade color/tint swatches (reuse `GradeIdEditor`'s palette), principle color picker, field
  type/required/enabled, question ai-only. Anchored to the item's gear button.
- `EditableText` — **extend** with an optional `disabled` prop; when `!editMode` it renders as plain
  text (so the same call site works in both modes with no conditional at the call site).

### 5.3 Reactivity / desync fixes (prerequisites — unblock v1)
These are independent of Edit Mode and should land first (they're latent bugs):
1. `App.tsx:38` — replace `RUBRIC_DATA` with a `useActiveRubric()` that subscribes to the
   customization store (`s.customization.rubric`) and returns `getActiveRubric()`. (Mirror the
   pattern already in `RubricEditor.tsx:17-22`.)
2. `SchemaForm.tsx:45` — add `useFrameworkCustomizationStore((s) => s.customization)` subscription
   so `getActiveFields(surface)` recomputes on field overrides.
3. `GradeSelector.tsx:8` — add the same subscription so `getGradeOptions()` recomputes.

### 5.4 Per-surface affordances (where they insert)
- **Evaluation / `QuestionSection.tsx`:**
  - `<details><summary>` (`:126`): prepend `DragHandle`; replace the title `<span>` with
    `EditableText` (disabled when off); append `RemoveButton` + `PopupEditor` (ai-only, related gate).
  - Body: `EditableText` on requirement text (`:149`), on score-level anchor descriptions inside
    `ScoringScoreInputs`; example rows get `EditableText` (the same display classes we just used in
    `RubricEditor`).
  - `InlineAddButton` after the last question in each category/principle.
  - Principle/category headers: `PopupEditor` for color + name.
- **Metadata / `SchemaForm.tsx` `FieldRenderer` (`:72`):**
  - Each field: `DragHandle`, `EditableText` label (the field-inputs render their own label — so
    either (a) pass an `editable` prop into the field-inputs, or (b) overlay `EditableText` on the
    label span). `InlineAddButton` per surface group; `RemoveButton` + `PopupEditor` (type,
    required, enabled, options) per field.
  - **Hardcoded fields** (`Metadata.tsx` toolName/toolUrl/logo/usesAi/discipline) are **not** schema
    -driven. v1 either (a) migrates them to `SchemaForm` descriptors (preferred, unifies the model)
    or (b) leaves them non-editable inline. Recommend migration as a sub-task.
- **Finalize / `GradeSelector.tsx`:**
  - Each grade chip: `EditableText` label + description, `PopupEditor` (color/tint swatches +
    report hex), `DragHandle` (reorder), `RemoveButton`. `InlineAddButton` at the end of the grid.
  - Finalization-surface fields go through the same `SchemaForm` affordances as Metadata.

### 5.5 Mutation wiring
Every affordance calls the **existing** store actions — no new mutations needed:
- title/requirement/anchor/example/ai-only → `setRubricOverride(path, value)`
- add/remove/reorder question → `addRubricQuestion` / `removeRubricQuestion` / `reorderRubricQuestions`
- field label/required/enabled/order/options → `setFieldOverride` / `addOption` / `removeOption` …
- add/remove field → `addField` / `removeCustomField`
- grade label/color/description → `setGradeOverride`; add/remove → `addGrade` / `removeGrade`
- principle name/color → `setPrincipleOverride`

### 5.6 What happens to the existing editors?
They are **not deleted in v1.** They become the power-user surface (pack import/export, reset-all,
versioning, bulk review) reachable from Settings. Over time, as Edit Mode proves out, the per-field
editing inside them can be deprecated — but pack IO and reset have no natural inline home, so the
hub stays. `PackManager` and `BrandingEditor` in particular remain (branding = global tokens, not
per-element inline).

---

## 6. Phased Implementation Plan (high level)

Each phase is independently shippable and lands behind the Edit Mode flag (off by default).

### Phase 0 — Prerequisites (no Edit Mode yet, pure bug fixes)
- Fix the `RUBRIC_DATA` desync (`App.tsx:38` → `useActiveRubric()`).
- Add store subscriptions to `SchemaForm` and `GradeSelector`.
- Tests: assert the review UI reflects a customization-store override live.
- *Ship: review UI now honors existing customizations (closes the latent gap).*

### Phase 1 — Edit Mode spine
- `EditModeContext` + provider + `useEditMode()`; toggle button in `AppShell` (hidden behind a flag).
- Extend `EditableText` with `disabled`.
- The C1 guard (block during active session, or C2 banner per your decision).
- Tests: toggle on/off renders/removes the button; review flow unchanged when off.

### Phase 2 — Click-to-edit text everywhere (the quick win)
- Swap read-only spans for `EditableText` (disabled when off) across `QuestionSection` (title,
  requirement, anchors, examples), `SchemaForm` field labels/help, `GradeSelector` labels/descriptions.
- Wire each to the matching `set*Override` action.
- Tests: edit-in-place commits for each surface (reuse the rubric test pattern).
- *Ship: the "edit wording inline" half of the vision.*

### Phase 3 — Add / remove / reorder
- Build `DragHandle` (dnd-kit), `InlineAddButton`, `RemoveButton`.
- Wire reorder to `reorderRubricQuestions` / field order swaps / grade order; add/remove to the
  existing actions; confirm-gate removes.
- Tests: reorder, add-via-(+), remove-via-confirm, per surface.

### Phase 4 — Popup styling editor
- Build `PopupEditor`; host the swatch palette (reuse `GradeIdEditor`'s `COLOR_PALETTE`/`TINT_PALETTE`)
  for grades/principles, and the type/required/enabled controls for fields.
- Tests: popup opens on gear click, commits color/type changes.

### Phase 5 — Metadata field migration + polish
- Migrate hardcoded `Metadata.tsx` fields to `SchemaForm` descriptors (or decide to leave them).
- Empty/hover affordance polish; keyboard a11y pass (dnd-kit keyboard sensor, focus traps).
- Decide editor deprecation messaging.

### Phase 6 (strategic follow-up, not v1) — Per-session snapshots (C3)
- Fork-on-edit using `packId`/`packVersion`; "Publish to framework" promotion flow.

---

## 7. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Global scope** — edit on a live review mutates all reviews | **High** | Resolve via §3 (recommend C1 for v1). |
| Review-flow regression when Edit Mode is off | Med | Edit affordances gated entirely behind `editMode`; add snapshot/visual-diff tests for the off state. |
| `EditableText` inside `<details><summary>` focus/keyboard quirks | Med | Escape-stopPropagation (already done); test summary-toggle still works with an editable title. |
| dnd-kit + `<details>` reorder conflicts (drag vs expand) | Med | DragHandle is a dedicated grip; the summary stays the expand target. |
| Bundle size (dnd-kit in an extension) | Low | dnd-kit is tree-shakeable/modular; import only `core` + `sortable`. |
| Metadata hardcoded fields don't fit the schema model | Low | Phase 5 migration; or explicit out-of-scope decision. |
| PopupEditor positioning (no Popper dep) | Low | Lightweight absolute-position panel + click-outside dismiss; no new dep. |

---

## 8. Testing Strategy
- **Unit/component:** each new primitive (`DragHandle`, `InlineAddButton`, `PopupEditor`) +
  `EditableText.disabled`; each surface's edit/add/remove/reorder via the click→commit flow we
  established for the editors.
- **Regression:** a "review flow with Edit Mode OFF" test per surface asserting **no** edit affordances
  render and DOM is unchanged (guard against the off-state drifting).
- **Integration:** enter Edit Mode → edit a question title → assert customization store patch +
  live re-render.
- No new mocks; reuse the real store + `@testing-library/react` patterns already in the suite.

---

## 9. Open Questions for You

1. **Scope (§3):** C1 (design surface only — recommended), C2 (edit on live review + guardrails), or
   C3 (per-session snapshots, bigger build)? *This is the gating decision.*
2. **Entry point (§4):** Approach A (toggle on the live review) or Approach B (dedicated Design tab)?
   If you pick C1 for scope, B is the natural pairing.
3. **Metadata hardcoded fields (§5.4):** migrate them into the schema in Phase 5, or leave them
   non-editable inline?
4. **Editors' fate (§5.6):** keep the Settings hub indefinitely (pack IO / branding), or plan to
   deprecate the per-element editors once Edit Mode is mature?
5. **dnd-kit dependency:** comfortable adding `@dnd-kit/core` + `@dnd-kit/sortable` (~small,
   tree-shakeable) for reorder, or prefer a lighter custom pointer-based reorder first?

---

## 10. References
- PatternFly — Inline Edit design guidelines: https://www.patternfly.org/components/inline-edit/design-guidelines
- UI-Patterns — In-place Editor: https://ui-patterns.com/patterns/InplaceEditor
- "Designing Web Interfaces" — the six in-page editing patterns (O'Reilly):
  https://www.oreilly.com/library/view/designing-web-interfaces/9780596155353/ch01.html
- Microsoft — WYSIWYG model-driven form designer:
  https://www.microsoft.com/en-us/power-platform/blog/2018/12/18/introducing-the-new-wysiwyg-model-driven-form-designer-public-preview/
- dnd-kit (modern React DnD default; react-beautiful-dnd abandoned):
  https://dndkit.com/react/guides/sortable-state-management
- Schema-driven React form builders (pattern reference, not dependency): SurveyJS
  https://surveyjs.io/react-form-builder ; coltorapps Builder https://builder.coltorapps.com/
