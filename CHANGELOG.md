# Changelog



## v0.8.0 — 2026-06-09

### Performance: 4× Faster Initial Load

The tldraw annotation library (1.6 MB) is now lazy-loaded only when you open the evidence annotation editor. The initial sidepanel load dropped from 2.07 MB to 438 KB — the extension opens and becomes interactive roughly four times faster.

### Fixed: Score Circles Use Strict Rounding

Score circles on the TRUST Label now use `Math.floor` for consistent display. Previously, a principle averaging 1.5 could round up to show 2 filled circles, which overstated the score. Now it always rounds down: 1.5 → 1 filled circle. This aligns the visual display with the printed numeric average below each principle.

### Fixed: Accessibility in Exported Reports

- Nutrition label principle table now uses proper `<th>` header cells instead of `<td>`, so screen readers can announce column headers correctly.
- Print stylesheet caps embedded images at 300 px height to prevent oversized prints.

### Security: Hardened Export Pipeline

- Archive sanitizer now strips CSS `url()` references and sanitizes `srcset` attributes in imported HTML captures.
- ZIP path-traversal check now also URL-decodes entry names to catch encoded `..` sequences.
- Malformed percent-encoding in ZIP entry names no longer crashes the import.
- `safeLink()` in HTML reports now sanitizes the `attrs` parameter, preventing potential attribute injection.

### Improved: Design System Consistency

- Focus rings now use the brand blue token (`--ut-blue`) instead of magenta, improving visibility on dark backgrounds.
- Touch targets on buttons raised to 28 px minimum for better mobile/tablet usability.
- Five decorative box-shadows removed for a cleaner, flatter aesthetic.
- Modal border-radius aligned with the design token (`--radius-md`).
- Finalization screen inline styles replaced with CSS classes for consistency.
- CSS transitions narrowed from `all` to specific properties, eliminating unintended animation of layout properties.

### Under the Hood

- Export pipeline pre-computes a question lookup map for faster report generation.
- ZIP compression tuned from level 9 to 6 (smaller files, faster exports).
- Logo ZIP entries renamed from `1.jpg/2.jpg/3.jpg` to semantic names (`trust-logo.jpg`, etc.).
- Rubric validation at startup ensures the bundled rubric JSON is structurally correct.

## v0.7.1 — 2026-06-08

### Security: Manifest Hardening for Chrome Web Store

Several changes to reduce the extension's permission surface and make its security posture structurally verifiable by Chrome Web Store reviewers:

- **Dropped `tabs` permission.** Host permissions (`<all_urls>`) already provide access to tab URL, title, and favicon. One fewer permission in the manifest.
- **Added strict Content Security Policy.** `connect-src 'self'` blocks all outbound network requests from extension pages. The extension literally cannot phone home.
- **Moved image fetches into content scripts.** Logo extraction (`fetch(logoUrl)`) and report image inlining now run inside `executeScript` (page context) instead of the extension context. No extension-level network access needed.
- **Explicit `world: "ISOLATED"` on all content scripts.** Injected functions run in Chrome's isolated JavaScript world — they can read DOM but cannot access or be affected by page JavaScript.
- **Security documentation in manifest config.** Inline comments in `wxt.config.ts` document the threat model: no outbound network, isolated content scripts, zero eval, hardcoded read-only DOM queries.

### Security: Additional Fixes

- **URL scheme validation on `window.open`.** The "Open tool in new tab" button in the session list now validates that the URL starts with `http://` or `https://`, preventing `javascript:` scheme injection from manually entered URLs.

### Full Security Audit Summary

- Zero `innerHTML`, `dangerouslySetInnerHTML`, `eval()`, `new Function()`, or `document.write()` in production code
- HTML report escapes all user data via `esc()` and validates URLs via `isSafeUrl()`
- CSV export uses PapaParse's built-in escaping
- ZIP import validates size limits, entry count, path traversal, and schema
- Archive sanitizer strips scripts, iframes, event handlers, and dangerous URLs
- No `postMessage` communication with web pages
- 2 dev-dependency CVEs (`tmp`, `uuid`) are in the WXT tooling chain only — no production exposure


## v0.7.0 — 2026-06-05

### New: Finalize & Export Buttons in Top Bar

Two new action buttons appear in the review header next to the quick-access tools:

- **Finalize** — navigates to the Finalize tab. The button is desaturated by default; when all evaluation questions are scored it turns green and pulses gently to draw attention. Once the review is finalized, the pulse stops but the green color remains.
- **Export** — downloads the review as a .zip file regardless of finalization state. Works even with empty fields. Uses the same magenta accent as the rest of the brand.

Both buttons show an icon and a text label, separated from the quick tools by a thin divider.

### New: Discipline Accordion

The Discipline field in Metadata now shows only "Multidisciplinary" by default (the most common choice for information tools), with a "more options ↓" toggle that expands to reveal all 39 discipline options plus the custom input field. If a previously imported session already has non-default disciplines selected, the accordion auto-expands to show them. Once expanded, it stays expanded until the user collapses it.

### Fixed: Nutrition Label Score Circles

The score circles on the TRUST Label (nutrition label) now correctly show scores out of 3 instead of out of 4. The rubric uses a 0–3 scale (4 levels), so a perfect score now shows ●●● 3/3 instead of ●●●● 4/4. This also fixes incorrect overall scores when a principle has only one question (e.g., AI-only tools where TR has a single rubric question).

### Fixed: Question Count Overflow on Import

Importing a review from an older version of the framework (which had more questions) could show "15/14 questions answered" in reports and on the session list. The answered count is now capped at the total for the current rubric, so the display never exceeds 100%.

### Fixed: Metadata Type Safety for Older Imports

Older exported sessions sometimes stored array fields (discipline, dataSources, searchMethods) as plain strings instead of arrays, causing crashes like `(t.discipline ?? []).join is not a function`. A shared `ensureArray()` utility now handles all three cases gracefully across the metadata form, CSV export, and HTML report — a string value is treated as a single-element array.

### Fixed: Tool Logo in Exported Reports

The tool logo in exported HTML reports now uses an inlined data URL instead of linking to the original remote image. This means the logo appears correctly when the report is viewed offline. The favicon is also inlined. If the remote fetch fails, the original URL is kept as fallback.

### Fixed: Blank Canvas on Imported Evidence

Opening the annotation editor on evidence from an imported .zip (especially from older framework versions) could show a blank tldraw canvas with the capture info visible below. The image loading is now decoupled from tldraw's mount lifecycle — it waits for both the editor and the screenshot data to be available before rendering the background image. This fixes the race condition where the editor mounted before the IDB screenshot store had loaded.

### Fixed: Modal Viewport Positioning

The evidence annotation modal now explicitly uses `top/left/right/bottom: 0` with `overflow-y: auto`, ensuring it covers the full viewport and stays centered even in extension sidepanel contexts where `inset: 0` shorthand may behave unexpectedly.

### Fixed: Annotation Stroke Size

The default pen size in the annotation editor is now correctly set to "L" (large). Previously, a hardcoded "m" was overriding the configured default, making annotations too thin on captured screenshots.

### Under the Hood

- Full Playwright E2E test suite added (13 tests covering session lifecycle, evaluation, captures, finalization, and extension behavior)
- Dead code removed: unused screenshot compression pass-throughs, unused `compact` prop on DoneToggle
- Tooltip titles aligned with ARIA labels for consistency
- README rewritten with logo, feature overview, usage guide, and development setup instructions

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
