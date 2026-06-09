# UI/UX Design & Accessibility Audit — TRUST Review Extension

**Date:** 2026-06-09
**Auditor:** DesignAudit (impeccable/audit skills)
**Scope:** `components/*.tsx`, `lib/components.css`, `lib/base.css`, `lib/tokens.css`, cross-checked against `DESIGN.md`, `PRODUCT.md`, `.audit/impeccable-audit.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/IMPECCABLE-MATRIX.md`
**Register:** product — a focused evaluation instrument ("The Review Bench"), not a consumer app.

---

## 1. Executive Summary

The extension is a disciplined, institutionally-flavored side panel that largely **honors its own design system**. The token layer (`tokens.css`) is excellent: navy-tinted neutrals, `color-mix()`-derived accent/score families scoped via `data-accent-key` / `data-score`, and a registered `@property --top-accent-color` for the signature top bar. Tab navigation, the EvidenceModal, and tooltips are accessibility **high points**. Since the prior impeccable audit (2026-05-23, 12/20), **eight of its findings have been resolved**, including the three P1s.

However, the audit surfaced a **regression cluster and one latent bug** that together re-open the "flat, no shadows" and focus-visible stories:

- **One undefined CSS custom property** (`--ut-magenta`) is referenced in **9 `:focus-visible` rules**. It is never declared, so the focus ring color is uncontrolled (resolves to `currentColor`) and contradicts the DESIGN.md rule that focus rings must be teal-blue (`--ut-blue`). (`components.css:146,179,407,730,788,846,868,898`)
- **The flat/no-shadow doctrine is broken in 5 places** with real drop-shadows — the modal uses a `0 20px 60px` shadow, and hover states on capture cards, finalization cards, and the help popover all add elevation. (`components.css:761-763,1823,2398,2812,2888-2891`)
- **`.modal-panel` uses `border-radius: 8px`** — a 4× violation of the "near-zero (0–2px)" radius doctrine and a regression past the prior audit.
- **A parallel HSL color palette** on the Finalize button (`hsl(142…)` / `hsl(220…)`) duplicates the green/slate tokens, undermining the single-source-of-truth principle the product itself preaches.

Net health improved since May (most P1s cleared), but the no-shadow/radius regressions and the focus-variable bug keep the score in the "Good — address weak dimensions" band rather than Excellent.

### Severity-tagged findings at a glance

| ID | Sev | Finding | Primary location |
|----|-----|---------|------------------|
| D-P1-1 | **P1** | Undefined `--ut-magenta` in 9 focus-visible outlines → ring color uncontrolled + spec mismatch | `lib/components.css:146,179,407,730,788,846,868,898` |
| D-P1-2 | **P1** | `.modal-panel` `border-radius: 8px` violates 0–2px doctrine | `lib/components.css:754` |
| D-P1-3 | **P1** | Five drop-shadows violate the flat/no-shadow doctrine | `lib/components.css:761,1823,2398,2812,2888` |
| D-P2-1 | P2 | Touch target `.score-overview-bar__next` is 22×22px (< WCAG 2.2 SC 2.5.8 24px min) | `lib/components.css:1501-1502` |
| D-P2-2 | P2 | Parallel HSL palette on Finalize button bypasses tokens | `lib/components.css:2856-2873` |
| D-P2-3 | P2 | `opacity` used for de-emphasis/hover reduces text contrast | `GradeSelector.tsx:61`; `components.css:799,894,2789` |
| D-P2-4 | P2 | `transition: all` + hard-coded durations bypass duration tokens | `components.css:1029,1484,2836,2625` |
| D-P2-5 | P2 | Unverified dialog a11y on ConfirmDialog / NewSessionModal | `components/ConfirmDialog.tsx`, `NewSessionModal.tsx` |
| D-P3-1 | P3 | Hard-coded font-sizes bypass type scale | `components.css:506,536,1440,1531,1543` |
| D-P3-2 | P3 | Hard-coded radii mirror tokens instead of referencing them | `components.css:1284,1299,2094,2102` |
| D-P3-3 | P3 | No dark mode / `prefers-color-scheme: dark` | (absent) |
| D-P3-4 | P3 | Token↔spec drift (`--ut-muted`, `--score-1`) undocumented | `tokens.css:22,90` |
| D-P3-5 | P3 | Magic `rgba(255,255,255,…)` hover backgrounds | `components.css:2843,2882` |
| D-P3-6 | P3 | Heavy inline `style={{}}` in FinalizationScreen | `FinalizationScreen.tsx:198-321` |

