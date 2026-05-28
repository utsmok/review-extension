# Code Quality Review — TRUST Review Extension

**Date**: 2026-05-28
**Scope**: Core lib, stores, hooks, key components
**Reviewer**: Automated pass

---

## 1. Bugs

### B1. `export.ts:266` — Unsafe cast of `LightweightCapture[]` to `Capture[]`

```ts
captures: lightweightCaptures as import("./types").Capture[],
```

The `session.json` written into export ZIPs stores `LightweightCapture` objects (no `screenshotBase64`, no `htmlContent`). On re-import (`importSessionFromZip`), the code mutates these objects to add back `screenshotBase64` and `htmlContent`, but `metadataField` is only conditionally copied. If a capture has no `metadataField` in the lightweight version, the import path still works because it's optional. However, the `as Capture[]` cast silently hides any future schema drift between `LightweightCapture` and `Capture`. **No runtime bug today**, but the cast is a maintenance landmine.

### B2. `html-report.ts:152` — Unsafe cast bypasses `ai_only` type safety

```ts
([, q]) => usesAi || !(q as { ai_only?: boolean }).ai_only,
```

The `ScoringQuestion` type already has `ai_only?: boolean`, but `questions` is typed as `Record<string, ScoringQuestion>` (or `PassFailQuestion` for QG). The cast to `{ ai_only?: boolean }` exists because `Object.entries()` loses the specific question type. Not a runtime bug, but indicates the type system is fighting the code.

### B3. `html-report.ts:170,208` — Double cast through `unknown`

```ts
(levels as unknown as Record<string, string>)[String(score)]
(levels as unknown as { examples?: Record<string, string> }).examples?.[lvl]
```

`ScoringQuestion` has keys `"0"`, `"1"`, `"2"`, `"3"` defined directly. Accessing via `levels[String(score)]` should work without casting since TypeScript allows indexing with `string` on objects with string keys. The double cast is unnecessary — `levels[String(score) as "0" | "1" | "2" | "3"]` would be sufficient and type-safe.

### B4. `QuestionSection.tsx:644` — Repeated type narrowing via `as`

```ts
const sq = q as ScoringQuestion;
const question = questionRaw as PassFailQuestion | ScoringQuestion;
```

Called inside a loop iterating `Object.entries(rubricSection)` which returns `[string, PassFailQuestion | ScoringQuestion][]`. The cast is safe because `rubricSection` is correctly narrowed by `isQG`, but should be a single narrowing function.

### B5. `FinalizationScreen.tsx:69` — Missing dependency in autosave effect

```ts
}, [grade, conclusion, strengths, weaknesses, recommendations, setFinalization]);
```

The effect body references `useSessionStore.getState().finalization` (line 48) but doesn't list any session store dependency. This is **intentional** (reading from `getState()` avoids subscriptions), but the pattern is fragile — if someone refactors to use the hook selector, it silently breaks.

### B6. `ActiveSession.tsx:73` — Locale-dependent timestamp in quick notes

```ts
const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
```

Produces locale-dependent output (e.g., "14:30" vs "2:30 PM"). For a review tool that may be shared across regions, this creates inconsistent notes. Should use ISO time or a fixed format.

---

## 2. Code Smells

### S1. Module-level mutable cache globals — `export.ts:93-97`, `html-report.ts:14`

```ts
let cachedJSZip: typeof import("jszip") | null = null;
let cachedPapa: typeof import("papaparse") | null = null;
let cachedPngToJpeg: typeof import("./image-convert").pngToJpeg | null = null;
let cachedMinifiedCss: string | null = null;
let cachedLogos: typeof import("./logos") | null = null;
```

Five module-level mutable caches in `export.ts`, plus one in `html-report.ts`. No invalidation path. If the CSS or logos change (e.g., hot reload), the stale cache persists until the extension is reloaded. Consider a `resetCaches()` export for testing/dev.

### S2. Dual color systems with manual sync

`tokens.css` defines `--score-1` etc. for the sidepanel UI. `rubric.ts` defines `SCORE_COLORS` as hex values for the report export. `principles.ts` has a third `color` field. Any color change requires coordinated edits across 3 surfaces. The codebase memory notes this as a known failure mode. A single source of truth (e.g., `principles.ts` with both CSS variable names and hex values) would eliminate the class.

### S3. God component — `QuestionSection.tsx` (753 lines)

`QuestionSection` + `QuestionRow` is a single 753-line file. `renderScoringScores` alone is ~180 lines with deeply duplicated event handler logic (click + keyDown for each score level, N/A, Unsure). The score rows share identical `onClick`/`onKeyDown` patterns — extract a `ScoreOption` component.

### S4. Duplicated score rendering logic — `QuestionSection.tsx:95-284`

`renderScoringScores` repeats this pattern 6 times (for 0,1,2,3, na, unsure):

