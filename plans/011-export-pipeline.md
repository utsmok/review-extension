# Plan 011: Export pipeline cleanup — font asset, ?raw test fidelity, reuse computed ReportModel

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat b5554b5..HEAD -- lib/html-report.ts lib/report-heading-font.ts lib/export-pipeline.ts vitest.config.ts`

## Status
- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but the `?raw` test-fidelity fix in Step 2 should land before the font move in Step 1 is judged by tests)
- **Category**: tech-debt, perf
- **Planned at**: commit `b5554b5`, 2026-06-14

## Why this matters
Three issues in the export/report path. (1) A 28 KB base64 font is committed as a single `.ts` source line — opaque in diffs, parsed by tsc, while the source `.woff2` already exists. (2) `import x from "./report.css?raw"` resolves to an EMPTY string under vitest's jsdom, so `tests/report-generate.test.ts` dumps unstyled HTML to `report-dev/audit/` — useless for visual review. (3) During a single export, `qualityGateResults` and `principleAverage` are re-invoked 3–5× with identical inputs inside the HTML template functions, when the already-built `ReportModel` holds the same data.

## Current state
- `lib/report-heading-font.ts:1-6` — entire file is `export const REPORT_HEADING_FONT_FACE = "@font-face{...28KB base64...}"`. Comment says "Regenerate from `report-dev/fonts/roboto-condensed-bold.woff2`".
- `lib/html-report.ts:23` — `import reportCss from "./report.css?raw";` and `:24` `import { REPORT_HEADING_FONT_FACE } from "./report-heading-font";`. Line 26: `export const REPORT_CSS = reportCss;`. Line 28: `const REPORT_STYLE = REPORT_HEADING_FONT_FACE + reportCss;`.
- `lib/html-report.ts:~400,444,586,600-602,655` — `qualityGateResults(...)` / `principleAverage(...)` called inside `buildNutritionLabelHtml`, `buildBusinessCardLabelHtml`, and the main report builder, redundantly with `buildReportModel` (which already computes them).
- `lib/export-pipeline.ts:262-268` — inside `captures.map()`, an IIFE loops all `evaluations` calling `.includes(c.id)` → O(C×E).
- `vitest.config.ts` — no special handling for `?raw` CSS imports.
- `tests/html-report-snapshot.test.ts` + `tests/__snapshots__/html-report-snapshot.test.ts.snap` (271 KB) — the safety net: report HTML must stay byte-identical after refactor.

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- html-report` | all pass |
| Snapshot | `pnpm test -- html-report-snapshot` | pass (no snapshot drift) |
| Full | `pnpm test` | all pass |

## Scope
**In scope**: `lib/report-heading-font.ts` (delete) + new `lib/report-heading-font.txt`, `lib/html-report.ts`, `lib/export-pipeline.ts`, `vitest.config.ts`, `tests/report-generate.test.ts` (only if needed for the `?raw` assertion).
**Out of scope**: `lib/report/compute-scores.ts`, `lib/report-model.ts` internals, `lib/report.css`.

## Git workflow
- One commit: `refactor(report): move font blob to raw asset, fix ?raw test fidelity, reuse computed model`

## Steps

### Step 1: Move the font blob to a `?raw` text asset
- Create `lib/report-heading-font.txt` containing exactly the `@font-face{...}` string currently in `lib/report-heading-font.ts:6` (the value of `REPORT_HEADING_FONT_FACE`, without quotes or trailing semicolon).
- In `lib/html-report.ts:24`, replace the named import with a raw import:
  ```ts
  import reportHeadingFontFace from "./report-heading-font.txt?raw";
  ```
  and update line 28 to use it: `const REPORT_STYLE = reportHeadingFontFace + reportCss;`. Remove the now-unused `REPORT_HEADING_FONT_FACE` symbol if nothing else imports it (search first — it is only imported at html-report.ts:24).
- Delete `lib/report-heading-font.ts`.

**Verify**: `pnpm typecheck` → exit 0. `pnpm build` → exit 0 (the built report must still embed the font).

### Step 2: Make `?raw` imports resolve under vitest (fixes REPORT_CSS + the new font import)
In `vitest.config.ts`, add `server.deps.inline` so Vite serves raw asset imports to the test environment. Inside `test:`:
```ts
server: { deps: { inline: [/report\.css$/, /report-heading-font\.txt$/] } },
```
If that does not resolve the empty-string issue, the alternative is to set `test: { deps: { optimizer: { web: true } } }` or add the files to `assetsInclude`. Confirm with a test assertion.

Then in `tests/report-generate.test.ts` (or `tests/html-report-utils.test.ts`), add/adjust an assertion that `REPORT_CSS` is non-empty (length > 1000). If a test already exists asserting emptiness, flip it.

**Verify**: `pnpm test -- html-report-utils` → REPORT_CSS is non-empty. `pnpm test -- html-report-snapshot` → still passes (snapshot may now include the real CSS + font — if it drifts, it is a CORRECT improvement; update the snapshot with `pnpm test -- html-report-snapshot -u` and verify the diff is only the previously-empty `<style>` now being populated).

### Step 3: Pre-build a capture→rubric lookup for captureLogCsv
In `lib/export-pipeline.ts` before the `captures.map()` (around line 252), build the inverse map once:
```ts
const captureToRubrics = new Map<string, string[]>();
for (const e of evaluations) {
  for (const cid of e.explicitEvidenceIds) {
    const arr = captureToRubrics.get(cid);
    if (arr) arr.push(e.rubricId); else captureToRubrics.set(cid, [e.rubricId]);
  }
}
```
Then in the map, `Tagged_Rubric_IDs: (captureToRubrics.get(c.id) ?? []).join("; ")`.

**Verify**: `pnpm test -- export` → all pass (CSV output unchanged).

### Step 4: Reuse the computed ReportModel in template functions
Read `lib/html-report.ts` to find every call to `qualityGateResults(...)` and `principleAverage(...)` inside `buildNutritionLabelHtml`, `buildBusinessCardLabelHtml`, and the main report builder. The `ReportModel` returned by `buildReportModel` already holds the computed results (check `lib/report-model.ts` for the exact field names — likely `qualityGateRows` and per-principle scores in `scores`). Thread the model (or its relevant fields) into the template functions and delete the redundant re-computations.

This is a refactor with no behavior change — the **snapshot test is the gate**. If the snapshot test does not exist or does not cover all three report variants (full, nutrition-label, business-card), add coverage first.

**Verify**: `pnpm test -- html-report` → all pass. `pnpm test -- html-report-snapshot` → passes with NO snapshot update (identical output proves behavior is unchanged). If the snapshot must change, STOP — that means the refactor altered output.

### Step 5: Commit
**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all exit 0. Commit.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] `lib/report-heading-font.ts` deleted; font sourced via `?raw` from `.txt`
- [ ] REPORT_CSS is non-empty under vitest (test asserts it)
- [ ] `html-report-snapshot` passes with byte-identical output (no `-u` needed for the model-reuse refactor)
- [ ] `captureLogCsv` no longer does O(C×E) work
- [ ] No files outside in-scope modified

## STOP conditions
- The `?raw` import still resolves empty under vitest after Step 2's config changes → STOP and report (do not mock the value; the goal is real fidelity). Consider whether the WXT vitest plugin intercepts the query.
- Reusing the ReportModel changes the report HTML output (snapshot drifts) → STOP; the template functions may depend on a side effect or slightly different inputs. Report the divergence rather than forcing the snapshot.
- `REPORT_HEADING_FONT_FACE` is imported anywhere besides `html-report.ts:24` → report the extra site before deleting the file.
