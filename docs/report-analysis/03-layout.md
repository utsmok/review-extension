# Layout & Visual Hierarchy Analysis

**Scope**: Evaluation Report + Nutrition Label layout, spacing, composition

---

## Overall Page Architecture

### Full Evaluation Report
The report uses a single-column, max-width 900px centered layout with 24px padding. Structure:
1. **Nutrition label** (embedded at top)
2. **Detailed report header** (border-top separator, tool metadata)
3. **Table of contents** (inline flex-wrap nav)
4. **Quality gates table**
5. **Category sections** (5 sections, alternating bg)
6. **Finalization section** (border-top separator)
7. **Additional evidence gallery**

### Nutrition Label (standalone)
A bordered card (3px solid) with stacked sections separated by dividers:
1. TRUST branding (centered logo + tagline)
2. Tool header (logo + name + URL + description, centered)
3. Verdict stamp (centered)
4. Quality gate issues (left-aligned list)
5. Principles table (5 columns + overall)
6. Strengths/Weaknesses (2-column split)
7. Footer (logos + date)

---

## Findings

### L-01 [P1] — Category section letter block wastes horizontal space
The `.category-letter-block` uses `min-width: 48px` for a 2-character code. At 900px viewport, this is ~5% of content width for a decorative element. The large letter (`clamp(1.8rem, 4vw, 2.5rem)`) is visually impactful but the information it carries (2-char code) is already shown in the category info section.
**Recommendation**: Reduce to `min-width: 36px`, letter size to `clamp(1.4rem, 3vw, 2rem)`.

### L-02 [P1] — Category meta line uses monospace for mixed content
`.category-meta` shows "6 / 6 · avg 3.0 · 0 evidence" in monospace at 0.75rem. The monospace font makes the meta data feel technical rather than informative. The "0 evidence" label is particularly unhelpful — it should either show the count when >0 or be hidden when 0.
**Recommendation**: Use body font for meta, increase size to 0.8rem, hide "0 evidence" or show as "No evidence attached".

### L-03 [P2] — Table of contents is visually weak
The ToC uses `flex-wrap` with `gap: 8px`, `font-size: 0.8rem`, `border: 1px solid var(--border)`. It looks like a footnote rather than a navigation tool. At 0.8rem with font-weight 600, it doesn't command attention.
**Recommendation**: Increase font to 0.85rem, add a subtle left border accent in magenta, make codes bolder.

### L-04 [P2] — Category table column widths are suboptimal
- Code column: 36px (appropriate for 3-char codes like "TR1")
- Score cell: 44px (appropriate for badge)
- Level column: 180px fixed (too rigid — level descriptions range from 10 to 200+ chars)
- Notes: flexible width

The fixed 180px level column causes either truncation or excessive wrapping for longer descriptions.
**Recommendation**: Remove fixed width, let level column flex. Set `max-width: 300px` to prevent over-expansion.

### L-05 [P1] — Vertical rhythm between sections is inconsistent
- Top bar to header: 24px margin
- Header to divider: 12px margin-bottom
- Divider to letterform: 16px margin-bottom
- Letterform to gate summary: 16px margin
- Gate summary to TOC: 12px margin-bottom
- Category sections: 32px margin-bottom
- Finalization section: 32px margin-bottom

The rhythm is 12→16→16→12→...→32, creating an uneven feeling. The jump from 12px to 32px between the overview area and the category sections is jarring.
**Recommendation**: Use a consistent 24px or 32px vertical rhythm. The current mixed spacing doesn't serve a clear hierarchy purpose.

### L-06 [P2] — Evidence items lack visual connection to their parent question
Evidence rows use `padding: 0 8px 8px 52px` to indent under the question, but there's no connecting line or visual cue. In a long category section with multiple questions and evidence items, it's hard to tell which evidence belongs to which question.
**Recommendation**: Add a thin left border in the category accent color, or a subtle vertical connector line.

### L-07 [P2] — Unlinked evidence section feels disconnected
The "Additional Evidence" section uses `border-top: 2px solid var(--magenta)` and lists items in a flex row with 16px gap. Each item has image + metadata. The layout is functional but doesn't explain WHY these are unlinked or what the reader should do with them.
**Recommendation**: Add a subtitle: "Screenshots captured during evaluation that were not linked to specific rubric questions."

