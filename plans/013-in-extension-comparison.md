# Plan 013: In-extension tool comparison (Direction A)

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat a7c2257..HEAD -- components/SessionManager.tsx lib/session-lifecycle.ts lib/report/compute-scores.ts`

## Status
- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 007 (lifecycle hardening — same file `lib/session-lifecycle.ts`)
- **Category**: direction (feature)
- **Planned at**: commit `a7c2257`, 2026-06-14

## Why this matters
Librarians evaluate 4–8 tools per cycle and must present side-by-side comparisons. Today the only comparison surface is the marketing site's Compare page (`site/script.js:90-287`), which requires exporting ZIPs, opening a website, and re-uploading. The extension already holds every session in IndexedDB and already ships batch export — comparison belongs in the session list, one click away. The site's data shape (`extractPrincipleScores`, `computeTotal`, best-score highlighting) is proven and directly portable.

## Current state
- `site/script.js:129-287` — the reference implementation: `parseZip` → `extractPrincipleScores` (group evaluations by rubricId prefix TR/RE/US/SE/TC, average numeric scores) → `computeTotal` → `renderCompare` (verdict row, score row, per-principle rows with best-highlight, strengths/weaknesses).
- `lib/report/compute-scores.ts` — the extension ALREADY computes per-principle category averages (`catScores`) and totals. Reuse it; do not re-implement `extractPrincipleScores`.
- `lib/session-lifecycle.ts` — `exportSessionById`/`exportAllSessions` show the pattern for loading sessions from IDB by ID.
- `components/SessionManager.tsx` — session list with per-card actions (export, switch, delete). Add a selection mode + "Compare selected" action here.
- `lib/rubric.ts` — principle metadata (ids, colors via `lib/principles.ts`).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Check | `pnpm check` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope
**In scope**: `lib/session-lifecycle.ts` (add `buildSessionComparison`), `components/SessionManager.tsx` (selection mode + compare trigger), `components/CompareModal.tsx` (new), `lib/types.ts` (add a `SessionComparison` type if needed), `tests/` (new test file).
**Out of scope**: `site/` (do not change the website), `lib/report/compute-scores.ts` (reuse, don't modify), the export pipeline.

## Git workflow
- Branch: work on `main`.
- One commit: `feat(compare): in-extension side-by-side tool comparison`

## Design

### Data: `buildSessionComparison(ids: string[])` in `lib/session-lifecycle.ts`
Loads each session from the repository, and for each returns:
```ts
interface ComparisonEntry {
  id: string;
  toolName: string;
  toolUrl: string;
  verdict: string;              // finalization.grade or ""
  conclusion: string;
  strengths: string[];
  weaknesses: string[];
  principleAverages: Record<string, number | null>;  // { TR, RE, US, SE, TC }
  total: { actual: number; max: number; answered: number };
}
```
Compute `principleAverages` and `total` by calling the existing `computeReportScores` (or the relevant function in `lib/report/compute-scores.ts` — read it to get the exact function name and return shape) against each session's evaluations + the rubric. Do NOT re-implement the per-principle averaging. If a session has no evaluations, averages are `null` and total is `{0,0,0}`.

### UI: selection mode in `SessionManager.tsx`
- Add a "Compare" toggle button to the SessionManager header. When active, each session card shows a checkbox (selectable); the header shows "Compare N selected" with a "Show comparison" button (enabled when ≥2 selected).
- "Show comparison" opens `<CompareModal entries={...} />`.

### UI: `components/CompareModal.tsx`
A modal (model after `components/ConfirmDialog.tsx` or `EvidenceModal.tsx` for the overlay pattern) rendering a table:
- Header row: criterion + one column per tool.
- Verdict row, Score (actual/max) row.
- Per-principle rows (TR/RE/US/SE/TC) using `lib/principles.ts` colors; highlight the best (max) value across selected tools when ≥2 tools (match `site/script.js:265-273`).
- Strengths and weaknesses rows (line lists).
All user-controlled strings (toolName, conclusion, strengths, weaknesses) rendered as React text children (NOT dangerouslySetInnerHTML) — the site used HTML strings with an `esc()` helper, but React auto-escapes, so just use `{value}`.

## Steps

### Step 1: Add `buildSessionComparison` + type
Add the `ComparisonEntry` type to `lib/types.ts`. Implement `buildSessionComparison` in `lib/session-lifecycle.ts`, reusing `computeReportScores` (read `lib/report/compute-scores.ts` first to confirm the exported function name and that it returns per-principle averages). Load each session via `getRepository().load(id)`; skip null sessions.
**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Add `CompareModal.tsx`
Create `components/CompareModal.tsx` per the Design. Use existing Tailwind tokens / `lib/principles.ts` for principle colors. Close on overlay click + Escape (model the key-handling on an existing modal).
**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Wire selection + trigger into `SessionManager.tsx`
Add the compare toggle, per-card checkboxes (only visible in compare mode), the "Show comparison" button (≥2 selected), and render `<CompareModal>` when open.
**Verify**: `pnpm typecheck && pnpm check` → exit 0.

### Step 4: Tests
Create `tests/compare.test.ts`:
1. `buildSessionComparison` with 2 fixture sessions returns correct principleAverages and totals (model fixtures on `tests/fixtures/index.ts`).
2. A session with no evaluations yields `null` averages and `{0,0,0}` total.
3. Best-value detection: given entries, the modal's best-per-row logic picks the max (test the pure helper, not the DOM).

Add a `tests/compare-modal.test.tsx` rendering the modal with 2 entries and asserting the table has the right column count and a best-highlight cell (model on `tests/evidence-modal.test.tsx`).
**Verify**: `pnpm test -- compare` → all pass; `pnpm test` → all pass.

### Step 5: Build + commit
**Verify**: `pnpm build` → exit 0. Commit.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm check`, `pnpm test`, `pnpm build` all exit 0
- [ ] `buildSessionComparison` reuses `computeReportScores` (no re-implemented averaging)
- [ ] CompareModal renders verdict/score/per-principle/strengths/weaknesses with best-highlight
- [ ] No `dangerouslySetInnerHTML` (React text escaping only)
- [ ] New tests pass; existing tests unaffected

## STOP conditions
- `computeReportScores` (or the equivalent in compute-scores.ts) doesn't cleanly expose per-principle averages → report; do not duplicate scoring logic — adjust the call site or ask.
- SessionManager's structure has changed such that a selection mode can't be added cleanly → report; consider a separate compare entry point rather than forcing it.
- Best-highlight logic can't be extracted to a pure helper → report.
