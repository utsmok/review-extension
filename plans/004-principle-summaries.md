# Plan 004: Per-Principle Summaries with Auto-Fill

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6cafd76..HEAD -- lib/types.ts lib/rubric.ts components/Evaluation.tsx lib/html-report.ts lib/export-pipeline.ts hooks/useLabs.ts`
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

The TRUST questionnaire has per-principle "observations, limitations, and recommendations" fields for each of the 5 principles (TR, RE, UC, SE, TC). Currently, a second reviewer must read every individual question to understand why a principle scored the way it did. Per-principle summaries give the reviewer a place to synthesize, and the auto-fill feature pre-populates these summaries from existing question scores, notes, and evidence — so reviewers only need to edit, not write from scratch.

## Current state

- `components/Evaluation.tsx:62-79` — Renders two `QuestionSection` components (quality gates + scoring rubric). No per-principle summary fields.
- `components/QuestionSection.tsx:417-455` — Iterates `Object.entries(rubricSection)` per category, rendering a `<h3>` category header (`getCategoryLabel(category)`) then `QuestionRow` for each question.
- `lib/rubric.ts:230-249` — `principleAverage(categoryId, evaluations, rubric)` computes the numeric average for a principle. Uses `getCategoryScores` which returns all score values for a category.
- `lib/rubric.ts:92-104` — `computeCompletion(evaluations, rubric, usesAi)` computes overall completion percentage.
- `lib/types.ts:73-83` — `Evaluation` interface has `rubricId`, `score`, `notes`, `explicitEvidenceIds`, `manualDone`, `customScore`.
- `lib/types.ts:13-40` — `SessionMetadata` has no principle summary fields.
- `lib/types.ts:42-51` — `SessionData` has `metadata`, `captures`, `evaluations`, `finalization`, `quickNotes`.

The rubric has 5 scoring categories. `lib/rubric.ts:78-85` has `CATEGORY_LABELS` mapping category IDs to display names:
```typescript
const CATEGORY_LABELS: Record<string, string> = {
  transparency: "Transparency",
  reliability: "Reliability",
  user_centric: "User-Centric",
  sound: "Sound",
  traceable: "Traceable",
};
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
- `lib/types.ts` — add `PrincipleSummary` interface and `principleSummaries` to `SessionData`
- `stores/session.ts` — add actions for principle summaries
- `lib/rubric.ts` — add `generatePrincipleSummary()` auto-fill function
- `components/Evaluation.tsx` — render principle summary sections (when labs enabled)
- `lib/html-report.ts` — render principle summaries in report
- `lib/export-pipeline.ts` — include principle summaries in CSV/export
- New test file for auto-fill logic and component tests

**Out of scope**:
- `components/SettingsScreen.tsx` — Labs toggle added in Plan 002
- `lib/session-repository.ts` — IDB schema migration (principle summaries stored in session.json, no new object store needed)
- Changing rubric question structure

## Git workflow

- Branch: `feature/004-principle-summaries`
- Commit per step; message style: conventional commits
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add types

In `lib/types.ts`, add:

```typescript
/** Per-principle summary written by the reviewer (or auto-filled). */
export interface PrincipleSummary {
  /** Category ID (e.g., "transparency", "reliability"). */
  categoryId: string;
  /** Auto-generated draft summarizing the question scores and notes. */
  observations: string;
  /** User-edited observations (null = use auto-generated). */
  customObservations?: string;
}
```

Add `principleSummaries` to `SessionData`:

```typescript
export interface SessionData {
  metadata: SessionMetadata;
  captures: Capture[];
  evaluations: Evaluation[];
  finalization: ReviewFinalization | null;
  quickNotes?: QuickNote[];
  /** Per-principle summaries. Only populated when Labs > Principle Summaries is enabled. */
  principleSummaries?: PrincipleSummary[];
}
```

**Verify**: `pnpm typecheck` — may show errors until stores are updated. That's expected.

### Step 2: Add store actions

In `stores/session.ts`, add to `SessionState`:

```typescript
/** Set or update a per-principle summary. */
setPrincipleSummary: (categoryId: string, patch: Partial<PrincipleSummary>) => void;
```

