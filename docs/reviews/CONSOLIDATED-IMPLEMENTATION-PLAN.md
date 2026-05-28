# Consolidated Review — Implementation Plan
Date: 2026-05-28
Sources: Architecture (04), UI/UX (05), A11y+Perf (06), Cleanup (07), Deepening (08)
Total deduplicated findings: 28

---

## P0 — Critical / Security (2)

### C1. Capture sanitization has zero unit tests
- **Source**: Arch #4
- **Files**: `tests/capture-sanitize.test.ts` (NEW)
- **Scope**: Test each sanitization step in `archivePageHtml()` — script removal, event handler stripping, javascript: URL blocking, iframe/object/embed removal, meta refresh removal
- **Effort**: S | **Risk**: S

### C2. ScoreOverviewBar badges have no accessible name
- **Source**: A11y #1
- **Files**: `components/ScoreOverviewBar.tsx`
- **Scope**: Add `aria-label` to each badge button with full question title + state + evidence count
- **Effort**: S | **Risk**: S

---

## P1 — High Priority (8)

### H1. Remove unused `uuid` dependency
- **Source**: Cleanup #2
- **Files**: `package.json`
- **Scope**: `pnpm remove uuid` — verify no imports remain
- **Effort**: XS | **Risk**: XS

### H2. Consolidate `saveCurrentSession` variants
- **Source**: Cleanup #1, Arch #12
- **Files**: `lib/session-lifecycle.ts`
- **Scope**: Remove fire-and-forget `saveCurrentSession()`, rename `saveCurrentSessionAsync()` → `saveCurrentSession()`, update callers
- **Effort**: S | **Risk**: S (3 call sites)

### H3. Add hover/active/focus states to ScoreOverviewBar badges
- **Source**: UX #2, A11y #10
- **Files**: `lib/components.css`
- **Scope**: Add `:hover` (background lightening), `:active` (scale 0.97), `:focus-visible` (ring) to `.score-overview-bar__badge`
- **Effort**: S | **Risk**: XS

### H4. Fix Quick Note overlay — add focus trap and backdrop
- **Source**: UX #1, A11y #2
- **Files**: `components/ActiveSession.tsx`, `lib/components.css`
- **Scope**: Add semi-transparent backdrop, focus trap within overlay, ensure Escape closes it from any focus position
- **Effort**: M | **Risk**: S

### H5. Replace 8-digit hex alpha with `color-mix()` or rgba
- **Source**: UX #3
- **Files**: `components/FinalizationScreen.tsx`
- **Scope**: Replace `${p.color}12` with a CSS custom property or `color-mix(in srgb, ${p.color} 7%, transparent)` with rgba fallback
- **Effort**: S | **Risk**: XS

### H6. Create `lib/evaluation-state.ts` — consolidate score/completion logic
- **Source**: Deepening #2, Arch #10
- **Files**: NEW `lib/evaluation-state.ts`, `lib/rubric.ts`, `components/ProgressCircle.tsx`, `components/ScoreOverviewBar.tsx`
- **Scope**: Extract `isScored()`, `isComplete()`, `getProgressState()` into one module. Update callers.
- **Effort**: M | **Risk**: M (many callers)

### H7. Fix evidence count font size (0.45rem → unreadable)
- **Source**: UX #7, A11y #10
- **Files**: `lib/components.css`
- **Scope**: Increase `.score-overview-bar__evidence-count` to 0.6rem, add padding for touch target
- **Effort**: XS | **Risk**: XS

### H8. Add non-color indicator for selected score option
- **Source**: A11y #3
- **Files**: `lib/components.css`, `components/ScoreOption.tsx`
- **Scope**: Add font-weight: 700 or a subtle checkmark icon for selected state, beyond just background color
- **Effort**: S | **Risk**: XS

---

## P2 — Medium Priority (10)

### M1. Consolidate report file organization
- **Source**: Cleanup #5
- **Files**: Move `lib/html-report.ts`, `lib/report.css` → `lib/report/`
- **Scope**: Update all imports
- **Effort**: S | **Risk**: S

### M2. Extract shared badge rendering in ScoreOverviewBar
- **Source**: Cleanup #7
- **Files**: `components/ScoreOverviewBar.tsx`
- **Scope**: Extract `BadgeButton` sub-component to deduplicate QG/scoring badge JSX
- **Effort**: S | **Risk**: XS

