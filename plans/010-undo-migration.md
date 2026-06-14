# Plan 010: undo-delete union merge + migration robustness

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat b5554b5..HEAD -- stores/session.ts lib/migrations.ts`

## Status
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `b5554b5`, 2026-06-14

## Why this matters
Two correctness gaps. (1) `undoDeleteCapture` restores evidence links by *replacing* each rubric's `explicitEvidenceIds` with the pre-delete snapshot — so any link added to that rubric during the 5-second undo window is silently lost. (2) `runMigrations` mutates the IDB-loaded object in place and unconditionally stamps `schemaVersion` forward, so opening a future-version session in an older extension silently downgrades and drops fields. Both are narrow but real data-integrity issues.

## Current state
- `stores/session.ts:154-160` — `removeCapture` snapshots `evidenceLinks[e.rubricId] = e.explicitEvidenceIds` (the full array).
- `stores/session.ts:229-237` — `undoDeleteCapture` restores `explicitEvidenceIds: originalIds` (full-array replace). If a different capture was linked to the same rubric in the window, that link is overwritten.
- `stores/session.ts:32-37` — the `recentlyDeleted` item type declares `evidenceLinks` (read it; currently `Record<string, string[]>`).
- `lib/migrations.ts:10-23` — v1→v2 mutates `data.finalization`; v2→v3 mutates `data.metadata.discipline` in place.
- `lib/migrations.ts:36` — `current.schemaVersion = CURRENT_SCHEMA_VERSION` runs unconditionally (no downgrade guard).
- `tests/migration.test.ts:94-105` — documents the missing downgrade protection.
- `tests/store.test.ts` — existing store tests (model new undo cases here).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- store` then `pnpm test -- migration` | all pass |
| Full | `pnpm test` | all pass |

## Scope
**In scope**: `stores/session.ts`, `lib/migrations.ts`, `tests/store.test.ts`, `tests/migration.test.ts`.
**Out of scope**: `stores/registry.ts`, `lib/session-repository.ts`, the `SessionState` interface signature (only the `recentlyDeleted` item field type changes).

## Git workflow
- One commit: `fix: undo-delete preserves new evidence links; guard migration downgrade`

## Steps

### Step 1: Change the undo snapshot to track rubric ids only
In `stores/session.ts`, the `recentlyDeleted` item's `evidenceLinks` should store just the rubric ids that referenced the deleted capture (not full arrays). Update the type (lines ~32-37): change `evidenceLinks` from `Record<string, string[]>` to `string[]`.

In `removeCapture` (lines 154-160), build a list of rubric ids:
```ts
const linkedRubricIds: string[] = [];
for (const e of state.evaluations) {
  if (e.explicitEvidenceIds.includes(id)) linkedRubricIds.push(e.rubricId);
}
```
and store `linkedRubricIds` in the `recentlyDeleted` entry (rename `evidenceLinks` → `linkedRubricIds` in the entry at line 184).

### Step 2: Undo by union-merging the restored id
In `undoDeleteCapture` (lines 229-237), for each rubric in `last.linkedRubricIds`, add the restored capture's id back only if absent (preserving any links added during the window):
```ts
const evals = s.evaluations.map((e) => {
  if (last.linkedRubricIds.includes(e.rubricId)) {
    return e.explicitEvidenceIds.includes(last.capture.id)
      ? e
      : { ...e, explicitEvidenceIds: [...e.explicitEvidenceIds, last.capture.id] };
  }
  return e;
});
```
**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Add an undo test
In `tests/store.test.ts`, add a case: seed a session with capture A linked to rubric R; delete A; then link capture B to rubric R (via `linkCaptureToRubric`); then `undoDeleteCapture()`. Assert R's `explicitEvidenceIds` now contains BOTH A and B (not just A).

**Verify**: `pnpm test -- store` → all pass, including the new case.

### Step 4: Guard migration downgrade + stop mutating input
In `lib/migrations.ts`, change `runMigrations` to (a) short-circuit on future versions and (b) avoid mutating the caller's object:
```ts
export function runMigrations(data: SessionData): SessionData {
  const startVersion = data.schemaVersion ?? 1;
  if (startVersion >= CURRENT_SCHEMA_VERSION) {
    return startVersion === CURRENT_SCHEMA_VERSION ? data : { ...data, schemaVersion: CURRENT_SCHEMA_VERSION };
  }
  let current = data;
  for (let v = startVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations.get(v);
    if (migrate) current = migrate(current);
  }
  current.schemaVersion = CURRENT_SCHEMA_VERSION;
  return current;
}
```
Wait — `startVersion >= CURRENT_SCHEMA_VERSION` with the inner check handles the downgrade case: if `startVersion > CURRENT`, return data unmodified (do NOT stamp). If equal, return as-is. Fix the guard to NOT stamp on downgrade:
```ts
  if (startVersion > CURRENT_SCHEMA_VERSION) return data;   // future-version data: leave untouched
  if (startVersion === CURRENT_SCHEMA_VERSION) return data;
```
Also make each migration non-mutating on nested fields:
- v1→v2: `data.finalization = data.finalization ?? null;` → `return { ...data, finalization: data.finalization ?? null };` (drop the in-place assign + return data).
- v2→v3: replace `data.metadata.discipline = [d]` with `return { ...data, metadata: { ...data.metadata, discipline: [d] } }` (and the undefined branch likewise).

**Verify**: `pnpm typecheck` → exit 0.

### Step 5: Add a downgrade test
In `tests/migration.test.ts`, add: a session with `schemaVersion = 99` (future) passed to `runMigrations` returns unchanged with `schemaVersion` still 99 (not stamped to CURRENT). Model after the existing case at lines 94-105 but flip the assertion.

**Verify**: `pnpm test -- migration` → all pass.

### Step 6: Commit
**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all exit 0. Commit.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] Undo test proves new links survive an undo
- [ ] Downgrade test proves future-version data is not stamped
- [ ] Migrations no longer mutate nested fields of the input
- [ ] No files outside in-scope modified

## STOP conditions
- The `recentlyDeleted` type is shared/used elsewhere in a way that breaks when `evidenceLinks` → `linkedRubricIds` → report all sites; do not change unrelated behavior.
- An existing migration test asserts on in-place mutation reference identity → report it (the new behavior intentionally returns a new object).
