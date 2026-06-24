<div align="center">
  <img src="public/trust.svg" alt="TRUST" width="280" />
  <br /><br />
  <strong>Systematic evaluation of academic search tools</strong>
  <br />
  Capture evidence, score against the TRUST framework, export a complete review package — all inside a browser side panel.
  <br /><br />
  <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/utsmok/review-extension/badges/version.json" alt="version" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="license" />
  <a href="https://github.com/utsmok/review-extension/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/utsmok/review-extension/ci.yml?branch=main&label=CI" alt="CI" /></a>
  <a href="https://codspeed.io/utsmok/review-extension"><img src="https://img.shields.io/endpoint?url=https://codspeed.io/badge.json" alt="CodSpeed" /></a>
  <img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/utsmok/review-extension/badges/test-count.json" alt="tests" />
</div>

---

TRUST Review is a Chrome/Firefox extension for conducting structured evaluations of information tools (search engines, databases, AI-powered assistants) using the [TRUST Framework](https://www.utwente.nl/library/). It runs entirely in the browser — no server, no accounts, no data leaves your machine.

## What it looks like

_Screenshots coming soon — to be captured from the running extension._

## What it does

- **Capture evidence** — screenshot the active tab, archive the page HTML, annotate captures with a built-in drawing tool (tldraw). All screenshots are stored as lossless PNG at native resolution.
- **Score against the rubric** — four quality gates (pass/fail) plus a 0–3 scoring rubric across the five TRUST principles: Transparent, Reliable, User-centric, Sound, Traceable.
- **Export a complete review package** — generates a ZIP with an HTML evaluation report, a standalone nutrition-label summary, CSV data files, and an `evidence/` folder containing all screenshots and archived pages.
## Install
### Chrome & chromium-based browsers

**From the webstore (recommended)**
You can find the extension in the [chrome web store](https://chromewebstore.google.com/detail/leclhemhkfmogioabkfcboddalmlncjg?utm_source=item-share-cb). Visit the page, then press `add to chrome`.

**Manual installation**
1. Download the latest `trust-review-extension-*.zip` from [Releases](https://github.com/utsmok/review-extension/releases)
2. Unzip it
3. Open `chrome://extensions`, enable **Developer mode** (top right)
4. Click **Load unpacked** and select the unzipped folder
5. Click the extension icon in the toolbar to open the side panel

### Firefox

**From Firefox Add-ons (recommended)**
The extension is available on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/trust-review/). Visit the page, then press `Add to Firefox`.

**Manual installation**
See **Manual installation** under Chrome above, but replace step 3–4 with: open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select any file inside the unzipped folder.

## Usage

### Starting a review

Click **Start New Review** on the session manager screen. Enter the tool name and URL. The side panel opens with four tabs:

| Tab | Purpose |
|---|---|
| **Evaluation** | Quality gates (pass/fail) and scoring rubric (0–3). A sticky progress bar shows score badges, completion %, and a circular ring. |
| **Metadata** | Tool details (name, URL, logo, pricing, availability, authentication, disciplines, search methods, data sources, AI usage). Also contains the **End Review & Export** button. |
| **Finalize** | Overall grade (Pass / Conditional / Fail), conclusion, strengths, weaknesses, recommendations. Principle dashboard shows per-category scores. |
| **Captures** | All screenshots in a grid or list view. Each capture shows URL, page title, notes, and linked rubric items. Click **Annotate** to open the drawing overlay. |

### Quick tools

The header toolbar provides one-click actions that work from any tab:

| Button | Action |
|---|---|
| 📝 **Quick Note** | Open a note field — text is appended to the session notes with a timestamp. |
| 📷 **Quick Capture** | Screenshot the active tab and add it as evidence. |
| 📄 **Capture T&C** | Screenshot the active tab and auto-fill the Terms & Conditions URL in metadata. |
| 🖼️ **Capture Logo** | Screenshot the active tab and attempt to extract the tool's logo image. |
| ❓ **Shortcuts** | Show keyboard shortcut reference. |

### Keyboard shortcuts

| Key | Action |
|---|---|
| `1` `2` `3` `4` | Switch tabs |
| `Ctrl+Shift+S` | Quick capture |
| `?` | Toggle shortcuts panel |
| `Esc` | Close quick note / shortcuts panel |

### Evidence annotation

From the Captures tab, click **Annotate** on any capture to open the tldraw-based editor. Draw arrows, rectangles, text labels, and freehand strokes on top of the screenshot. Stroke sizes (S/M/L/XL) are available in the toolbar. Zoom controls let you pan and inspect fine detail. The annotated version is saved alongside the original.

### Export

On the Metadata tab, click **End Review & Export**. This produces a ZIP file containing:

```
Evaluation_Report_<tool>.html   # Full standalone HTML report with inline CSS and images
Nutrition_Label_<tool>.html     # Compact summary label
session.json                    # Structured session data
session_metadata.csv            # Tool metadata
rubric_scores.csv               # All rubric scores
capture_log.csv                 # All captures with URLs and notes
review_conclusions.csv          # Grade, conclusion, strengths, weaknesses
evidence/
  <id>.png                      # Lossless PNG screenshots
  <id>_annotated.png            # Annotated versions (if any)
  <id>.html                     # Archived page HTML
```

All evidence screenshots are stored as lossless PNG at their original resolution to preserve text clarity and fine detail.

### Multi-session support

The session manager lists all reviews with progress indicators. You can switch between reviews, resume incomplete ones, or delete finished sessions. Each review is independently saved to IndexedDB with auto-save (debounced, flushes on panel hide).

_Tips: Capture screenshots as you explore (`Ctrl+Shift+S` from any tab). Tag captures to rubric items from the Captures tab — tagged evidence appears inline on the Evaluation tab. Toggle "Tool uses AI" off to hide AI-only questions. Import previous sessions from the session manager._

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 10+

### Quick start

```bash
pnpm install
pnpm dev          # dev build with HMR → .output/chrome-mv3-dev
pnpm build        # production build → .output/chrome-mv3
```

Load the dev build from `.output/chrome-mv3-dev` in `chrome://extensions` (enable Developer mode first).

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (Chrome) with HMR |
| `pnpm dev:firefox` | Dev server (Firefox) |
| `pnpm build` | Production build |
| `pnpm zip` | Packaged zip for distribution |
| `pnpm zip:firefox` | Firefox-specific zip |
| `pnpm test` | Run test suite (Vitest + jsdom) |
| `pnpm test:watch` | Watch mode |
| `pnpm test:coverage` | Coverage report |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm bench` | Performance benchmarks |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | Biome lint |
| `pnpm check` | Biome check (lint + format) |

### Project layout

```
components/        React UI components (side panel screens)
lib/               Core logic — capture, export pipeline, report builder, IDB
stores/            Zustand stores (registry + session state)
hooks/             Shared React hooks
data/rubrics/      TRUST rubric JSON
entrypoints/       WXT entry points (background script, side panel bootstrap)
e2e/               Playwright end-to-end tests
```

Key files to know:

| File | What it does |
|---|---|
| `components/ActiveSession.tsx` | Main tab container + quick tools |
| `components/QuestionSection.tsx` | Quality gates + scoring rubric |
| `components/Metadata.tsx` | Tool metadata + export trigger |
| `components/FinalizationScreen.tsx` | Grade, conclusion, export |
| `components/Captures.tsx` | Capture grid, notes, evidence linking |
| `lib/export-pipeline.ts` | ZIP assembly |
| `lib/html-report.ts` | Standalone HTML report builder |
| `stores/session.ts` | Active session state (auto-save to IndexedDB) |

### Tech stack

- **[WXT](https://wxt.dev/)** — cross-browser extension framework
- **React 19** + **TailwindCSS 3** — side panel UI
- **Zustand** — state management (registry in localStorage, sessions in IndexedDB)
- **[tldraw](https://tldraw.dev/)** — evidence annotation overlay
- **JSZip** + **PapaParse** — export pipeline
- **Biome** — linting and formatting (not ESLint/Prettier)

### Conventions

- **Linting**: Biome — run `pnpm lint` to check, `pnpm check` to lint + format
- **Commit style**: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
- **Tests**: `pnpm test` (Vitest + jsdom). End-to-end: `pnpm test:e2e` (Playwright)
- **Type safety**: `pnpm typecheck` before submitting changes

### License

[Apache License 2.0](LICENSE)