### M3. Move `getProgressState` out of ProgressCircle
- **Source**: Cleanup #8, overlaps with H6
- **Files**: `components/ProgressCircle.tsx` → `lib/evaluation-state.ts`
- **Scope**: Part of H6 if that proceeds; otherwise standalone move
- **Effort**: S | **Risk**: XS

### M4. Add keyboard shortcut discoverability
- **Source**: UX #9
- **Files**: `components/ActiveSession.tsx`, `lib/components.css`
- **Scope**: Add a "?" button in the header that shows shortcuts in a tooltip/popover. Or show a toast on first session.
- **Effort**: M | **Risk**: S

### M5. Add loading state to Quick Capture button
- **Source**: UX #4
- **Files**: `components/ActiveSession.tsx`, `lib/components.css`
- **Scope**: While `capturing=true`, show a spinning icon or pulsing state on the camera button
- **Effort**: S | **Risk**: XS

### M6. Add empty state to Captures tab
- **Source**: UX #8
- **Files**: `components/Captures.tsx`
- **Scope**: When captures.length === 0, show instructions with Quick Capture and Ctrl+Shift+S
- **Effort**: S | **Risk**: XS

### M7. Add `aria-live` to tabpanel for screen reader announcements
- **Source**: A11y #6
- **Files**: `components/ActiveSession.tsx`
- **Scope**: Add `aria-live="polite"` to the tabpanel container
- **Effort**: XS | **Risk**: XS

### M8. Add semantic structure to finalization score cards
- **Source**: A11y #4
- **Files**: `components/FinalizationScreen.tsx`
- **Scope**: Add `role="list"` / `role="listitem"`, add `aria-label` to each card
- **Effort**: S | **Risk**: XS

### M9. Fix ScoreOverviewBar `Object.keys().indexOf()` O(n²) pattern
- **Source**: Arch #10
- **Files**: `components/ScoreOverviewBar.tsx`
- **Scope**: Use indexed iteration instead of `Object.keys(questions).indexOf(qId)`
- **Effort**: S | **Risk**: XS

### M10. Fix `useKeyboardShortcuts` re-subscription on every render
- **Source**: Arch #13
- **Files**: `hooks/useKeyboardShortcuts.ts`
- **Scope**: Use `useRef` for the shortcuts map; only subscribe once
- **Effort**: S | **Risk**: XS

---

## P3 — Low Priority (8)

### L1. Tab completion checkmark — increase to 14px, add aria-label
### L2. Close review button — use × icon instead of left chevron
### L3. Draft saved toast — add fade animation
### L4. Metadata URL field — add `type="url"` validation
### L5. ScoreOption disabled state — add `opacity: 0.5` and `cursor: not-allowed`
### L6. Toast store — clear pending timers on reset
### L7. Grade buttons — add explicit `focus-visible` ring
### L8. CSS comments audit for accuracy

---

## Architecture Deepening (optional, post-P2)

These are larger refactors with high long-term value but non-trivial effort:

### D1. Export Pipeline abstraction
- Create `ExportPipeline` interface; decouple report building from ZIP assembly
- **Effort**: L | **Risk**: M

### D2. HTML Report data model
- Introduce intermediate `ReportModel`; separate data transformation from HTML string generation
- **Effort**: L | **Risk**: M

### D3. Session Persistence module
- Merge auto-save, repository, and lifecycle into a single `SessionPersistence` deep module
- **Effort**: M | **Risk**: M

### D4. Split useActiveSession
- Separate `useSessionData()` (read-only) from `useSessionActions()` (lifecycle)
- **Effort**: M | **Risk**: M

---

## Recommended Sprint Plan

### Sprint A — Security + Quick Wins (P0 + P1 low-risk)
- C1: Capture sanitization tests
- C2: ScoreOverviewBar aria-labels
- H1: Remove uuid
- H2: Consolidate saveCurrentSession
- H5: Fix hex alpha
- H7: Fix evidence count font
- **Files touched**: 4-5 | **Tests added**: ~10

### Sprint B — UX Polish (P1 medium-risk)
- H3: Badge hover/active/focus states
- H4: Quick Note focus trap + backdrop
- H6: Evaluation state consolidation
- H8: Non-color score indicator
- **Files touched**: 6-8 | **Tests added**: ~5

### Sprint C — Medium Priority (P2)
- M1-M10 as listed
- **Files touched**: 8-10 | **Tests added**: ~3

### Sprint D — Architecture Deepening (optional)
- D1-D4 as listed, one per sprint
- **Effort**: 1-2 sprints each
