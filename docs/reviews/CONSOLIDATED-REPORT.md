# Consolidated Review Report: v0.3.0 → HEAD

**Date**: 2026-05-24  
**Scope**: 16 commits, 56 files, ~2064 insertions / ~368 deletions  
**Reviewers**: 6 parallel subagents (logic, tests, content, UI/UX, export, docs)  
**Verification**: typecheck ✓, lint ✓, test 462/462 ✓, build ✓, bench 16/16 ✓

---

## Executive Summary

Six parallel reviews identified **21 findings** across logic, tests, content, UI/UX, export, and documentation. After validity assessment and deduplication, **1 P0 bug, 4 P1 issues, and 8 P2 issues** require action. The most critical finding is a **P0 bug in `getAiOnlyRubricIds()`** — the function returns partial question IDs that never match evaluation rubricIds, causing the usesAi confirmation dialog and score clearing to silently fail.

---

## Validated Findings (Action Required)

### P0 — Must Fix Immediately

| # | Area | Finding | Reporter |
|---|---|---|---|
| **P0-1** | Logic | **`getAiOnlyRubricIds()` returns partial IDs, breaking usesAi toggle**. Function pushes bare keys (`"training_policy"`) instead of full rubricIds (`"privacy_and_security.training_policy"`). `hasScoredAiOnlyQuestions()` never matches → confirmation dialog never appears, AI-only scores never cleared on toggle. | Logic review |

### P1 — Must Fix Before Release

| # | Area | Finding | Reporter |
|---|---|---|---|
| **P1-1** | Logic | **`computeCompletion()` numerator not filtered to visible questions**. Denominator uses `getVisibleRubricQuestionIds` (excludes ai_only), but numerator counts ALL evaluations including hidden ones. Can show >100% completion for non-AI sessions. | Logic review |
| **P1-2** | Logic | **`computeReportScores` ignores `usesAi`**. Always processes all 14 questions regardless. `totalQuestions`, `isComplete`, and "X/Y questions answered" display in HTML report are wrong for non-AI tools. Verdict is unaffected (finalization overrides). | Logic review |
| **P1-3** | UI/UX | **`categorySummary` in Evaluation.tsx doesn't filter by `usesAi`**. Per-category totals include ai_only questions while progress bar excludes them, creating mismatched counts. Also missing `usesAi` in dependency array. | UI/UX review |
| **P1-4** | Docs | **REVIEW-FIELDS-OVERVIEW.md references stale v1.0 rubric**. Lists 2 QG questions (actual: 4), omits IP category, mislabels PS1, skips authentication method field, wrong discipline count (26 vs 34). | Docs review |

### P2 — Should Fix Before Release

| # | Area | Finding | Reporter |
|---|---|---|---|
| **P2-1** | Tests | **`getVisibleRubricQuestionIds` has zero test coverage**. Core usesAi filtering function untested. | Test review |
| **P2-2** | Tests | **`compressCaptureScreenshot` has zero test coverage**. 48-line async function in critical capture pipeline. | Test review |
| **P2-3** | Tests | **`computeCompletion` never tested with `usesAi=false`**. Only the default `usesAi=true` path is exercised. | Test review |
| **P2-4** | Tests | **`AllProviders` hardcodes `usesAi: false`** — opposite of production default (`true`). Systematic test-production mismatch across all component tests. | Test review |
| **P2-5** | Export | **`authenticationMethod` missing from CSV export**. Rendered in HTML report but dropped from `session_metadata.csv`. | Export review |
| **P2-6** | Content | **Scoring rubric questions lack N/A guidance**. QG questions have N/A scenarios in background text; scoring questions don't, despite system supporting `na` scores. | Content review |
| **P2-7** | Docs | **RUBRIC-CONTENT-REVIEW.md contains false P1 finding**. Reports stale `related_gate` on TC1, but it was already removed in v1.1. Also falsely claims 6 metadata fields missing from report. | Docs review |
| **P2-8** | Docs | **CHANGELOG.md not updated** for 16 commits since v0.3.0. | Docs review |

### P3 — Nice to Fix

| # | Area | Finding | Reporter |
|---|---|---|---|
| P3-1 | UI/UX | Pill toggle buttons lack `aria-pressed` for screen readers | UI/UX review |
| P3-2 | UI/UX | `evaluationComplete` dep should narrow from `session` to `session?.usesAi` | UI/UX review |
| P3-3 | Logic | Unnecessary `as` casts in `getVisibleRubricQuestionIds` | Logic review |
| P3-4 | Content | TC2 levels 0 and 1 have overlapping boundary (both match when retracted sources present) | Content review |
| P3-5 | Content | Inconsistent description verbosity across questions (US1, TC1 are terse) | Content review |
| P3-6 | Content | Discipline option names missing commas (4 Scopus-based entries) | Content review |
| P3-7 | Docs | Neither doc has versioning metadata for freshness tracking | Docs review |
| P3-8 | Export | `compressCaptureScreenshot` has no canvas dimension cap for 4K+ displays | Export review |

