# Plan 005: Smart Review Templates with Auto-Detection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6cafd76..HEAD -- components/NewSessionModal.tsx lib/types.ts lib/capture/ stores/registry.ts lib/session-lifecycle.ts components/Metadata.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `6cafd76`, 2026-06-12

## Why this matters

Starting a new review requires filling in tool name, URL, metadata fields, and planning what to test. Currently the user does this manually every time. Two things make this slow: (1) metadata entry for known tools is repetitive, and (2) there's no guidance on what to test or how to structure the evaluation. This plan adds smart auto-detection of the current tool and a template system that pre-fills metadata and suggests test queries based on the tool being evaluated.

## Current state

- `components/NewSessionModal.tsx:26-41` — Auto-detects tool name, URL, and favicon from the current tab via `captureCurrentPageInfo()`. Only 3 fields: `toolName`, `toolUrl`, `usesAi`.
- `lib/types.ts:13-40` — `SessionMetadata` has ~20 fields including `dataSources`, `searchMethods`, `discipline`, `company`, `pricing`, `availability`, etc. All set to empty defaults.
- `components/Metadata.tsx` — Full metadata form with all these fields. User fills them in manually.
- `lib/capture/` — The capture module (archived HTML capture system). Currently only captures screenshots and page HTML.
- `stores/registry.ts:12` — `sessionIndex` holds all sessions with their metadata.
- `lib/session-lifecycle.ts:216-224` — `createSession(metadata)` creates a new session from `SessionMetadata`.

The auto-detection already works for name/URL/favicon. The gap is: no detection of tool category, no pre-fill of metadata fields, no suggestion of test queries.

## Design approach

Instead of asking the user to manually fill a test protocol form, we:

1. **Detect known tools** by matching the current tab's hostname against a local registry of ~15 common academic search tools (Semantic Scholar, Elicit, Consensus, ai2 Asta, Google Scholar, Web of Science, Scopus, PubMed, etc.).
2. **Auto-fill metadata** from the detected tool's profile (data sources, search methods, discipline, pricing, company, etc.).
3. **Suggest test queries** appropriate for the tool category (e.g., academic search tools get queries like "climate change adaptation strategies" or "machine learning bias in healthcare").
4. **Offer "Clone from previous"** if the user has previously evaluated the same tool, pre-filling from that session's metadata.

This makes starting a review a 2-click operation for known tools: "Start New Review" → confirm the auto-detected info.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |
| Build     | `pnpm build`             | exit 0              |

## Scope

**In scope**:
- `lib/tool-profiles.ts` — new file with tool detection logic and profiles
- `lib/test-queries.ts` — new file with suggested test queries per tool category
- `components/NewSessionModal.tsx` — enhanced auto-detection and pre-fill
- `components/Metadata.tsx` — show test query suggestions
- `lib/types.ts` — add `suggestedQueries` to `SessionMetadata` (optional)
- New test files

**Out of scope**:
- `lib/capture/` — no changes to screenshot/HTML capture
- `components/Evaluation.tsx` — no evaluation changes
- `lib/export-pipeline.ts` — no export changes (test queries are internal, not exported)
- Any UI for managing/editing tool profiles (hardcoded for now)

## Git workflow

- Branch: `feature/005-review-template`
- Commit per step; message style: conventional commits
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create tool profiles

Create `lib/tool-profiles.ts`:

```typescript
export interface ToolProfile {
  /** Hostname patterns to match (e.g., "semanticscholar.org"). */
  hostnames: string[];
  /** Pre-filled metadata values. */
  defaults: {
    company?: string;
    usesAi?: boolean;
    dataSources?: string[];
    searchMethods?: string[];
    discipline?: string[];
    pricing?: string;
    availability?: string;
    authenticationMethod?: string;
  };
  /** Tool category for test query selection. */
  category: "academic_search" | "general_search" | "ai_assistant" | "database" | "other";
}

export const TOOL_PROFILES: ToolProfile[] = [
  {
    hostnames: ["semanticscholar.org"],
    defaults: {
      company: "Allen Institute for AI",
      usesAi: true,
      dataSources: ["Peer-reviewed papers", "Preprints"],
      searchMethods: ["Semantic search", "Keyword search"],
      discipline: ["Multidisciplinary"],
      pricing: "Free",
      availability: "Open access",
      authenticationMethod: "None required",
    },
    category: "academic_search",
  },
  {
    hostnames: ["elicit.com"],
    defaults: {
      company: "Elicit",
      usesAi: true,
      dataSources: ["Peer-reviewed papers"],
      searchMethods: ["Natural language queries", "Semantic search"],
      discipline: ["Multidisciplinary"],
      pricing: "Freemium",
      availability: "Open access",
      authenticationMethod: "Email",
    },
    category: "academic_search",
  },
  {
    hostnames: ["consensus.app"],
    defaults: {
      company: "Consensus",
      usesAi: true,
      dataSources: ["Peer-reviewed papers"],
      searchMethods: ["Natural language queries"],
      discipline: ["Multidisciplinary"],
      pricing: "Freemium",
    },
    category: "academic_search",
  },
  // Add profiles for: ai2 Asta, Google Scholar, Web of Science, Scopus,
  // PubMed, JSTOR, BASE, CORE, Dimensions, ProQuest, EBSCOhost
  // (the implementer should add ~10 more following this pattern)
];

/**
 * Detect a known tool profile from a URL.
 * Returns null if no profile matches.
 */
export function detectToolProfile(url: string): ToolProfile | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return TOOL_PROFILES.find((p) =>
      p.hostnames.some((h) => hostname === h || hostname.endsWith(`.${h}`)),
    ) ?? null;
  } catch {
    return null;
  }
}
```

