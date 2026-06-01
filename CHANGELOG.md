# Changelog

## v0.6.0 — 2026-06-01

### New: Score Overview Bar

A new sticky progress bar appears at the top of the Evaluation tab, replacing the old hero/chips layout. It shows animated score badges for every question, a circular progress ring, and a completion celebration when all questions are scored. The bar uses a glass-blur effect and score-colored gradient fills that shift from red to green as your average improves.

### New: Keyboard Shortcuts

Navigate faster without reaching for the mouse:

- **1–4** — switch between tabs (Metadata, Evaluation, Captures, Finalize)
- **Ctrl+Shift+S** — take a screenshot capture
- **?** — open the help popover showing all shortcuts

A help button in the top-right corner lists all shortcuts with styled keys.

### New: Onboarding

First-time users see a welcome card on the Session Manager screen with 4 numbered steps explaining how to start a review. Each tab also has an empty state with actionable guidance and shortcut hints.

### New: Evidence Modal Zoom Controls

The annotation modal now has zoom controls (zoom in, zoom out, fit-to-view, percentage display) in the toolbar. A pan/zoom hint at the bottom of the canvas auto-hides after 4 seconds. The modal no longer clips on narrow screens.

### New: Annotation Size Controls

Stroke size buttons (S/M/L/XL) let you pick pen thickness directly in the annotation toolbar. Default pen size is now thicker ("L") for better visibility on captured screenshots.

### Redesigned Finalization Screen

- Hero score block with gradient background and animated score reveal
- Principle dashboard: each principle gets a tinted card with colored left-border and mini progress bar
- Grade buttons now show descriptions (Pass, Conditional, Fail) alongside the label
- Placeholder prompts in every text field give concrete examples instead of generic hints
- Strengths/weaknesses items use icon buttons (pencil, trash) instead of text links

### Redesigned Captures Tab

- Grid view: hover cards lift with shadow, action buttons appear on hover overlay
- List view: rows are now expandable to show notes, rubric tagging, and annotate/delete buttons with thumbnail previews
- Annotate and delete buttons are round colored icons instead of text links
- Staggered fade-in animation for cards on load

### Improved Evaluation Tab

- Score rows get a colored left-border accent when selected
- Pass/fail quality gate badges use tinted backgrounds with 3px accent strips
- Category headers are color-coded (navy for quality gates, magenta for scoring)
- Mouse-reactive wave animation on the badge constellation
- Reduced visual clutter: removed redundant dividers, self-evident descriptions, and "(merged)" labels
- Question rows: "Done" toggle moved to the action row alongside capture/link buttons
- Notes area now labeled "Remarks" with evidence-prompting placeholder text

### Improved Session Manager

- Progress bars on each session card showing scored/total count
- Keyboard shortcuts hint bar at the bottom
- AI toggle has a tooltip explaining rubric question filtering
- Tab descriptions appear on hover/focus

### Improved Export

- Exported HTML reports are now fully standalone — CSS is inlined, no separate stylesheet needed
- Responsive HTML reports: layouts adapt from 320px mobile to 1920px desktop screens
- Nutrition label shows "Not specified" for empty strengths/weaknesses instead of hiding the column
- Export complete screen shows file sizes and has proper error handling with retry
- Improved report spacing scale, evidence gallery proportions, and print styles

### Improved Metadata

- "Additional Details" section flattened into the main form — no more collapsed section
- Expanded Data Sources list: added arXiv, bioRxiv, MedRxiv, ERIC, PsycINFO, and more
- Expanded Search Methods: added Vector search, Hybrid search, Controlled vocabulary/MeSH
- Added disciplines: Multidisciplinary, Information Science, Communication and Media Studies, Geography
- Renamed "Access Level" to "Availability", "Tool Logo URL" to "Logo"
- Added "Personal account" authentication method

### Improved Rubric Content

- N/A scoring guidance added to all 10 scoring questions (was 2/10)
- Score descriptions rewritten with concrete behavioral grounding
- 13 of 20 example items rewritten with specific evidence anchors (UI elements, quoted text, named entities)

### Bug Fixes

- Fix score selection could not be unselected once chosen
- Fix screenshots not capturing on some pages (host permissions)
- Fix evidence modal cutting off on narrow screens
- Fix capture grid thumbnails displaying at wrong aspect ratio
- Fix help popover not dismissing on outside click
- Fix Escape key being captured in nested textareas

### Accessibility

- All score labels are keyboard-focusable
- Radiogroup elements have descriptive aria-labels
- All animations respect prefers-reduced-motion setting
- WCAG AA contrast compliance for score colors in reports

## v0.5.0 — 2026-05-27

### Report design overhaul