---

## 2. Compliance Scores

### 2.1 DESIGN.md compliance — **~78%**

| DESIGN.md rule | Status | Evidence |
|----------------|--------|----------|
| Flat, no `box-shadow` (§4) | ❌ Violated | 5 drop-shadows (D-P1-3) |
| Border radius 0–2px (§5) | ❌ Violated | modal 8px (D-P1-2) |
| Navy-anchored palette / neutrals tinted | ✅ Pass | `tokens.css:17-27`, navy-tinted `--neutral-*` |
| Principle Accent Rule (one color per category) | ✅ Pass | `data-accent-key` families `tokens.css:57-86` |
| Score Spectrum Rule (red→green ramp only) | ✅ Pass | `--score-0..3`, scoped via `data-score` |
| Uppercase Header Rule | ✅ Pass | `tracking-ut-heading` + `uppercase` on headers throughout |
| 4-font type system | ✅ Pass | `--ff-body/heading/mono/display` all defined + used |
| Top Accent Bar via `@property` | ✅ Pass | `tokens.css:1-5` registered, transitions on nav |
| Single source of truth for color (tokens only) | ⚠️ Partial | parallel HSL palette on Finalize (D-P2-2) |
| Token usage in CSS (no hard-coded values) | ⚠️ Partial | hex literals cleared; HSL/rgba/font-size bypasses remain |
| Focus rings = teal-blue (#007d9c) | ❌ Violated | code uses undefined `--ut-magenta` instead (D-P1-1) |

### 2.2 WCAG 2.1 AA compliance — **~85% (1 clear failure, 1 degraded)**

| SC | Criterion | Status | Note |
|----|-----------|--------|------|
| 1.3.1 | Info & Relationships | ✅ | ARIA tabs (`role=tablist/tab/tabpanel`, roving tabindex) |
| 1.4.3 | Contrast (Minimum) | ✅ | `--ut-slate`/`--ut-muted` tuned to ~6.5–7.5:1 |
| 1.4.11 | Non-text Contrast | ⚠️ | focus rings fall back to `currentColor`; some low-contrast (D-P1-1) |
| 1.4.13 | Content on Hover/Focus | ✅ | tooltips now show on `:focus`; help popover `Esc`-dismissable |
| 2.1.1 | Keyboard | ✅ | full keyboard nav + shortcuts |
| 2.1.2 | No Keyboard Trap | ✅ | EvidenceModal `useFocusTrap` + `Esc` |
| 2.4.1 | Bypass Blocks | ✅ | skip-link in `AppShell.tsx:115` |
| 2.4.7 | Focus Visible | ⚠️ | visible but unintended color on 9 controls (D-P1-1) |
| 2.5.8 | Target Size (Minimum 24×24) | ❌ | `.score-overview-bar__next` 22×22 (D-P2-1) |
| 3.3.x | Labels / Error / Status | ✅ | `aria-label`s, `aria-live` toasts/draft-saved |
| 4.1.2 | Name, Role, Value | ✅ | modals/toolbar/buttons named + roled |
| 4.1.3 | Status Messages | ✅ | `aria-live="polite"` regions present |

**One clear AA failure** (2.5.8 target size) and **one degraded-but-visible** focus story (2.4.7/1.4.11). Everything else passes.

---

## 3. Detailed Findings

### P1 — D-P1-1: Undefined `--ut-magenta` in 9 focus-visible outlines

**Locations:** `lib/components.css:146,179,407,730,788,846,868,898`

Nine `:focus-visible` rules use `outline: 2px solid var(--ut-magenta)`, but `--ut-magenta` is **never declared** anywhere in the token layer. `tokens.css` defines `--trust-magenta` (#8e036c) and `--focus-ring: var(--ut-blue)` (#007d9c), but not `--ut-magenta`. Per the CSS custom-property spec, an undefined `var()` with no fallback makes the property invalid-at-computed-value-time, so `outline-color` falls back to its initial value (`currentColor`).

**Impact:**
- The focus ring renders in the element's text color, not a consistent accent. On `.score-row` that is `--ut-muted` (#4f5e73); on `.sidebar-tab` it is whatever the tab text color is. Ring weight/thickness (2px) still renders, so 2.4.7 "Focus Visible" is *technically* satisfied, but inconsistently and sometimes below the 1.4.11 3:1 non-text-contrast ideal.
- It contradicts DESIGN.md §2, which assigns focus rings to Teal-Blue (#007d9c / `--ut-blue`). Two elements get this right by using `--focus-ring`/`--ut-blue` (`.score-overview-bar__next:1520`, `.quick-action-btn:1052`, `.top-action-btn:2850`); the other nine do not.

**Affected controls:** `.sidebar-tab` (the main navigation), `.rubric-chip`, `.score-row` (scoring controls), `.evidence-thumb-overlay button`, `.confirm-dialog-actions button`, `.annotation-actions__btn/__zoom/__save`.

**Fix** — replace the broken reference with the spec'd focus token:
```css
/* before */
.sidebar-tab:focus-visible { outline: 2px solid var(--ut-magenta); outline-offset: 2px; }
/* after — use the registered focus token */
.sidebar-tab:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```
Apply to all 9 sites. Optionally add `--ut-magenta: var(--trust-magenta);` to `:root` as a belt-and-suspenders alias, but prefer converging on `--focus-ring` for rings.

---

### P1 — D-P1-2: `.modal-panel` `border-radius: 8px` violates the radius doctrine

**Location:** `lib/components.css:754`

```css
.modal-panel { … border-radius: 8px; … }
```

DESIGN.md §5 sets radius to **0–2px** (`--radius-sm: 1px`, `--radius-md: 2px`, `--radius-lg: 0px`), explicitly "a deliberate rejection of rounded-card aesthetics." An 8px radius on the EvidenceModal/ConfirmDialog container is a 4× violation and a regression past the prior audit (which flagged 3px). Every other radius in the file correctly uses the tokens.

**Fix:**
```css
.modal-panel { … border-radius: var(--radius-md); … }  /* 2px, matches the regimented system */
```

---

### P1 — D-P1-3: Five drop-shadows violate the flat/no-shadow doctrine

DESIGN.md §4 is unambiguous: *"No `box-shadow` anywhere in the system."* The prior audit fixed the one on `.quick-note-overlay` (formerly `:874`), but five new/remaining drop-shadows re-open the rule:

| Location | Declaration | Purpose |
|----------|-------------|---------|
| `components.css:761-763` | `box-shadow: 0 20px 60px rgba(0,0,0,.25), 0 8px 20px rgba(0,0,0,.15)` | `.modal-panel` elevation |
| `components.css:1823` | `box-shadow: 0 2px 8px rgba(0,44,95,.12)` | `.capture-card-enter:hover` lift |
| `components.css:2398` | `box-shadow: 0 2px 4px rgba(0,0,0,.08)` | `.finalization-principle-card:hover` lift |
| `components.css:2812` | `box-shadow: 0 4px 16px rgba(0,0,0,.12)` | `.help-popover` elevation |
| `components.css:2888-2891` | `box-shadow: 0 0 0 4px hsl(142 40% 50% / .25)` | `@keyframes finalize-pulse` ring |

(Plus an inline `boxShadow` at `FinalizationScreen.tsx:201` on the finalized banner — an inset highlight, lower severity.)

The hover "lifts" (`translateY(-1/-2px)` + shadow) are textbook consumer-app affordances, the exact aesthetic the "Review Bench" north star rejects. Per DESIGN.md, prominence must come from **border weight, background tint, or saturation** — never shadow.

**Fix patterns:**
```css
/* Modal: replace elevation with a heavier, tinted border (depth via border weight) */
.modal-panel { border: 2px solid var(--ut-navy); /* drop the box-shadow entirely */ }

/* Hover lift → saturated border + tint (no translate, no shadow) */
.capture-card-enter:hover { border-color: var(--ut-navy); background: var(--neutral-50); }

/* Popover: 2px border + tint already present; just delete the shadow */
.help-popover { /* box-shadow removed */ }

/* Pulse ring → use outline (non-painting, no shadow) */
@keyframes finalize-pulse { 50% { outline: 2px solid var(--ut-green); outline-offset: 2px; } }
```
Inset `box-shadow` used purely as a 1px inset border-equivalent (`components.css:403,438,987`) is a gray area — those are arguably "border-like" and lower priority, but ideally also migrate to real borders/`outline` to keep the codebase shadow-free by grep.

---

### P2 — D-P2-1: Touch target below WCAG 2.2 SC 2.5.8 (24×24 minimum)

**Location:** `lib/components.css:1501-1502`

```css
.score-overview-bar__next { width: 22px; height: 22px; … }
```

The "first needs work" navigation button is **22×22px**, below the WCAG 2.2 AA Target Size (Minimum) of 24×24 CSS px. (`IMPLEMENTATION-PLAN.md` A11Y-6 already planned raising evidence-thumb buttons to 32×32 — the same intent applies here.) For reference: `.quick-action-btn` is 28×28 (`:1022-1023`, passes AA, not AAA-44) and `.score-row` min-height 28 (`:391`, passes AA).

**Fix:** `.score-overview-bar__next { width: 28px; height: 28px; }` (match `.quick-action-btn`).

---

### P2 — D-P2-2: Parallel HSL palette bypasses the token system

**Location:** `lib/components.css:2856-2873`

The Finalize button declares its own green/slate ramp in raw HSL, ignoring the established tokens:
```css
.top-action-btn--finalize        { color: hsl(220 10% 55%);  border-color: hsl(220 10% 85%); } /* ≈ --ut-slate / --ut-border */
.top-action-btn--finalize.ready  { color: hsl(142 50% 35%);  border-color: hsl(142 40% 65%); background: hsl(142 40% 92%); } /* ≈ --ut-green */
```
This is a "two sources of truth" for green: `--ut-green`/`--judgment-pass`/`--grade-pass-tint` (the canonical Pass green) *and* `hsl(142…)`. The product's own principle #1 is *"Practice what you preach"* — a transparency/traceability tool should not harbor an undocumented parallel palette.

**Fix:** map the states onto tokens; derive tints with `color-mix()`:
```css
.top-action-btn--finalize        { color: var(--ut-slate); border-color: var(--ut-border); }
.top-action-btn--finalize.ready  {
  color: var(--ut-green);
  border-color: var(--judgment-pass-border);
  background: var(--judgment-pass-tint);
  animation: finalize-pulse 2s ease-in-out infinite;
}
```

---

### P2 — D-P2-3: `opacity` used for de-emphasis / hover lowers contrast

**Locations:** `GradeSelector.tsx:61` (`opacity-80` on grade descriptions inside colored buttons); `components.css:799` (`.btn-danger:hover { opacity:.85 }`), `:894` (`.annotation-actions__save:hover`), `:2789` (`.list-action-btn:hover`).

DESIGN.md §6 Do's recommend `color-mix()` tints for emphasis, and the prior audit flagged opacity-as-hierarchy as systemic. `opacity-80` on white description text over a colored grade button (`#4a8355` Pass / `#c60c30` Fail) still passes ~4:1 but loses the headroom a tint would keep. Hover `opacity:.85` dims the element rather than giving it a positive hover signal (a backwards-feeling affordance).

**Fix:** replace opacity with `color-mix()` tints/borders for hover, and a slightly darker text shade for de-emphasis:
```css
.btn-danger:hover { background: color-mix(in srgb, var(--ut-red) 88%, black); }  /* darken, not fade */
/* GradeSelector description: drop opacity-80, use a lighter on-accent shade */
```

---

### P2 — D-P2-4: `transition: all` and hard-coded durations bypass tokens

**Locations:** `components.css:1029` (`.quick-action-btn { transition: all var(--duration-fast) ease }`), `:2836` (`.top-action-btn { transition: all 0.2s ease }`), `:1484` (`.score-overview-bar__badge { transition: transform 0.15s ease-out }`), `:2625` (confetti `600ms`).

`transition: all` animates properties the author did not intend (perf + surprise side-effects) and `0.2s`/`0.15s`/`600ms` ignore `--duration-normal/fast/action`. The tokens exist (`tokens.css:155-158`); use them and enumerate properties.

**Fix:** `transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease, border-color var(--duration-fast) ease;`

---

### P2 — D-P2-5: Unverified dialog a11y on remaining modals

EvidenceModal is exemplary (`role="dialog"`, `aria-modal="true"`, `aria-label`, `useFocusTrap` + `useAutoFocus` at `EvidenceModal.tsx:83-84`, `Esc` handler). **ConfirmDialog.tsx and NewSessionModal.tsx were not verified in this pass** — `IMPLEMENTATION-PLAN.md` §5.10 lists them for a `role="dialog"`/`aria-modal` audit. Confirm they share the same focus-trap + auto-focus + labelled pattern before considering this closed.

---

### P3 — D-P3-1: Hard-coded font-sizes bypass the type scale

`components.css:506,536` (`0.625rem` — equals `--text-2xs`), `:1531` (`0.625rem`), `:1543` (`0.5625rem`), `:1440` (`0.5rem`). The last two are **below the smallest token** (`--text-2xs: 0.625rem`) — a sub-scale exists in practice but not in the system. Either introduce `--text-3xs: 0.5rem` or snap to `--text-2xs`.

### P3 — D-P3-2: Hard-coded radii mirror tokens instead of referencing them

`components.css:1284,1299` (`2px` == `--radius-md`), `:2094,2102` (`1px` == `--radius-sm`). Values match the tokens; use the tokens so future radius changes propagate.

### P3 — D-P3-3: No dark mode

No `prefers-color-scheme: dark` query or dark tokens anywhere. Low priority for a desktop institutional tool, but `PRODUCT.md` targets "university-wide use … should work for all staff." A token-driven dark theme would be straightforward given everything already routes through CSS variables.

### P3 — D-P3-4: Token ↔ DESIGN.md drift (undocumented)

- `--ut-muted: #4f5e73` (`tokens.css:22`) vs DESIGN.md `neutral-muted: #576578`. The token is darker (better contrast) — likely an intentional a11y fix. **Document the divergence** so DESIGN.md stays the source of truth.
- `--score-1: #c2410c` (`tokens.css:90`) vs DESIGN.md `score-poor: #ea580c`. Darkened on purpose to fix the prior P1 white-on-orange contrast failure (now `bg-score-1-strong`). **Update DESIGN.md** to match, or the spec will mislead future contributors.

### P3 — D-P3-5: Magic `rgba(255,255,255,…)` hover backgrounds

`components.css:2843,2882` use `rgba(255,255,255,0.6)` for hover. Introduce `--hover-surface` (or reuse `--ut-white` with opacity) so the hover affordance is tokenized.

### P3 — D-P3-6: Heavy inline styles in FinalizationScreen

`FinalizationScreen.tsx:198-321` carries ~10 inline `style={{}}` blocks (gradients, `boxShadow`, `borderTop` widths, dynamic per-principle colors). Most *do* reference tokens via `var()`, but they bypass the class layer and resist theming/`prefers-reduced-motion`. The classes (`.finalized-banner`, `.finalization-hero-score`, `.finalization-principle-card`) already exist — fold the static parts into CSS, keeping only genuinely dynamic values (computed colors/scaleX) inline.

---

## 4. Status of Prior Audit Findings (.audit/impeccable-audit.md, 2026-05-23)

| Prior finding | Sev | New status | Evidence |
---------------|-----|------------|----------|
| Score badge contrast at `opacity: 0.7` | P1 | ✅ **Resolved** | `.score-row` now `opacity:1` selected; only `[data-disabled]` uses `0.5` (`components.css:437,276`) |
| Grade button "Conditional" white-on-orange | P1 | ✅ **Resolved** | now `bg-score-1-strong` (darkened `#c2410c`×80% black), `GradeSelector.tsx:21` |
| Side-stripe `border-l-[3px]` on session header | P1 | ✅ **Resolved** | header now full-width `border-b-2 border-trust-magenta-border` (`ActiveSession.tsx:138`) |
| Side-stripe on finalized notice | P2 | ✅ **Resolved** | now `borderTop: 6px solid` (`FinalizationScreen.tsx:200`) |
| Bounce easing in `animate-scale-in` | P2 | ✅ **Resolved** | now `cubic-bezier(0.22, 1, 0.36, 1)` — no overshoot (`components.css:942`) |
| Quick-action tooltips keyboard-inaccessible | P2 | ✅ **Resolved** | `::after` now keyed on `:focus` + `:focus-within` (`components.css:1081-1083`) |
| Missing visible label on quick-note textarea | P2 | ✅ **Resolved** | `aria-label="Quick note"` (`ActiveSession.tsx:465`) |
| No image lazy loading | P3 | ✅ **Resolved** | `loading="lazy"` on `Captures.tsx:11`, `EvidenceThumbnails.tsx:12` |
| Touch targets below 44×44 | P2 | ⚠️ **Partial** | most now 28px (AA-ok); `.score-overview-bar__next` still 22px (D-P2-1) |
| Hard-coded colors in components.css | P2 | ⚠️ **Partial** | hex literals cleared; parallel HSL palette + `rgba` hovers remain (D-P2-2, D-P3-5) |
| Inline styles in TSX | P2 | ⚠️ **Partial** | Metadata cleared; FinalizationScreen still heavy (D-P3-6) |
| Hard-coded font-size values | P3 | ⚠️ **Open** | D-P3-1 |
| Hard-coded border-radius values | P3 | ⚠️ **Open** | D-P3-2 (and modal 8px, now P1) |
| No dark mode | P3 | ⚠️ **Open** | D-P3-3 |

**Tally: 8 fully resolved, 6 partially open, 0 regressed in kind** — plus the new P1s (D-P1-1/2/3) discovered this pass.

---

## 5. Positive Findings (carry forward + new)

1. **Textbook ARIA tabs.** `ActiveSession.tsx` implements the full WAI-ARIA tabs pattern — `role=tablist/tab`, `aria-selected`, `aria-controls`, `role=tabpanel`, `aria-labelledby`, and roving tabindex via `useRovingTabIndex`.
2. **Exemplary modal accessibility.** `EvidenceModal.tsx` combines `role="dialog"`, `aria-modal`, labelled, `useFocusTrap(panelRef)` + `useAutoFocus(panelRef, …)`, an `Esc` handler, and `aria-hidden` on decorative SVGs/overlays.
3. **Token architecture is genuinely good.** `color-mix()`-derived accent/score/judgment families scoped by `data-accent-key` / `data-score` keep JSX minimal and the visual system declarative; neutrals are navy-tinted, not gray.
4. **Registered `@property --top-accent-color`** (`tokens.css:1-5`) gives the signature top bar smooth, animatable color transitions across principles.
5. **Reduced motion is belt-and-suspenders** — covered in both `tokens.css:202-211` and `components.css:283-298`, zeroing all durations.
6. **Skip-link** present (`AppShell.tsx:115` + styles `components.css:13-26`) — closes the WCAG 2.4.1 gap the IMPROVEMENT-SWEEP flagged.
7. **Toolips/popovers dismissable** and surfaced on keyboard focus (1.4.13 satisfied).
8. **Images carry descriptive `alt`** and lazy-load.
9. **Score-row de-emphasis redesigned** away from blanket `opacity:0.7` toward per-state `--badge-color` + font-weight.

---

## 6. Recommendations (ordered by ROI)

### Immediate (P1) — correctness + doctrine
1. **Fix the `--ut-magenta` reference** (D-P1-1). One global find/replace → `--focus-ring` across 9 sites. Highest ROI: removes a real bug, restores the teal-blue focus spec, and tightens 1.4.11/2.4.7 in one edit.
2. **`.modal-panel` radius → `var(--radius-md)`** (D-P1-2). One-line fix.
3. **Delete the five drop-shadows** (D-P1-3), replacing modal/popover elevation with a 2px `--ut-navy` border and hover lifts with saturated borders + tints. Restores the "Review Bench" flat character.

### Short-term (P2) — consistency + AA target size
4. **Raise `.score-overview-bar__next` to 28×28** (D-P2-1) — closes the one clear WCAG 2.2 AA failure.
5. **Map the Finalize-button HSL palette onto tokens** (D-P2-2) — `--ut-green`/`--judgment-pass-*`/`--ut-slate`.
6. **Replace opacity-based hover/de-emphasis with `color-mix()` tints** (D-P2-3).
7. **Audit ConfirmDialog/NewSessionModal** for the same dialog-a11y pattern as EvidenceModal (D-P2-5).
8. **Enumerate `transition` properties and use duration tokens** (D-P2-4).

### Maintenance (P3) — system hygiene
9. **Reconcile token↔DESIGN.md drift** (`--ut-muted`, `--score-1`) — update the spec or the token, and add a comment at each divergence (D-P3-4).
10. **Promote FinalizationScreen inline styles into the existing classes** (D-P3-6).
11. **Replace literal font-size/radius values with tokens** (D-P3-1/2); add `--text-3xs` if 0.5rem is intentional.

### Roadmap
12. **Dark mode** (D-P3-3) — feasible now that color routes through CSS variables; gate on PRODUCT demand.

---

## 7. Method note

Findings were verified against the current source (`components/*.tsx`, `lib/*.css`) by direct read + structural search; no build/lint/test gates were run per scope constraints. The `--ut-magenta` conclusion follows from the CSS custom-property spec (undefined var ⇒ property invalid-at-computed-value-time ⇒ `outline-color` resolves to initial `currentColor`); the *visual* ring still renders, so this is a correctness/spec-mismatch P1 rather than a total 2.4.7 failure. ConfirmDialog/NewSessionModal (D-P2-5) are flagged unverified rather than assumed broken.