---

## Rejected / Invalidated Findings

| Claim | From | Assessment |
|---|---|---|
| Migration doesn't remap v1.0 rubricIds | Logic review | **Low risk.** v1.0 sessions only had `traceability.citation_mechanism` in QG — that ID is simply absent in v1.1, treated as unanswered. No crash. Old scoring IDs (TR.*, RE.*, etc.) are unchanged. Orphaned QG eval is cosmetic only. |
| `countUnsure` has zero test coverage | Test review | **Valid but low priority.** Simple iteration function, 12 lines. Worth adding but not blocking. |
| UsesAi confirmation dialog untested | Test review | **Valid.** Promoted to P2-1 test coverage scope — should be tested alongside P0-1 fix. |
| TC1 `merged_gate: true` orphaned | Content review | **By design.** TC1 serves as implicit gate (any attribution = pass). Badge renders from question's own title/code, not from related_gate. Removing merged_gate would change existing behavior for no benefit. |
| QG examples lack N/A examples | Content review | **Low impact.** N/A guidance is in background text. Examples.na field is optional. |
| SE1 key doesn't match title | Content review | **By design.** Key stability for data compatibility. Documented trade-off. |

---

## Priority Recommendations

### Fix immediately (blocks release)

1. **P0-1**: Fix `getAiOnlyRubricIds()` to push `${cat}.${id}` instead of bare `id`
2. **P1-1**: Filter `computeCompletion` numerator to visible question IDs
3. **P1-3**: Add `usesAi` filter to `categorySummary` and fix dependency array
4. **P1-4**: Update REVIEW-FIELDS-OVERVIEW.md for v1.1 (or delete and regenerate)

### Fix before release (quality bar)

5. **P1-2**: Thread `usesAi` through `computeReportScores` (report informational fields)
6. **P2-1/P2-3**: Add tests for `getVisibleRubricQuestionIds` and `computeCompletion(usesAi=false)`
7. **P2-4**: Change `AllProviders` default to `usesAi: true`
8. **P2-5**: Add `Authentication_Method` to CSV export
9. **P2-7**: Fix false findings in RUBRIC-CONTENT-REVIEW.md
10. **P2-8**: Update CHANGELOG.md

### Can defer

11. P3 items (accessibility, canvas cap, content polish)
12. P2-2 (`compressCaptureScreenshot` tests — complex to mock canvas, function has fallback chain)
13. P2-6 (N/A guidance for scoring questions — content improvement, not a bug)

---

## Positive Observations (What's Done Well)

1. **Commit hygiene is excellent** — atomic commits, conventional commit format, logical ordering, clear messages with bullet-point bodies.
2. **Security posture is strong** — consistent `esc()` escaping, `safeLink()` URL validation, no XSS vectors found.
3. **Scoring logic is correct** — verdict priority chain (finalization > no-eval > incomplete > computed) is right. `principleAverage` correctly excludes na/unsure.
4. **Compression fallback chain is robust** — WebP → JPEG → original with jsdom timeout.
5. **Test combination matrix** in compute-scores.test.ts is exemplary — 8-case parametric verdict coverage.
6. **Rubric content quality is high** — 4.2/5 average, strong background text, realistic examples, proper ai_only assignment.
7. **The P0 bug is isolated** — it's in one helper function in Metadata.tsx. The rest of the usesAi flow (UI hiding, completion denominator, scoring exclusion) is correct.

---

## Review Methodology

Six parallel subagents reviewed distinct areas with clean context windows:

| # | Agent | Scope | Report |
|---|---|---|---|
| 1 | Logic & Scoring | rubric.ts, types, compute-scores, verdict logic | `docs/reviews/01-logic-and-scoring.md` |
| 2 | Test Suite | All 24 test files, coverage analysis | `docs/reviews/02-test-suite.md` |
| 3 | Question Content | trust-full.json, background text, examples, options | `docs/reviews/03-question-content.md` |
| 4 | UI/UX | Component behavior, accessibility, CSS, state management | Structured JSON (schema violation) |
| 5 | Report & Export | html-report.ts, export.ts, image-convert.ts, capture.ts | `docs/reviews/05-report-and-export.md` |
| 6 | Docs & Commits | Documentation accuracy, commit structure, infrastructure | `docs/reviews/06-docs-and-commits.md` |

All findings were cross-validated against actual code before inclusion in this report.
