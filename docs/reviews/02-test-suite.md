# Test Suite Review: v0.3.0 → HEAD

**Reviewer**: 45-ReviewTests  
**Date**: 2026-05-24  
**Scope**: 26 test files changed (207 insertions, 170 deletions)  
**Verdict**: Test updates are mechanically correct for the v1.1 rubric migration, but have significant coverage gaps for new features.

## Summary

The test changes are dominated by two categories: (1) mechanical rubric v1.0→v1.1 migration (new QG IDs, 12→14 question counts, import sorting), and (2) Biome lint compliance (non-null assertions replaced with optional chaining, unused variable prefixes). The mechanical updates are thorough and consistent. However, several new features introduced in this patch series have zero or minimal test coverage:

| Feature | Test Coverage | Severity |
|---------|--------------|----------|
| `getVisibleRubricQuestionIds()` (usesAi filtering) | **Zero** | HIGH |
| `compressCaptureScreenshot()` (WebP/JPEG compression) | **Zero** | HIGH |
| `countUnsure()` helper | **Zero** | MEDIUM |
| UsesAi confirmation dialog (`showUsesAiConfirm`) | **Zero** (only toggle test) | MEDIUM |
| `computeCompletion()` with `usesAi` parameter | **Zero** (only default path) | MEDIUM |
| `authenticationMethod` field in HTML report | **Zero** | LOW |
| Dynamic completion denominator in Evaluation component | **Untested** | MEDIUM |

## Findings

### F1. `getVisibleRubricQuestionIds` has zero test coverage
- **Severity**: HIGH  
- **File**: `lib/rubric.ts:18-33`  
- **Description**: New exported function that filters rubric questions by `ai_only` flag based on `usesAi` boolean. The function is consumed by `Evaluation.tsx:24` and `computeCompletion()` to compute the dynamic completion denominator. No test file imports or exercises this function. The rubric data contains 4 `ai_only: true` questions, meaning `usesAi=false` should reduce the visible question count from 14 to 10. This is completely unverified.
- **Recommendation**: Add tests to `tests/rubric.test.ts`:
  - `usesAi=true` returns all 14 IDs
  - `usesAi=false` excludes `ai_only` questions (should return 10)
  - Verify specific excluded IDs: `privacy_and_security.training_policy`, `TR.methodology_disclosure`, `RE.accuracy_and_hallucination`, `US.cognitive_guardrails`

### F2. `compressCaptureScreenshot` has zero test coverage
- **Severity**: HIGH  
- **File**: `lib/image-convert.ts:40-71`  
- **Description**: New 48-line async function that performs WebP/JPEG compression with canvas fallback chain. It is called in the critical capture pipeline (`capture.ts:197`). `tests/image-convert.test.ts` tests `pngToJpeg`, `base64ToUint8Array`, and `uint8ArrayToBase64` but does not test `compressCaptureScreenshot` at all. The function has multiple branching paths (non-image data-URL passthrough, browser canvas path with WebP then JPEG fallback, timeout handling for jsdom/Node) that are all untested.
- **Recommendation**: Add tests to `tests/image-convert.test.ts`:
  - Non-image data-URL passthrough
  - Browser canvas path (mock `Image` + `document.createElement('canvas')`)
  - WebP first, JPEG fallback, original passthrough as last resort

### F3. `countUnsure` helper has zero test coverage
- **Severity**: MEDIUM  
- **File**: `lib/rubric.ts:122-133`  
- **Description**: New exported function used in `Evaluation.tsx:69` to display unsure counts per category. No test exercises this function.
- **Recommendation**: Add tests alongside `principleAverage` tests in `tests/rubric.test.ts`.

### F4. UsesAi confirmation dialog has zero test coverage
- **Severity**: MEDIUM  
- **File**: `components/Metadata.tsx:106, 348-349, 718-729`  
- **Description**: The `tests/metadata.test.tsx:316-328` tests only the simple toggle (unchecking sets `usesAi=false`). The confirmation dialog flow — triggered when unchecking with scored AI-only questions (`hasScoredAiOnlyQuestions()` then `setShowUsesAiConfirm(true)` then `clearAiOnlyScores()`) — has zero coverage. This is the most complex interaction in the Metadata component.
- **Recommendation**: Add tests:
  - Unchecking with scored AI-only questions shows confirm dialog
  - Confirming clears AI-only scores to "na" and sets `usesAi=false`
  - Cancelling preserves scores and keeps `usesAi=true`

