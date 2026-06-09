# AUDIT: Tests & E2E Coverage

**Date:** 2026-06-09
**Auditor:** TestAudit2 (subagent)
**Scope:** `tests/`, `e2e/`, `bench/`, test config files

---

## Summary

The project has **44 unit test files**, **5 e2e spec files**, and **7 benchmark files**. Unit test coverage is solid for core logic (stores, export pipeline, scoring, migrations, html-report) but has significant blind spots in component coverage and hook coverage. E2E tests cover basic happy-path flows but miss error states, edge cases, and cross-browser testing. Benchmarks are well-structured with realistic inputs. Overall the testing infrastructure is mature but coverage gaps exist in 10+ untested source files.

**Overall Grade: B−** — Good foundations, actionable gaps.

---

## 1. Coverage Map: Source → Test

### Components (`components/`)

| Source File | Test File | Status |
|---|---|---|
| `ActiveSession.tsx` | `active-session.test.tsx` | ✅ Covered |
| `SessionManager.tsx` | `session-manager.test.tsx` | ✅ Covered |
| `Metadata.tsx` | `metadata.test.tsx` | ✅ Covered |
| `EvidenceModal.tsx` | `evidence-modal.test.tsx` | ✅ Covered |
| `Captures.tsx` | `captures.test.tsx` | ✅ Covered |
| `ScoreOverviewBar.tsx` | `score-overview-bar-narrow.test.tsx` | ✅ Covered |
| `FinalizationScreen.tsx` | `finalization-screen.test.tsx` | ✅ Covered |
| `QuestionSection.tsx` | `question-section.test.tsx` | ✅ Covered |
| `AppShell.tsx` | `appshell-banner.test.tsx` | ✅ Covered (banner only) |
| `EmptyState.tsx` | — | ⚠️ NO TEST (trivial component) |
| `Evaluation.tsx` | — | ❌ **NO TEST** |
| `NewSessionModal.tsx` | — | ❌ **NO TEST** |
| `PillField.tsx` | — | ❌ **NO TEST** |
| `ExportCompleteScreen.tsx` | — | ❌ **NO TEST** |
| `Toast.tsx` | `toast.test.ts` | ✅ Covered (store-level) |
| `ProgressCircle.tsx` | — | ❌ **NO TEST** |
| `EvidenceThumbnails.tsx` | — | ❌ **NO TEST** |
| `RubricChipGroup.tsx` | `rubric-chip-group.test.tsx` | ✅ Covered |
| `ConfirmDialog.tsx` | — | ❌ **NO TEST** |
| `ScoreOption.tsx` | — | ⚠️ NO TEST (tested via QuestionSection) |
| `SettingsScreen.tsx` | `settings-screen.test.tsx` | ✅ Covered |
| `App.tsx` | — | ⚠️ NO TEST (composition root) |
| `ErrorBoundary.tsx` | `error-boundary.test.tsx` | ✅ Covered |
| `question-section/DoneToggle.tsx` | `unselect-and-done.test.tsx` | ✅ Covered |
| `question-section/QuestionNotes.tsx` | — | ⚠️ NO TEST (tested via QuestionSection) |
| `question-section/QualityGateSection.tsx` | — | ⚠️ NO TEST (tested via QuestionSection) |
| `finalization/GradeSelector.tsx` | — | ⚠️ NO TEST (tested via FinalizationScreen) |
| `finalization/ExportActions.tsx` | — | ❌ **NO TEST** |

### Libraries (`lib/`)

