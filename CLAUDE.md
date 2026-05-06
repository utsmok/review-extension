# TRUST Review Extension

Browser extension for systematic evaluation of academic search tools against the TRUST framework. Side panel UI captures screenshots/DOM, tags evidence to rubric items, and exports a `.zip` with CSVs + standalone HTML report.

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
- **JSZip + papaparse** — export pipeline (`lib/export.ts`)
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
  FinalizationScreen.tsx manual grade + notes before export
  ExportCompleteScreen.tsx post-export confirmation + return home
  Metadata.tsx           tool metadata form + export trigger
  SettingsScreen.tsx     reviewer name/email/rubric preferences
  EvidenceThumbnails.tsx inline evidence preview in questions
  EvidenceModal.tsx      full-size evidence viewer
  ProgressCircle.tsx     circular score indicator
  ConfirmDialog.tsx      generic confirm dialog
  Toast.tsx              toast notification component
  ErrorBoundary.tsx      React error boundary
hooks/
  useActiveSession.ts    lifecycle orchestration (load/save/flush/auto-save)
stores/
  registry.ts            Zustand+persist — session index, active ID, settings
  session.ts             in-memory Zustand — active session data (captures, evaluations)
  toast.ts               toast notification state
lib/
  types.ts               data model (SessionData, discriminated EvaluationScore)
  session-storage.ts     IndexedDB persistence (save/load/delete)
  session-lifecycle.ts   create/switch/close/markDone orchestration
  migration.ts           legacy localStorage → IDB migration (idempotent)
  capture.ts             screenshot + HTML archiver (inlines CSS, strips scripts)
  export.ts              zip/csv pipeline + HTML report generation
  html-report.ts         standalone HTML report builder
  scoring.ts             score computation, distribution bars, per-principle checks
  filename.ts            safe filename generation
  auto-save.ts           debounced auto-save subscriber
  logos.ts               base64-encoded logos (TRUST, LISA-EIS, UT)
  principles.ts          TRUST principle color map
  rubric.ts              rubric data + helpers
  hooks.ts               shared React hooks
public/
  trust.svg / lisa-eis.svg  brand logos
  icon-*.png                 extension icons (16–128px)

## Design Tokens

All colors and typography live in `lib/tokens.css` as CSS custom properties, surfaced through `tailwind.config.ts`. Key brand tokens:

- **TRUST Magenta** (`--trust-magenta` `#8e036c`) — primary accent: buttons, headers, top bar, wordmark
- **UT Navy** (`--ut-darkblue` `#002c5f`) — structural: body text, backgrounds, borders
- **LISA-EIS Red/Teal** (`--lisa-red`, `--eis-teal`) — organizational secondary, footer only

Four font families: `display` (Nunito Sans, brand hero), `heading` (Arial Narrow, uppercase labels), `body` (Inter, prose), `mono` (JetBrains Mono, metadata).

## Persistence

Two-store architecture:
- **Registry store** (`stores/registry.ts`) — Zustand + `persist` middleware → `localStorage`. Holds session index, active session ID, settings.
- **Session store** (`stores/session.ts`) — in-memory Zustand (no persist). Active session data only. Auto-saved to IndexedDB via `lib/auto-save.ts` singleton (debounced 300ms, flush on `visibilitychange`).

`useActiveSession` is the single coordination point — loads from IDB on `activeSessionId` change, debounced auto-save during edits, flush on panel hide.

## Data Flow

1. User creates session → `NewSessionModal` → `lifecycle.createSession()` → registry + IDB
2. `useActiveSession` loads from IDB when `activeSessionId` changes
3. Captures linked to rubric items via `Evaluation.explicitEvidenceIds` (one-directional)
4. Auto-save to IDB on every change (debounced), flush on visibility hidden
5. Export compiles active session state into `.zip` (evidence/, CSVs, HTML report)

## Key Decisions

- Rubric data in `data/rubrics/` (trust-full.json, trust-lite.json), helpers in `lib/rubric.ts`
- All data stays local — no server calls
- Zustand `persist` middleware uses localStorage for registry only (session data in IndexedDB)
- Path alias `@/` maps to project root
- Extension icons configured in `wxt.config.ts` under `manifest.action.default_icon`
- Capture HTML archiver inlines stylesheets, strips scripts, resolves relative URLs
- Legacy migration (`migration.ts`) runs once on first load after upgrade

## Rubric Structure

The TRUST rubric has two sections:
- **Quality gates** — pass/fail prerequisites (data privacy, training policy, citation mechanism, accessibility)
- **Scoring rubric** — 0-3 scale across T_R_U_S_T categories (transparent, reliable, user-centric, sound, traceable)

See `data/rubrics/trust-full.json` for the full rubric data and `docs/TRUST-FRAMEWORK.md` for the framework reference.

## Agent skills

### Issue tracker

Issues tracked in GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one CONTEXT.md + docs/adr/ at repo root. See `docs/agents/domain.md`.

### Impeccable design skill

- **Status:** fully set up and accessible from OMP. Skill resolved via `skill://impeccable`, scripts at `~/.claude/skills/impeccable/`.
- **Register:** `product` (design serves the product — correct for this evaluation instrument).
- **Context files:** `PRODUCT.md` (users, brand, principles) and `DESIGN.md` (full design system: colors, typography, elevation, components, do's/don'ts) are both present and substantive at the project root.
- **Path note:** the skill's SKILL.md references `node .claude/skills/impeccable/scripts/load-context.mjs` (relative), but the project's `.claude/skills/` has no `impeccable` symlink. Use the resolved absolute path instead: `node /home/sam/.claude/skills/impeccable/scripts/load-context.mjs`. Alternatively, add a symlink: `ln -s ~/.claude/skills/impeccable .claude/skills/impeccable`.
- **Commands available:** 22 commands across build (craft, shape, teach, document, extract), evaluate (critique, audit), refine (polish, bolder, quieter, distill, harden, onboard), enhance (animate, colorize, typeset, layout, delight, overdrive), fix (clarify, adapt, optimize), and iterate (live). Plus pin/unpin management.
- **No `.impeccable.md`** — not needed; the native PRODUCT.md/DESIGN.md pair is richer.
