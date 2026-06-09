# Documentation & Developer Experience Audit

**Date**: 2026-06-09
**Scope**: README.md, CLAUDE.md, DESIGN.md, PRODUCT.md, docs/, code comments, error messages, API documentation, developer onboarding

---

## Summary

Documentation is strong in depth (DESIGN.md, PRODUCT.md, TRUST-NORTH-STAR.md, TRUST-FRAMEWORK.md, IMPLEMENTATION-PLAN.md) but weak in surface area — missing key developer-entry files and user-facing guides. The README has a stale version badge and no contribution guide. CLAUDE.md is comprehensive for AI agents. Public APIs in `lib/` lack JSDoc. Error messages are good in the export/import path but thin elsewhere. A new human contributor would struggle to find where to start.

---

## Documentation Coverage Map

| Document | Location | Audience | Status | Quality |
|----------|----------|----------|--------|---------|
| README.md | `/` | All (users + devs) | Present, stale badge | Good |
| CLAUDE.md | `/` | AI agents | Present, comprehensive | Excellent |
| DESIGN.md | `/` | Designers + devs | Present, thorough | Excellent |
| PRODUCT.md | `/` | Product + design | Present, concise | Good |
| USER-GUIDE.md | `docs/` | End users | Present, sparse | Weak |
| TRUST-FRAMEWORK.md | `docs/` | All | Present, comprehensive | Excellent |
| TRUST-NORTH-STAR.md | `docs/` | All | Present, thorough | Excellent |
| IMPLEMENTATION-PLAN.md | `docs/` | Devs | Present, detailed | Good |
| IMPROVEMENT-SWEEP.md | `docs/` | Devs | Present | Good |
| CONFERENCE-WEBSITE-PROPOSAL.md | `docs/` | Devs | Present | Good |
| CHANGELOG.md | `/` | All | Present, well-maintained | Good |
| CONTRIBUTING.md | `/` | New contributors | **Missing** | — |
| Architecture Decision Records | `docs/adr/` | Devs | **Missing** | — |
| Testing guide | — | Devs | **Missing** | — |
| API reference | — | Devs | **Missing** | — |

---

## Quality Assessment Per Document

### README.md — Good (with issues)

**Strengths:**
- Clear value proposition in the opening block: "Capture evidence, score against the TRUST framework, export a complete review package"
- Install instructions for both Chrome and Firefox (unpacked extension)
- Usage section with table-based quick reference for tabs, tools, keyboard shortcuts
- Architecture ASCII diagram showing component hierarchy
- Tech stack listed with rationale
- Development setup is concise (4-line install)

**Issues:**
fix:
- **P1 — Stale version badge**: Shows `0.6.0` but actual version is `0.7.1` (line 8). Hardcoded badges drift. Should use dynamic badge or keep in sync with `package.json`.
-> add dynamic badge.
- **P2 — Missing screenshots/media**: The architecture section is text-only. No animated demo, no screenshots of the extension UI. A visual tool should show itself.
-> good tip, improve/add.

skip:
- **P3 — "Tips" section overlaps with USER-GUIDE.md**: Both documents cover similar ground (capture as you go, tag evidence). Risk of drift.
-> doesn't matter much, no need to spend effort on
- **P2 — No CONTRIBUTING.md link**: No pointer to contribution guidelines, PR process, or code of conduct.
-> will be tackled later, ignore here

### CLAUDE.md — Excellent

**Strengths:**
- Complete command reference with one-liner descriptions
- Full architecture tree mapping every file to its responsibility
- Design tokens section summarizing brand colors and typography
- Persistence model clearly documented (two-store: registry → localStorage, session → IndexedDB)
- Data flow documented in numbered steps
- Key decisions section captures design rationale
- Agent skills section documents tooling (roborev, impeccable)

**Issues:**
fix:
- **P3 — Agent skills section is large (40+ lines)**: The impeccable and roborev configuration details add noise for humans reading CLAUDE.md. Consider splitting to `.agents/README.md` or a separate agent-ops doc.
-> drop these from CLAUDE.md.

