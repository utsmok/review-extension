---
name: TRUST Review Extension
description: Browser extension for systematic evaluation of academic search tools against the TRUST framework
colors:
  trust-magenta: "#8e036c"
  trust-magenta-strong: "#6a0254"
  trust-magenta-tint: "#fbeef5"
  trust-magenta-border: "#c991ab"
  lisa-red: "#ab2b44"
  eis-teal: "#005c53"
  navy-primary: "#002c5f"
  ut-blue: "#007d9c"
  ut-red: "#c60c30"
  ut-green: "#4a8355"
  ut-purple: "#4f2d7f"
  trust-blue: "#2563eb"
  trust-green: "#16a34a"
  trust-violet: "#9333ea"
  trust-orange: "#ea580c"
  trust-teal: "#0d9488"
  neutral-canvas: "#eef0f3"
  neutral-panel: "#f3f4f6"
  neutral-text: "#172033"
  neutral-muted: "#4f5e73"
  neutral-slate: "#4c5e74"
  neutral-border: "#bfc6cf"
  score-fail: "#c60c30"
  score-poor: "#c2410c"
  score-fair: "#0e7490"
  score-good: "#4a8355"
typography:
  display:
    fontFamily: "Nunito Sans, Arial Narrow, sans-serif"
    fontWeight: 800
    letterSpacing: "0.08em"
  heading:
    fontFamily: "Arial Narrow, Arial, sans-serif"
    fontWeight: 700
    letterSpacing: "0.03em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.02em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
rounded:
  sm: "1px"
  md: "2px"
  lg: "0px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.trust-magenta}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#6a0254"
  button-danger:
    backgroundColor: "{colors.ut-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  input-text:
    rounded: "{rounded.sm}"
    padding: "6px 8px"
  accent-card:
    backgroundColor: "{colors.neutral-panel}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  rubric-chip:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: TRUST Review Extension

## 1. Overview

**Creative North Star: "The Review Bench"**

A bench-side evaluation instrument: sharp borders, monospace metadata, evidence pinned directly to observations. The side panel feels like a structured lab notebook open alongside the specimen under review. Not a consumer app, not a dashboard: a focused work surface for methodical scoring.

