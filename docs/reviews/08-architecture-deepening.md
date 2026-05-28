# Codebase Architecture Deepening Review
Date: 2026-05-28

## Executive Summary

This review applies the "deep module" lens from *A Philosophy of Software Design* (Ousterhout): modules should have simple interfaces backed by rich implementations. We look for **shallow modules** (interface as complex as implementation), **missing seams** (where behavior can't be altered without editing in place), and **leaking concerns** (knowledge spread across modules that should be localized).

The codebase has good bones — the Zustand store is a proper deep module with a clean interface. The rubric module provides good leverage through `getVisibleRubricQuestionIds()`. But several areas are ripe for deepening.

## Deepening Opportunities

### Candidate 1: Export Pipeline — shallow orchestration

**Files**: `lib/export.ts`, `lib/html-report.ts`, `lib/report/compute-scores.ts`

**Problem**: The export pipeline is 400+ lines of sequential orchestration — ZIP creation, image conversion, CSV generation, report building, logo extraction, and minification all interleaved. The interface (`exportSession(metadata, captures, evaluations, rubric, finalization)`) is clean, but the implementation is a flat procedure. Adding a new export format (e.g., PDF) would require duplicating most of this pipeline.

**Solution**: Create an `ExportPipeline` module with a clear interface:
```ts
interface ExportPipeline {
  addReport(name: string, html: string): void;
  addEvidence(id: string, data: Uint8Array, ext: string): void;
  addCsv(name: string, rows: Record<string, string>[]): void;
  addJson(name: string, data: unknown): void;
  build(): Promise<Blob>;
}
```
Report building, CSV generation, and evidence processing become independent steps feeding into the pipeline. Import logic uses the same pipeline in reverse.

**Benefits**: 
- Locality: ZIP format details live in one place
- Testability: each step is independently testable
- Extensibility: adding PDF/Markdown export reuses the same pipeline
- The deletion test passes: removing the pipeline would scatter ZIP logic across N callers

### Candidate 2: Evaluation State Machine — missing seam

**Files**: `stores/session.ts`, `lib/rubric.ts`, `components/QuestionSection.tsx`, `components/ScoreOverviewBar.tsx`

**Problem**: The "is this question complete?" logic is spread across 4+ locations:
1. `stores/session.ts:setEvaluation()` — shallow merge of evaluation patches
2. `components/ProgressCircle.tsx:getProgressState()` — determines complete/partial/empty
3. `lib/rubric.ts:computeCompletion()` — computes percentage
4. `components/ScoreOverviewBar.tsx` — re-derives hasScore/hasNotes/hasEvidence for each badge

Each caller independently interprets what "scored" means (does "na" count? does "unsure" count? does manualDone override?).

**Solution**: Create a `lib/evaluation-state.ts` module that encapsulates all evaluation state logic:
```ts
interface EvaluationState {
  isScored(evaluation: Evaluation): boolean;
  isComplete(evaluation: Evaluation, hasEvidence: boolean): boolean;
  getProgress(evaluations: Evaluation[], rubric: RubricData, usesAi: boolean): ProgressInfo;
  scoreToDisplay(score: EvaluationScore): string;
}
```
One adapter. One source of truth for "what does scored/complete/empty mean."

**Benefits**:
- Locality: Changing the scoring rules touches ONE file
- Leverage: All UI and export code uses the same definitions
- Testability: One test suite covers all edge cases

### Candidate 3: HTML Report Builder — string templates have no structure

**Files**: `lib/html-report.ts` (734 lines)

**Problem**: The HTML report is built via string concatenation. There's no intermediate representation — data goes directly to HTML strings with escaping sprinkled throughout. This makes it impossible to test the report structure without rendering the full HTML.

**Solution**: Introduce a lightweight report data model:
```ts
interface ReportModel {
  sections: ReportSection[];
  nutritionLabel: NutritionLabelData;
  metadata: ReportMetadata;
}
```
Transform evaluation data → ReportModel (pure, testable), then ReportModel → HTML string (template-only). The data transformation is the deep module; the HTML rendering is a shallow adapter.

**Benefits**:
- Locality: Report structure changes touch the model, not the HTML generation
- Testability: Assert model properties without string matching
- Alternative renderers (PDF, Markdown) reuse the same model

### Candidate 4: Session Persistence — thin wrapper around IDB

**Files**: `lib/session-repository.ts`, `lib/session-lifecycle.ts`, `lib/auto-save.ts`

**Problem**: `session-repository.ts` is a thin wrapper around IndexedDB (`save`/`load`/`delete`). `auto-save.ts` subscribes to the store and calls the repository. `session-lifecycle.ts` orchestrates save/load/clear. The "seam" between in-memory state and persistence is spread across all three.

**Solution**: Create a `SessionPersistence` module that owns the entire save/load/auto-save/flush lifecycle:
```ts
interface SessionPersistence {
  start(sessionId: string): void;
  stop(): void;
  flush(): Promise<void>;
  load(id: string): Promise<SessionData | null>;
}
```
Auto-save subscription, debouncing, visibility flush, and error handling all live inside this module. Callers just call `start()`/`stop()`.

**Benefits**:
- Locality: All persistence logic in one place
- Simpler lifecycle: `useActiveSession` calls `persistence.start(id)` in one effect
- Testability: Mock persistence with a single interface

### Candidate 5: Capture Processing — scattered image conversion logic

**Files**: `lib/capture.ts`, `lib/image-convert.ts`, `lib/export.ts`

**Problem**: Image conversion (PNG→JPEG, compression, resize) is called in three places:
1. `capture.ts` — compresses on capture
2. `export.ts` — converts for ZIP inclusion
3. `html-report.ts` — resizes for report display

Each has slightly different parameters and error handling.

**Solution**: Create a `CaptureProcessor` with named operations:
```ts
interface CaptureProcessor {
  compress(screenshot: string): Promise<string>;
  convertForExport(dataUrl: string, quality: number): Promise<{ dataUrl: string; ext: string }>;
  resizeForReport(dataUrl: string, maxWidth: number): Promise<string>;
}
```
All pngToJpeg calls go through this interface.

**Benefits**:
- Locality: Image conversion parameters in one place
- Testability: One set of tests for conversion behavior
- Optimization: Could add caching or WebWorker offloading behind the same interface

## Priority Assessment

| Candidate | Depth Gain | Effort | Risk | Recommended Order |
|-----------|-----------|--------|------|-------------------|
| Export Pipeline | High | M | L | 2nd |
| Evaluation State | High | S | L | 1st |
| HTML Report Model | High | M | M | 3rd |
| Session Persistence | Medium | M | M | 4th |
| Capture Processor | Low | S | L | 5th |

## Recommended Approach

Start with **Candidate 2 (Evaluation State)** — smallest scope, highest leverage, lowest risk. Every piece of the UI and export touches evaluation state logic. Consolidating it into one deep module pays dividends across the entire codebase.

Then **Candidate 1 (Export Pipeline)** — the export module is the most complex single file. An `ExportPipeline` abstraction would reduce its size by 60% while making it extensible.

**Candidate 3 (HTML Report Model)** is valuable but requires careful design to avoid over-engineering. The current string-concatenation approach is ugly but functional. Only pursue this if report customization becomes a product requirement.

**Candidates 4 and 5** are good long-term improvements but can wait until the current pain points are addressed.
