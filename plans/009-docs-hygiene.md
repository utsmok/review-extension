# Plan 009: Codebase hygiene — fix stale docs, drop vestigial `preferredRubric`, reconcile plans index

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat b5554b5..HEAD -- CLAUDE.md stores/registry.ts lib/types.ts README.md docs/AUDIT-ARCHITECTURE.md`

## Status
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs, tech-debt
- **Planned at**: commit `b5554b5`, 2026-06-14

## Why this matters
CLAUDE.md (read by every AI coding session) cites 7 renamed/deleted files; `stores/registry.ts` documents itself as IndexedDB when it's localStorage; `preferredRubric` is a Settings field that no runtime code reads, yet it's persisted, exported, and carried through ~8 test fixtures; the `plans/README.md` marks five plans TODO that actually shipped (001/002/003/005) or were abandoned (004). These are low-effort fixes that stop misleading every future contributor and agent.

## Current state
- `CLAUDE.md:59-71` — `lib/` section lists: `session-storage.ts` (actual `session-repository.ts`), `migration.ts` (actual `migrations.ts`), `capture.ts` (actual `capture/index.ts` + `browser.ts`/`sanitize.ts`/`extract.ts`), `scoring.ts` (actual `report/compute-scores.ts`), `hooks.ts` (does not exist), `filename.ts` (does not exist). Missing actual files: `export-pipeline.ts`, `report-model.ts`, `image-convert.ts`, `tool-profiles.ts`, `report-heading-font.ts`.
- `stores/registry.ts:5-9` — doc comment says "persisted to IDB" and "IDB is accessible to extensions sharing the same origin." Actual: `persist` with `name: "trust-review-registry"`, no custom `storage` → Zustand default = **localStorage**.
- `lib/types.ts:9` — `preferredRubric: string` in `Settings`. `stores/registry.ts:40` defaults `"trust-full"`. `stores/registry.ts:15,26` comments mention "rubric preference".
- The custom `merge` (`stores/registry.ts:85-96`) spreads `...persisted.settings` — so removing the field from the type/default is NOT enough; old localStorage would resurrect it. The merge must actively drop it.
- `README.md:12` — test badge says "575 passing"; actual is ~757.
- `docs/AUDIT-ARCHITECTURE.md:56` — registry diagram says "(IDB)"; `:280-286` quotes coverage thresholds 65/60/70/65 (actual 75/75/80/80).
- Test fixtures carrying `preferredRubric: "trust-full"` (must remove): `tests/active-session-hook-coverage.test.tsx:110`, `tests/active-session-hook.test.ts:35`, `tests/active-session.test.tsx:118`, `tests/import-session-zip-file.test.ts:56`, `tests/labs-settings.test.tsx:16`, `tests/metadata.test.tsx:128`, `tests/question-section.test.tsx:123`, `tests/registry.test.ts:21` (and assertion at `:120`).
- `plans/README.md` — status table marks 001–005 all TODO.

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test` | all pass |
| Grep | (use search tool) `preferredRubric` → no matches in `lib/`, `stores/`, `components/`, `tests/` |

## Scope
**In scope**: `CLAUDE.md`, `stores/registry.ts` (doc comment + default + merge + comments), `lib/types.ts` (Settings), the 8 test files listed above, `README.md`, `docs/AUDIT-ARCHITECTURE.md`, `plans/README.md`.
**Out of scope**: any runtime logic change; `lib/session-repository.ts`; `vitest.config.ts`.

## Git workflow
- One commit: `chore: fix stale docs, drop vestigial preferredRubric, reconcile plans index`

## Steps

### Step 1: Remove `preferredRubric` from the type and store
- `lib/types.ts:9` — delete the `preferredRubric: string;` line from `Settings`.
- `stores/registry.ts:40` — delete `preferredRubric: "trust-full",` from the default settings.
- `stores/registry.ts:15` — change comment `Global reviewer settings (name, email, rubric preference).` → `Global reviewer settings (name, email, Labs flags).`
- `stores/registry.ts:26` — change `updateSettings` comment `Shallow-merge settings fields (reviewer name, email, rubric preference).` → drop "rubric preference".

