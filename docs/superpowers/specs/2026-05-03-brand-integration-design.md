# Brand Integration Design: TRUST Review Extension

**Date:** 2026-05-03
**Status:** Draft (pending user review)
**Scope:** Visual identity integration of TRUST framework + LISA-EIS organizational branding into the review extension UI and PDF export pipeline.

## Decisions Summary

| # | Decision | Choice |
|---|----------|--------|
| 1 | Primary brand anchor | **B: Navy institutional + TRUST magenta signature** |
| 2 | TRUST vs LISA-EIS balance | TRUST dominant; LISA-EIS secondary (footer, about page) |
| 3 | PDF report branding | Full alignment with sidepanel design, TRUST throughout |
| 4 | Typography | Add Nunito Sans for brand-visible display contexts; logos are custom SVG paths |
| 5 | Magenta role | **B: Balanced** — accent bar, wordmark, active tab, primary buttons, section headers, PDF headers |
| 6 | SessionInit layout | **A: Centered Hero** with large TRUST wordmark above form |
| 7 | Principle accent colors | Keep all five current colors unchanged |
| 8 | Browser action icon | Magenta stylized T from TRUST wordmark |

---

## 1. Brand Architecture

### Dual-Color System

The UI operates on two color tiers:

**Tier 1 — Institutional Structure (Navy)**
- Color: `#002c5f` (UT Navy)
- Role: Body text, panel backgrounds, structural borders, input fields, neutral surfaces
- Character: Holds the instrument together. Readable, professional, recedes to let content breathe.
- Maps to existing tokens: `--ut-primary`, `--ut-navy`, `--ut-darkblue`, `--ut-text`

**Tier 2 — Framework Identity (TRUST Magenta)**
- Color: `#8e036c` (TRUST Magenta)
- Role: Top accent bar, primary buttons, active tab indicator, section headers, TRUST wordmark rendering, PDF report header/branding
- Character: The signature that says "this is a TRUST tool." Drives interaction and identity.
- New token: `--trust-magenta`

**Tier 3 — Organizational Secondary (LISA-EIS)**
- Colors: `#ab2b44` (LISA-EIS Red), `#005c53` (LISA-EIS Teal), gradient `#ab2b44 → #005c53`
- Role: Footer attribution, about page (50/50 with TRUST), export watermark/credit line
- New tokens: `--lisa-red`, `--eis-teal`
- Character: Present but never competing. The "made by" layer.

### Usage Rules

1. **Magenta never appears on navy backgrounds** — contrast is insufficient. Magenta sits on white/off-white panels or as text on light backgrounds.
2. **Navy buttons are demoted to secondary** — any action that was previously "primary button" becomes magenta. Navy buttons become "secondary" or "structural" actions only.
3. **LISA-EIS colors appear only in footer/attribution contexts** — never in interactive elements, borders, or data encoding.
4. **The five principle accents remain untouched** — they encode rubric categories functionally and have no relationship to the brand colors.

---

## 2. Token Updates

### New Tokens (add to `lib/tokens.css`)

```css
/* Framework Signature */
--trust-magenta: #8e036c;
--trust-magenta-strong: color-mix(in srgb, #8e036c 86%, #000);
--trust-magenta-tint: color-mix(in srgb, #8e036c 16%, #fff);
--trust-magenta-border: color-mix(in srgb, #8e036c 32%, #bfc6cf);

/* Organizational Secondary */
--lisa-red: #ab2b44;
--eis-teal: #005c53;
```

### Modified Tokens

```css
/* button-primary shifts from navy to magenta */
/* Before: background: var(--ut-primary) / #002c5f */
/* After:  background: var(--trust-magenta) / #8e036c */

/* button-primary-hover */
/* Before: #001a3a */
/* After:  color-mix(in srgb, #8e036c 88%, #000) ≈ #6a0254 */
```

### Tokens to Remove

