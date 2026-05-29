# Impeccable Skill × Application Surface Matrix

## Application Surfaces

| ID | Surface | Description | Files |
|---|---|---|---|
| **S1** | Session Manager | Home screen: session list, new session, import | `SessionManager.tsx`, `NewSessionModal.tsx` |
| **S2** | Metadata Tab | Tool info, discipline, data source, AI toggle, procurement fields | `Metadata.tsx`, `PillField.tsx` |
| **S3** | Evidence Tab | Capture grid/list, capture actions, URL captures, evidence thumbnails | `Captures.tsx`, `CaptureImg`, `EvidenceThumbnails.tsx`, `RubricChipGroup.tsx` |
| **S4** | Evaluation Tab | Score overview bar, quality gates, scoring rubric, per-question rows | `Evaluation.tsx`, `ScoreOverviewBar.tsx`, `QuestionSection.tsx`, `ScoreOption.tsx`, `question-section/*` |
| **S5** | Finalization Tab | Grade selector, notes, export actions, completion | `FinalizationScreen.tsx`, `finalization/GradeSelector.tsx`, `finalization/ExportActions.tsx` |
| **S6** | Evidence Modal | Full-size screenshot, tldraw annotation, notes | `EvidenceModal.tsx` |
| **S7** | Export HTML Report | Full evaluation report: nutrition label, score tables, evidence gallery, principles | `lib/html-report.ts`, `lib/report.css` |
| **S8** | Export Nutrition Label | Summary card: verdict stamp, score distribution, principle bars | `lib/html-report.ts` (buildNutritionLabel) |
| **S9** | Export ZIP/Pipeline | Export artifacts assembly, CSV files, session.json | `lib/export-pipeline.ts`, `lib/export.ts` |
| **S10** | Active Session Shell | Top accent bar, tab navigation, quick actions, status indicators | `ActiveSession.tsx`, `AppShell.tsx` |
| **S11** | Settings Screen | Settings/preferences UI | `SettingsScreen.tsx` |
| **S12** | Error/Empty States | Error boundary, empty state messaging, toast notifications | `ErrorBoundary.tsx`, `EmptyState.tsx`, `Toast.tsx` |
| **S13** | Confirm Dialog | Reusable confirmation modal | `ConfirmDialog.tsx` |
| **S14** | Export Complete Screen | Post-export success/summary screen | `ExportCompleteScreen.tsx` |
| **S15** | Design Tokens / CSS | Global tokens, component CSS, report CSS | `lib/tokens.css`, `lib/components.css`, `lib/report.css`, `lib/base.css` |

## Impeccable Skills (22)

| Category | Skills |
|---|---|
| **Evaluate** | `audit`, `critique` |
| **Build** | `craft`, `shape`, `teach`, `document`, `extract` |
| **Refine** | `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard` |
| **Enhance** | `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive` |
| **Fix** | `clarify`, `adapt`, `optimize` |

## Full Matrix

Legend: ★ = high value, ○ = moderate, · = low, — = not applicable

| Surface | audit | critique | polish | bolder | quieter | distill | harden | onboard | animate | colorize | typeset | layout | delight | overdrive | clarify | adapt | optimize |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 Session Manager | ★ | ★ | ○ | ○ | — | · | ○ | ★ | · | · | ○ | ★ | ○ | — | ★ | ★ | · |
| S2 Metadata Tab | ★ | ○ | ★ | · | — | ○ | ★ | ○ | · | · | ★ | ★ | · | — | ★ | ★ | · |
| S3 Evidence Tab | ★ | ★ | ★ | ○ | · | ○ | ○ | · | ○ | ○ | ○ | ★ | ○ | · | ○ | ★ | · |
| S4 Evaluation Tab | ★ | ★ | ★ | ○ | ○ | ★ | ★ | · | ○ | ★ | ★ | ★ | ★ | · | ★ | ★ | · |
| S5 Finalization Tab | ★ | ○ | ★ | ○ | — | ○ | ★ | · | · | ○ | ○ | ★ | ○ | — | ★ | ○ | · |
| S6 Evidence Modal | ★ | ○ | ★ | · | — | ○ | ★ | — | ○ | · | ○ | ○ | ○ | ○ | ○ | · | · |
| S7 HTML Report | ★ | ★ | ★ | ○ | · | ★ | ★ | — | — | ★ | ★ | ★ | — | — | ★ | ★ | ★ |
| S8 Nutrition Label | ★ | ★ | ★ | ○ | · | ★ | ○ | — | — | ★ | ★ | ★ | — | — | ★ | — | · |
| S9 Export Pipeline | ○ | · | · | — | — | · | ★ | — | — | — | — | · | — | — | · | — | ★ |
| S10 Active Session | ★ | ○ | ★ | ○ | · | ○ | ○ | · | ★ | · | ○ | ★ | ○ | ○ | ○ | ★ | · |
| S11 Settings Screen | ○ | · | ○ | · | — | · | ★ | · | · | · | ○ | ○ | · | — | ○ | ○ | · |
| S12 Error/Empty States | ★ | ○ | ○ | · | — | · | ★ | ★ | · | · | ○ | ○ | ★ | — | ★ | · | · |
| S13 Confirm Dialog | ○ | · | ○ | · | — | · | ★ | — | ○ | · | · | ○ | · | — | ★ | · | · |
| S14 Export Complete | ○ | ○ | ★ | ○ | — | ○ | ★ | ★ | · | · | ○ | ★ | ★ | — | ★ | · | · |
| S15 Design Tokens/CSS | ★ | · | ★ | · | · | ○ | · | — | — | ★ | ★ | ★ | — | — | · | ★ | ★ |

