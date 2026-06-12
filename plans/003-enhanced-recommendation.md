# Plan 003: Enhanced Recommendation with Labs Toggle

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6cafd76..HEAD -- components/FinalizationScreen.tsx components/finalization/GradeSelector.tsx lib/types.ts lib/export-pipeline.ts lib/html-report.ts hooks/useLabs.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/002-labs-settings.md`
- **Category**: direction
- **Planned at**: commit `6cafd76`, 2026-06-12

## Why this matters

The current 3-grade system (Pass/Conditional/Fail) is too coarse for institutional decision-making. The TRUST questionnaire defines 6 recommendation levels that better differentiate between "acceptable with caveats" and "limited pilot only." When this labs feature is enabled, the finalization screen shows the richer grade selector, and the export artifacts (HTML report, nutrition label, CSV) use the expanded grades. This is opt-in via Labs settings, so existing reviews are unaffected.

## Current state

- `lib/types.ts:86` — `FinalizationGrade = "pass" | "conditional" | "fail"` (3 levels).
- `components/finalization/GradeSelector.tsx` — Renders 3 buttons with hardcoded `GRADES` array. Each has `value`, `label`, `description`, `color`, `tint`.
- `components/FinalizationScreen.tsx:25-29` — Local state for `grade`, `conclusion`, `strengths`, `weaknesses`, `recommendations`. Uses `FinalizationGrade` type.
- `lib/export-pipeline.ts:266-278` — `conclusionsCsv` writes `Grade: finalization.grade`.
- `lib/html-report.ts` — Renders the grade in the report HTML (search for `finalization.grade`).
- `hooks/useLabs.ts` — Provides `useLabs()` hook returning `LabsSettings` (created in Plan 002).

Questionnaire spec defines 6 levels (`docs/trust framework background/trust-questionnaire.md:67-74`):
- Recommended
- Recommended with caveats
- Needs review/provisional
- Pilot only
- Not recommended
- Out of scope

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
- `lib/types.ts` — extend `FinalizationGrade` to support 6 levels
- `components/finalization/GradeSelector.tsx` — render 6 grades when labs toggle is on
- `components/FinalizationScreen.tsx` — pass labs flag to GradeSelector
- `lib/export-pipeline.ts` — handle expanded grade in CSV
- `lib/html-report.ts` — handle expanded grade in HTML report
- New test file for GradeSelector with labs toggle

**Out of scope**:
- `components/SettingsScreen.tsx` — no changes (Labs section added in Plan 002)
- `stores/registry.ts` — no changes (labs infrastructure added in Plan 002)
- Adding "suitable/unsuitable use cases" fields — separate future work
- Adding "next review date" field — separate future work
- Changing quality gate semantics — not related

## Git workflow

- Branch: `feature/003-enhanced-recommendation`
- Commit per step; message style: conventional commits
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extend `FinalizationGrade` type

In `lib/types.ts`, extend the `FinalizationGrade` union:

```typescript
/** Final verdict grade assigned during review finalization. */
export type FinalizationGrade =
  // Standard 3-level grades
  | "pass"
  | "conditional"
  | "fail"
  // Enhanced 6-level grades (Labs: enhancedRecommendation)
  | "recommended"
  | "recommended_with_caveats"
  | "needs_review"
  | "pilot_only"
  | "not_recommended"
  | "out_of_scope";