Implementation in the store creator:
```typescript
setPrincipleSummary: (categoryId, patch) =>
  set((s) => {
    const existing = s.principleSummaries ?? [];
    const idx = existing.findIndex((p) => p.categoryId === categoryId);
    if (idx >= 0) {
      const updated = [...existing];
      updated[idx] = { ...updated[idx], ...patch };
      return { principleSummaries: updated };
    }
    return { principleSummaries: [...existing, { categoryId, observations: "", ...patch }] };
  }),
```

Also add `principleSummaries` to the `SessionState` interface and the `emptyState` (default to `[]`).

And add to `SessionData` interface in `snapshot()`:
```typescript
...(s.principleSummaries?.length ? { principleSummaries: s.principleSummaries } : {}),
```

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Implement auto-fill logic

Add a new function in `lib/rubric.ts`:

```typescript
/**
 * Generate a draft per-principle summary from existing evaluation data.
 * Returns one PrincipleSummary per scoring category.
 */
export function generatePrincipleSummaries(
  evaluations: Evaluation[],
  rubric: RubricData,
  usesAi: boolean = true,
): PrincipleSummary[] {
  const summaries: PrincipleSummary[] = [];
  const evalMap = buildEvalMap(evaluations);

  for (const [categoryId, questions] of Object.entries(rubric.scoring_rubric)) {
    const questionEntries = Object.entries(questions as Record<string, ScoringQuestion>);
    const visibleQuestions = usesAi
      ? questionEntries
      : questionEntries.filter(([, q]) => !q.ai_only);

    if (visibleQuestions.length === 0) continue;

    const parts: string[] = [];

    // Collect scores and notes
    const scoredQuestions: Array<{ code: string; score: number | string; notes: string }> = [];
    for (const [qId, q] of visibleQuestions) {
      const rubricId = `${categoryId}.${qId}`;
      const ev = evalMap.get(rubricId);
      const idx = questionEntries.findIndex(([k]) => k === qId);
      const code = getQuestionCode(categoryId, idx);

      if (ev && ev.score !== "" && ev.score !== undefined) {
        scoredQuestions.push({
          code,
          score: typeof ev.score === "number" ? ev.score : ev.score,
          notes: ev.notes ?? "",
        });
      }
    }

    if (scoredQuestions.length === 0) {
      summaries.push({ categoryId, observations: "No questions scored yet." });
      continue;
    }

    // Average score
    const numericScores = scoredQuestions
      .map((q) => (typeof q.score === "number" ? q.score : null))
      .filter((s): s is number => s !== null);
    const avg = numericScores.length > 0
      ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1)
      : "N/A";

    // Build summary text
    parts.push(`${getCategoryLabel(categoryId)}: average score ${avg}/3.`);

    // Highlight strengths (score 3) and weaknesses (score 0-1)
    const strengths = scoredQuestions.filter((q) => q.score === 3);
    const weaknesses = scoredQuestions.filter((q) => typeof q.score === "number" && q.score <= 1);

    if (strengths.length > 0) {
      parts.push(`Strengths: ${strengths.map((q) => q.code).join(", ")} scored 3/3.`);
    }
    if (weaknesses.length > 0) {
      parts.push(`Concerns: ${weaknesses.map((q) => q.code).join(", ")} scored ${weaknesses.map((q) => `${q.score}/3`).join(", ")}.`);
    }

    // Include reviewer notes if present
    const notesWithContent = scoredQuestions.filter((q) => q.notes.trim().length > 0);
    if (notesWithContent.length > 0) {
      parts.push(`Reviewer notes on ${notesWithContent.map((q) => q.code).join(", ")}.`);
    }

    summaries.push({ categoryId, observations: parts.join(" ") });
  }

  return summaries;
}
```

Import `PrincipleSummary` from `./types`. The function is pure — it takes evaluations and rubric data, returns an array of summaries. No side effects.

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Render principle summary sections in Evaluation

In `components/Evaluation.tsx`:

1. Import `useLabs` from `@/hooks/useLabs`.
2. Import `generatePrincipleSummaries` from `@/lib/rubric`.
3. Import the scoring categories from rubric data.
4. When `labs.principleSummaries` is true, after each scoring category's questions, render a summary section.

