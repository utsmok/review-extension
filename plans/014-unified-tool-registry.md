# Plan 014: Unified tool registry (Direction C)

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat a7c2257..HEAD -- lib/tool-profiles.ts site/data/tools.csv site/script.js`

## Status
- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (feature)
- **Planned at**: commit `a7c2257`, 2026-06-14

## Why this matters
Tool data exists in two divergent sources: `lib/tool-profiles.ts` (15 tools, hostnames + defaults + category, used by the extension for auto-detection) and `site/data/tools.csv` (12 tools, scores + verdict + status, used by the marketing site's Tools table + Compare). They don't agree — profiles has Scopus/Web of Science that the CSV marks "nominated"; the CSV has Perplexity/ChatGPT/Gemini/Copilot/You.com that profiles lacks. A single registry, consumed by both the extension (build-time import) and the site (fetch), kills the drift and lets the extension surface "recently reviewed" tools.

## Current state
- `lib/tool-profiles.ts:1-14` — `ToolProfile` interface: `{ hostnames, defaults: {company, usesAi, dataSources, searchMethods, discipline, pricing, availability, authenticationMethod}, category }`. 15 entries (`TOOL_PROFILES`), `detectToolProfile(url)` matches by hostname.
- `site/data/tools.csv:1-12` — columns: `tool_name,category,tool_url,verdict,tr_score,re_score,us_score,se_score,tc_score,total,total_max,status,notes`. 11 data rows (done/nominated/in-progress).
- `site/script.js:32-88` — `loadTools()` fetches `data/tools.csv`, parses with Papaparse, renders the Tools table.
- Divergence confirmed: profiles has Scopus (`scopus.com`) + WoS (`webofscience.com`); CSV lists both as `nominated` with zero scores. CSV has Perplexity/ChatGPT/Gemini/Copilot/You.com; profiles has some of these (verify by reading the full `TOOL_PROFILES`).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Check | `pnpm check` | exit 0 |
| Tests | `pnpm test` | all pass |
| Build | `pnpm build` | exit 0 |

## Scope
**In scope**: new `data/tools/registry.json`, new `data/tools/index.ts`, `lib/tool-profiles.ts` (refactor to source from registry), `site/script.js` (load from registry), `site/index.html` (if the tools table source path changes), `site/data/tools.csv` (delete or keep as export-only — see Step 4), `tests/tool-profiles.test.ts` (update).
**Out of scope**: the extension's session UI, the rubric, scoring.

## Git workflow
- One commit: `feat(tools): unify extension + site tool data into a shared registry`

## Design

### Schema: `data/tools/registry.json`
Merge both sources into one array. Each entry:
```jsonc
{
  "name": "Semantic Scholar",
  "category": "academic_search",            // matches ToolProfile.category union
  "url": "https://www.semanticscholar.org",
  "hostnames": ["semanticscholar.org"],      // detection (from profiles); [] if none
  "defaults": { "company": "...", "usesAi": false, "dataSources": [], "searchMethods": [], "discipline": [], "pricing": "", "availability": "", "authenticationMethod": "" },
  "review": {                                // from CSV; null/absent if not yet reviewed
    "verdict": "recommended",
    "scores": { "TR": 2.5, "RE": 3.0, "US": 2.5, "SE": 2.5, "TC": 3.0 },
    "total": 38, "totalMax": 42, "status": "done", "notes": "..."
  }
}
```
- Union the tool sets: every tool in EITHER source appears once, keyed by normalized `url` host.
- For tools only in `tool-profiles.ts`: include hostnames + defaults, omit `review`.
- For tools only in `tools.csv`: include url + review; set hostnames from the url host (so detection still works), defaults empty.

### `data/tools/index.ts`
```ts
import registry from "./registry.json";
export interface ToolRegistryEntry { /* the schema above */ }
export const TOOL_REGISTRY: ToolRegistryEntry[] = registry as ToolRegistryEntry[];
```

### `lib/tool-profiles.ts` refactor
Keep the public API (`ToolProfile`, `TOOL_PROFILES`, `detectToolProfile`) stable so callers (NewSessionModal) are unaffected. Derive `TOOL_PROFILES` from `TOOL_REGISTRY`:
```ts
export const TOOL_PROFILES: ToolProfile[] = TOOL_REGISTRY
  .filter((t) => t.hostnames.length > 0)
  .map((t) => ({ hostnames: t.hostnames, defaults: t.defaults, category: t.category }));
```
`detectToolProfile` stays as-is.

### `site/script.js`
Change `loadTools()` to fetch `data/tools/registry.json` (or a built `registry.csv` — but JSON is simpler). Render the Tools table from registry entries; rows with no `review` show "Not yet reviewed". Best to also add a small JSON→row adapter rather than rewriting the render.

## Steps

### Step 1: Build `data/tools/registry.json`
Read the full `lib/tool-profiles.ts` (all 15 entries) and `site/data/tools.csv` (11 rows). Construct the merged JSON per the schema. Union by URL host. Preserve all existing detection hostnames and all existing review scores. This is data entry — be exact.
**Verify**: `pnpm typecheck` → exit 0 (after Step 2 creates the index).

### Step 2: `data/tools/index.ts` + refactor `lib/tool-profiles.ts`
Create the index module. Refactor `tool-profiles.ts` to derive `TOOL_PROFILES` from the registry (keep `ToolProfile` interface and `detectToolProfile` unchanged). Delete the hardcoded array.
**Verify**: `pnpm typecheck` → exit 0; `pnpm test -- tool-profiles` → existing detection tests still pass.

### Step 3: Update `site/script.js` `loadTools()`
Fetch `data/tools/registry.json`, map entries to table rows. Keep the existing render (`scorePill`, status badges). Rows without `review` render with muted "Not yet reviewed" and no score pills.
**Verify**: `pnpm build` → exit 0 (site isn't built by `pnpm build`, but confirm no JS syntax errors via `node --check site/script.js`).

### Step 4: Retire `site/data/tools.csv`
After confirming the site reads from the registry, delete `tools.csv`. (If any other consumer fetches it — search first — keep it as a generated export instead.)
**Verify**: search for `tools.csv` references → only historical/none.

### Step 5: Tests + commit
Update `tests/tool-profiles.test.ts`: detection still works for known hostnames; add a case that a registry-only tool (e.g. a CSV-only entry with a host) is detectable. Add `tests/tool-registry.test.ts` asserting the registry is well-formed (every entry has name+url+category; scores sum matches total where present).
**Verify**: `pnpm typecheck && pnpm check && pnpm test` → all exit 0. Commit.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm check`, `pnpm test`, `pnpm build` all exit 0
- [ ] `data/tools/registry.json` is the single source; `tool-profiles.ts` derives from it
- [ ] `detectToolProfile` behavior unchanged (existing tests pass)
- [ ] Site Tools table renders from the registry
- [ ] `tools.csv` removed (or documented as generated)
- [ ] New registry well-formedness test passes

## STOP conditions
- The CSV and profiles disagree on a tool's category or URL in a way that can't be reconciled by a rule → report the conflict; do not silently pick one.
- Another consumer fetches `tools.csv` that you can't migrate → keep the CSV as a generated artifact and report.
- `site/script.js` fetch path can't be changed without a build step the repo doesn't have → report (the site is static; a JSON fetch should drop in for the CSV fetch).
