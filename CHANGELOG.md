# Changelog

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
