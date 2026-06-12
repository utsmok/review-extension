# Plan 002: Add Labs Settings Section

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6cafd76..HEAD -- lib/types.ts stores/registry.ts components/SettingsScreen.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `6cafd76`, 2026-06-12

## Why this matters

Plans 003 (Enhanced Recommendation) and 004 (Per-Principle Summaries) introduce significant behavior changes that should be opt-in for existing users. A "Labs" section in settings provides a home for beta/trial features that users can enable explicitly. This is infrastructure that will be reused for future experimental features.

## Current state

- `lib/types.ts:6-11` — `Settings` interface has `reviewerName`, `reviewerEmail`, `preferredRubric`, `setupBannerDismissed`.
- `stores/registry.ts:32-84` — `useRegistryStore` persists `settings` via Zustand `persist` middleware to localStorage. `updateSettings(patch)` does a shallow merge.
- `components/SettingsScreen.tsx` — Two sections: "Reviewer Profile" (name + email). That's it. The `preferredRubric` field in settings is unused (variant system was abandoned). Scrollable content area in a flex column.

Settings screen layout (currently):
```tsx
<div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-5">
  {/* Section: Reviewer Profile */}
  <section>...</section>
</div>
```

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
- `lib/types.ts` — add `labs` field to `Settings` interface
- `stores/registry.ts` — add default `labs` value
- `components/SettingsScreen.tsx` — add Labs section UI
- New test file for labs settings behavior

