# Typography Analysis

**Scope**: Font choices, hierarchy, readability, print typography in both reports

---

## Font System Overview

| Role | Family | Weights Used | Sizes |
|------|--------|-------------|-------|
| Body | Inter, Segoe UI, system-ui, sans-serif | 400, 600, 700 | 0.72–0.95rem |
| Heading | Arial Narrow, Arial, Helvetica, sans-serif | 700, 800 | 0.75–3.5rem (clamp) |
| Mono | JetBrains Mono, Cascadia Code, Fira Code, monospace | 700 | 0.75–1.1rem |

Base: 15px (html font-size), body line-height: 1.55

---

## Findings

### T-01 [P1] — No web font embedding in standalone HTML
**File**: `lib/report.css` (:root)
**Problem**: The font stack specifies "Inter", "Arial Narrow", "JetBrains Mono" — none of which are system fonts. The standalone HTML report has no `@font-face` declarations and no font files. On systems without these fonts installed, the entire report falls back to system-ui/sans-serif.
**Impact**: The carefully designed typography degrades to generic system fonts on most machines. Arial Narrow is particularly rare on Linux. JetBrains Mono is a developer font, unlikely on non-technical machines.
**Fix**: Consider embedding critical fonts as base64 @font-face, or choosing fonts more likely to be installed (Georgia, Verdana for body; Impact or condensed system fonts for headings). Alternatively, accept the fallback and document it.

### T-02 [P2] — Arial Narrow is a strong heading choice with caveats
**Problem**: Arial Narrow is an excellent choice for institutional/academic headings — it's condensed, authoritative, and distinctive. However:
- Not available on Linux (no Arial Narrow in most distros)
- Falls back to regular Arial, which is wider and less impactful
- Not a web-safe font
**Assessment**: The visual identity depends heavily on this font. Without it, the report looks significantly different.
**Recommendation**: If embedding isn't feasible, consider `font-stretch: condensed` on the fallback Arial, or use a more universally available condensed font.

### T-03 [P2] — Heading size range is very wide
**Sizes used**:
- 0.7rem (0.75rem × ~93%) — category letter name, principle names, timestamps
- 0.75rem — legend labels, footer, timestamps, ToC label, gate table headers, meta text
- 0.8rem — ToC items, body text in tables, evidence meta, URL text
- 0.85rem — notes text, block text, finalization body text
- 0.9rem — verdict reason, category section headers
- 0.95rem — category table labels
- 1.0rem — gate summary text
- 1.1rem — principle codes, evidence count
- 1.2rem — report header h1
- 1.3rem — tool name (nutrition label), category code (overview table)
- 1.5rem — tool name (full report header)
- 1.8rem — total score
- clamp(1.4–2.2rem) — verdict stamp
- clamp(1.8–2.5rem) — category letters
- clamp(2–3rem) — letterform letters, finalization grade
- clamp(2–3.5rem) — verdict text

That's 17 distinct sizes across a 4.7× range. Tufte would approve of the range, but some adjacent sizes (0.75/0.8, 0.85/0.9) are nearly indistinguishable.

**Recommendation**: Consolidate to ~12 distinct sizes. Merge 0.72→0.75, 0.85→0.9.

### T-04 [P3] — Small text sizes may fail readability standards
**Problem**: Several text elements use sizes below 0.8rem (12px at 15px base):
- 0.55rem (8.25px) — evidence count label
- 0.7rem (10.5px) — category letter name
- 0.72rem (10.8px) — nutrition status text
- 0.75rem (11.25px) — multiple elements

At these sizes with Inter's x-height, readability is acceptable but tight. For print at 12px base (the print stylesheet reduces to 12px), these become:
- 0.55rem → 6.6px — **unreadable**
- 0.7rem → 8.4px — very small
- 0.75rem → 9px — below minimum for comfortable reading

**Fix**: In print stylesheet, increase minimum font size to 9px equivalent. Set `html { font-size: 14px }` in print instead of 12px, or add minimum font-size overrides.

### T-05 [P2] — Monospace font weight is always 700
**Problem**: All monospace text (codes, badges, evidence IDs, URLs) uses `font-weight: 700`. This creates visual heaviness for elements that should be subtle (like muted evidence timestamps). The bold weight works well for score badges but is too heavy for metadata.
**Fix**: Use `font-weight: 400` for evidence timestamps and metadata, keep 700 for codes and badges only.

### T-06 [P1] — Letter-spacing creates inconsistent rhythm
**Letter-spacing values used**:
- `0.02em` — table headers
- `0.03em` — tool name, category section headers, fin-grade, fin-block h3
- `0.04em` — legend labels, ToC label, gate title, principle names, nutrition titles, gate items
- `0.08em` — report header h1, letterform letters, verdict label, verdict stamp, trust tagline
- `0.12em` — trust-branding tagline

The progression is reasonable (more spacing = more important/uppercase text). However, `0.08em` on the letterform and verdict stamp creates very wide tracking that can reduce readability for the most important text.

**Assessment**: Generally well-applied, but the 0.08em and 0.12em values on key display text may reduce legibility for dyslexic readers.

