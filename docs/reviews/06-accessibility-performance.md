# Accessibility & Performance Review
Date: 2026-05-28

## Executive Summary

The extension has a solid accessibility foundation: proper ARIA roles on the tab bar (`role="tablist"`, `role="tab"`, `role="tabpanel"`), `aria-label` on radiogroups, focus-visible outlines, and screen-reader-only classes for radio inputs. Keyboard navigation is supported via roving tabindex on tabs and Enter/Space handling on ScoreOption labels.

However, several gaps remain: the Quick Note overlay lacks focus trapping; the ScoreOverviewBar buttons lack accessible names; color is used as the sole indicator in several places; and the score summary card on the finalization screen has no semantic structure for assistive technologies.

On the performance side, the codebase is generally well-optimized with individual Zustand selectors, memoized computations, and batched export processing. The main concerns are the large sidepanel bundle (2.02 MB) and the string-concatenation-based HTML report generation.

## Accessibility Findings

### P1 — High Priority

**1. ScoreOverviewBar badge buttons have no accessible name**
- `components/ScoreOverviewBar.tsx:171-186` — `<button>` contains only a code span, an indicator character, and an evidence count
- Screen readers announce something like "PS1 ● 2" — meaningless without context
- **Fix**: Add `aria-label` with the full question title and state, e.g. `"PS1: Data Source Clarity — complete, 2 evidence items"`

**2. Quick Note overlay has no focus trap**
- `components/ActiveSession.tsx:320-362` — When the overlay opens, focus is sent to the textarea but Tab can escape to elements behind it
- No Escape key handling in the overlay container (only in the textarea's onKeyDown)
- **Fix**: Add focus trapping; ensure Escape on the container closes it

**3. ScoreOption labels use color as sole indicator for active state**
- `components/QuestionSection.tsx` — Active score rows use `is-selected` class which adds colored background
- No text or icon to distinguish selected vs unselected for color-blind users
- **Fix**: Add a visual indicator beyond color (checkmark, border weight, or text weight change)

**4. Finalization principle score card has no semantic structure**
- `components/FinalizationScreen.tsx:155-167` — Grid of divs with no ARIA role, no labels
- Screen readers see "TR 2.5 /3.0" with no context
- **Fix**: Use `role="list"` on the grid, `role="listitem"` on each card, add `aria-label` with full text

### P2 — Medium Priority

**5. Radiogroup keyboard navigation is non-standard**
- `components/ScoreOption.tsx:33-42` — Each label handles Enter/Space individually, but arrow key navigation between options doesn't work
- Standard radiogroup pattern uses arrow keys to move between options
- **Fix**: Add `role="radiogroup"` to the parent container and implement arrow key navigation

**6. Sidebar tab bar doesn't announce tab changes to screen readers**
- Tab panel container has no `aria-live` attribute
- Switching tabs is invisible to screen readers unless they manually navigate
- **Fix**: Add `aria-live="polite"` to the tabpanel; announce the active tab name on change

**7. Captures tab heading lacks hierarchy**
- `components/Captures.tsx` — Added `<h2>Captures</h2>` but other tab content may not have consistent heading levels
- **Fix**: Audit all tab panels for consistent heading hierarchy (h2 for tab title, h3 for sections)

**8. Toast notifications lack role="alert"**
- Toast messages use Zustand store → rendered in a component but with no ARIA role
- Draft saved toast has `aria-live="polite"` (good) but error toasts may not
- **Fix**: Add `role="status"` to all toast renders

### P3 — Low Priority

**9. Focus-visible outline on quick action buttons may be hard to see**
- Quick action buttons use the global `:focus-visible` outline which is `var(--ut-blue)`
- On the magenta-tinted header, blue outline may have low contrast
- **Fix**: Use magenta-colored focus ring for header buttons

**10. Evidence count badge is too small for touch targets**
- `.score-overview-bar__evidence-count` at 0.45rem is far below the 44×44px touch target guideline
- **Fix**: Increase clickable area with padding while keeping text small

## Performance Findings

### P2 — Medium Priority

**11. Sidepanel bundle is 2.02 MB**
- Build output: `sidepanel-BAfnQYcg.js` at 2.02 MB (before gzip)
- Includes JSZip, papaparse, pngjs, tldraw, and all application code in a single chunk
- **Fix**: Code-split tldraw (lazy load only when annotation is used), split vendor chunks

**12. HTML report generation uses string concatenation — no memoization**
- `lib/html-report.ts` — `buildHtmlReport()` rebuilds the entire HTML string on every export
- The function is only called on explicit export action, so this is acceptable
- **Impact**: Low — not called during interactive use
- **Fix**: Consider caching the CSS portion (already done for minified CSS)

**13. export.ts caches dynamic imports at module level**
- `lib/export.ts:78-81` — `cachedJSZip`, `cachedPapa`, `cachedPngToJpeg` as module-level singletons
- Good pattern for avoiding re-imports, but these stay in memory for the extension's lifetime
- **Fix**: Acceptable trade-off for a long-lived extension; document the pattern

### P3 — Low Priority

**14. ScoreOverviewBar recomputes all badges on any evaluation change**
- `components/ScoreOverviewBar.tsx:78-137` — `badges` useMemo depends on `evalMap` and `captureMap`
- Any evaluation change recreates all badge objects
- **Fix**: Could use granular per-badge memoization, but with only 14 questions this is negligible

**15. capture.ts archivePageHtml runs in content script context**
- `lib/capture.ts:157-164` — `browser.scripting.executeScript({ func: archivePageHtml })` runs the archive function in the page's content script
- This means the full DOM cloning and CSS inlining happens in the page's process
- **Fix**: Acceptable — content scripts are the only way to access the page DOM

## Scores

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Keyboard navigation | 7 | Good roving tabindex; missing arrow keys in radiogroups |
| Screen reader support | 6 | Good tab roles; missing labels on overview badges |
| Color accessibility | 7 | WCAG AA compliant colors; color-only indicators remain |
| Focus management | 6 | Good focus-visible; missing focus trap on overlay |
| Bundle size | 5 | 2.02 MB sidepanel chunk; needs code splitting |
| Runtime performance | 8 | Good memoization and selector patterns |

## Top 5 Recommendations

1. **Add aria-labels to ScoreOverviewBar badges** (P1-1) — critical for screen reader users
2. **Add focus trap to Quick Note overlay** (P1-2) — keyboard accessibility
3. **Add non-color indicator for selected score** (P1-3) — color-blind accessibility
4. **Code-split tldraw out of main bundle** (P2-11) — 400KB+ savings on initial load
5. **Add aria-live to tabpanel container** (P2-6) — screen reader tab change announcements