### L-08 [P1] — Nutrition label principles table is cramped on mobile
At 640px and below, the 5+1 column principles table has very little horizontal space per column. The principle codes (TR, RE, US, SE, TC) are centered at 1.1rem bold, but the names below them (Transparency, Reliability, etc.) at 0.7rem are barely readable.
**Recommendation**: Below 640px, stack the principles into a 2-column or 3-column grid. Or convert to a vertical list with code + name + circles on one line.

### L-09 [P1] — Nutrition label strengths/weaknesses columns lack min-width
`.nutrition-sw-col` has `flex: 1; min-width: 0;`. With long bullet text, one column can collapse the other. There's no `overflow` handling.
**Recommendation**: Set `min-width: 150px` and `overflow-wrap: break-word` on list items.

### L-10 [P2] — Report header metadata lines are undifferentiated
The detailed report header shows 8+ lines of metadata (tool name, URL, date, description, data sources, search methods, discipline, publisher, pricing, availability, terms, AI-powered, notes) all at `font-size: 0.8rem` with the same style. This creates a wall of text.
**Recommendation**: Group related metadata (tool info, classification, policy) into labeled sub-sections with subtle separators. Use a 2-column layout for shorter metadata pairs.

### L-11 [P3] — Category sections alternate background too subtly
`.category-alt { background: #fafafa; }` is barely distinguishable from white (#ffffff). The alternation barely aids scanning.
**Recommendation**: Use `#f5f6f8` or a very light tint of each category's accent color.

### L-12 [P2] — Finalization section grade block is oversized
`.fin-grade` uses `clamp(2rem, 5vw, 3rem)` with `padding: 16px 0`, `border: 2px solid currentColor`. For a single word ("RECOMMENDED"), this takes up significant vertical space without proportional information value.
**Recommendation**: Reduce to `clamp(1.5rem, 4vw, 2.5rem)` with more compact padding.

### L-13 [P1] — Score summary at top is buried in category header
The current score overview is split across 5 category headers, requiring the reader to scroll through the entire report. There's no single "report card" view.
**Recommendation**: Add a compact summary section between the nutrition label and quality gates: a single row with principle codes, scores, and mini indicators.

### L-14 [P2] — Distribution bars add visual noise without proportional insight
The distribution bars in category headers are 10px tall with colored segments. For categories with uniform scores (e.g., all 3s → 100% green), the bar provides no information. For mixed scores, the 10px height makes the proportions hard to judge.
**Recommendation**: See Tufte analysis (06-tufte-data-viz.md) — replace with numeric display.

### L-15 [P2] — Footer is minimal and lacks visual weight
The footer uses `font-size: 0.75rem; color: var(--slate)` with 32px bottom margin. It's easily overlooked. For an institutional report, the footer should reinforce credibility.
**Recommendation**: Add TRUST logo, add "Confidential" or evaluation scope label, increase font to 0.8rem.

### L-16 [P3] — Evidence item layout could use a card pattern
Evidence items use flex with `gap: 12px` and a subtle panel background. For reports with many evidence items, a more structured card layout with consistent image sizing would improve scanability.
**Recommendation**: Consider a grid layout for evidence items with fixed thumbnail sizes.

### L-17 [P2] — Print layout doesn't show nutrition label separately
When printing, the nutrition label (embedded at the top of the full report) doesn't get special treatment. It would be valuable to have the nutrition label on page 1 and the detailed report starting on page 2.
**Recommendation**: Add `page-break-after: always` after the nutrition label in the full report's print styles.

### L-18 [P1] — Quality gates table "Notes" column is always present even when empty
The notes column shows "-" for unanswered gates, creating visual noise. Empty notes should be handled more elegantly.
**Recommendation**: Hide the notes column entirely when no gate has notes, or use a lighter treatment for the dash.

---

## Nutrition Label Layout Strengths

1. **Self-contained card design** — The 3px border creates a clear visual boundary
2. **Centered header** — Logo + name + URL create a strong focal point
3. **Horizontal divider system** — Thick/thin dividers create clear section boundaries
4. **Verdict stamp** — The rotated stamp with border creates a memorable visual
5. **Two-column strengths/weaknesses** — Effective comparison layout
6. **Compact footer** — Logos + date in a single row

## Nutrition Label Layout Weaknesses

1. **No overall numeric score** — Only circles, no number for quick comparison
2. **Stamp is too small** — For the most important element, it doesn't dominate
3. **Principles table too compressed** — 5 columns + overall in ~900px leaves little room
4. **Missing scale context** — What does 3/4 circles mean? No legend.
5. **No link to full report** — Shared standalone, no path to details
