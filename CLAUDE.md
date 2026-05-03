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

## Architecture

Side panel (`chrome.sidePanel`) is the only UI surface. Background script opens it on extension icon click.

```
entrypoints/
  background.ts          opens side panel on action click
  sidepanel.html         side panel entry
  sidepanel/main.tsx     React bootstrap
components/
  App.tsx                routes SessionInit ↔ ActiveSession
  SessionInit.tsx        start session form
  ActiveSession.tsx      tab container (Captures / Evaluation / Metadata)
  Captures.tsx           capture list, notes, rubric tagging
  Evaluation.tsx         quality gates (pass/fail) + scoring rubric (0-3)
  Metadata.tsx           tool metadata form + export trigger
stores/
  session.ts             Zustand store — session, captures, evaluations
lib/
  types.ts               data model types
  rubric.ts              hardcoded TRUST rubric + helpers
  capture.ts             chrome.tabs.captureVisibleTab + DOM serialization
  export.ts              zip/pdf/csv generation pipeline
```

## Data Flow

1. User starts session → `SessionMetadata` saved to Zustand (persisted to localStorage)
2. Captures tagged to rubric IDs → `Capture.linkedRubricIds`
3. Evaluations reference captures → `Evaluation.explicitEvidenceIds`
4. Export compiles all state into `.zip` (evidence/, CSVs, PDF report)

## Key Decisions

- TRUST rubric is hardcoded in `lib/rubric.ts` (not user-configurable yet)
- All data stays local — no server calls
- Zustand `persist` middleware uses localStorage for session continuity
- Path alias `@/` maps to project root

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
