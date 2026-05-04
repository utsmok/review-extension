# TRUST Review Extension

Browser extension for systematic evaluation of academic search tools against the TRUST framework. Side panel UI captures screenshots/DOM, tags evidence to rubric items, and exports a `.zip` with CSVs + PDF report.

## Commands

```bash
pnpm dev              # dev server (Chrome)
pnpm dev:firefox      # dev server (Firefox)
pnpm build            # production build
pnpm zip              # packaged zip for distribution
pnpm typecheck        # type check
```

## Tech Stack

- **WXT** (`wxt.dev`) — cross-browser extension framework
- **React 19 + TailwindCSS 3** — side panel UI
- **Zustand** — persistent session state (`stores/session.ts`)
- **JSZip + pdfmake + papaparse** — export pipeline (`lib/export.ts`)
- **Nunito Sans + Inter + Arial Narrow + JetBrains Mono** — 4-font type system (`display`, `heading`, `body`, `mono`)

## Architecture

Side panel (`chrome.sidePanel`) is the only UI surface. Background script opens it on extension icon click. Multi-session: `SessionManager` lists sessions, `NewSessionModal` creates new ones.

```
entrypoints/
  background.ts          opens side panel on action click
  sidepanel.html         side panel entry
  sidepanel/main.tsx     React bootstrap
components/
  App.tsx                root — migration, routing, RubricContext provider
  AppShell.tsx           layout wrapper (header, settings gear)
  SessionManager.tsx     session list, new/done/delete actions
  NewSessionModal.tsx    session creation form
  ActiveSession.tsx      tab container (Captures / Evaluation / Metadata)
  Captures.tsx           capture list, notes, evidence linking
  Evaluation.tsx         quality gates + scoring rubric (delegates to QuestionSection)
  QuestionSection.tsx    individual rubric question with score/evidence
  Metadata.tsx           tool metadata form + export trigger
  SettingsScreen.tsx     reviewer name/email/rubric preferences
  EvidenceThumbnails.tsx inline evidence preview in questions
  ProgressCircle.tsx     circular score indicator
  ConfirmDialog.tsx      generic confirm dialog
hooks/
  useActiveSession.ts    lifecycle orchestration (load/save/flush/auto-save)
stores/
  registry.ts            Zustand+persist — session index, active ID, settings
  session.ts             in-memory Zustand — active session data (captures, evaluations)
lib/
  types.ts               data model (SessionData, discriminated EvaluationScore)
  session-storage.ts     IndexedDB persistence (save/load/delete)
  session-lifecycle.ts   create/switch/close/markDone orchestration
  migration.ts           legacy localStorage → IDB migration (idempotent)
  capture.ts             screenshot + HTML archiver (inlines CSS, strips scripts)
  export.ts              zip/pdf/csv pipeline
  nutrition-label.ts     PDF summary page builder
  pdf-logos.ts           base64-encoded logos for PDF
  pdf-score-indicator.ts SVG score indicators for PDF
  principles.ts          TRUST principle color map
  rubric.ts              rubric data + helpers
  hooks.ts               shared React hooks
public/
  trust.svg / lisa-eis.svg  brand logos
  icon-*.png                 extension icons (16–128px)
```

## Design Tokens

All colors and typography live in `lib/tokens.css` as CSS custom properties, surfaced through `tailwind.config.ts`. Key brand tokens:

- **TRUST Magenta** (`--trust-magenta` `#8e036c`) — primary accent: buttons, headers, top bar, wordmark
- **UT Navy** (`--ut-darkblue` `#002c5f`) — structural: body text, backgrounds, borders
- **LISA-EIS Red/Teal** (`--lisa-red`, `--eis-teal`) — organizational secondary, footer only

Four font families: `display` (Nunito Sans, brand hero), `heading` (Arial Narrow, uppercase labels), `body` (Inter, prose), `mono` (JetBrains Mono, metadata).

## Persistence

Two-store architecture:
- **Registry store** (`stores/registry.ts`) — Zustand + `persist` middleware → `localStorage`. Holds session index, active session ID, settings.
- **Session store** (`stores/session.ts`) — in-memory Zustand (no persist). Active session data only. Auto-saved to IndexedDB via `useActiveSession` hook (debounced 300ms, flush on `visibilitychange`).

`useActiveSession` is the single coordination point — loads from IDB on `activeSessionId` change, debounced auto-save during edits, flush on panel hide.

## Data Flow

1. User creates session → `NewSessionModal` → `lifecycle.createSession()` → registry + IDB
2. `useActiveSession` loads from IDB when `activeSessionId` changes
3. Captures linked to rubric items via `Evaluation.explicitEvidenceIds` (one-directional)
4. Auto-save to IDB on every change (debounced), flush on visibility hidden
5. Export compiles active session state into `.zip` (evidence/, CSVs, PDF report)

## Key Decisions

- TRUST rubric is hardcoded in `lib/rubric.ts` (not user-configurable yet)
- All data stays local — no server calls
- Zustand `persist` middleware uses localStorage for registry only (session data in IndexedDB)
- Path alias `@/` maps to project root
- Extension icons configured in `wxt.config.ts` under `manifest.action.default_icon`
- Capture HTML archiver inlines stylesheets, strips scripts, resolves relative URLs
- Legacy migration (`migration.ts`) runs once on first load after upgrade

## Rubric Structure

The TRUST rubric has two sections:
- **Quality gates** — pass/fail prerequisites (privacy, traceability, accessibility)
- **Scoring rubric** — 0-3 scale across T_R_U_S_T categories (transparent, reliable, user-centric, secure, traceable)

See `docs/rubric.json` for the full JSON and `docs/spec.md` for the implementation spec.

## Agent skills

### Issue tracker

Issues tracked in GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one CONTEXT.md + docs/adr/ at repo root. See `docs/agents/domain.md`.