| Source File | Test File | Status |
|---|---|---|
| `export.ts` | `export.test.ts` | ✅ Covered |
| `export-pipeline.ts` | — | ❌ **NO TEST** |
| `metadata-utils.ts` | — | ❌ **NO TEST** |
| `html-report.ts` | `html-report-utils.test.ts`, `html-report-snapshot.test.ts` | ✅ Well covered |
| `image-convert.ts` | `image-convert.test.ts` | ✅ Covered |
| `report-model.ts` | — | ❌ **NO TEST** |
| `rubric.ts` | `rubric.test.ts`, `principles.test.ts` | ✅ Covered |
| `session-lifecycle.ts` | `session-lifecycle.test.ts` | ✅ Covered |
| `migrations.ts` | `migration.test.ts` | ✅ Covered |
| `session-repository.ts` | `session-repository.test.ts` | ✅ Covered |
| `auto-save.ts` | `auto-save.test.ts` | ✅ Covered |
| `evaluation-state.ts` | `evaluation-state.test.ts` | ✅ Covered |
| `minify.ts` | `minify.test.ts` | ✅ Covered |
| `screenshot-store.ts` | — | ❌ **NO TEST** |
| `principles.ts` | `principles.test.ts` | ✅ Covered |
| `logos.ts` | — | Excluded (data) |
| `contexts.tsx` | `contexts.test.tsx` | ✅ Covered |
| `capture/extract.ts` | `capture.test.ts` | ✅ Covered |
| `capture/browser.ts` | `capture.test.ts`, `capture-archive.test.ts` | ✅ Covered |
| `capture/index.ts` | — | Re-export (tested via consumers) |
| `capture/sanitize.ts` | `capture.test.ts` | ✅ Covered |
| `report/compute-scores.ts` | `compute-scores.test.ts`, `compute-scores-property.test.ts` | ✅ Well covered |

### Hooks (`hooks/`)

| Source File | Test File | Status |
|---|---|---|
| `useActiveSession.ts` | `active-session-hook.test.ts`, `active-session-hook-coverage.test.tsx` | ✅ Well covered |
| `useScreenshotUrl.ts` | — | ❌ **NO TEST** |
| `useScreenshots.ts` | — | ❌ **NO TEST** |
| `useFocus.ts` | `hooks.test.tsx` | ✅ Covered |
| `useCaptureAction.ts` | — | ❌ **NO TEST** |
| `useSessionActions.ts` | — | ⚠️ Thin wrapper, tested via consumers |
| `useSessionData.ts` | — | ⚠️ Thin wrapper, tested via consumers |
| `useKeyboardShortcuts.ts` | — | ❌ **NO TEST** |
| `useCaptureQueue.ts` | `capture-queue.test.tsx` | ✅ Covered |
| `useSidepanelZoom.ts` | `sidepanel-zoom.test.tsx` | ✅ Covered |

### Stores (`stores/`)

| Source File | Test File | Status |
|---|---|---|
| `session.ts` | `store.test.ts` | ✅ Covered |
| `registry.ts` | `registry.test.ts` | ✅ Covered |
| `toast.ts` | `toast.test.ts` | ✅ Covered |

### Coverage Gap Summary

**10 source files with NO test file at all:**
1. `components/Evaluation.tsx`
2. `components/NewSessionModal.tsx`
3. `components/ExportCompleteScreen.tsx`
4. `components/ProgressCircle.tsx`
5. `components/EvidenceThumbnails.tsx`
6. `components/ConfirmDialog.tsx`
7. `components/finalization/ExportActions.tsx`
8. `lib/export-pipeline.ts`
9. `lib/metadata-utils.ts`
10. `lib/report-model.ts`
11. `lib/screenshot-store.ts`
12. `hooks/useScreenshotUrl.ts`
13. `hooks/useScreenshots.ts`
14. `hooks/useCaptureAction.ts`
15. `hooks/useKeyboardShortcuts.ts`

---

## 2. E2E Coverage Assessment

### Configuration (`playwright.config.ts`)

- **Browser:** Chromium only (headless: false — required for extension loading)
- **Timeout:** 30s, **Retries:** 0
- **Single project:** `chrome-extension`
- **No Firefox/WebKit coverage** — extension is Manifest V3, Firefox compatibility untested at e2e level
- **No CI integration** — `retries: 0` suggests no CI pipeline configured

### E2E Test Inventory