### Step 2: Drop `preferredRubric` from persisted state during merge
In `stores/registry.ts` `merge` (lines 85-96), strip the key from persisted settings so old localStorage doesn't resurrect it. Rewrite the settings merge:
```ts
merge: (persisted, current) => {
  const p = persisted as RegistryState;
  const persistedSettings = { ...(p?.settings ?? {}) } as Record<string, unknown>;
  delete persistedSettings.preferredRubric;
  return {
    ...current,
    ...p,
    settings: {
      ...current.settings,
      ...persistedSettings,
      labs: {
        ...current.settings.labs,
        ...(p?.settings?.labs ?? {}),
      },
    },
  };
},
```
**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Remove `preferredRubric` from all test fixtures
In each of the 8 files listed in "Current state", remove `preferredRubric: "trust-full",` from the settings object literals. In `tests/registry.test.ts:120`, delete the assertion `expect(settings.preferredRubric).toBe("trust-full");`.
**Verify**: `pnpm typecheck` → exit 0 (no excess-property errors); `pnpm test` → all pass.

### Step 4: Fix the registry doc comment
`stores/registry.ts:5-9` — rewrite to accurately say localStorage:
```
/**
 * Zustand registry store, persisted to localStorage via zustand/middleware
 * persist (key "trust-review-registry"). The `settings` field contains
 * reviewer name and email, stored unencrypted in localStorage. Browser
 * extension localStorage is scoped to the extension origin.
 */
```

### Step 5: Update CLAUDE.md `lib/` section (lines ~57-71)
Replace the stale file list with the current reality. Correct mapping:
- `session-storage.ts` → `session-repository.ts` — IndexedDB persistence (save/load/delete)
- `migration.ts` → `migrations.ts` — schema migrations (runMigrations, CURRENT_SCHEMA_VERSION)
- `capture.ts` → `capture/` — `index.ts` barrel, `browser.ts` (Chrome API calls), `sanitize.ts` (archivePageHtml + sanitizeArchiveHtml), `extract.ts` (logo/URL extraction)
- `scoring.ts` → `report/compute-scores.ts` — score computation
- `hooks.ts` → DELETE (does not exist)
- `filename.ts` → DELETE (does not exist)
- Add: `export-pipeline.ts` (zip/csv assembly + batch), `report-model.ts` (report data model), `html-report.ts` (standalone report builder), `image-convert.ts` (PNG/JPEG conversion), `tool-profiles.ts` (known-tool auto-detection), `report-heading-font.ts` (embedded font for reports).

### Step 6: Fix README badge + AUDIT-ARCHITECTURE.md
- `README.md:12` — change `tests-575%20passing` → `tests-757%20passing`.
- `docs/AUDIT-ARCHITECTURE.md:56` — change `(IDB)` → `(localStorage)` for the registry store line.
- `docs/AUDIT-ARCHITECTURE.md:280-286` — update quoted thresholds to `statements:75, branches:75, functions:80, lines:80`.

### Step 7: Reconcile plans/README.md
Update the status table:
- 001 Batch Export → **DONE** (shipped v0.8.1; `lib/session-lifecycle.ts:exportAllSessions`, `tests/batch-export.test.ts`)
- 002 Labs Settings → **DONE** (shipped; `hooks/useLabs.ts`, `LabsSettings` type, `tests/labs-settings.test.tsx`)
- 003 Enhanced Recommendation → **DONE** (shipped v0.8.1; `FinalizationGrade` extended, `GradeSelector.tsx`)
- 004 Principle Summaries → **REJECTED** (added `8aed436`, removed `d410513` — redundant with per-question notes)
- 005 Smart Templates → **DONE** (shipped v0.8.1; `lib/tool-profiles.ts`, `lib/test-queries.ts`)
Add rows 006–012 (this audit's plans) as TODO with their titles.

**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all exit 0. Use the search tool: `preferredRubric` → zero matches across `lib/`, `stores/`, `components/`, `tests/`.

### Step 8: Commit
Commit all changes with the message above.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] `preferredRubric` has zero matches in `lib/`, `stores/`, `components/`, `tests/`
- [ ] CLAUDE.md `lib/` section matches actual filenames; no phantom `hooks.ts`/`filename.ts`
- [ ] `stores/registry.ts` doc comment says localStorage; merge drops `preferredRubric`
- [ ] README badge says 757; AUDIT-ARCHITECTURE thresholds corrected
- [ ] `plans/README.md` reflects 001/002/003/005 DONE, 004 REJECTED, 006–012 TODO

## STOP conditions
- Removing `preferredRubric` from a test fixture causes a cascade of type errors beyond the 8 listed files → report the extra files; do not change runtime code to satisfy tests.
- A test actively asserts on `preferredRubric` behavior beyond the one at `registry.test.ts:120` → report it.