### DESIGN.md — Excellent

**Strengths:**
- Creative North Star ("The Review Bench") gives immediate design intuition
- Complete color system with hex values, semantic roles, and usage rules
- Typography hierarchy with font families, weights, sizes, tracking
- Component specs (buttons, chips, cards, inputs, navigation, rating scale, judgment selector)
- Explicit "Do's and Don'ts" section — practically useful
- Design rules stated as principles (Flat Surface Rule, Principle Accent Rule, Score Spectrum Rule, Uppercase Header Rule)

**Issues:**
- None significant. This is a model design system document.

### PRODUCT.md — Good

**Strengths:**
- Clear user definition (academic librarians at UT, their context and workflow)
- Product purpose stated in one paragraph + success metric
- Brand personality defined
- Five design principles with rationale
- Accessibility stance documented

**Issues:**
ignore:
- **P3 — No "out of scope" section beyond anti-references**: Would benefit from explicit non-goals (e.g., "not a multi-user review platform", "not a policy compliance checker").
- **P3 — No metrics/KPIs**: No definition of how success is measured beyond "consistent, evidence-backed, auditable."
-> both not that important, scope is clear enough from context

### USER-GUIDE.md — Weak

**Strengths:**
- Covers all major workflows: capture, scoring, finalization, export
- Structured in numbered sections

**Issues:**
fix: remove this file entirely -- it feels unneccesary and hard to discover? If you think it should be kept, update it and integrate into the README
- **P1 — Extremely sparse (36 lines)**: A 36-line guide for a tool with 5 tabs, evidence annotation, rubric tagging, quality gates, scoring, finalization, and export is insufficient.
- **P1 — No visual aids**: No screenshots, no annotated screenshots of the UI. A side-panel extension is inherently visual.
- **P2 — Missing sections**: No troubleshooting ("capture failed", "export is empty"), no glossary of TRUST terms, no walkthrough of a complete review from start to finish.
- **P2 — No link to TRUST framework reference**: The guide mentions "TRUST principles" without linking to `docs/TRUST-FRAMEWORK.md`.
- **P2 — Keyboard shortcuts not documented**: README has them, USER-GUIDE does not.
- **P3 — No "getting help" section**: No link to GitHub issues, discussions, or contact.

### TRUST-FRAMEWORK.md — Excellent

**Strengths:**
- Complete framework reference (587 lines)
- Explains TRUST acronym, purpose, two variants (Full vs Lite), AI vs non-AI handling
- Quality gates and scoring rubric fully documented
- Scoring scale (0–3) defined with examples

**Issues**:
fix: review that this is still correct and up to date, matching with current implemention, add changelog w/ dates to make it clear when it was last updated

### TRUST-NORTH-STAR.md — Excellent

**Strengths:**
- Defines tool scope, users (primary/secondary/tertiary with "Not:" clarifications), outputs, quality standards
- Export artifact table with descriptions
- Content quality criteria for rubric text
- Separate sections for evaluator, reviewer, and end-user experience
- Clear "what the tool is NOT" statements

**Issues:**
fix: review this to be certain, add a date and changelog to make it clear when it was revised

### IMPLEMENTATION-PLAN.md — Good