The system is flat and dense by design. Shadows are absent; depth comes from background tint differentiation and border weight variation. Border radius is near-zero (0 to 2px), a deliberate rejection of rounded-card aesthetics in favor of regimented functionalism. Navy (#002c5f) carries institutional structure for body text and backgrounds, while TRUST Magenta (#8e036c) serves as the framework identity — primary buttons, top accent bar, section headers, and wordmark.

Five TRUST principle colors (blue, green, violet, orange, teal) encode rubric categories visually, making review state scannable at a glance. Score-level colors (red through green) encode evaluation outcomes on a 0-3 spectrum. Both systems use data attributes (`data-accent-key`, `data-score`) to drive coloring through CSS custom properties, keeping JSX minimal and the visual system declarative.

**Key Characteristics:**
- Flat, no shadows; tonal layering through tinted backgrounds only
- Near-zero border radius (0-2px) across all surfaces
- Dense layout optimized for browser side-panel viewport (320-400px)
- Data-attribute-driven accent coloring per TRUST principle
- Score-level semantic color ramp (red to green) for evaluation state
- Four font families with distinct roles: display (Nunito Sans, brand-visible), heading (condensed), body (humanist), mono (technical)

## 2. Colors

A navy-anchored palette with five categorical accents for TRUST principles and a four-step semantic ramp for score levels. Neutrals are tinted toward the brand navy, not pure gray.

### Primary
- **TRUST Magenta** (#8e036c): The framework identity. Used for top accent bar, section headers, primary buttons, wordmark rendering, and the dominant brand presence. The signature that says "this is a TRUST tool."

### Secondary
- **UT Navy** (#002c5f): The institutional anchor. Body text, panel backgrounds, structural borders, input fields, neutral surfaces. Holds the instrument together — readable, professional, recedes to let content breathe.

### Tertiary
- **Teal-Blue** (#007d9c): Interactive accent. Links, focus rings, and secondary interactive elements.

### Organizational
- **LISA-EIS Red** (#ab2b44): Organizational secondary. Footer attribution, export credits only.
- **LISA-EIS Teal** (#005c53): Organizational secondary. Paired with LISA-EIS Red in footer contexts.

### Principle Accents
- **TRUST Reliable Green** (#16a34a): Accent for R_reliable category.
- **TRUST User-Centric Violet** (#9333ea): Accent for U_user_centric category.
- **TRUST Sound Orange** (#ea580c): Accent for S_sound category.
- **TRUST Traceable Teal** (#0d9488): Accent for T_traceable category.

Each TRUST color generates a full family via `color-mix()`: accent (base), accent-strong (86% + black), tint (16% + white), border (32% + border gray), on-accent (white). These drive the `[data-accent-key]` scoping system in CSS.

### Neutral
- **Deep Navy Text** (#172033): Body text color. Tinted toward navy, not pure black.
- **Muted Steel** (#4f5e73): Secondary text, descriptions, helper copy.
- **Slate** (#4c5e74): Tertiary text, disabled states, subtle labels.
- **Steel Border** (#bfc6cf): Structural borders and dividers.
- **Canvas Grey** (#eef0f3): Page/canvas background.
- **Panel Off-White** (#f3f4f6): Card and panel backgrounds.
- **White** (#fafbfc): Innermost surface, inputs, elevated panels.

### Score Semantics
- **Score 0 Fail** (#c60c30): Red. Bottom score, critical failure.
- **Score 1 Poor** (#c2410c): Orange. Below expectations.
- **Score 2 Fair** (#0e7490): Dark teal. Meets baseline.
- **Score 3 Good** (#4a8355): Green. Exceeds expectations.

Each score color also generates tint (10% + white) and border (24% + border gray) variants for background and border states.

**The Principle Accent Rule.** Each TRUST category is assigned exactly one accent color. That color drives the entire visual treatment for that category's rubric section: borders, tints, and text accents. No category borrows another's color.

**The Score Spectrum Rule.** The four score colors form a semantic ramp from red (0) through orange (1) and teal (2) to green (3). This ramp is the only place where color alone encodes evaluation state. Score tints and borders derive automatically via `color-mix()`.

**The Color Precedence Rule.** Principle accent colors are the *dominant* color-as-meaning channel across the product — a category is identified by its color first, everywhere it appears. The score spectrum is the *secondary* channel, used deliberately and locally: only in contexts where a principle-identity color is not already present (e.g. the hero verdict seal, the final overall score, quality-gate ✓/✗ marks), so the two systems never compete for the same element. When identity and outcome coexist — principle score rows, the summary table — the identity color carries the principle and the outcome is read through shape and label (filled/open circles, the N/3 value) rather than a competing hue.

## 3. Typography

**Display Font:** Nunito Sans (Google Fonts, humanist sans-serif, weight 800-900)
**Heading Font:** Arial Narrow (system, condensed sans-serif)
**Body Font:** Inter (Google Fonts, humanist sans-serif)
**Label/Mono Font:** JetBrains Mono (Google Fonts, monospace)

**Character:** A four-way split. Nunito Sans is reserved for brand-visible display contexts — the SessionInit hero subtitle, TRUST wordmark adjacent text — where its wider proportions get breathing room. Arial Narrow condensed headings pack dense uppercase labels into the side-panel constraint for all working surfaces. Inter body text keeps prose descriptions readable at small sizes with generous line height (1.55). JetBrains Mono marks metadata, IDs, and technical labels as machine-readable, distinguishing data from narrative.

Nunito Sans applies only to: SessionInit hero text, any screen where the TRUST wordmark appears adjacent to text. All inline section headers, tab labels, kicker labels, field labels, and button text continue using Arial Narrow.

### Hierarchy
- **Heading** (700, 1.563rem, tracking 0.03em, uppercase): Panel section headers ("Quality Gates", "Scoring Rubric"). Always uppercase in heading font. Sets structural rhythm.
- **Body** (400, 1rem, line-height 1.55): Prose descriptions, requirements text, notes fields. Line length capped by side-panel width (naturally 40-60ch at 320-400px).
- **Label/Kicker** (700, 0.6875rem-0.75rem, tracking 0.02em-0.08em, uppercase): Category kickers ("T Transparent"), field labels, chip text, metadata. Always uppercase. Tracking varies by role: 0.02em for standard labels, 0.04em for uppercase body, 0.08em for kickers and panel titles.
- **Mono** (400, 0.75rem): Timestamps, URLs, IDs, technical metadata. Distinguishes data from prose.

**The Uppercase Header Rule.** Every section header, category kicker, and field label is uppercase in either heading font or mono. Body text and notes are never uppercase. This split makes the scanning layer (headers, labels) visually distinct from the reading layer (descriptions, notes).

## 4. Elevation

No shadows. Flat by default, always.

Depth is conveyed through three mechanisms:
1. **Background tint hierarchy.** White (#fafbfc) sits on panel off-white (#f3f4f6) sits on canvas grey (#eef0f3). Each layer steps one shade darker, creating a subtle recession without drop shadows.
2. **Border weight variation.** Structural borders are 1-2px in steel border (#bfc6cf). Accent borders are 6px for emphasis (section markers). The weight difference signals importance without elevation.
3. **Color intensity.** Active/selected states use saturated accent colors against the muted neutral palette. A selected rubric chip at full accent color reads as "elevated" against its unselected border-only siblings.

**The Flat Surface Rule.** No `box-shadow` anywhere in the system. If an element needs visual prominence, use background tint, border weight, or color saturation, never shadow.

**Exported-report exception.** The generated evaluation report (nutrition label, business card, and full HTML/PDF report) is a *publication artifact*, not the instrument UI. Its hero verdict seals, fold-out rubric/evidence popovers, and the screenshot lightbox use restrained `box-shadow` and a verdict-color accent bar to read as an authoritative, shareable document. This is the sole sanctioned use of elevation in the system; the extension sidepanel and the marketing site remain strictly flat.

## 5. Components

Components are structured but approachable: flat borders, tinted backgrounds, and deliberate color accents provide visual structure without austerity.

### Buttons
- **Shape:** Sharp edges (2px radius)
- **Primary:** TRUST Magenta (#8e036c) background, white text, uppercase heading font, tracking 0.02em. Padding 8px 16px.
- **Hover:** Darkens magenta via `color-mix(88% + black)` to #6a0254. Transition 200ms.
- **Focus:** 2px outline in teal-blue (#007d9c).
- **Danger:** Red (#c60c30) background, white text. Used for destructive actions (discard session).
- **Ghost/Link:** Teal-blue text, no background. Uppercase mono, tracking 0.02em. Used for "Capture Evidence" links.

### Chips (Rubric Tags)
- **Shape:** 1px radius, tight padding (2px 8px)
- **Unselected:** Transparent background, steel border, muted text. Shows rubric category ID in mono.
- **Selected/Linked:** Background tinted to the TRUST principle accent (16% via `color-mix()`), accent-colored border (32%), accent-colored text. State driven by `data-linked="true"` and `data-accent-key`.
- **Toggle:** Click to link/unlink. Visual transition on state change.

### Cards / Containers
- **Corner Style:** 2px radius (or 0px for captures list items)
- **Background:** Panel off-white (#f3f4f6), tinted by TRUST principle accent when applicable
- **Border:** Top accent border (6px) colored by `data-accent-key` principle. Structural borders 1px steel.
- **Internal Padding:** 12px-16px (space-3 to space-4)

### Inputs / Fields
- **Shape:** 1px radius, flat
- **Background:** Canvas grey (#eef0f3) fill, steel border
- **Focus:** Border shifts to teal-blue focus ring
- **Textarea:** Same treatment, resize-y enabled. Used for notes fields on rubric items.

### Navigation (Sidebar Tabs)
- **Shape:** Full-width tab buttons in a horizontal bar
- **Typography:** Uppercase heading font, tracking 0.08em (panel-title spacing)
- **Default:** Muted text, no border
- **Active:** Magenta text, 3px bottom border in magenta
- **Hover:** Text darkens

### Rating Scale (Signature Component)
A 4-column grid for selecting scores 0-3. Each column represents one score level with its own semantic color.
- **Layout:** CSS Grid, 4 equal columns
- **Default:** Muted text, neutral background, thin border
- **Selected:** Score-colored background tint and text. Each column's bottom border is colored by its score-level semantic color (3-5px).
- **Focus:** Outline ring in teal-blue when the contained radio input has focus
- **Transition:** Confirm animation (scale pulse) on selection

### Judgment Selector (Pass/Fail)
A two-option radio group for quality gate items.
- **Layout:** Flex row, two labels
- **Default:** Neutral border, muted text
- **Active Pass:** Green background tint, green text, green border
- **Active Fail:** Red background tint, red text, red border
- **Driven by:** `data-judgment="pass|fail"` and `data-active="true|false"` attributes

### Top Accent Bar
A sticky 5px bar at the top of the active session panel. Defaults to TRUST Magenta (#8e036c). Color transitions between TRUST principle accents as the reviewer navigates rubric sections. Uses `@property --top-accent-color` registration for smooth CSS color transitions.

## 6. Do's and Don'ts

### Do:
- **Do** use background tints derived via `color-mix()` for subtle emphasis. A 10-16% tint on white is enough to distinguish a selected state.
- **Do** keep all text and labels uppercase when using heading font or mono. The scanning layer is always uppercase.
- **Do** drive accent colors through `data-accent-key` attributes so rubric sections inherit their principle color automatically.
- **Do** use the score semantic ramp (red through green) consistently for all 0-3 evaluation displays. Never invent a new color for a score level.
- **Do** cap border radius at 2px. This is a deliberate aesthetic, not an oversight.
- **Do** use Inter for body text at 1rem with 1.55 line-height. The generous leading keeps small text readable in the side panel.

### Don't:
- **Don't** add `box-shadow` to any element. The system is flat by doctrine.
- **Don't** use border-radius greater than 2px. Rounded corners contradict the regimented functionalism.
- **Don't** apply TRUST principle colors outside their assigned categories. The one-to-one mapping is the system's scannability guarantee.
- **Don't** use pure black (#000) or pure white (#fff). Neutrals are navy-tinted.
- **Don't** use body text for headers or heading font for body prose. The three-font system has strict role separation.
- **Don't** add decorative gradients, glassmorphism, or background-clip text effects. The palette is flat and opaque.
- **Don't** introduce new accent colors beyond the five TRUST principles. If a new category is needed, assign it an existing principle color.