| Spec File | Tests | Coverage |
|---|---|---|
| `extension.spec.ts` | 1 | Service worker registration smoke test |
| `session-lifecycle.spec.ts` | 3 | Session create, verify tabs, close+delete |
| `evaluation.spec.ts` | 4 | Tab display, QG scoring, rubric scoring, keyboard shortcuts |
| `captures.spec.ts` | 1 | Quick capture button visibility |
| `finalization.spec.ts` | 4 | Grade selector, conclusion fill, export button, download |

**Total: 13 e2e tests across 5 spec files.**

### E2E Strengths
- Custom fixture (`helpers.ts`) properly loads extension, resolves extension ID, opens sidepanel
- Uses `createSession` helper for consistent setup
- Tests tab navigation via keyboard shortcuts
- Verifies download produces `.zip` file
- Good use of ARIA roles (`getByRole("tab")`, `getByRole("heading")`)

### E2E Gaps (Missing Scenarios)

| Scenario | Severity | Notes |
|---|---|---|
| No Firefox E2E | P2 | Extension targets Firefox too; zero e2e coverage |
| No error state testing | P1 | What happens when IndexedDB fails? Storage full? |
| No session persistence verification | P2 | Reload page, session still present? |
| No metadata editing E2E | P2 | Metadata tab only tested for "End Review" button |
| No capture full flow E2E | P2 | Captures tab only checks button visibility, not actual capture |
| No import flow E2E | P2 | Importing a `.trust.zip` file not tested |
| No concurrent session E2E | P3 | Multiple sessions, switching between them |
| No scoring completeness gate E2E | P2 | Cannot finalize without all scores — untested |
| No settings E2E | P3 | Settings screen has unit tests but no e2e |
| Conditional `if (await ... isVisible)` guards | P1 | `finalization.spec.ts:41-45` silently skips if save button missing — test passes even when feature is broken |

---

## 3. Test Quality Spot-Check

### 3.1 `tests/question-section.test.tsx` — Quality: A−

**Strengths:**
- Thorough localStorage stubbing (line 40-60) — handles WXT jsdom limitation correctly
- Uses `seedActiveSession` helper for consistent setup
- Tests memo isolation (line 422-551) — verifies `React.memo` prevents unnecessary re-renders
- Tests merged gate badges (line 559-703) — domain-specific logic verification
- Proper cleanup via `afterEach`
- Tests both QG and scoring question types

**Issues:**
- Heavy mocking of `session-repository`, `auto-save`, `capture` (lines 17-33) — makes tests brittle to internal refactors
- `flush()` helper (line 139-141) using `setTimeout(r, 0)` is a timing smell — could be `waitFor()` instead
- 700+ lines in a single test file — could benefit from splitting

### 3.2 `tests/export.test.ts` — Quality: A

**Strengths:**
- Uses real `PapaParse` for CSV verification (line 14)
- Tests ZIP output structure via `unzipToFiles` helper (line 47-68)
- Tests `sanitizeFilename` edge cases (line 487-521)
- Full integration: metadata → export → unzip → verify contents
- Good use of `makeMetadata`, `makeCapture` factories

**Issues:**
- No test for export with extremely long tool names (path traversal)
- No test for export with special characters in metadata fields
- Missing test for export with zero evaluations vs partial evaluations

### 3.3 `tests/html-report-utils.test.ts` — Quality: A

**Strengths:**
- Tests XSS prevention via `esc()` (line 47-73) — security-critical
- Tests URL validation via `safeLink()` (line 77-106) — injection prevention
- Tests date formatting edge cases (line 110-120)
- Tests score circle rendering with boundary values (line 124-163)
- Tests quality gate rendering with mixed pass/fail/NA (line 167-206)
- Helper functions (`report()`, `label()`, `allScored()`) provide clean abstraction

**Issues:**
- No test for extremely large numbers of captures (performance regression)
- No test for report with all-NA evaluations

---

## 4. Test Anti-Patterns Found