**Strengths:**
- Sprint-based with severity ordering
- Each finding has file, change description, and verification steps
- Clear scope boundaries (what's NOT in each sprint)

**Issues:**
fix:
- **P3 — Stale reference**: Cites "IMPROVEMENT-SWEEP.md (125 findings)" but doesn't note which have been completed.
-> drop the entire implemention-plan.md file, not important to keep


---

## Code Comments Quality
**Issues**:
fix: ensure all modules have appropriate comments of decent quality; treat each file in the same way.

### lib/export-pipeline.ts — Good

Comments are purposeful:
- JSDoc on `sanitizeFilename()` explains the sanitization scope (path separators, parent dir refs, Windows-invalid chars)
- `LightweightCapture` type has an inline doc explaining why it's a subset
- `ExportArtifacts` interface is fully documented with per-field JSDoc
- `shortId()` has a one-liner explaining the ID truncation strategy
- `prepareExportArtifacts()` has a block comment explaining separation from ZIP logic
- Inline comments explain implementation decisions (cached dynamic imports, screenshot merge strategy)

### lib/html-report.ts — Good

Well-commented for a template-heavy file:
- Section markers (`// ── Constants ──`, `// ── Utilities ──`) aid navigation in the 627-line file
- `esc()` has a comment explaining the regex-based optimization (skip if no chars need escaping)
- `isSafeUrl()` documents the URL validation intent
- `formatDate()` explains ISO slicing approach (avoids Date construction)
- `REPORT_COLORS` comment explains why colors differ from design tokens (WCAG AA contrast)

### stores/session.ts — Adequate

- File-level JSDoc explains security model (unencrypted IDB, same-origin access)
- Inline comments explain screenshot persistence split (heavy blobs → separate IDB store)
- `setEvaluation` has a comment explaining shallow-merge behavior
- Missing: No JSDoc on any of the 13 public methods. The store interface is self-documenting but would benefit from `@param` docs for `linkCaptureToRubric`, `unlinkCaptureFromRubric`.

### lib/rubric.ts — Minimal

- Only 3 JSDoc comments in 251 lines (`getQuestionCode`, `getQGCategoryCode`, `getAccentKey`)
- Helper functions like `computeCompletion`, `getLinkedRubricIdsForCapture`, `qualityGateResults` have zero documentation
- `principleAverage` is a key scoring function with no JSDoc
- Magic numbers (e.g., the scoring formula) are uncommented

### lib/capture/browser.ts — Good

- `ALLOWED_SCHEMES` and `MAX_CAPTURE_SIZE` are named constants with comments
- URL scheme validation has inline comments explaining the security rationale
- Error messages are descriptive (see Error Messages section)

### lib/session-repository.ts — Adequate

- Interface `SessionRepository` is clean and self-documenting
- Constants are labeled
- `openDB()` explains the upgrade path
- `save()` has a quota guard comment with estimation logic
- `InMemorySessionRepository` is documented by name only
- `setRepository()` / `resetRepository()` have minimal docs (one-liner on reset)

### lib/export.ts — Good

- `downloadBlob()` has a comment about URL revocation delay
- ZIP bomb protection constants are clearly labeled
- `validateSessionData()` has inline comments per validation step
- `importSessionFromZip()` has path traversal protection with explanatory comment

---

## Error Messages Quality

**Issues**:
fix: ensure all errors are ranked as 'good' error messages where possible. Add when missing.

### Good Error Messages

**lib/export.ts** — Thorough, user-facing validation:
- `"session.json is not a valid object"` — clear
- `"metadata.id must be a non-empty string"` — specific field-level
- `"ZIP file too large (X MB). Maximum compressed size is 200 MB."` — includes actual vs limit
- `"ZIP entry 'X' has invalid path. Archive may be corrupted or malicious."` — names the bad entry + guidance
- `"No session.json found in archive. Not a valid TRUST Review export."` — tells user what's wrong and what format is expected
- `"ZIP contains too many entries (X). Maximum is Y."` — quantitative

**lib/capture/browser.ts** — Contextual:
- `"No active tab found"` — direct
- `"Cannot capture this page — chrome: URLs are not accessible. Browser-internal pages cannot be captured."` — explains *why*, not just *that* it failed
- `"Cannot capture this page — the URL is invalid."` — distinct error for malformed URL

**lib/session-repository.ts** — Adequate:
- `"Database upgrade blocked — close other tabs and retry"` — actionable
- `"Transaction aborted"` — generic but IDB-specific

### Weak Error Messages

- **stores/session.ts** — `console.error("Failed to persist screenshot:", err)` — logged but not surfaced to user. Silent data loss risk.
- **stores/session.ts** — `console.error("Failed to delete screenshot:", err)` — same issue. Delete failures are invisible.
- **No user-facing error boundary docs** — `ErrorBoundary.tsx` exists but there's no documentation of what errors it catches or how to extend it.

### Missing Error Messages

- **No validation in Zustand store setters**: `updateMetadata(patch)` silently ignores updates when `session` is null. No warning, no throw. Callers have no feedback.
- **IDB quota warning is console-only**: `session-repository.ts` logs a `console.warn` for low storage but never surfaces this to the user. Could result in silent save failures.

---

## API Documentation
**Issues**:
fix: add documentation where missing. Ensure at least minimal coverage of all public and private apis.

### JSDoc Coverage

Key public modules in `lib/` have near-zero formal JSDoc:

- **lib/types.ts** — All interfaces have inline field comments (e.g., `/** URL or data URL for the reviewed tool's logo */`) but no `@remarks` or `@example` blocks.
- **lib/rubric.ts** — 251 lines, ~3 JSDoc comments. Public functions like `getVisibleRubricQuestionIds`, `computeCompletion`, `qualityGateResults`, `principleAverage` have no documentation.
- **lib/export-pipeline.ts** — Best-documented module. `ExportArtifacts` has per-field docs, `sanitizeFilename` has JSDoc, `shortId` has a one-liner. `prepareExportArtifacts` has a block comment.
- **lib/html-report.ts** — Good self-documentation via section markers and inline comments, but no formal JSDoc on exported functions (`buildHtmlReport`, `buildNutritionLabel`).
- **lib/session-repository.ts** — Interface is self-documenting. `resetRepository()` has a one-liner.
- **stores/session.ts** — No JSDoc on any store method.

**Assessment**: The codebase relies on descriptive naming rather than formal API documentation. This works for the current small team but creates a gap for new contributors and for the exported functions that form the public surface (`rubric.ts`, `export.ts`, `export-pipeline.ts`).

---

## Developer Onboarding Assessment
**Issues**:
fix: ensure at least a minimally viable onboarding experience. Be concise, this project is not that complex after all.

### What a new contributor would experience:

1. **README.md** → "Install" section is clear. `pnpm install && pnpm dev` works.
2. **Architecture diagram** → Good ASCII tree. But no explanation of the data flow between stores.
3. **Where to start?** → No CONTRIBUTING.md, no "good first issue" label system, no onboarding guide.
4. **Codebase navigation** → CLAUDE.md has the best component map. A human reader would need to find CLAUDE.md (not obvious it's relevant to humans).
5. **Testing** → No testing guide. `vitest.config.ts` exists, tests are in `tests/`, but no documentation on conventions (render helpers, mock patterns, test naming).
6. **Design system** → DESIGN.md is excellent but not linked from README.
7. **Domain knowledge** → TRUST-FRAMEWORK.md is comprehensive but a new dev would need to know it exists.

### Friction points:

- **No CONTRIBUTING.md** — Most impactful gap. A new contributor has no guide for: branch naming, PR process, commit conventions, linting setup, test expectations.
- **CLAUDE.md is dual-purpose** — Serves AI agents well but is not designed as a human contributor onboarding doc. The agent skills section (roborev, impeccable) is noise for humans.
- **No testing documentation** — ~575 tests exist but there's no guide on test patterns, how to run specific tests, or the `renderWithProviders` helper convention.
- **No ADR (Architecture Decision Records)** — Key decisions are scattered: persistence in CLAUDE.md, security in CHANGELOG, design in DESIGN.md, but no single place records *why* decisions were made.

---

## Severity-Tagged Findings

### P1 — Should Fix

| ID | Finding | Location | Impact |
|----|---------|----------|--------|
| DOC-P1-1 | README version badge stale (shows 0.6.0, actual is 0.7.1) | `README.md:8` | Misleading for users checking latest version |
| DOC-P1-2 | USER-GUIDE.md is only 36 lines — too sparse for the tool's complexity | `docs/USER-GUIDE.md` | End users lack guidance; support burden falls on devs |
| DOC-P1-3 | No CONTRIBUTING.md — no contributor onboarding path | Root (missing) | New contributors have no entry point |
| DOC-P1-4 | IDB storage warnings are console-only, never surfaced to users | `lib/session-repository.ts:82`, `stores/session.ts:74,84,96` | Silent data loss risk |

### P2 — Should Fix When Convenient

| ID | Finding | Location | Impact |
|----|---------|----------|--------|
| DOC-P2-1 | No screenshots or visual demo in README | `README.md` | Extension is visual; text-only README undersells it |
| DOC-P2-2 | USER-GUIDE missing: troubleshooting, glossary, keyboard shortcuts, walkthrough | `docs/USER-GUIDE.md` | Users hit issues with no self-service help |
| DOC-P2-3 | No testing guide (conventions, helpers, patterns) | Missing | New devs can't write tests effectively |
| DOC-P2-4 | No ADR — architectural decisions not formally recorded | `docs/adr/` (missing) | Decisions are scattered, rationale lost over time |
| DOC-P2-5 | Tips section in README duplicates USER-GUIDE | `README.md`, `docs/USER-GUIDE.md` | Drift risk |
| DOC-P2-6 | Zustand store setters silently swallow errors | `stores/session.ts` | Callers get no feedback on failures |
| DOC-P2-7 | Public lib/ functions lack JSDoc | `lib/rubric.ts`, `lib/html-report.ts` | Contributors can't discover APIs without reading source |

### P3 — Nice to Have

| ID | Finding | Location | Impact |
|----|---------|----------|--------|
| DOC-P3-1 | IMPLEMENTATION-PLAN doesn't track completion status | `docs/IMPLEMENTATION-PLAN.md` | Unclear what's done vs pending |
| DOC-P3-2 | CLAUDE.md agent skills section is 40+ lines of noise for humans | `CLAUDE.md:127-166` | Reduces CLAUDE.md readability for human readers |
| DOC-P3-3 | PRODUCT.md lacks explicit non-goals and success metrics | `PRODUCT.md` | Ambiguous scope boundaries |
| DOC-P3-4 | ErrorBoundary.tsx undocumented | `components/ErrorBoundary.tsx` | Contributors don't know how to extend error handling |
| DOC-P3-5 | rubric.ts scoring functions have magic numbers | `lib/rubric.ts` | Scoring logic is opaque without reading formula carefully |

---

## Recommendations

### Immediate (P1)

1. **Fix version badge**: Update `README.md:8` to `0.7.1` or use a dynamic badge from `package.json`.
2. **Expand USER-GUIDE.md**: Add screenshots, a complete review walkthrough, troubleshooting section, keyboard shortcuts, glossary. Target 150+ lines.
3. **Create CONTRIBUTING.md**: Include branch naming, PR template, commit conventions (`pnpm typecheck`/`lint`/`test`), development workflow, testing patterns.
4. **Surface IDB errors to users**: `session-repository.ts` quota warnings and `session.ts` screenshot persistence failures should trigger toast notifications, not just `console.error`.

### Short-Term (P2)

5. **Add README screenshots**: Animated GIF or 3-4 screenshots showing the extension workflow.
6. **Write a testing guide**: Document `renderWithProviders`, `AllProviders`, mock conventions, test file naming (`<module>.test.tsx`), and how to run specific tests.
7. **Start ADR directory**: `docs/adr/` with initial records for: persistence architecture (IDB + localStorage split), export pipeline design, security model (CSP, isolated world), and rubric data format.
8. **Add JSDoc to key public APIs**: At minimum `lib/rubric.ts` exports and `lib/export-pipeline.ts` main functions.
9. **Deduplicate Tips**: Remove from README, expand in USER-GUIDE with richer content.

### Long-Term (P3)

10. **Track IMPLEMENTATION-PLAN completion**: Add status markers (✅/🔄/⬜) to each sprint item.
11. **Extract agent config from CLAUDE.md**: Move roborev/impeccable config to `.agents/README.md`.
12. **Document ErrorBoundary contract**: What it catches, how to add custom error boundaries, fallback UI expectations.