```tsx
onClick={(e) => {
  e.preventDefault();
  if (isAutoNa) return;
  if (isX) {
    setEvaluation(rubricId, { score: "" });
  } else {
    setEvaluation(rubricId, { score: "X", customScore: undefined });
  }
}}
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    // identical logic
  }
}}
```

This should be a single reusable `ScoreOption` component with the handler passed as a prop.

### S5. `as Evaluation` casts in `stores/session.ts:96,103`

```ts
updated[existing] = { ...updated[existing], ...patch } as Evaluation;
{ rubricId, notes: "", explicitEvidenceIds: [], ...patch } as Evaluation,
```

The spread + cast pattern means any required field added to `Evaluation` in the future will be silently missed. The initial object literal should explicitly list all required fields (or use a factory function).

### S6. `export.ts:442` — Untyped property access through cast

```ts
const hasAnnotated = (capture as unknown as Record<string, unknown>).hasAnnotatedScreenshot;
```

`LightweightCapture` type already has `hasAnnotatedScreenshot?: boolean` defined on line 9. This double cast is completely unnecessary — `capture.hasAnnotatedScreenshot` would typecheck.

### S7. `export.ts:163` — Asymmetric annotation handling

```ts
annotatedScreenshotBase64: annotatedPathMap.has(c.id)
  ? (annotatedPathMap.get(c.id) as string)
  : c.annotatedScreenshotBase64,
```

When there's no annotated screenshot, `c.annotatedScreenshotBase64` (which may be `undefined`) is used. The resulting `capturesWithPaths` array has type `Capture[]` but the `annotatedScreenshotBase64` field can be `undefined` or a relative path string. `buildHtmlReport` handles both cases via `?? c.screenshotBase64` (line 639), but the type narrowing is misleading.

### S8. `useActiveSession` exposes too many store actions

`useActiveSession` returns 17 bindings — every store action plus composite helpers. Components that only need `setEvaluation` also subscribe to changes in `captures`, `finalization`, etc. because the hook destructures all selectors at the parent level. The individual `useSessionStore((s) => s.xxx)` selectors inside the hook prevent re-renders from the store, but the returned object is a new reference every call. Every consumer re-renders on any state change.

**Severity**: Medium. The hook is called from `Evaluation`, `ActiveSession`, `FinalizationScreen`, `Captures`, `Metadata`, and `QuestionSection`. All re-render on any store change.

### S9. `html-report.ts` — Template literal report builder (735 lines)

`buildHtmlReport`, `buildNutritionLabelHtml`, and helpers are 735 lines of string concatenation with embedded HTML. No type safety for HTML structure, easy to introduce XSS via missing `esc()` calls, and hard to review for accessibility. Consider a typed template system or at minimum extract each section into tested helper functions.

### S10. `capture.ts` — Mutation of cloned document in `archivePageHtml`

The function clones the document, then mutates the clone in place (replacing `<link>` with `<style>`, removing elements, etc.). This is correct behavior but the function is 200+ lines of sequential DOM manipulation with no early-exit paths. If any step throws, the partially-mutated clone is still returned.

---

## 3. Gaps

### G1. No runtime validation of `Evaluation.score` values

`setEvaluation` in `stores/session.ts:90` accepts `Partial<Evaluation>` without validating the `score` field. Any string can be written as a score. The type system constrains this to `EvaluationScore`, but there's no runtime guard against malformed data from IndexedDB, import, or future code changes.

### G2. No test coverage for `capture.ts:archivePageHtml`

The archive function is 200+ lines of complex DOM manipulation (CSS inlining, @import resolution, script stripping, URL sanitization, base tag injection). Only `capture.test.ts` exists (3.7KB) and tests URL scheme validation. The archive logic is untested.

### G3. `session-repository.ts:quota guard` — Warning-only, no backpressure

```ts
if (payloadSize > headroom * 0.8) {
  console.warn(...);
}
```

When storage is running low, the code logs a warning but proceeds with the save. If the save fails, `save()` returns `false` but the caller in `auto-save.ts` only shows a toast. There's no mechanism to pause data collection or alert the user before data loss occurs.

### G4. No concurrency protection for session save/load

`auto-save.ts` debounces at 300ms, but `saveCurrentSession()` in `session-lifecycle.ts` is fire-and-forget. If a user rapidly switches sessions, a stale save could race with the new session's first save. The `scheduledSessionId` guard in `flush()` mitigates this, but the `switchToSession` path calls `saveCurrentSessionAsync()` then `clear()`, which could lose data if the save hasn't committed before clear runs.

Actually, `saveCurrentSessionAsync` is `await`ed, so this is safe. But `markDoneAndClose` calls non-async `saveCurrentSession()` (fire-and-forget) then immediately `clear()`. If the IDB save is slow, the session is cleared from the store while the save is still in-flight — this is safe because `snapshot()` was not called (the save captures current state synchronously). OK, but fragile.

### G5. `FinalizationScreen` — No validation before finalize