- Add numeric score display to nutrition label
- Add circle scale legend and score fractions (e.g. "2.5/4") to nutrition label
- Enlarge nutrition label verdict stamp for better readability
- Add score count labels (e.g. "1:3 2:5 3:2") to distribution bars
- Add footer to full evaluation report with session metadata
- Add full report reference link in nutrition label footer
- Hide empty strengths/weaknesses columns in nutrition label
- Rename "Quality Gate Issues" to "Notes" and show all-pass state

### Evaluation tab redesign

- Redesign evaluation score status area with improved visual hierarchy
- Improve all evaluation tab parts — progress circles, score chips, question rows

### Accessibility (WCAG AA)

- Darken score-1 and CAUTION colors in report for 4.5:1 contrast ratio
- Darken --score-1 sidepanel UI token for WCAG AA
- Add table accessibility attributes (scope, headers) to report tables
- Remove nested `<a>` tags in nutrition label header
- Improve evidence image alt text for screen readers

### Report robustness

- Fix `@page` print content syntax error
- Add color-mix() fallback values for older browsers
- Close nutrition-principles `<div>` before footer to prevent layout breakage
- Fix missing closing brace in `distributionBar()` function
- Cap evidence image width to 300px on screen

### Internal

- Bump GitHub Actions to Node 24 compatible versions
- Bump pnpm/action-setup v4 → v6
- Add report design analysis documents (audit, typography, layout, color, UX critique, Tufte data viz, clarity, hardening, nutrition label)
- Add example export result artifacts for reference

### Tests

- Update tests for color token changes and label renames

## v0.4.0 — 2026-05-23

### Rubric v1.1

- Upgrade rubric from v1.0 to v1.1 with 4 quality gate questions (was 2)
- Add Intellectual Property gate (IP1) for copyright/preservation assessment
- Split Privacy & Security into two gates: data privacy (PS1, all tools) and AI training policy (PS2, AI-only)
- Add `ai_only` flag to 4 rubric questions for dynamic hiding when tool does not use AI
- Add Authentication Method metadata field with 8 predefined options (SSO/SAML, IP Authentication, etc.)
- Expand discipline options from 26 to 34 — Arts & Humanities and Social Sciences replaced with Scopus subcategories
- Add N/A scenario guidance to PS1, IP1, and AC1 background text
- Add deterministic database scoring guidance to RE2 background
- Remove stale `related_gate` reference from TC1

### Logic & scoring

- Add `getVisibleRubricQuestionIds()` for filtering ai_only questions by usesAi flag
- Dynamic completion denominator — progress bar and completion percentage now exclude hidden ai_only questions
- Fix `getAiOnlyRubricIds()` to return full dot-separated rubricIds — enables correct usesAi toggle confirmation and score clearing
- Fix `computeCompletion` numerator to filter by visible question set — prevents >100% completion display
- Fix `categorySummary` in Evaluation to filter by usesAi — consistent per-category totals
- Thread `usesAi` through `computeReportScores` — accurate question counts in HTML report
- Add `countUnsure()` with usesAi filtering for displaying unsure counts alongside principle averages
- Remove unnecessary type casts in `getVisibleRubricQuestionIds` — PassFailQuestion and ScoringQuestion both expose ai_only directly

### HTML report

- Render 6 procurement/access metadata fields in header (company, pricing, availability, termsConditionsUrl, authenticationMethod, usesAi)
- Filter gate rows and category sections by usesAi — non-AI sessions no longer show ai_only questions

### Capture & export

- Add WebP/JPEG compression for IndexedDB screenshot storage (WebP quality 0.95, JPEG fallback)
- Guard restricted URL schemes (`javascript:`, `data:`, `blob:`, `chrome:`, `chrome-extension:`) in page info capture
- Add `Authentication_Method` to CSV export

### UX & design

- Add animated progress bar with green completion pulse on Evaluation tab
- Add category fill chips with `color-mix` tinting for per-category score visualization
- Add score row scale+shadow micro-interaction on hover
- Add slide-down animation for question detail expansion
- Add section kicker left-border accent color per category
- Add micro-interactions across all tabs: pill-toggle press, capture float animation, grid card fade-up, grade button press+shadow, draft-saved fade-out toast, bullet list slide-in
- Apply WCAG AA contrast fix for grade buttons (score-1-strong token)
- Improve CSS contrast, easing curves, and spacing from design audit

### Internal

- Fix FinalizationScreen setTimeout cleanup on unmount
- Narrow Evaluation tab computeCompletion dependency to session?.usesAi
- Fix CSS `--section-context-accent` to use defined `--section-accent` token
- Scope `omp-slide-down` animation to `[open]` state to prevent replay on re-render
- Add `.audit/` to .gitignore

### Tests