The profiles should cover the most commonly evaluated tools at UT. The `detectToolProfile` function is pure — takes a URL string, returns a profile or null.

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Create test queries

Create `lib/test-queries.ts`:

```typescript
export interface TestQuery {
  /** The search query text. */
  query: string;
  /** What this query is designed to test. */
  purpose: string;
}

const ACADEMIC_SEARCH_QUERIES: TestQuery[] = [
  { query: "climate change adaptation strategies in coastal cities", purpose: "Cross-disciplinary coverage" },
  { query: "machine learning bias in healthcare diagnostics", purpose: "AI ethics and bias detection" },
  { query: "quantum computing error correction methods 2024", purpose: "Recent publication coverage" },
  { query: "systematic review meta-analysis social media mental health", purpose: "Synthesis quality" },
  { query: "bibliometric analysis renewable energy research trends", purpose: "Citation and metrics handling" },
  { query: "action research community development sub-saharan africa", purpose: "Regional and niche coverage" },
  { query: "does intermittent fasting improve cardiovascular health", purpose: "Yes/no question handling" },
  { query: "compare BERT and GPT architectures for NLP tasks", purpose: "Comparison and technical depth" },
];

const GENERAL_SEARCH_QUERIES: TestQuery[] = [
  { query: "renewable energy policy Netherlands 2024", purpose: "Regional and recency" },
  { query: "how does CRISPR gene editing work", purpose: "Explanatory query" },
  // ... a few more
];

const AI_ASSISTANT_QUERIES: TestQuery[] = [
  // Similar but focused on AI-specific evaluation aspects
];

/**
 * Get suggested test queries for a tool category.
 * Returns 4-6 queries appropriate for the category.
 */
export function getSuggestedQueries(category: ToolProfile["category"]): TestQuery[] {
  switch (category) {
    case "academic_search": return ACADEMIC_SEARCH_QUERIES.slice(0, 6);
    case "general_search": return GENERAL_SEARCH_QUERIES.slice(0, 6);
    case "ai_assistant": return AI_ASSISTANT_QUERIES.slice(0, 6);
    default: return ACADEMIC_SEARCH_QUERIES.slice(0, 4);
  }
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Enhance NewSessionModal with auto-detection

In `components/NewSessionModal.tsx`:

1. After `captureCurrentPageInfo()` resolves, also call `detectToolProfile(url)`.
2. If a profile is detected, show a notice: "Detected: Semantic Scholar — pre-filling metadata."
3. Store the detected profile's category in component state.
4. After session creation, if a profile was detected, immediately call `updateMetadata` with the profile's defaults.

```typescript
// In the useEffect that calls captureCurrentPageInfo:
captureCurrentPageInfo()
  .then(({ url, title, faviconUrl: fav }) => {
    if (cancelled) return;
    setToolUrl(url);
    setToolName(title);
    setFaviconUrl(fav);

    // Auto-detect tool profile
    const profile = detectToolProfile(url);
    if (profile) {
      setDetectedProfile(profile);
      // Pre-fill usesAi from profile if it has an opinion
      if (profile.defaults.usesAi !== undefined) {
        setUsesAi(profile.defaults.usesAi);
      }
    }
  })