### T-07 [P2] — Text-transform: uppercase overuse
**Problem**: Nearly every heading, label, and meta element uses `text-transform: uppercase`:
- Header tool name, gate summary, ToC label, legend label, category headers, category letter name, category info h2, finalization h3, verdict label, verdict stamp, nutrition titles, nutrition principle names, trust tagline, footer

Uppercase text is ~13% harder to read than mixed case (word shape recognition is reduced). With so many uppercase elements, the visual system fatigues.

**Fix**: Keep uppercase for: verdict stamp, category codes, brand tagline. Use mixed case for: section headers, meta labels, table headers.

### T-08 [P2] — Line-height of 1.55 is good for body, tight for small text
**Problem**: Body `line-height: 1.55` is appropriate. But small text (0.75–0.8rem) inherits this same line-height, which at small sizes creates tight leading. The evidence meta and table notes at 0.75rem with 1.55 line-height have very tight line spacing when they wrap.
**Fix**: Add explicit `line-height: 1.6` for elements below 0.85rem.

### T-09 [P3] — No hyphenation control
**Problem**: The report has no `hyphens` CSS property. Long words in notes, level descriptions, and requirements text may cause awkward line breaks.
**Fix**: Add `hyphens: auto` for body text in print stylesheet.

### T-10 [P3] — Verdict stamp text wrapping could be awkward
**Problem**: "NOT RECOMMENDED" at `clamp(1.4rem, 3.5vw, 2.2rem)` with `letter-spacing: 0.08em` could wrap on narrow viewports. The stamp has no `white-space: nowrap`.
**Fix**: Add `white-space: nowrap` to `.nutrition-verdict-stamp`.

### T-11 [P1] — Print font-size reduction is too aggressive
**File**: `lib/report.css` (@media print)
**Problem**: `html { font-size: 12px; }` reduces the base from 15px to 12px — a 20% reduction. At this size:
- 0.75rem text → 9px (below 10px minimum for comfortable reading)
- 0.55rem text → 6.6px (unreadable)
- Distribution bars → 8px height (nearly invisible)
**Fix**: Use `font-size: 13px` in print, or add minimum-size overrides for critical text elements.

### T-12 [P2] — Italic usage is appropriate but sparse
**Problem**: Italic is used for tool description (`.nutrition-description`) and notes (`font-style: italic`). This is appropriate — italic for supplementary/contextual text, roman for data.
**Assessment**: Well-applied. No issues.

### T-13 [P2] — Numeric alignment in tables could be improved
**Problem**: Score values (0, 1, 2, 3) in table cells use left-aligned text. Numeric data is easier to compare when right-aligned or decimal-aligned.
**Fix**: Right-align the score cell column: `.score-cell { text-align: right; }` or use tabular-nums font feature: `font-variant-numeric: tabular-nums`.

### T-14 [P3] — No font-display strategy
**Problem**: Since no fonts are loaded (no @font-face), there's no FOIT/FOUT concern. The fallback fonts are acceptable but visually different.
**Assessment**: N/A for standalone HTML. Acceptable.

### T-15 [P2] — Category letter contrast with background
**Problem**: Category letters use the principle color on a tinted background (`color-mix(in srgb, var(--accent) 6%, var(--white))`). For SE (#c2410c) on its 6% tint, the contrast should be verified. Dark orange on very light orange is fine. All colors at full saturation on near-white backgrounds have excellent contrast.

### T-16 [P3] — Font fallback chain quality
**Problem**: 
- Body: "Inter" → "Segoe UI" → system-ui → -apple-system → sans-serif
  - Inter and Segoe UI are similar (humanist sans). Good fallback chain.
- Heading: "Arial Narrow" → Arial → Helvetica → sans-serif
  - Arial Narrow → Arial is a significant style change (narrow → normal width). The condensed look is lost.
- Mono: "JetBrains Mono" → "Cascadia Code" → "Fira Code" → ui-monospace → monospace
  - Good chain among developer-oriented monospace fonts. ui-monospace is a modern system monospace.

### T-17 [P2] — Verdict text in full report could use more visual weight
**Problem**: The `.verdict-text` uses `clamp(2rem, 6vw, 3.5rem)` with weight 700. For the most important single piece of information, this is good but could be stronger with 800 weight to match the letterform letters.

### T-18 [P3] — Footer text color is too light for print
**Problem**: Footer uses `color: var(--slate)` (#4c5e74) which may reproduce too lightly in grayscale print.
**Fix**: In print, darken to `color: #333`.

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 | 3 | Missing font embedding, print size reduction, letter-spacing extremes |
| P2 | 10 | Small text readability, uppercase overuse, font weight uniformity, text alignment |
| P3 | 5 | Hyphenation, wrapping, fallback quality, print legibility |
| **Total** | **18** | |

### Strengths
1. Three-font system (body/heading/mono) creates clear visual separation
2. `clamp()` for responsive sizing is well-implemented
3. Consistent letter-spacing progression reflects hierarchy
4. Monospace for codes/badges is distinctive and scannable
5. The condensed heading font gives an authoritative, institutional feel

### Key Improvement
**Embed Inter (or a similar web-safe alternative) and a condensed heading font** to ensure the carefully designed typography survives in the standalone HTML context.
