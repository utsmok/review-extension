# Codebase Cleanup Review
Date: 2026-05-28

## Executive Summary

The codebase is in good shape overall — recent refactoring has removed dead code (uuid dependency calls, inline styles extracted to CSS), extracted reusable components (ScoreOption), and split monolithic modules (minify.ts from export.ts). Biome lint passes clean with zero warnings across 113 files.

This review identifies remaining cleanup opportunities: dead code, unnecessary complexity, inconsistent patterns, and tech debt that should be addressed before the next feature cycle.

## Findings

### P2 — Medium Priority

**1. `saveCurrentSession()` fire-and-forget variant is dead code**
- `lib/session-lifecycle.ts:37-44` — `saveCurrentSession()` is sync wrapper that calls the async version without awaiting
- All call sites now use either `saveCurrentSessionAsync()` or `markDoneAndClose()` which awaits properly
- The auto-save module uses `saveCurrentSessionAsync()` directly
- **Impact**: Confusing API surface — two functions for the same operation
- **Fix**: Remove `saveCurrentSession()` and rename `saveCurrentSessionAsync()` to `saveCurrentSession()` (returning a promise is fine)

**2. `capture.ts` still imports from removed uuid package — import removed but package stays**
- `lib/capture.ts:1` — `import { v4 as uuidv4 } from "uuid"` was replaced with `crypto.randomUUID()`
- `components/NewSessionModal.tsx` — same migration
- But `uuid` remains in `package.json` dependencies
- **Impact**: Unused dependency adds to install size
- **Fix**: Run `pnpm remove uuid` and verify no other imports remain

**3. `export.ts` has two functions for filename sanitization**
- `lib/export.ts:19-28` — `sanitizeFilename()` with full invalid char regex
- The function is only used in two places: `downloadBlob` filename and ZIP entry names
- **Impact**: Minimal — function is small and correct
- **Fix**: Keep as-is; consider moving to a `lib/filename.ts` utility if used more broadly

**4. `useActiveSession` forwards 22 properties — excessive API surface**
- `hooks/useActiveSession.ts` — returns status, session, captures, evaluations, finalization, plus 17 action functions
- Most components only need 2-3 of these
- **Impact**: Hard to understand which component uses which part of the hook
- **Fix**: Split into `useSessionData()` (read-only) and `useSessionActions()` (actions) — components import only what they need

**5. `lib/report/` directory contains compute-scores.ts but html-report.ts is in lib/ root**
- `lib/report/compute-scores.ts` — moved to subdirectory
- `lib/html-report.ts` — still in root
- `lib/report.css` — still in root (imported by html-report)
- **Impact**: Inconsistent file organization
- **Fix**: Move html-report.ts, report.css, and related files into `lib/report/` subdirectory

**6. Test file naming inconsistency**
- `tests/import-session-zip.test.ts` vs `tests/import-session-zip-file.test.ts` — two test files for similar functionality
- `tests/active-session-hook.test.ts` vs `tests/active-session-hook-coverage.test.ts` — coverage companion
- **Impact**: Confusing which file tests what
- **Fix**: Consolidate related test files; use clear naming like `session-import.test.ts`

**7. `ScoreOverviewBar.tsx` has duplicated badge rendering**
- Lines 171-186 and 192-207 — nearly identical JSX for QG badges and scoring badges
- Only difference is the divider between them
- **Impact**: Changes to badge rendering must be made in two places
- **Fix**: Extract a `BadgeButton` sub-component or use a single `.map()` with a divider insert

### P3 — Low Priority

**8. `getProgressState` imported from `components/ProgressCircle`**
- `components/ScoreOverviewBar.tsx:7` — imports `getProgressState` from ProgressCircle
- A utility function living in a UI component file
- **Fix**: Move to `lib/progress.ts` alongside other pure logic

**9. `esc()` function in html-report.ts could use DOM API instead**
- `lib/html-report.ts:41-45` — manual HTML escaping with regex + lookup map
- **Fix**: Could use `new TextEncoder()` but current approach is fine for server-side rendering context; keep as-is for bundle size

**10. CSS has orphaned comments referencing removed code**
- `lib/components.css` — some comments reference patterns that no longer exist
- **Fix**: Audit CSS comments for accuracy during next style pass

**11. `lib/minify.ts` — minifyHtml could be more aggressive**
- Currently only removes comments and normalizes whitespace
- Doesn't remove optional closing tags, unnecessary quotes, or collapse boolean attributes
- **Impact**: Minor — generated HTML is already reasonable size
- **Fix**: Consider using a proper HTML minifier for report output

**12. `stores/toast.ts` — toast store has no auto-dismiss cleanup**
- Toasts auto-dismiss but the timer isn't cleaned up on store reset
- **Impact**: Potential stale timeout if session is cleared while toast is visible
- **Fix**: Clear all pending toast timers in a `reset()` action

## Cleanup Priority Matrix

| Item | Effort | Impact | Risk |
|------|--------|--------|------|
| Remove `saveCurrentSession()` | S | M | L (call sites) |
| Remove uuid from package.json | S | S | S |
| Split useActiveSession | M | H | M |
| Consolidate report directory | S | M | S |
| Extract shared badge rendering | S | M | S |
| Consolidate test files | M | M | M |
| Move getProgressState | S | S | S |

## Top 5 Recommendations

1. **Remove unused uuid dependency** — one-liner, zero risk
2. **Consolidate saveCurrentSession variants** — reduces API confusion
3. **Move html-report.ts and report.css into lib/report/** — consistent file organization
4. **Extract shared badge rendering in ScoreOverviewBar** — DRY principle
5. **Split useActiveSession into data + actions** — cleaner component interfaces