### P1: Silent Skip Guards in E2E
- **File:** `e2e/finalization.spec.ts:41-45`
- **Pattern:** `if (await saveBtn.isVisible()) { await saveBtn.click(); ... }`
- **Problem:** Test passes even when the save button never appears — feature regression goes undetected
- **Fix:** Use `await expect(saveBtn).toBeVisible()` assertion instead of conditional skip

### P2: localStorage Stubbing Boilerplate
- **Files:** `tests/question-section.test.tsx:40-60`, `tests/contexts.test.tsx:6-26`, `tests/settings-screen.test.tsx`, `tests/appshell-banner.test.tsx`
- **Pattern:** Identical `vi.hoisted()` localStorage shim duplicated across 4+ files
- **Problem:** Violates DRY; if shim needs updating, must change all files
- **Fix:** Move to `tests/helpers/render-utils.tsx` or a shared `tests/helpers/local-storage.ts`

### P2: `setTimeout(flush)` for Async Settling
- **File:** `tests/question-section.test.tsx:139-141`
- **Pattern:** `await new Promise<void>((r) => setTimeout(r, 0))` to flush React/Zustand updates
- **Problem:** Timing-dependent; can cause flaky tests on slow CI
- **Fix:** Use `@testing-library/react`'s `waitFor()` or `act()` for deterministic async settling

### P3: Test File Proximity to Source
- Tests are in `tests/` not co-located with source files
- This is a valid project convention but makes it harder to spot missing tests during code review
- Consider adding a coverage check script that maps source to test

---

## 5. Missing Test Scenarios

### Error States (Priority: P1)
- IndexedDB quota exceeded during save
- IndexedDB unavailable (private browsing)
- Export failure (disk full, permission denied)
- Corrupt session data on load
- Network errors during extension update

### Empty States (Priority: P2)
- Session list with zero sessions (tested in e2e `session-lifecycle.spec.ts` but not unit)
- Evaluation with zero captures
- Finalization with no evaluations scored
- Metadata with minimal fields

### Boundary Conditions (Priority: P2)
- Session with maximum captures (hundreds)
- Tool name with maximum length characters
- Tool URL with unusual protocols (`ftp://`, `data:`)
- Evaluation notes with extremely long text (>10KB)
- Concurrent capture queue at MAX_QUEUE limit (tested in `capture-queue.test.tsx` but not e2e)

### Concurrent Operations (Priority: P2)
- Multiple auto-saves firing simultaneously
- Score update during export
- Session close during capture
- Tab switch during capture

### Accessibility (Priority: P2)
- No `axe-core` or similar a11y testing
- Keyboard navigation through question sections
- Screen reader announcement of score changes
- Focus management in modals (tested at hook level in `hooks.test.tsx` but not component level)

---

## 6. Benchmark Coverage Assessment

### Inventory (7 files)

| Benchmark File | Target Module | Coverage |
|---|---|---|
| `bench/export.bench.ts` | `sanitizeFilename`, `minifyHtml`, `minifyCss` | ✅ Small + large inputs |
| `bench/html-report.bench.ts` | `minifyCss`, `scoreColor`, `distributionBar`, `qualityGateResults`, `principleAverage` | ✅ Good |
| `bench/compute-scores.bench.ts` | `computeReportScores` | ✅ All-pass, mixed, empty |
| `bench/rubric.bench.ts` | All `rubric.ts` functions | ✅ Comprehensive |
| `bench/minify.bench.ts` | `minifyHtml`, `minifyCss` | ✅ Multi-size inputs |
| `bench/image-convert.bench.ts` | `base64ToUint8Array`, `uint8ArrayToBase64` | ✅ Small/medium/large |
| `bench/sanitize.bench.ts` | `sanitizeFilename` | ✅ Edge cases included |

### Assessment: A

Benchmarks are well-structured with:
- Multiple input sizes (small, medium, large)
- Edge case inputs (path traversal, control characters, empty strings)
- Reuse of test fixtures (`makeEvaluation`, `RUBRIC`)
- Only gap: no benchmark for `buildHtmlReport` (the most expensive function) or `exportSession` full pipeline

---

## 7. Vitest Configuration Assessment

### Config (`vitest.config.ts`)