### F5. `computeCompletion` never tested with `usesAi=false`
- **Severity**: MEDIUM  
- **File**: `tests/rubric.test.ts:146-175`  
- **Description**: `computeCompletion` now accepts an optional `usesAi` parameter (default `true`). All three existing tests call it without the parameter, so the `usesAi=false` path through `getVisibleRubricQuestionIds` is never exercised. The denominator changes from 14 to 10 when `usesAi=false`.
- **Recommendation**: Add test case with `usesAi=false` verifying the reduced denominator.

### F6. `AllProviders` hardcodes `usesAi: false` — may mask bugs
- **Severity**: MEDIUM  
- **File**: `tests/helpers/render-utils.tsx:11`  
- **Description**: The shared test wrapper `AllProviders` provides `usesAi: false` to `RubricContext`. This means all component tests using `AllProviders` (question-section, evidence-modal, etc.) run in a non-AI mode, but the component's real default (from `RubricContext`) is `usesAi: true`. Tests that depend on question visibility or completion calculations may pass in test but fail in production where `usesAi=true`. This is a systematic test-production mismatch.
- **Recommendation**: Change default to `usesAi: true` or parameterize it. Add a separate test for `usesAi=false` behavior.

### F7. `authenticationMethod` field untested in HTML report
- **Severity**: LOW  
- **File**: `lib/html-report.ts:666`  
- **Description**: The HTML report now renders `authenticationMethod` in the metadata header. `tests/html-report-utils.test.ts` and `tests/scoring-report.test.ts` have no test for this new field.
- **Recommendation**: Add a test case passing `authenticationMethod` in meta overrides and asserting the rendered output.

### F8. Dynamic completion denominator in Evaluation component untested
- **Severity**: MEDIUM  
- **File**: `components/Evaluation.tsx:23-26`  
- **Description**: The Evaluation component now computes completion using `getVisibleRubricQuestionIds(rubric, usesAi).length` instead of a fixed count. No test verifies that the progress bar or completion text updates correctly when `usesAi` changes (14 vs 10 total questions).
- **Recommendation**: Test the Evaluation component's completion display with both `usesAi=true` and `usesAi=false`.

## Coverage Assessment

### Well-tested areas
- **Rubric v1.1 migration**: All existing tests updated for 14-question structure, new QG IDs (`data_privacy`, `ip_preservation`), and new categories (`intellectual_property`). Comprehensive and consistent.
- **Scoring verdict matrix** (`tests/compute-scores.test.ts`): 8-case combination matrix tests all verdict branches (anyFail, ratioBelow, principleFail) with and without finalization overrides. Edge cases for ratio=0.6 and totalMax=0 are tested. Excellent coverage.
- **Biome lint compliance**: Non-null assertions (`!`) systematically replaced with optional chaining (`?.`) across all test files. All assertions still validate correctly (using `toBe`/`toEqual` on nullable values).
- **Import sorting**: Alphabetical imports applied consistently across 26 files.
- **QuestionSection merged gates** (`tests/question-section.test.tsx`): 6 dedicated tests for merged gate badge rendering (pass, fail, na, no badge, label). Thorough.
- **QuestionRow memo isolation**: Tests verify notes persistence across row interactions — proves React.memo prevents remounting.

### Missing coverage
- `getVisibleRubricQuestionIds()` — core usesAi filtering logic
- `compressCaptureScreenshot()` — image compression in capture pipeline
- `countUnsure()` — used in Evaluation component
- UsesAi confirmation dialog (scored AI questions, confirm, clear)
- `computeCompletion` with `usesAi=false` parameter
- `authenticationMethod` rendering in HTML report
- Dynamic completion denominator display in Evaluation component

## Positive Observations

1. **Combination matrix pattern** in `compute-scores.test.ts` is exemplary — covers all 8 verdict combinations in a parametric loop, avoiding copy-paste tests.
2. **Render count tests** in `question-section.test.tsx` directly measure React re-renders, providing concrete performance regression detection.
3. **Memo isolation tests** cleverly verify React.memo effectiveness by checking DOM state preservation rather than relying on mock counts.
4. **Edge case testing** for ratio=0.6 (exact threshold) is well-handled with carefully constructed score distributions.
5. **XSS prevention** tests in `html-report-utils.test.ts` verify actual HTML escaping, not just function return values.
6. **Consistent lint compliance** across all 26 files shows disciplined maintenance.