```

The existing `ReviewFinalization` interface (`lib/types.ts:88-95`) stores `grade: FinalizationGrade` — no change needed there since it already uses the union type.

**Verify**: `pnpm typecheck` — expect errors in GradeSelector where the switch/if doesn't handle new values. That's expected, fixed in step 2.

### Step 2: Update GradeSelector to support both modes

In `components/finalization/GradeSelector.tsx`:

1. Import `useLabs` from `@/hooks/useLabs`.
2. Define a `STANDARD_GRADES` array (existing 3 grades) and an `ENHANCED_GRADES` array (6 grades).
3. Select which array to render based on `useLabs().enhancedRecommendation`.

```typescript
const ENHANCED_GRADES: typeof GRADES = [
  {
    value: "recommended",
    label: "Recommended",
    description: "Meets TRUST standards for the evaluated use case(s)",
    color: "bg-ut-green",
    tint: "bg-grade-pass-tint",
  },
  {
    value: "recommended_with_caveats",
    label: "With caveats",
    description: "Acceptable but requires specific conditions or monitoring",
    color: "bg-score-2-strong",
    tint: "bg-grade-conditional-tint",
  },
  {
    value: "needs_review",
    label: "Needs review",
    description: "Insufficient evidence or minor concerns; further evaluation needed",
    color: "bg-score-1-strong",
    tint: "bg-grade-conditional-tint",
  },
  {
    value: "pilot_only",
    label: "Pilot only",
    description: "May be used in a limited pilot but not for broad deployment",
    color: "bg-caution",
    tint: "bg-grade-conditional-tint",
  },
  {
    value: "not_recommended",
    label: "Not recommended",
    description: "Does not meet TRUST standards for the evaluated use case(s)",
    color: "bg-ut-red",
    tint: "bg-grade-fail-tint",
  },
  {
    value: "out_of_scope",
    label: "Out of scope",
    description: "Falls outside the evaluation scope as defined in metadata",
    color: "bg-ut-slate",
    tint: "bg-grade-fail-tint",
  },
];
```

In the component:
```typescript
export default function GradeSelector({ grade, onGradeChange }: GradeSelectorProps) {
  const labs = useLabs();
  const grades = labs.enhancedRecommendation ? ENHANCED_GRADES : GRADES;

  // When switching modes, if the current grade isn't in the new set, clear it
  const isValid = grades.some((g) => g.value === grade);
  // (Don't auto-clear here — let FinalizationScreen handle it)

  return (
    <div>
      <span className="...">
        Overall Grade
        {labs.enhancedRecommendation && (
          <span className="ml-1 text-ut-xs font-normal normal-case tracking-normal text-ut-slate">
            (Enhanced)
          </span>
        )}
      </span>
      <div className={`flex ${labs.enhancedRecommendation ? "flex-wrap" : ""} gap-ut-2`}>
        {grades.map((g) => (
          // ... same render logic as current, but use `grades` instead of `GRADES`
        ))}
      </div>
    </div>
  );
}
```

With 6 grades the buttons need `flex-wrap` to wrap in the narrow side panel. Consider making the enhanced mode use a 2×3 or 3×2 grid layout instead of a single row. The buttons should also be slightly more compact in enhanced mode.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Handle grade migration in FinalizationScreen

In `components/FinalizationScreen.tsx`:

When the user toggles the labs setting (which happens in Settings, outside this screen), the stored grade may not be valid for the current mode. Handle this:

1. In the component, detect if `grade` is valid for the current mode.
2. If not, clear the grade with a toast: "Your grade selection has been cleared because it uses a format not available in the current mode. Please re-select."
3. This should only happen when the user changes the labs setting and then returns to finalization.

Actually, since Settings is a different screen, the simplest approach is: when the GradeSelector renders and the stored grade isn't in the current grade set, show a notice and let the user re-select. Don't auto-clear — just show a "Please re-select" indicator.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Update export pipeline for expanded grades

In `lib/export-pipeline.ts`:

1. The `conclusionsCsv` at line 270 writes `Grade: finalization.grade`. This works as-is — the string value will be the new grade name.
2. Update `scoreLabel` or add a `gradeLabel` function that maps grade values to human-readable strings for CSV.

In `lib/html-report.ts`:

1. Search for where `finalization.grade` is rendered in the report HTML.
2. Add a `gradeLabel()` helper that maps grade values to display text:
   - Standard: pass → "Pass", conditional → "Conditional", fail → "Fail"
   - Enhanced: recommended → "Recommended", recommended_with_caveats → "Recommended with caveats", etc.
3. The grade display styling (colors, badges) in the report should map the 6 grades to appropriate colors. The mapping:
   - recommended → green (same as pass)
   - recommended_with_caveats → green-tinted amber
   - needs_review → amber (same as conditional)
   - pilot_only → orange/amber
   - not_recommended → red (same as fail)
   - out_of_scope → slate/grey

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Add tests

Create `tests/grade-selector-enhanced.test.tsx`:

1. Render `GradeSelector` with `enhancedRecommendation: false` → 3 buttons rendered.
2. Render with `enhancedRecommendation: true` → 6 buttons rendered.
3. Click an enhanced grade → `onGradeChange` called with the new value.
4. Verify grade values match the `FinalizationGrade` type.

Mock `useLabs` by setting the registry store before rendering. Follow the pattern in `tests/finalization-screen.test.tsx`.

**Verify**: `pnpm test -- tests/grade-selector-enhanced.test.tsx` → all pass

### Step 6: Update existing tests

Run `pnpm test` — any tests that hardcode "pass"/"conditional"/"fail" as the only valid grades in type assertions may fail if the type was narrowed. Fix by updating assertions to accept the expanded union.

**Verify**: `pnpm test` → all pass

## Test plan

- New tests in `tests/grade-selector-enhanced.test.tsx`:
  - Standard mode renders 3 grades
  - Enhanced mode renders 6 grades
  - Clicking an enhanced grade calls `onGradeChange` with correct value
  - Invalid grade for current mode is detected
- Pattern: follow `tests/finalization-screen.test.tsx`
- Verification: `pnpm test` → all pass, including new tests and updated existing tests

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; new tests for enhanced grades exist and pass
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `hooks/useLabs.ts` file doesn't exist (Plan 002 wasn't completed).
- `lib/html-report.ts` renders the grade in a way that's structurally different from a simple string substitution (e.g., if the grade is rendered as part of a complex conditional block).
- The existing test suite has grade-related assertions that break in a way that requires significant refactoring beyond updating string values.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- When this feature graduates from Labs to default: make `FinalizationGrade` only the 6-level type, remove `GRADES` (the 3-level array), always use `ENHANCED_GRADES`, and remove the labs toggle.
- The mapping from 6-level to 3-level for backward compatibility in reports: recommended → pass, recommended_with_caveats → conditional, needs_review → conditional, pilot_only → conditional, not_recommended → fail, out_of_scope → fail. This mapping may be needed for comparison views.
- If "suitable/unsuitable use cases" is added later, it would extend `ReviewFinalization` with new string array fields, rendered in the finalization screen and exported in the report.