The rendering approach: In the `QuestionSection` component (or as a new wrapper), after rendering all questions for a category, add a collapsible "Principle Summary" section with:
- Auto-generated text (read-only, shown in a styled block)
- Editable textarea for custom observations
- A "Use auto-generated" button to reset to the auto-fill

Actually, the cleaner approach is to add the summary UI **between** the category header and the questions, or as a collapsible at the bottom of each category. Since `QuestionSection.tsx` iterates categories internally, the summary should go in `QuestionSection.tsx` after each category's questions.

In `components/QuestionSection.tsx`, inside the `Object.entries(rubricSection).map(...)` block, after the questions for each category, add:

```tsx
{labs.principleSummaries && section === "scoring_rubric" && (
  <PrincipleSummaryEditor
    categoryId={category}
    evaluations={evaluations}
    rubric={rubric}
    usesAi={usesAi}
    summary={principleSummaries.find((p) => p.categoryId === category)}
    onUpdate={(patch) => setPrincipleSummary(category, patch)}
  />
)}
```

Create a small `PrincipleSummaryEditor` component (in the same file or extracted) that:
1. Shows the auto-generated summary text.
2. Has a textarea for custom observations.
3. Has a "Reset to auto-generated" button that clears custom text.
4. Auto-generates on mount if no summary exists yet.

**Verify**: `pnpm typecheck` → exit 0

### Step 5: Update export pipeline

In `lib/export-pipeline.ts`:

1. Accept `principleSummaries` as an optional parameter in `prepareExportArtifacts`.
2. If present, add a `principle_summaries.csv` to the ZIP with columns: Category, Observations, Custom_Observations.
3. Include principle summaries in `session.json`.

In `lib/html-report.ts`:

1. If `principleSummaries` is present and non-empty, render a "Principle Summaries" section in the report, one subsection per principle.
2. Show both the auto-generated observations and any custom observations.
3. Place this section between the per-question scoring details and the finalization section.

**Verify**: `pnpm typecheck` → exit 0

### Step 6: Add tests

Create `tests/principle-summaries.test.tsx`:

1. Test `generatePrincipleSummaries`:
   - With no evaluations → "No questions scored yet" for each category.
   - With all scores at 3 → summary mentions strengths, no concerns.
   - With mixed scores → summary mentions both strengths and concerns.
   - Notes are mentioned when present.
   - `ai_only` questions are filtered when `usesAi: false`.
2. Test `PrincipleSummaryEditor` component:
   - Renders auto-generated text.
   - Textarea for custom observations.
   - "Reset to auto-generated" clears custom text.
3. Test store action `setPrincipleSummary`.

**Verify**: `pnpm test -- tests/principle-summaries.test.tsx` → all pass

### Step 7: Update existing tests

Run `pnpm test` — update any tests that break due to the new `principleSummaries` field in `SessionData` or new imports.

**Verify**: `pnpm test` → all pass

## Test plan

- New tests in `tests/principle-summaries.test.tsx`:
  - `generatePrincipleSummaries` with no evaluations
  - `generatePrincipleSummaries` with all max scores
  - `generatePrincipleSummaries` with mixed scores and notes
  - AI-only filtering
  - Store action round-trip
  - Component renders correctly with labs enabled/disabled
- Pattern: follow `tests/question-section.test.tsx`
- Verification: `pnpm test` → all pass

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; new tests for principle summaries exist and pass
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `hooks/useLabs.ts` file doesn't exist (Plan 002 wasn't completed).
- The `SessionData` type has changed significantly beyond what's shown in the excerpts.
- The rubric category structure in `data/rubrics/trust-full.json` has changed (categories renamed or removed).
- The HTML report rendering in `lib/html-report.ts` has been restructured in a way that makes inserting a new section non-trivial.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- When this feature graduates from Labs: remove the `principleSummaries` labs toggle check, always show the summaries, and make the auto-fill happen on first render without user action.
- The auto-fill function `generatePrincipleSummaries` is designed to be idempotent — calling it multiple times with the same data produces the same result. This means it's safe to call on every render to update the auto-generated text (custom text is preserved).
- If the rubric gains new categories, the auto-fill will automatically include them (it iterates `rubric.scoring_rubric` entries).
- Future enhancement: make the auto-fill richer by including evidence counts ("3 screenshots linked") or quoting specific reviewer notes.
