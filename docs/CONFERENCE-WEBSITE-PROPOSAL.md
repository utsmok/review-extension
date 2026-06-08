# Conference Website Proposal — TRUST Framework

Presentation site for LIBER 2026 (55th Annual Conference, 1–3 July 2026, NTNU Trondheim, Norway).

**Theme**: "The Power of Libraries in an Uncertain World"

## 1. Purpose

A static site that introduces the TRUST framework and its browser extension to conference attendees. It should look like the extension itself — same colors, fonts, iconography — so visitors recognize the tool immediately after seeing the live demo.

## 2. Technology

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Plain HTML + CSS + vanilla JS | No build step, easy to maintain |
| Styling | Custom properties from `lib/tokens.css` | Exact visual match with the extension |
| Hosting | `trust.samuelmok.cc` (subdomain of personal site) | Full control, self-hosted |
| Video | Self-hosted `.mp4` | No third-party embeds, privacy-first |
| Analytics | None | Consistent with TRUST privacy stance |
| Language | English only | LIBER is international |
| QR code | Yes, static SVG in assets | For conference poster/handout |

## 3. Structure

Single-page with tab navigation (mirrors the extension's Metadata → Evaluation → Captures → Finalize flow).

```
┌──────────────────────────────────────────────────┐
│  [TRUST logo]   Home | Demo | Background | Links │
├──────────────────────────────────────────────────┤
│                                                  │
│              (tab content area)                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 3.1 Tab: Home (landing)

- **Hero section**: TRUST SVG logo (from `public/trust.svg`), tagline *"Evaluating AI search tools with confidence"*, one-paragraph intro from LIBER abstract
- **Five principles**: colored cards using principle tokens (`--tr`, `--re`, `--uc`, `--se`, `--tc`), each with icon + 1-line description
- **Authors**: S. Mok, S.A. Kruit, G. de Jonge, K.I.H. Mingoti Poague, L. van Ewijk, J.M. van Eck — University of Twente, LISA EIS-IS
- **Badges row**: Version badge, Apache-2.0 license, link to GitHub releases

### 3.2 Tab: Demo

- **Install instructions**: Chrome + Firefox steps (copied from README)
- **Screenshots**: 3–4 static screenshots of the extension in action (placeholder for now)
- **Video walkthrough**: Self-hosted `.mp4` in `<video>` element (placeholder for now)
- **Example review results**: Nutrition label graphic + HTML report thumbnail

### 3.3 Tab: Background

- **Framework overview**: The 5 principles, quality gates, scoring method (0–3 scale, 10 questions per principle)
- **Papers & references**: List from LIBER abstract references + links to full texts
- **Related documents**: Links to policy docs in `docs/trust framework background/`
- **Comparison table**: "Recommended / Needs review / Not recommended" examples from abstract

### 3.4 Tab: Links

- GitHub repo: `https://github.com/utsmok/review-extension`
- Issue tracker
- LIBER 2026 conference page
- University of Twente LISA-EIS
- Contact: s.mok@utwente.nl

## 4. Visual Design

### Colors (from `lib/tokens.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--trust-magenta` | `#8e036c` | Primary accent, CTAs, active tab |
| `--ut-primary` | `#002c5f` | Header background, headings |
| `--ut-offwhite` | `#f3f4f6` | Page background |
| `--ut-text` | `#172033` | Body text |
| `--ut-muted` | `#4f5e73` | Secondary text |
| `--tr` / `--re` / `--uc` / `--se` / `--tc` | Blue/Green/Purple/Orange/Teal | Principle cards |
| `--trust-magenta-tint` | `#fbeef5` | Card hover/selected state |

### Typography

| Role | Font | Weight |
|------|------|--------|
| Logo | Nunito Sans | 800 |
| Headings | Nunito Sans | 700 |
| Body | system-ui, sans-serif | 400 |

### Layout

- Max-width: `960px`, centered
- Tab bar: sticky top, magenta underline on active
- Cards: `border-radius: 8px`, subtle shadow, white background
- Mobile: stack cards vertically, hamburger nav below `640px`

## 5. Assets to Prepare

| Asset | Source | Action |
|-------|--------|--------|
| TRUST logo | `public/trust.svg` | Copy as-is |
| LISA-EIS logo | `public/lisa-eis.svg` | Copy as-is |
| UT logo | `public/ut-logo.png` | Copy as-is |
| Extension icon | `public/icon.svg` | Use as favicon |
| Screenshots | Manual capture | Take 3–4 screenshots of the extension |
| Nutrition label | Generate from extension | Export example review |
| Video | Self-hosted `.mp4` | Record walkthrough, include in assets |
| QR code | Generate static SVG | For conference poster/handout |

```
docs/site/
  index.html          # Single-page app shell
  style.css           # All styles (tokens + layout + components)
  script.js           # Tab switching, scroll spy
  assets/
    trust.svg
    lisa-eis.svg
    ut-logo.png
    icon.svg
    screenshots/      # Placeholder
    video/            # Placeholder
```

## 7. Milestones

1. **M1 — Static shell**: HTML + CSS + tab switching, all placeholder content
2. **M2 — Content**: Real text from LIBER abstract, screenshots, references
3. **M3 — Polish**: Responsive, animations, final screenshots + video
4. **M4 — Deploy**: Deploy to `trust.samuelmok.cc`, verify on mobile
## 8. Decisions

- **Video**: Self-hosted `.mp4` on `trust.samuelmok.cc`, no third-party embeds
- **Analytics**: None — consistent with TRUST's privacy-first stance
- **QR code**: Yes — generate a static SVG QR code for conference poster/handout
- **Language**: English only — LIBER is an international audience
- **Hosting**: `trust.samuelmok.cc` subdomain (self-hosted, not GitHub Pages)