```

After session creation in `handleSubmit`, apply profile defaults:
```typescript
// After createSession succeeds:
if (detectedProfile) {
  // Apply metadata defaults in the background (non-blocking)
  const defaults = detectedProfile.defaults;
  updateMetadata({
    ...(defaults.company && { company: defaults.company }),
    ...(defaults.dataSources && { dataSources: defaults.dataSources }),
    ...(defaults.searchMethods && { searchMethods: defaults.searchMethods }),
    ...(defaults.discipline && { discipline: defaults.discipline }),
    ...(defaults.pricing && { pricing: defaults.pricing }),
    ...(defaults.availability && { availability: defaults.availability }),
    ...(defaults.authenticationMethod && { authenticationMethod: defaults.authenticationMethod }),
  });
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add "Clone from previous" option

In `components/NewSessionModal.tsx`:

1. After detecting the URL, check `sessionIndex` for any existing sessions with the same `toolUrl` (normalized).
2. If found, show a notice: "You've previously reviewed this tool. Clone metadata from that review?"
3. If the user accepts, pre-fill the form fields from the previous session's metadata.

```typescript
// Check for previous session with same tool
const previousSession = Object.values(sessionIndex).find(
  (s) => s.toolUrl && normalizeUrl(s.toolUrl) === normalizeUrl(url),
);
if (previousSession) {
  setPreviousSession(previousSession);
}
```

Show a small banner when `previousSession` is set, with a "Clone metadata" button that copies all metadata fields (except name, URL, id, startTime).

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Show test query suggestions in Metadata

In `components/Metadata.tsx`:

1. If the session was created from a detected profile, show a collapsible "Suggested Test Queries" section.
2. Render the queries as a list with copy buttons (click to copy query text to clipboard).
3. This is informational only — no data is stored. The reviewer uses these queries during their evaluation.

```tsx
{detectedCategory && (
  <details className="mb-ut-3">
    <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy cursor-pointer">
      Suggested Test Queries
    </summary>
    <div className="mt-ut-2 space-y-ut-1">
      {getSuggestedQueries(detectedCategory).map((tq, i) => (
        <div key={i} className="flex items-center gap-ut-2 text-ut-xs">
          <code className="flex-1 bg-ut-grey px-ut-2 py-ut-0.5 rounded-ut-sm font-mono text-ut-body">
            {tq.query}
          </code>
          <span className="text-ut-muted text-[10px]">{tq.purpose}</span>
          <button
            type="button"
            className="text-trust-magenta hover:text-trust-magenta-strong"
            onClick={() => navigator.clipboard.writeText(tq.query)}
            title="Copy query"
          >
            {/* copy icon */}
          </button>
        </div>
      ))}
    </div>
  </details>
)}
```

The `detectedCategory` would need to be passed from the session creation flow. Options: store it in `SessionMetadata` as an optional `detectedToolCategory` field, or detect it again from `toolUrl` when Metadata renders.

Simpler approach: re-detect from `toolUrl` in the Metadata component itself (it's a pure function call, no side effects).

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Add tests

Create `tests/tool-profiles.test.ts`:

1. `detectToolProfile("https://www.semanticscholar.org/...")` → returns Semantic Scholar profile.
2. `detectToolProfile("https://elicit.com/...")` → returns Elicit profile.
3. `detectToolProfile("https://unknown-tool.com")` → returns null.
4. `detectToolProfile("not a url")` → returns null.
5. Profile defaults have expected fields.

Create `tests/test-queries.test.ts`:

1. `getSuggestedQueries("academic_search")` → returns 6 queries with `query` and `purpose`.
2. `getSuggestedQueries("other")` → returns 4 queries.

Create/update `tests/new-session-modal.test.tsx`:

1. Verify auto-detection shows profile notice when URL matches a known tool.
2. Verify metadata is pre-filled after session creation.

**Verify**: `pnpm test -- tests/tool-profiles.test.ts tests/test-queries.test.ts` → all pass

## Test plan

- New tests in `tests/tool-profiles.test.ts`:
  - Known tool detection (3+ tools)
  - Unknown tool returns null
  - Invalid URL returns null
  - Profile defaults are complete
- New tests in `tests/test-queries.test.ts`:
  - Query count per category
  - Queries have text and purpose
- Updated tests in `tests/new-session-modal.test.tsx`:
  - Auto-detection UI
  - Metadata pre-fill
- Pattern: follow `tests/session-manager.test.tsx`
- Verification: `pnpm test` → all pass

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; new tests for tool profiles and test queries exist and pass
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `lib/capture/` module's `captureCurrentPageInfo()` API has changed and no longer returns `{ url, title, faviconUrl }`.
- The `SessionMetadata` type has changed significantly — new required fields that the profile defaults don't cover.
- The Metadata form in `components/Metadata.tsx` has been restructured in a way that makes inserting a new section non-trivial.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Tool profiles are hardcoded for now. If this feature is popular, consider making them user-editable or fetching from a shared resource.
- The test queries are generic. If the team develops tool-specific test batteries (e.g., "test these 5 queries on every academic search tool"), they should be added as named query sets that can be referenced by profile.
- The "Clone from previous" feature uses URL matching. If tools change their domain (e.g., elicit.com → elicit.ai), the profile hostnames need updating.
- The `ToolProfile` interface is designed to be extensible — new fields can be added to `defaults` without breaking existing profiles.
