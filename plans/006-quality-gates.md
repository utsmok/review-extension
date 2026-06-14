# Plan 006: Enforce quality gates (coverage, lint-as-error, format) in CI and release

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report — do not improvise. Commit your work per the Git workflow section.
>
> **Drift check (run first)**: `git diff --stat b5554b5..HEAD -- .github/workflows/ci.yml biome.json scripts/release.mjs`
> If any in-scope file changed, compare excerpts against live code first.

## Status
- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `b5554b5`, 2026-06-14

## Why this matters
The repo defines coverage thresholds (75/75/80/80) and four correctness/a11y lint rules, but neither is enforced: CI runs `pnpm test` (no coverage) and `pnpm lint` (Biome exits 0 on `warn`-level diagnostics). Format drift is also unchecked (CI runs `lint`, not `check`). Coverage can silently regress and lint violations accumulate with zero signal. This plan closes those gaps so every later change is actually gated.

## Current state (revised after measurement)
- `.github/workflows/ci.yml:27` runs `pnpm lint`; line `29` runs `pnpm test`.
- `package.json:17` defines `test:coverage` (`vitest run --coverage`); `package.json:23` defines `check` (`biome check .`).
- `biome.json:29-43` sets `noUnusedVariables`, `noUnusedImports` (correctness), `noExplicitAny` (suspicious), `useButtonType` (a11y) all to `"warn"`.
- `vitest.config.ts:14-18` defines thresholds statements:75, branches:75, functions:80, lines:80 — but **actual coverage measured on HEAD is Statements 73.27%, Branches 66.51%, Functions 66.22%, Lines 75.04%**. The configured thresholds are aspirational and unmet; enforcing them as-is breaks CI. This plan RATCHETS the thresholds to current levels and enforces them (no-regression protection now; raising them is future work).
- `scripts/release.mjs:58-62` gate runs `wxt prepare → typecheck → test → build` (no lint/check).
- Confirmed on HEAD: `pnpm lint` reports 0 warnings, so flipping warn→error is safe on current code.
## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Lint (strict) | `pnpm lint` | exit 0 |
| Coverage | `pnpm test:coverage` | exit 0, all thresholds met |
| Typecheck | `pnpm typecheck` | exit 0 |

## Scope
**In scope**: `.github/workflows/ci.yml`, `biome.json`, `scripts/release.mjs`, `vitest.config.ts` (ratchet thresholds).
**Out of scope**: any source file.

## Git workflow
- Branch: work on `main` (operator authorized direct commits).
- One commit: `chore(ci): enforce coverage, strict lint, and format in CI and release gate`
- Conventional-commit style (match repo: `chore(scope): ...`).

## Steps

### Step 1: Flip the four Biome rules to error
In `biome.json`, change these four values from `"warn"` to `"error"`:
- `correctness.noUnusedVariables`
- `correctness.noUnusedImports`
- `suspicious.noExplicitAny`
- `a11y.useButtonType`

Leave the other rules (`noUnknownAtRules: off`, `useSemanticElements: off`, `noStaticElementInteractions: off`, `noImportantStyles: off`) unchanged.

**Verify**: `pnpm lint` → exit 0 (no violations on current code).

### Step 2: Ratchet coverage thresholds to current levels, then enforce in CI
In `vitest.config.ts:15-18`, set the thresholds to just below the measured current coverage (a no-regression ratchet; raising them is future work):
```ts
thresholds: {
  statements: 73,
  branches: 66,
  functions: 66,
  lines: 75,
},
```
Add a trailing comment: `// ratchet: raise as coverage improves — was aspirational 75/75/80/80, unenforced`.

Then in `.github/workflows/ci.yml`, in the `check` job:
- Change `- run: pnpm lint` → `- run: pnpm check`
- Change `- run: pnpm test` → `- run: pnpm test:coverage`

**Verify**: `pnpm check` → exit 0; `pnpm test:coverage` → exit 0 with all 4 ratcheted thresholds met (statements ≥73, branches ≥66, functions ≥66, lines ≥75).

### Step 3: Add lint+check to the release gate
In `scripts/release.mjs`, in the local-gate try block (lines ~58-62), add `pnpm check` after `pnpm typecheck`:
```
execSync("pnpm wxt prepare", { stdio: "inherit" });
execSync("pnpm typecheck", { stdio: "inherit" });
execSync("pnpm check", { stdio: "inherit" });
execSync("pnpm test", { stdio: "inherit" });
execSync("pnpm build", { stdio: "inherit" });
```
(Keep `pnpm test` not `test:coverage` in the release gate — coverage is CI's job; release just needs green tests.)

**Verify**: `pnpm check` → exit 0.

### Step 4: Commit
Commit all three files with the message above.

**Verify**: `git status` → clean working tree; `git log -1 --oneline` shows the commit.

## Done criteria
- [ ] `pnpm lint` exits 0 with the four rules at `error`
- [ ] `pnpm check` exits 0
- [ ] `pnpm test:coverage` exits 0 and prints all four thresholds met
- [ ] `ci.yml` runs `pnpm check` and `pnpm test:coverage`
- [ ] `release.mjs` gate includes `pnpm check`
- [ ] No files outside the in-scope list modified

## STOP conditions
- `pnpm lint` reports violations after Step 1 → STOP (do not sweep-fix unrelated code; report which files/lines so the reviewer can decide).
- `pnpm test:coverage` falls below the RATCHETED thresholds (73/66/66/75) → STOP and report which metric and the gap. Do NOT lower the ratchet further to make it pass; report so the reviewer can decide (the gap likely means a real regression introduced by this or a prior change).