**Out of scope**:
- `components/FinalizationScreen.tsx` — no finalization changes (that's Plan 003)
- `components/Evaluation.tsx` or `components/QuestionSection.tsx` — no evaluation changes (that's Plan 004)
- Any behavioral changes gated by labs flags — this plan only adds the infrastructure

## Git workflow

- Branch: `feature/002-labs-settings`
- Commit per step; message style: conventional commits
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend `Settings` type with `labs` field

In `lib/types.ts`, add a `LabsSettings` interface and a `labs` field to `Settings`:

```typescript
/** Experimental features that users opt into via the Labs settings section. */
export interface LabsSettings {
  /** Enable 6-level recommendation grades (Recommended → Out of scope) instead of 3-level Pass/Conditional/Fail. */
  enhancedRecommendation?: boolean;
  /** Enable per-principle summary fields with auto-fill from question data. */
  principleSummaries?: boolean;
}

export interface Settings {
  reviewerName: string;
  reviewerEmail: string;
  preferredRubric: string;
  setupBannerDismissed?: boolean;
  labs: LabsSettings;
}
```

**Verify**: `pnpm typecheck` — expect errors in `stores/registry.ts` where `settings` defaults are set (missing `labs`). That's OK, step 2 fixes it.

### Step 2: Update registry store defaults

In `stores/registry.ts`, update the `settings` default to include `labs`:

```typescript
settings: {
  reviewerName: "",
  reviewerEmail: "",
  preferredRubric: "trust-full",
  labs: {},
},
```

The `persist` middleware handles migration automatically — existing persisted state without `labs` will get the default from `merge` behavior. Since `updateSettings` does `{ ...s.settings, ...patch }`, existing users' settings won't be touched. However, the persist middleware needs a shallow merge strategy for nested objects. Check if `zustand/middleware persist` with `merge` is already configured, or if a custom `merge` is needed.

Actually, Zustand's `persist` middleware replaces top-level keys on hydration. If the persisted state has `settings: { reviewerName: "..." }` without `labs`, the hydrated state will have `settings` without `labs`. Then the store's initial state won't be used for that key. To handle this, add a partialize/merge strategy:

```typescript
persist(
  (set) => ({ ... }),
  {
    name: "trust-review-registry",
    // Merge persisted state with defaults so new fields get their defaults
    merge: (persisted, current) => ({
      ...current,
      ...(persisted as Partial<RegistryState>),
      settings: {
        ...current.settings,
        ...((persisted as RegistryState)?.settings ?? {}),
        labs: {
          ...current.settings.labs,
          ...((persisted as RegistryState)?.settings?.labs ?? {}),
        },
      },
    }),
  },
),
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Add Labs section to SettingsScreen

In `components/SettingsScreen.tsx`, add a new section after "Reviewer Profile":

```tsx
{/* ── Section: Labs ────────────────────────────── */}
<section>
  <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
    Labs
  </h2>
  <p className="text-ut-xs text-ut-muted mb-ut-2">
    Experimental features under development. Enable them to try new capabilities
    before they become default. Your feedback helps shape the final design.
  </p>
  <div className="space-y-ut-3">
    {/* Enhanced Recommendation toggle */}
    <label className="flex items-start gap-ut-2 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 accent-trust-magenta"
        checked={settings.labs?.enhancedRecommendation ?? false}
        onChange={(e) =>
          updateSettings({
            labs: { ...settings.labs, enhancedRecommendation: e.target.checked },
          })
        }
      />
      <div>
        <span className="text-ut-xs font-semibold text-ut-navy block">
          Enhanced Recommendation
        </span>
        <span className="text-ut-xs text-ut-muted block leading-relaxed">
          Use a 6-level recommendation scale (Recommended, Recommended with caveats,
          Needs review, Pilot only, Not recommended, Out of scope) instead of the
          standard Pass/Conditional/Fail grades.
        </span>
      </div>
    </label>

    {/* Principle Summaries toggle */}
    <label className="flex items-start gap-ut-2 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 accent-trust-magenta"
        checked={settings.labs?.principleSummaries ?? false}
        onChange={(e) =>
          updateSettings({
            labs: { ...settings.labs, principleSummaries: e.target.checked },
          })
        }
      />
      <div>
        <span className="text-ut-xs font-semibold text-ut-navy block">
          Principle Summaries
        </span>
        <span className="text-ut-xs text-ut-muted block leading-relaxed">
          Add summary fields for each TRUST principle. Summaries are auto-filled
          from your question scores and notes, and can be edited freely.
        </span>
      </div>
    </label>
  </div>
</section>
```

Match the existing section styling pattern from "Reviewer Profile" — same heading style, same spacing classes.

**Verify**: `pnpm typecheck` → exit 0. `pnpm build` → exit 0.

### Step 4: Export a `useLabs` convenience hook

Add a small helper in a new file `hooks/useLabs.ts`:

```typescript
import type { LabsSettings } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";

/** Read the current Labs settings from the registry store. */
export function useLabs(): LabsSettings {
  return useRegistryStore((s) => s.settings.labs ?? {});
}
```

This gives plans 003 and 004 a clean import point without coupling to the registry store directly.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Add tests

Create `tests/labs-settings.test.tsx`:

1. Render `SettingsScreen`, verify Labs section appears with both toggles unchecked.
2. Click "Enhanced Recommendation" toggle, verify `useRegistryStore.getState().settings.labs.enhancedRecommendation` is `true`.
3. Verify existing persisted state without `labs` field hydrates correctly (labs defaults to `{}`).
4. Verify toggling one lab setting doesn't affect the other.

Use `tests/helpers/render-utils.tsx` (`AllProviders`, `renderWithProviders`) as the test infrastructure. Follow existing settings test patterns.

**Verify**: `pnpm test -- tests/labs-settings.test.tsx` → all pass

## Test plan

- New tests in `tests/labs-settings.test.tsx` covering:
  - Labs section renders with toggles unchecked
  - Toggle updates registry store correctly
  - Persisted state migration (no `labs` → defaults to `{}`)
  - One toggle doesn't affect the other
- Pattern: follow `tests/helpers/render-utils.tsx` for rendering
- Verification: `pnpm test` → all pass, including new tests

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; new tests for labs settings exist and pass
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The Zustand persist middleware in `stores/registry.ts` already has a custom `merge` function — adapt accordingly rather than overwriting.
- The `Settings` type has changed beyond what's shown in the excerpts.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Future lab features: add a new `boolean` field to `LabsSettings`, add a toggle in the Labs section of `SettingsScreen.tsx`. The pattern is: type → store default → UI toggle → read via `useLabs()`.
- When a lab feature graduates to stable: remove the toggle from Labs, make the behavior default, and clean up the `LabsSettings` field. Keep the toggle hidden (not removed) for one version to avoid breaking persisted state, then remove.
- The `merge` strategy in `stores/registry.ts` must be updated if new nested objects are added to `Settings` beyond `labs`.