```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "html", "lcov"],
  include: ["lib/**/*.ts", "stores/**/*.ts", "hooks/**/*.ts"],
  thresholds: { statements: 65, branches: 60, functions: 70, lines: 65 },
}
```

**Findings:**

| Issue | Severity | Details |
|---|---|---|
| Components excluded from coverage | P2 | `include` only covers `lib/`, `stores/`, `hooks/` — no component coverage tracking |
| Thresholds may be stale | P3 | 65/60/70/65 — verify these still pass with current codebase |
| No `setupFiles` | P3 | localStorage shim not automated — each test file does it manually |
| `WxtVitest()` plugin | — | Properly configured for WXT testing |
| Excludes `e2e/` | — | Correct — Playwright owns e2e |

---

## 8. Findings Summary

### P0 (Critical) — None

### P1 (High)

| # | Finding | Location | Recommendation |
|---|---|---|---|
| 1 | Silent E2E skip guards mask failures | `e2e/finalization.spec.ts:41-45, 73-74` | Replace `if (isVisible)` with `await expect().toBeVisible()` |
| 2 | No error state testing | E2E and unit | Add tests for IndexedDB failures, export errors, corrupt data |
| 3 | 15 source files have zero test coverage | Components, hooks, libs | Prioritize `export-pipeline.ts`, `NewSessionModal.tsx`, `Evaluation.tsx` |
| 4 | No Firefox E2E testing | `playwright.config.ts` | Add Firefox project or at minimum a Firefox smoke test |

### P2 (Medium)

| # | Finding | Location | Recommendation |
|---|---|---|---|
| 5 | Duplicated localStorage shim | 4+ test files | Extract to `tests/helpers/local-storage.ts` |
| 6 | No benchmark for `buildHtmlReport` | `bench/` | Add benchmark for the full report generation pipeline |
| 7 | Components excluded from coverage config | `vitest.config.ts:11` | Add `components/**/*.tsx` to `include` |
| 8 | No session persistence E2E test | `e2e/` | Test: create session, reload, session still present |
| 9 | No import flow E2E test | `e2e/` | Test importing a `.trust.zip` file |
| 10 | Missing `useKeyboardShortcuts` test | `hooks/` | Hook has no unit test despite complex event handling |

### P3 (Low)

| # | Finding | Location | Recommendation |
|---|---|---|---|
| 11 | `setTimeout` flush for async settling | `tests/question-section.test.tsx:139` | Use `waitFor()` / `act()` |
| 12 | No accessibility testing | Project-wide | Add `jest-axe` or Playwright a11y assertions |
| 13 | No CI retries configured | `playwright.config.ts:6` | Set `retries: 2` for CI stability |
| 14 | `retries: 0` in Playwright config | `playwright.config.ts:6` | Flaky E2E tests will fail CI runs |
| 15 | No visual regression testing | Project-wide | Consider Playwright screenshot comparison |

---

## 9. Recommendations

1. **Immediate (P1):** Fix silent skip guards in `finalization.spec.ts` — these tests can pass while the feature is broken.
2. **Short-term (P1):** Add tests for `export-pipeline.ts` (core export logic), `NewSessionModal.tsx` (primary entry point), and `Evaluation.tsx` (main evaluation container).
3. **Short-term (P2):** Extract the localStorage shim to a shared helper and add it to `vitest.config.ts` as `setupFiles`.
4. **Medium-term (P2):** Add Firefox E2E project to `playwright.config.ts` — even a single smoke test would catch Manifest V2/V3 compatibility issues.
5. **Medium-term (P2):** Add error boundary tests for IndexedDB failures at the e2e level.
6. **Nice-to-have (P3):** Add `buildHtmlReport` benchmark and consider adding screenshot-based visual regression for the nutrition label and score overview.

## 10. Decision

Your recommendations sound solid, please implement all 15 flagged issues (P1, P2, P3), except issue 15 -- ignore that one. In case you need to decide between a minimal and more extensive implementation, pick the more extensive option.
