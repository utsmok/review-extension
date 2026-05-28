# UI/UX Audit Review
Date: 2026-05-28

## Executive Summary

The extension's UI follows a clear tab-based layout (Evaluation → Metadata → Finalize → Captures) with a compact header providing quick actions. The design system in `lib/tokens.css` provides consistent spacing, typography, and color tokens. The recently added ScoreOverviewBar provides a compact progress indicator.

Key UX concerns include: the Quick Note overlay is visually jarring and lacks a proper modal pattern; the tab completion indicators are subtle and easy to miss; the FinalizationScreen's principle score cards use 8-digit hex alpha which may not render in all browsers; and several interactive elements lack clear affordance.

## Findings

### P1 — High Priority

**1. Quick Note overlay has no backdrop and looks broken**
- `components/ActiveSession.tsx:320-362` — Quick Note textarea renders inline as a floating overlay with no backdrop or z-index management
- No visual separation from content below; appears "stuck" to the content
- **Impact**: Users may not realize they need to interact with it; feels like a bug
- **Fix**: Wrap in a proper modal with backdrop, or use a slide-down panel with clear visual boundaries

**2. ScoreOverviewBar badges have no hover/active states defined in CSS**
- `lib/components.css` — `.score-overview-bar__badge` has no `:hover` or `:active` pseudo-class styles
- Buttons are visually identical whether hovered or not
- **Impact**: Poor discoverability; users don't realize badges are clickable
- **Fix**: Add `:hover` (subtle background lightening) and `:active` (scale 0.95) states

**3. Finalization principle cards use 8-digit hex alpha — unreliable cross-browser**
- `components/FinalizationScreen.tsx:156` — `style={{ background: \`${p.color}12\` }}`
- 8-digit hex (`#RRGGBBAA`) is not supported in older Chrome versions or some webviews
- **Impact**: Background may appear fully opaque or transparent on some environments
- **Fix**: Use `color-mix(in srgb, ${p.color} 7%, transparent)` with fallback, or a pre-computed rgba value

**4. No loading states for async operations**
- Quick Capture, Quick Note save, session load — no spinner or loading indicator
- Button disabling on `capturing` state is good but gives no visual feedback
- **Impact**: User may click multiple times or think nothing happened
- **Fix**: Add a brief spinner or pulsing state to the capture button while `capturing` is true

### P2 — Medium Priority

**5. Tab completion checkmark is too subtle**
- `components/ActiveSession.tsx:244-254` — `TabCheck` SVG is 12×12px, same color as tab text
- Easy to miss, especially for users with low vision
- **Fix**: Increase to 14px, use `text-ut-green` explicitly, add aria-label

**6. ScoreOption component lacks visual distinction between disabled and enabled states**
- `components/ScoreOption.tsx` — when `isDisabled`, only `tabIndex={-1}` changes; no visual dimming
- **Impact**: Users can't tell which options are interactive
- **Fix**: Add `opacity: 0.5` or `cursor: not-allowed` when disabled

**7. Evidence heatmap count is too small to read**
- `lib/components.css` — `.score-overview-bar__evidence-count` uses `font-size: 0.45rem` (~7px)
- Below the minimum readable text size in most environments
- **Impact**: The evidence count indicator is invisible to most users
- **Fix**: Increase to `0.6rem` minimum, or use a colored dot indicator instead of text

**8. No empty state guidance on Captures tab**
- When no captures exist, the Captures tab shows just a heading
- No instructions for how to add captures (quick actions, keyboard shortcut)
- **Impact**: First-time users don't know what to do
- **Fix**: Add an empty state with illustration and "Use Quick Capture or press Ctrl+Shift+S"

**9. Keyboard shortcut discoverability is zero**
- Shortcuts 1-4 and Ctrl+Shift+S are wired but never shown to the user
- No help overlay, tooltip, or settings panel listing shortcuts
- **Impact**: Powerful feature that nobody knows about
- **Fix**: Add a "?" help button that shows available shortcuts, or a toast on first session

**10. Grade buttons in FinalizationScreen lack keyboard focus styles**
- `components/FinalizationScreen.tsx:168-176` — `.grade-btn` has no custom `:focus-visible` style
- Relies on global `:focus-visible` outline which may conflict with the colored button backgrounds
- **Fix**: Add explicit `focus-visible` ring matching the grade color

### P3 — Low Priority

**11. Metadata tab has no URL validation feedback**
- Tool URL field accepts any text; no inline validation or formatting hint
- **Fix**: Add `type="url"` to the input, show a subtle indicator for invalid URLs

**12. Close review button is a left-arrow — confusing affordance**
- `components/ActiveSession.tsx:97-109` — Left chevron suggests "back navigation" not "close"
- **Fix**: Use an × (close) icon or a "Back" label

**13. Draft saved toast in FinalizationScreen is too quiet**
- `components/FinalizationScreen.tsx:118` — "Draft saved locally" appears as small monospace text
- No animation or visual emphasis
- **Fix**: Add a subtle fade-in/fade-out animation; consider a small icon

**14. Progress bar fill has no animation on change**
- ScoreOverviewBar's progress bar has CSS transition but no visual pop when count increases
- **Fix**: Add a brief scale(1.05) → scale(1) animation on the scored counter when it changes

**15. Tab bar doesn't indicate current position to screen readers**
- Tab bar uses proper `role="tablist"` and `role="tab"` but no `aria-live` region announcing tab changes
- **Fix**: Add `aria-live="polite"` to the tabpanel container to announce panel changes

## UI Scores

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Visual hierarchy | 8 | Clear heading levels, consistent spacing |
| Interaction design | 6 | Missing hover states, no loading indicators |
| Error/empty states | 5 | Captures has no empty state; error handling is silent |
| Accessibility | 7 | Good aria roles; some gaps in focus management |
| Responsiveness | 7 | 360px breakpoint handled; most content adapts |
| Discoverability | 5 | Keyboard shortcuts hidden; quick actions unlabeled |
| Polish | 7 | Consistent tokens; some rough edges |

## Top 5 Recommendations

1. **Add hover/active states to ScoreOverviewBar badges** — critical for discoverability
2. **Fix Quick Note overlay** — proper modal or slide-down with backdrop
3. **Replace 8-digit hex alpha with color-mix or rgba** — cross-browser safety
4. **Add loading states to capture buttons** — visual feedback during async operations
5. **Add keyboard shortcut discoverability** — help overlay or first-run toast