The "Lock & Finalize Review" button only checks `disabled={!grade}`. It doesn't check whether any questions have been answered, whether conclusion is non-empty, or whether the evaluation is complete. A user can finalize an empty review.

### G6. `registry.ts` — No size limit on `sessionIndex`

`sessionIndex` is a `Record<string, SessionMetadata>` persisted via Zustand `persist` (localStorage). Every session's metadata is stored here permanently. With many sessions, this could exceed localStorage limits (~5-10MB). No pruning mechanism exists.

### G7. Missing error boundaries around report generation

`exportSession` in `hooks/useActiveSession.ts:87-98` wraps the export in try/catch, but `buildHtmlReport` and `buildNutritionLabel` have no internal error handling. If any principle or question has unexpected data, the entire export fails with an unhelpful error.

### G8. No CSRF/token protection on `downloadBlob`

`downloadBlob` creates a temporary `<a>` element and triggers a click. In a browser extension context this is safe, but the function is exported and could be misused in other contexts.

### G9. `removeCapture` in `stores/session.ts:72-84` — Metadata field cleanup is incomplete

```ts
if (removed?.metadataField === "toolLogoUrl") metadataPatch.toolLogoUrl = "";
if (removed?.metadataField === "termsConditionsUrl") metadataPatch.termsConditionsUrl = "";
```

Only two metadata fields are cleaned up on capture removal. If new metadata fields are added that reference captures, this list must be updated manually. No type-level enforcement.

---

## 4. Opportunities

### O1. Extract `ScoreOption` component from `QuestionSection.tsx`

The 6x repeated score option pattern (label + hidden radio + click/keyDown handler) should be a single component:

```tsx
<ScoreOption
  value={val}
  selected={isActive}
  disabled={isDisabled}
  label={...}
  onSelect={() => setEvaluation(rubricId, { score: val })}
  onDeselect={() => setEvaluation(rubricId, { score: "" })}
/>
```

Would reduce `QuestionSection.tsx` by ~200 lines and eliminate the duplicated event handler logic.

### O2. Type-safe rubric question access

Replace the `Object.entries()` + cast pattern with a typed helper:

```ts
function getRubricEntries<T extends PassFailQuestion | ScoringQuestion>(
  section: Record<string, Record<string, T>>,
): [string, string, T][] {
  return Object.entries(section).flatMap(([cat, qs]) =>
    Object.entries(qs).map(([qId, q]) => [cat, qId, q] as const),
  );
}
```

### O3. Single color source of truth

Define all colors in `principles.ts` with both CSS variable references and hex values. Generate `tokens.css` score colors from the same source. Eliminates the 3-surface update problem.

### O4. Immutable evaluation updates

Replace the spread-and-cast pattern in `setEvaluation` with a proper update function:

```ts
function applyEvaluationPatch(existing: Evaluation | undefined, rubricId: string, patch: Partial<Evaluation>): Evaluation {
  return {
    rubricId: existing?.rubricId ?? rubricId,
    score: existing?.score ?? "",
    notes: existing?.notes ?? "",
    explicitEvidenceIds: existing?.explicitEvidenceIds ?? [],
    ...patch,
  };
}
```

This eliminates the `as Evaluation` cast and makes future field additions safe.

### O5. Lazy-load `QuestionRow` with code splitting

`QuestionSection.tsx` is the heaviest component (753 lines). `QuestionRow` is already `React.memo`-wrapped. Splitting it into a lazy-loaded chunk would reduce initial bundle size since most users don't expand all questions.

### O6. Add `schemaVersion` to import validation

`validateSessionData` in `export.ts:321` validates field presence but doesn't check `schemaVersion`. Importing a future-version session into an older extension would silently fail or produce incorrect behavior.

### O7. Replace `console.warn` in quota guard with user-facing notification

When storage quota is low, show a toast warning the user. Silent console warnings are invisible to end users who will lose data.

### O8. Extract template literal HTML generation into testable units

`buildGateRows`, `buildCategorySections`, `buildNutritionLabelHtml` are large functions that produce HTML strings. Extract each into a pure function with typed inputs and write snapshot tests. Currently only `scoring-report.test.ts` (4.1KB) covers report generation.

---

## Summary

| Category | Count | Severity |
|----------|-------|----------|
| Bugs | 6 | 1 medium (B6), 5 low (type-safety/maintenance) |
| Smells | 10 | 2 high (S3, S8), 4 medium, 4 low |
| Gaps | 9 | 2 high (G2, G5), 4 medium, 3 low |
| Opportunities | 8 | 3 high-impact (O1, O3, O4) |

**Top 3 priorities:**
1. **S3/O1** — Decompose `QuestionSection.tsx`. 753 lines with 6x duplicated event handlers is the biggest maintainability risk.
2. **S8** — `useActiveSession` causes over-rendering. Split into focused hooks or use Zustand's shallow comparison.
3. **G2** — `archivePageHtml` is 200 lines of untested DOM manipulation. A regression here silently corrupts all captured evidence.
