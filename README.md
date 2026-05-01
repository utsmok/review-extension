# TRUST Review Extension

Browser extension for systematic evaluation of academic search engines and databases. Captures screenshots and DOM, tags evidence to rubric items, and exports a `.zip` with CSVs, evidence files, and a PDF report — all processed locally.

Based on the **TRUST framework** (Transparent, Reliable, User-centric, Secure, Traceable) with quality gates (pass/fail) and a 0-3 scoring rubric.

## Getting Started

```bash
pnpm install
pnpm dev
```

Then load the extension from `.output/chrome-mv3` in `chrome://extensions` (developer mode). Click the extension icon to open the side panel and start a review session.

## Usage

1. **Start** — enter tool name and URL
2. **Capture** — screenshot + DOM of the active tab, tag to rubric items
3. **Evaluate** — score against quality gates and rubric criteria
4. **Export** — end session to download a `.zip` with evidence, CSVs, and PDF report