- `--ut-pink: #cf0072` — undocumented orphan, unused everywhere. Delete.
- `--state-warning: #d97706` — if still needed for Metadata warnings, document it properly. Otherwise remove and use `score-poor` (#ea580c) instead.

### DESIGN.json Updates

Add `trust-magenta`, `lisa-red`, `eis-teal` to the `colorMeta` section with full oklch tonal ramps. Update `button-primary` component spec to reference magenta instead of navy.

---

## 3. Typography Updates

### Font Stack Changes

**Current heading font:** `Arial Narrow, Arial, sans-serif`
**New addition:** `Nunito Sans` at weight 800-900 for brand-visible contexts

Where Nunito Sans applies:
- SessionInit screen title ("Review Extension" subtitle under wordmark)
- PDF report cover title
- Any screen where the TRUST wordmark appears adjacent to text

Where Arial Narrow stays:
- All inline section headers within working panels (Quality Gates, Scoring Rubric, etc.)
- Tab labels
- Kicker labels
- Field labels
- Button text

Rationale: The side panel is a dense working surface. Arial Narrow's extreme condensation is valuable there. Nunito Sans is wider and needs breathing room — reserve it for hero/display moments.

### Implementation

Add Nunito Sans via Google Fonts import in `entrypoints/sidepanel/main.tsx` or `lib/base.css`. Add a new CSS class `.font-display` that maps to `'Nunito Sans', 'Arial Narrow', sans-serif` at weight 800.

---

## 4. Logo Placement Specification

### 4.1 SessionInit Screen (Centered Hero)

```
┌─────────────────────────────┐
│ ░░░░ 5px magenta bar ░░░░░ │  ← --trust-magenta
│                             │
│        [TRUST SVG]          │  ← trust.svg, ~180px wide
│    REVIEW EXTENSION         │  ← .font-display, uppercase, muted
│                             │
│  ┌───────────────────────┐  │
│  │ Tool Name             │  │  ← standard form inputs
│  │ Tool URL              │  │
│  │ Reviewer              │  │
│  │                       │  │
│  │ [ START REVIEW ]      │  │  ← magenta primary button
│  └───────────────────────┘  │
│                             │
│ ─────────────────────────── │  ← border-top
│ [LISA-EIS SVG]  LISA-EIS   │  ← footer, org secondary
│     / University of Twente │
└─────────────────────────────┘
```

- TRUST wordmark: `public/trust.svg`, rendered at ~180px width, centered
- Subtitle: "REVIEW EXTENSION" in `.font-display`, `color: var(--ut-muted)`, `letter-spacing: 0.08em`
- Form: centered, max-width ~280px, standard input styling unchanged
- Primary button: magenta background per new token
- Footer: LISA-EIS SVG (`public/lisa-eis.svg`) at ~20px height + "LISA-EIS / University of Twente" in slate text

### 4.2 ActiveSession Header

```
┌─────────────────────────────┐
│ ░░░░ 5px magenta bar ░░░░░ │  ← was navy, now --trust-magenta
│                             │
│ [T] TRUST Review   EVAL ... │  ← small trust wordmark or stylized T
│ ─────────────────────────── │
│  CAPTURES  EVALUATION  META │  ← active tab = magenta underline
└─────────────────────────────┘
```

- Top accent bar: `background: var(--trust-magenta)` (was `var(--ut-primary)`)
- Header area: small TRUST wordmark (~80px) left of panel title, OR just the panel title in magenta
- Active tab: `border-bottom-color: var(--trust-magenta)` (was navy), active tab text also magenta
- Inactive tabs: unchanged (muted steel)

### 4.3 Section Headers (Within Panels)

Within Evaluation/Captures/Metadata panels:

- Section header text (e.g., "QUALITY GATES", "SCORING RUBRIC"): `color: var(--trust-magenta)` (was `var(--ut-navy)`)
- Font remains Arial Narrow heading, uppercase, tracking 0.03em
- This is the single biggest visual change inside working panels — every section header shifts from navy to magenta

### 4.4 Buttons

| Button Type | Before | After |
|-------------|--------|-------|
| Primary (Start Review, Export Report) | Navy `#002c5f` | Magenta `#8e036c` |
| Primary hover | `#001a3a` | `color-mix(88% + black)` ≈ `#6a0254` |
| Danger (Discard) | UT Red `#c60c30` | Unchanged |
| Ghost/Link (Capture Evidence) | Teal-blue text | Unchanged |
| Save (in EvidenceModal) | Green `#4a8355` | Unchanged (contextual action) |

### 4.5 PDF Report Cover

```
┌──────────────────────────────┐
│                              │
│       [TRUST SVG]            │  ← Large, centered
│                              │
│    TRUST FRAMEWORK           │  ← .font-display, magenta
│      REVIEW REPORT           │
│                              │
│  Tool: Semantic Scholar      │  ← body text, navy
│  Reviewed by: [name]         │
│  Date: [date]                │
│                              │
│  ─────────────────────────   │  ← magenta divider
│                              │
│ [LISA-EIS SVG]               │  ← Small, bottom-right or centered
│ LISA-EIS / Univ. of Twente  │
│                              │
└──────────────────────────────┘
```

- TRUST wordmark prominent at top
- Title in Nunito Sans/magenta
- All body metadata in navy-tinted text
- Table headers: magenta-tinted background (not the current blue `#1e40af`)
- Score colors: use design system score ramp (not Tailwind defaults)
- Footer: LISA-EIS attribution

### 4.6 PDF Report Internal Pages

- Page header (if any): thin magenta top bar (2-3px)
- Section titles: magenta color
- Table header fills: `color-mix(in srgb, #8e036c 12%, #fff)` — very subtle magenta tint
- All hardcoded colors remapped to design system tokens (see Section 7)

### 4.7 Browser Extension Icon

- Use the stylized "T" from `public/trust.svg`
- Extract just the T path, render in `#8e036c` on transparent background
- Size: standard browser action icon (16x16, 19x19, 38x38 variants)
- The T's distinctive wide-bar shape is recognizable even at 16px

### 4.8 About Page (Future)

If added later:
- 50/50 split: TRUST wordmark + LISA-EIS logo side by side
- TRUST section: framework description, principles overview
- LISA-EIS section: team info, department context
- CC-BY attribution to GO FAIR for FAIR inspiration

---

## 5. Component-by-Component Changes

### 5.1 SessionInit.tsx

**Major restructure to centered hero layout:**

1. Remove current flat header/title layout
2. Add centered container with:
   - `<img src="/trust.svg">` (or inline SVG) as hero element
   - "REVIEW EXTENSION" subtitle in `.font-display`
   - Form inputs (unchanged structurally)
   - Primary button now uses magenta (class change)
3. Add footer bar with LISA-EIS logo + attribution
4. Top accent bar already exists via ActiveSession parent — ensure SessionInit also gets the magenta bar

### 5.2 ActiveSession.tsx

1. Top accent bar: change from implicit navy to `bg-trust-magenta` (new token)
2. Consider adding small TRUST wordmark or "T" mark in header area
3. Active tab indicator: update CSS to use `--trust-magenta` instead of `--ut-navy`

### 5.3 Evaluation.tsx

1. Section headers ("QUALITY GATES", "SCORING RUBRIC"): add `text-trust-magenta` (or equivalent)
2. No other changes needed — rubric cards keep their principle-specific accent colors

### 5.4 Captures.tsx

1. Section header: magenta color
2. Capture cards: consider adding subtle treatment (currently plain bordered divs). Minimum: no change. Enhancement option: very subtle left border in `--trust-magenta-tint` when capture has linked rubric tags.

### 5.5 Metadata.tsx

1. Section header: magenta color
2. Export button: magenta (already primary button pattern)
3. Discard button: unchanged (danger/red)

### 5.6 EvidenceModal.tsx

1. Modal header: could include small TRUST wordmark or "T" mark
2. Save button: stays green (contextual action, not primary CTA)

### 5.7 ConfirmDialog.tsx

1. No brand changes needed — this is a utility dialog

---

## 6. CSS / Token Changes Detail

### `lib/tokens.css` Additions

```css
/* === Framework Signature === */
--trust-magenta: #8e036c;
--trust-magenta-strong: #6a0254;
--trust-magenta-tint: #fbeef5;
--trust-magenta-border: #c991ab;

/* === Organizational Secondary === */
--lisa-red: #ab2b44;
--eis-teal: #005c53;
```

### `lib/tokens.css` Removals

```css
/* DELETE these undocumented/orphan tokens: */
--ut-pink: #cf0072;           /* unused everywhere */
/* CONSIDER removing: */
--state-warning: #d97706;     /* replace usages with --score-poor */
```

### `lib/components.css` Changes

```css
/* Top accent bar */
.top-accent {
  background: var(--trust-magenta);  /* was var(--ut-primary) */
}

/* Sidebar tabs */
.sidebar-tab.is-active {
  color: var(--trust-magenta);      /* was var(--ut-navy) */
  border-bottom-color: var(--trust-magenta);
}

/* Primary button (.ds-btn-primary) */
.ds-btn-primary {
  background: var(--trust-magenta); /* was var(--ut-primary) */
}
.ds-btn-primary:hover {
  background: var(--trust-magenta-strong); /* was #001a3a */
}
```

### `tailwind.config.ts` Updates

Add new color entries:
- `trustMagenta: '#8e036c'` (with opacity variants)
- `lisaRed: '#ab2b44'`
- `eisTeal: '#005c53'`

Update `buttonPrimary` reference to use `trustMagenta`.

---

## 7. PDF Export Pipeline Fix

### Problem

`lib/export.ts` uses ~20 hardcoded Tailwind default colors that don't match the design system. The nutrition label (`lib/nutrition-label.ts`) is correct and should be the reference.

### Required Color Remapping

| Current (Wrong) | Design System Token | Hex |
|-----------------|-------------------|-----|
| `#dc2626` (fail) | `--ut-red` / score-fail | `#c60c30` |
| `#d97706` (warning) | `--score-poor` | `#ea580c` |
| `#1e40af` (table header) | `--ut-primary` (navy) | `#002c5f` — data tables stay navy for readability; section dividers use magenta |
| `#1e293b` (title) | `--ut-text` | `#172033` |
| `#374151` (section) | `--ut-text` | `#172033` |
| `#6b7280` (muted) | `--ut-muted` | `#576578` |
| `#9ca3af` (tertiary) | `--ut-slate` | `#8b9bb0` |
| `#4b5563` (description) | `--ut-muted` | `#576578` |
| `#e5e7eb` (border) | `--ut-border` | `#bfc6cf` |

### Structural PDF Changes

1. **Cover page**: Add TRUST wordmark (embed SVG as base64 or render text approximation), title in bold/magenta, LISA-EIS footer
2. **Table headers**: Shift from blue to either navy (institutional) or magenta-tint (framework). Recommend navy for data tables, magenta for section dividers.
3. **Section dividers**: Use magenta instead of generic gray lines
4. **Score displays**: Already using correct colors in nutrition label. Ensure main export follows same palette.
5. **Font**: pdfMake defaults to Roboto. Acceptable — Nunito Sans would require font embedding which complicates the ZIP output. Keep Roboto for PDF, use magenta color to carry brand.

---

## 8. Existing Discrepancies to Fix Alongside Brand Work

These were identified in the audit and should be resolved during implementation:

### Must-Fix (High Priority)

1. **PDF export colors** (Discrepancy C) — covered in Section 7
2. **Checkbox radius** (Discrepancy E) — change `rounded` to `rounded-ut-sm` in Metadata.tsx and SessionInit.tsx

### Should-Fix (Medium Priority)

3. **Accent card border orientation** (Discrepancy A) — pick top or left, make consistent. Current code uses `border-top`; DESIGN.json says `border-left`. Recommend keeping `border-top` since it matches the top-accent-bar visual language and works better in vertical scroll.
4. **Rating scale architecture** (Discrepancy G) — current `.score-row` vertical list works well in narrow side panel. The 4-column grid from the spec would be cramped. Recommend keeping vertical rows, cleaning up dead `.rating-scale` CSS.
5. **Capture cards lack accent** (Discrepancy H) — add minimal treatment (magenta-tint left border when tagged)

### Nice-to-Fix (Low Priority)

6. **Focus ring approach** (Discrepancy D) — `focus:ring` (box-shadow) vs `outline`. Visual result is nearly identical. Can leave as-is unless strict Flat Surface Rule compliance is required.
7. **Discard button padding** (Discrepancy F) — minor asymmetry. Quick fix.

---

## 9. Files Changed (Implementation Scope)

### New Files
- None expected (logos already exist as assets)

### Modified Files

| File | Change Type | Description |
|------|------------|-------------|
| `lib/tokens.css` | Edit | Add magenta/lisa-eis tokens, remove orphan pink |
| `lib/components.css` | Edit | Update accent bar, tabs, primary button to magenta |
| `tailwind.config.ts` | Edit | Add new color tokens to Tailwind theme |
| `DESIGN.md` | Edit | Document brand architecture, update rules |
| `DESIGN.json` | Edit | Add new tokens to colorMeta, update component specs |
| `components/SessionInit.tsx` | Major edit | Centered hero layout with TRUST wordmark |
| `components/ActiveSession.tsx` | Minor edit | Accent bar color, optional header wordmark |
| `components/Evaluation.tsx` | Minor edit | Section header color to magenta |
| `components/Captures.tsx` | Minor edit | Section header color, optional card accent |
| `components/Metadata.tsx` | Minor edit | Section header color, checkbox radius |
| `lib/export.ts` | Major edit | Complete color remapping, cover page branding |
| `public/manifest.json` (or WXT config) | Edit | Browser action icon path |

### Files NOT Changed
- `lib/rubric.ts` — principle accent colors untouched
- `lib/nutrition-label.ts` — already correct
- `stores/session.ts` — no visual concerns
- `lib/types.ts` — no visual concerns
- `components/EvidenceModal.tsx` — minimal/no changes
- `components/ConfirmDialog.tsx` — no changes

---

## 10. Implementation Phases

### Phase 1: Foundation (Tokens + CSS)
1. Add new tokens to `tokens.css`
2. Update `components.css` (accent bar, tabs, buttons)
3. Update `tailwind.config.ts`
4. Clean up orphan tokens

### Phase 2: UI Components
5. Redesign `SessionInit.tsx` to centered hero layout
6. Update `ActiveSession.tsx` (accent bar, tab color)
7. Update section headers across Evaluation, Captures, Metadata
8. Fix checkbox radius
9. Optional: capture card accent treatment

### Phase 3: Artifacts (PDF Export)
10. Remap all colors in `export.ts` to design tokens
11. Add TRUST wordmark to PDF cover
12. Add LISA-EIS attribution to PDF footer
13. Update table header styling
14. Test PDF output visually

### Phase 4: Polish & Cleanup
15. Update DESIGN.md and DESIGN.json documentation
16. Create browser extension icon (extract T from trust.svg)
17. Update manifest/icon config
18. Remove dead CSS (unused `.rating-scale` rules)
19. Final visual QA pass (all screens + PDF)
