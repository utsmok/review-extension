# TRUST Review

Browser extension for systematic evaluation of academic search tools using the [TRUST Framework](https://www.utwente.nl/library/).

Captures screenshots, tags evidence to rubric items, and exports a ZIP with CSV data, evidence screenshots, an HTML report, and a standalone nutrition label — all processed locally in the browser.

Based on the five TRUST principles (Transparent, Reliable, User-centric, Secure, Traceable) with quality gates and a 0–3 scoring rubric.

## Install

1. Download the latest `trust-review-extension-*.zip` from [Releases](https://github.com/utsmok/review-extension/releases)
2. Unzip it
3. Open `chrome://extensions` and enable **Developer mode** (top right)
4. Click **Load unpacked** and select the unzipped folder
5. Click the extension icon in the toolbar to open the side panel

## Develop

```bash
pnpm install
pnpm dev          # dev build with HMR
pnpm build        # production build
pnpm zip          # production ZIP for distribution
pnpm test         # run tests
pnpm typecheck    # type check
pnpm lint         # lint
```

Load the dev build from `.output/chrome-mv3-dev` in `chrome://extensions`.

## Workflow

1. **Start** — enter tool name, URL, and metadata
2. **Capture** — screenshot the active tab, tag evidence to rubric items
3. **Evaluate** — score against quality gates and scoring rubric
4. **Finalize** — add strengths, weaknesses, and a verdict
5. **Export** — download a ZIP with evidence, CSV, HTML report, and nutrition label