- Add tests for `getVisibleRubricQuestionIds` (3 tests: all-visible, ai_only filtering, non-AI QG inclusion)
- Add tests for `computeCompletion` with `usesAi=false` (4 tests: visible-only scoring, no-exceed, denominator, numerator filtering)
- Add 4-test suite for `countUnsure` (zero unsure, partial, unknown category, usesAi filtering)
- Replace vacuous early return in quality gate test with explicit `expect().toBeDefined()`
- Fix `AllProviders` test helper to default `usesAi: true` (matches production default)
- Update all tests for v1.1 rubric structure (14 questions, 4 QG)
- Fix biome lint warnings across 13 test files

## v0.3.0 — 2026-05-22

### Security
- Strip iframes, on\* handlers, javascript: URLs, and meta refresh from archived page HTML — prevents stored XSS
- Enforce 200 MB input size, 500 entry count, and 500 MB uncompressed budget on session ZIP import — blocks ZIP bomb attacks
- Remove `<all_urls>` host permission from manifest — extension now requests only `activeTab`
- Validate imported session.json structure before casting — rejects malformed imports early

### State management
- Await IndexedDB save before switching sessions — prevents data loss on race conditions
- Clear session metadata fields (toolLogoUrl, termsConditionsUrl) when the linked capture is removed
- Cancel pending autosave timer when user explicitly saves or clears finalization
- Make `isCapturing` reactive boolean state instead of function — UI now correctly reflects capture queue
- Stabilize QuestionRow memo with module-level constant — eliminates unnecessary re-renders

### UX
- Add close button and Escape key handler to expanded capture details
- Add annotate and delete buttons to captures list view
- Use semantic `<section>` element for capture details panel
- Add `aria-live` regions to toast notifications for screen reader support
- Fix captures grid — removed unresponsive breakpoints for narrow sidePanel viewport

### Refactoring
- Extract 604-line inline CSS string to `lib/report.css` imported via `?raw` — no behavior change

### Tests
- 20 new component tests for Captures, EvidenceModal, and SessionManager
- 6 new XSS hardening tests for archivePageHtml
- 3 new ZIP bomb protection tests
- New benchmarks for export pipeline (sanitizeFilename, minifyHtml, minifyCss) and report functions (scoreColor, distributionBar, qualityGateResults, principleAverage)
- 462 total tests (up from 377), 31 benchmarks (up from 29)

## v0.2.0 — 2026-05-22

### Export improvements
- Screenshot evidence converted to JPEG — smaller ZIP files with no visible quality loss
- Logos extracted as separate files instead of inline base64 — eliminates ~36 KB of duplication
- HTML and CSS minification applied to all files in the export ZIP
- DEFLATE level 9 compression enabled — tighter ZIP output
- Shared CSS extracted into a single `report.css` referenced by both HTML reports
- Evidence files stored at ZIP root with short IDs for smaller paths
- HTML screenshots minified before storage

### Performance
- Report generation rewritten with pre-computed Maps and Sets — O(1) lookups replace O(n) scans
- Template rendering converted from `.map().join()` chains to flat loops — eliminates intermediate array allocations
- Scoring and gate checks merged into single-pass loops
- HTML escape function uses single-pass regex with early-out for clean strings
- Date formatting uses string slicing instead of `Date` object construction
- Shared evaluation Map eliminates 12 redundant Map builds per report

### Image handling
- Logo images resized to max 400 px before JPEG conversion
- Zero-copy `Buffer` views for pixel data during image downscale
- Dynamic imports cached — no repeat module resolution per export

### UI fixes
- 9 design review findings resolved (alignment, spacing, consistency)
- Code review findings addressed (lint, type safety, dead code removal)
- Extracted memoised `QuestionRow` component to prevent render cascades

### Infrastructure
- CI workflow with coverage thresholds
- Firefox ZIP build and upload in release workflow
- Playwright E2E test harness with extension smoke test
- CodSpeed performance benchmarks
- Apache License 2.0
- Legacy CSV-based import and localStorage migration paths removed

### Added
- Component test infrastructure with `AllProviders`, `renderWithProviders`, and `seedActiveSession`
- 36 unit tests for minifiers, data migration, and image conversion
- 20 component tests for ActiveSession and Metadata panels
- Tests for accessibility hooks, toast store, capture validation, and scoring edge cases

## v0.1.0 — 2025-05-06

### Added
- TRUST Full and TRUST Lite rubric variants
- Quality gate scoring (pass/fail) for privacy, traceability, and accessibility
- Scoring rubric (0–3) across five TRUST principles
- Screenshot and HTML capture with rubric tagging
- Auto-save to IndexedDB with save status indicator
- Session management (create, switch, delete, resume)
- Review finalization with grade, conclusion, strengths, weaknesses, and recommendations
- Export to ZIP with HTML report, CSV data files, and evidence folder
- Side panel UI with tabbed navigation
- Keyboard-accessible focus indicators