## Top 15 Ranked Candidates

| Rank | Skill | Surface | Rationale | Expected Impact |
|---|---|---|---|---|
| 1 | `audit` | **Full app** (S1-S15) | Baseline: find a11y gaps, perf issues, anti-patterns, responsive failures across everything | Identify all P0-P3 issues to prioritize |
| 2 | `audit` | **S7+S8** (Report + Nutrition Label) | Export HTML is standalone artifact — a11y and responsive issues there affect end users directly | Separate from app; different rendering context |
| 3 | `polish` | **S4** (Evaluation Tab) | Highest-interaction surface; spacing, alignment, visual rhythm of score options/gates | Tighten the primary workflow |
| 4 | `polish` | **S7** (HTML Report) | External-facing artifact; every visual imperfection reflects on the framework | Professional-grade report output |
| 5 | `typeset` | **S4** (Evaluation Tab) | Dense scoring labels, question text, score descriptions — typography hierarchy is critical | Scannability in the primary workflow |
| 6 | `layout` | **S3** (Evidence Tab) | Capture grid, thumbnails, chip groups — layout rhythm is inconsistent | Better evidence browsing |
| 7 | `layout` | **S7** (HTML Report) | Report has tables, score bars, evidence gallery, nutrition label — all need rhythm | Report visual hierarchy |
| 8 | `colorize` | **S4** (Evaluation Tab) | Score colors are functional but accent usage could better leverage TRUST palette | More expressive scoring UX |
| 9 | `harden` | **S2** (Metadata Tab) | Form validation, field edge cases, long text overflow, AI toggle clarity | Production-ready metadata entry |
| 10 | `harden` | **S14** (Export Complete) | Post-export state: download confirmation, file size, next steps | Complete the export flow |
| 11 | `distill` | **S4** (Evaluation Tab) | Scoring rows are dense — strip visual noise, focus on essential scoring actions | Faster evaluation workflow |
| 12 | `clarify` | **S1** (Session Manager) | Session list items, empty states, action labels, import/export copy | First-run clarity |
| 13 | `delight` | **S10** (Active Session) | Quick actions, tab transitions, score completion feedback — personality without distraction | Memorable micro-interactions |
| 14 | `onboard` | **S1+S12** (Session Manager + Empty States) | First-time user guidance: what to do first, what each tab does | Reduce time to first value |
| 15 | `adapt` | **S7** (HTML Report) | Report must look good at any viewport (320px mobile to 1920px desktop) | Universal report readability |

## Execution Plan

### Pass 1: Broad Audits (Runs 1-2)
1. **`impeccable audit`** — full application scan (all surfaces)
2. **`impeccable audit`** — HTML report + nutrition label specifically

### Pass 2: Targeted Improvements (Runs 3-15)
3. **`impeccable polish`** — Evaluation Tab
4. **`impeccable polish`** — HTML Report
5. **`impeccable typeset`** — Evaluation Tab
6. **`impeccable layout`** — Evidence Tab
7. **`impeccable layout`** — HTML Report
8. **`impeccable colorize`** — Evaluation Tab
9. **`impeccable harden`** — Metadata Tab
10. **`impeccable harden`** — Export Complete Screen
11. **`impeccable distill`** — Evaluation Tab
12. **`impeccable clarify`** — Session Manager
13. **`impeccable delight`** — Active Session Shell
14. **`impeccable onboard`** — Session Manager + Empty States
15. **`impeccable adapt`** — HTML Report

### Sequencing Logic
- Audits first: identify issues before fixing blind spots
- Polish before other refinements: fix alignment/spacing before adding color or motion
- Harden late: validate after visual changes stabilize
- Adapt last: responsive fixes depend on final layout decisions
