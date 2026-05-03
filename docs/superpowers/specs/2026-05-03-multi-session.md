# Multi-Session Management & UI Improvements

## Context

The TRUST Review Extension currently supports a single session at a time. Starting a new session wipes all previous data. The user needs a session management layer — a "home screen" showing all past/present reviews, with the ability to open, continue, export, or delete any session. Alongside this architectural change, several UI improvements are needed: session creation becomes a modal with prefill, a shared header/footer wraps all views, score deselection works, the evaluation god-component is decomposed, and the icon is redesigned.

## Architecture Decisions

### AD-1: Two Zustand Stores (Registry + Active Session)

**Problem:** A single store holding both session-index state and active-session data causes unnecessary re-renders. Evaluation.tsx (9 selectors) would re-render when the session index changes. The two concerns have different change rates and different depths.

**Decision:** Split into two independent stores:

- **`stores/registry.ts`** — session index, activeSessionId, settings. Persisted to localStorage via Zustand persist. Synchronous. Tiny payload (<1KB). **No async methods, no IDB awareness.** Actions: `setActiveSessionId`, `addSession`, `deleteSession`, `markSessionDone`, `updateSettings`, `updateSessionMetadata`.

- **`stores/session.ts`** — active session data only (session, captures, evaluations, questionModes, status). **No persist middleware.** Data is loaded/saved explicitly by the orchestration hook (AD-3). Status field models the session lifecycle (AD-6).

Components subscribe only to the store they need. Session switching is orchestrated by the hook, not by either store.

### AD-2: Simple IndexedDB Save/Load (No Zustand Persist Adapter)

**Problem:** localStorage has a ~5-10MB total per-origin limit. A single session with 5 captures (~200KB-2MB each as base64) can exhaust it. The current store writes the full state to localStorage on every `set()` call.

**Decision:** Write `lib/session-storage.ts` as a thin IDB wrapper with three functions: `saveToIDB(id, data)`, `loadFromIDB(id)`, `deleteFromIDB(id)`. The session store does NOT use Zustand persist. Instead, the orchestration hook (AD-3) calls these functions at the right moments — on session load and on session close.

This avoids the dynamic-persist-key workaround entirely. The ID is a parameter, not encoded in a blob. The adapter is a real storage adapter — serialize → store, load → deserialize.

```ts
// lib/session-storage.ts
export async function saveToIDB(id: string, data: SessionData): Promise<void> { ... }
export async function loadFromIDB(id: string): Promise<SessionData | null> { ... }
export async function deleteFromIDB(id: string): Promise<void> { ... }
```

Auto-save is handled by a debounced `subscribe` listener in the hook (AD-3), not inside a storage adapter. 300ms debounce. The hook tags saves with the session ID; stale saves (from a previous session) are skipped.

### AD-3: Deepened `useActiveSession` Hook as Orchestration Seam

**Problem:** 7 of 8 components import `useSessionStore` directly. With the store split (AD-1), components would need to import from two stores. The store's internal shape becomes a public API — any refactor touches every component.

**Decision:** `hooks/useActiveSession.ts` is the single seam between components and the stores. It has real leverage: it reads from both stores AND manages the session lifecycle (loading, auto-saving, closing). Components import the hook, not the stores.

The hook's `useEffect` watches `activeSessionId` from the registry store. When it changes from null to a value, the hook:
1. Sets session store `status` to `"loading"` (AD-6)
2. Calls `loadFromIDB(activeSessionId)` (AD-2)
3. Populates the session store via `loadSession(data)`
4. Sets `status` to `"active"`

When `activeSessionId` changes from a value to null, the hook:
1. Calls `saveToIDB(activeSessionId, currentData)` (immediate, non-debounced)
2. Calls `sessionStore.clear()`

The hook also subscribes to the session store for debounced auto-save during active review.

```ts
export function useActiveSession() {
  const activeSessionId = useRegistryStore((s) => s.activeSessionId);
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  const captures = useSessionStore((s) => s.captures);
  const evaluations = useSessionStore((s) => s.evaluations);
  const questionModes = useSessionStore((s) => s.questionModes);

  // Lifecycle orchestration
  useEffect(() => {
    if (activeSessionId && status === "empty") {
      useSessionStore.setState({ status: "loading" });
      loadFromIDB(activeSessionId).then((data) => {
        if (data) {
          useSessionStore.getState().loadSession(data);
          useSessionStore.setState({ status: "active" });
        } else {
          useSessionStore.setState({ status: "empty" });
          useRegistryStore.getState().setActiveSessionId(null);
        }
      });
    } else if (!activeSessionId && status === "active") {
      const { session, captures, evaluations, questionModes } =
        useSessionStore.getState();
      if (session) {
        saveToIDB(session.id, { metadata: session, captures, evaluations, questionModes });
      }
      useSessionStore.getState().clear();
    }
  }, [activeSessionId]);

  // Debounced auto-save during active review
  useEffect(() => {
    if (status !== "active" || !activeSessionId) return;
    const unsub = useSessionStore.subscribe(debounce((state) => {
      if (state.session) {
        saveToIDB(activeSessionId, { ... });
      }
    }, 300));
    return unsub;
  }, [activeSessionId, status]);

  // Forwarded actions
  const addCapture = useSessionStore((s) => s.addCapture);
  const setEvaluation = useSessionStore((s) => s.setEvaluation);
  const updateMetadata = useSessionStore((s) => s.updateMetadata);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore((s) => s.unlinkCaptureFromRubric);
  // ... all session store actions

  // Registry actions
  const setActiveSessionId = useRegistryStore((s) => s.setActiveSessionId);
  const addSession = useRegistryStore((s) => s.addSession);

  const closeSession = () => setActiveSessionId(null);
  const switchToSession = (id: string) => {
    // Save current session first, then switch
    const { session, captures, evaluations, questionModes } = useSessionStore.getState();
    if (session) {
      saveToIDBFireAndForget(session.id, { metadata: session, captures, evaluations, questionModes });
    }
    useSessionStore.getState().clear();
    setActiveSessionId(id);
  };

  return {
    status, session, captures, evaluations, questionModes,
    addCapture, setEvaluation, updateMetadata,
    linkCaptureToRubric, unlinkCaptureFromRubric,
    addSession, closeSession, switchToSession, /* ...all actions */
  };
}
```

After this change, components don't import stores at all. Tests mock the hook, not the store. The hook has real depth: it hides the complexity of cross-store coordination, IDB I/O, lifecycle management, and debounced saves behind a single interface.

### AD-4: Completion as Derived State

**Problem:** The session table shows status "started/xx%/done" but no logic computes completion percentage.

**Decision:** Add `computeCompletion(evaluations, rubricData): number` as a pure function in `lib/rubric.ts`. The registry store's summary includes a cached `completionPercent` field, updated when a session is closed or exported. During active review, the table shows "Started"; percentage appears after closing.

### AD-5: "basic"→"standard" Rename in Phase 1

**Problem:** The rename affects types, store, and persisted data. Splitting it across phases creates an inconsistent intermediate state.

**Decision:** Do the rename in Phase 1 as part of the type/store changes. Add migration: when loading a session from IndexedDB, map `questionModes` values from `"basic"` → `"standard"`.

### AD-6: Session Lifecycle Status

**Problem:** The spec previously modeled session state as `activeSessionId: string | null` — a boolean. The real states are: *no session* → *loading session from IDB* → *active session* → *closing session*. Without an explicit model, App.tsx would briefly render the wrong view during the async loading gap, and race conditions between debounced saves and session switches need ad-hoc guards.

**Decision:** Add `status: "empty" | "loading" | "active"` to the session store. App.tsx routes on status:
- `"empty"` → render SessionManager
- `"loading"` → render loading spinner
- `"active"` → render ActiveSession

This prevents the "render with no session" gap. Race conditions are prevented structurally — auto-save subscriptions are gated on `status === "active"`, so saves can't fire during loading or after clearing.

### AD-7: Unidirectional Evidence Linking

**Problem:** The capture-evaluation relationship is stored in two places (`Capture.linkedRubricIds` and `Evaluation.explicitEvidenceIds`). Every link/unlink mutation updates both sides. `removeCapture` must scan all evaluations to clean up `explicitEvidenceIds`. The store's `linkCaptureToRubric` and `unlinkCaptureFromRubric` actions exist solely to maintain this denormalization. This is the highest-coupling code in the store.

**Decision:** Make `Evaluation.explicitEvidenceIds` the canonical direction. Remove `linkedRubricIds` from the `Capture` type. The reverse direction (which rubric IDs a capture is linked to) is computed on demand:

```ts
// lib/rubric.ts
export function getLinkedRubricIdsForCapture(
  captureId: string,
  evaluations: Evaluation[],
): string[] {
  return evaluations
    .filter((e) => e.explicitEvidenceIds.includes(captureId))
    .map((e) => e.rubricId);
}
```

Store actions simplify:
- `linkCaptureToRubric(captureId, rubricId)` → adds `captureId` to the evaluation's `explicitEvidenceIds`
- `unlinkCaptureFromRubric(captureId, rubricId)` → removes `captureId` from the evaluation's `explicitEvidenceIds`
- `removeCapture(captureId)` → removes `captureId` from all evaluations' `explicitEvidenceIds`
- No more bidirectional sync. No more `Capture.linkedRubricIds` array to maintain.

The export pipeline's existing `getLinkedIds` function already has fallback logic — with this change, it uses the canonical direction only.

### AD-8: Evaluation Component Decomposition

**Problem:** Evaluation.tsx is 421 lines with 8 store selectors, handling Quality Gate pass/fail UI, Scoring Rubric 0-3 UI, inline evidence management, capture-from-evidence flow, confirm dialogs, and mode toggling. The spec adds score deselection, checkbox mode toggle, and N/A desaturation to this same file.

**Decision:** Decompose into three modules:
- **`components/Evaluation.tsx`** — thin shell: tab navigation between QG and Scoring sections, ProgressCircle, mode toggle. ~80 lines.
- **`components/QualityGateSection.tsx`** — renders quality gate questions with pass/fail/na scoring and evidence linking. Owns its own store selectors via `useActiveSession`.
- **`components/ScoringSection.tsx`** — renders scoring rubric questions with 0-3 scoring and evidence linking. Owns its own store selectors via `useActiveSession`.

Shared evidence logic (thumbnails, linking UI) extracted into:
- **`components/EvidenceThumbnails.tsx`** — already exists as an internal component, promoted to its own file.

### AD-9: Idempotent Migration

**Problem:** The original spec's migration was one-shot with fragile rollback: generate UUID, write to IDB, verify, delete legacy key. If it fails after the IDB write but before the flag set, re-running creates a duplicate session (new UUID each time). If it fails after deleting the old key, data is lost.

**Decision:** Derive session IDs deterministically from legacy data using `deterministicId(toolName, toolUrl, startTime)`. The migration:
1. Reads legacy `"trust-review-session"` localStorage key
2. Derives the session ID from the data
3. Checks if that ID already exists in IDB — if so, skip
4. Writes to IDB with the derived ID
5. Updates registry index
6. Deletes legacy key
7. Sets `"trust-review-migrated"` flag

Re-running is safe: the derived ID is the same every time, so step 3 prevents duplicates. The legacy key is only deleted after step 3 confirms the IDB entry exists (either just-written or pre-existing).

```ts
function deterministicId(toolName: string, toolUrl: string, startTime: string): string {
  // Simple hash — local use only, no crypto dependency needed
  const input = `trust-session:${toolName}:${toolUrl}:${startTime}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
```

---

## Implementation Phases

### Phase 1: Store Architecture + Types + Linking Simplification

**Files to create:**
- `stores/registry.ts` — session index + settings store (sync, localStorage)

**Files to modify:**
- `lib/types.ts` — add `id`, `status`, `faviconUrl` to `SessionMetadata`; add `Settings`, `SessionData`, `SessionStatus` types; rename `"basic"` → `"standard"` in `questionModes` types; **remove `linkedRubricIds` from `Capture`**
- `stores/session.ts` — remove localStorage persist; **add `status` field with `"empty" | "loading" | "active"`**; add `loadSession(data: SessionData)`, `clear()`, `setStatus(s)`; simplify `linkCaptureToRubric`/`unlinkCaptureFromRubric`/`removeCapture` to single-direction (update `explicitEvidenceIds` only); keep all other mutations unchanged
- `lib/rubric.ts` — add `computeCompletion()` pure function; add `getLinkedRubricIdsForCapture()` selector

**Key changes:**

1. **`lib/types.ts`**:
   ```ts
   export type SessionStatus = "started" | "done";
   export type StoreStatus = "empty" | "loading" | "active";

   export interface SessionMetadata {
     id: string;             // uuid
     toolName: string;
     toolUrl: string;
     startTime: string;
     rubricId?: string;
     usesAi?: boolean;
     status: SessionStatus;  // NEW
     faviconUrl?: string;    // NEW
     company?: string;
     pricing?: string;
     availability?: string;
     termsConditionsUrl?: string;
     notes?: string;
   }

   export interface Settings {
     reviewerName: string;
     reviewerEmail: string;
     preferredRubric: string;
   }

   export interface SessionData {
     metadata: SessionMetadata;
     captures: Capture[];
     evaluations: Evaluation[];
     questionModes: Record<string, "expert" | "standard">;  // renamed from "basic"
   }

   export interface Capture {
     id: string;
     timestamp: string;
     sourceUrl: string;
     pageTitle: string;
     screenshotBase64: string;
     annotatedScreenshotBase64?: string;
     htmlContent: string;
     notes: string;
     // linkedRubricIds REMOVED — computed from evaluations
   }

   export interface Evaluation {
     rubricId: string;
     score: string | number;
     notes: string;
     explicitEvidenceIds: string[];  // canonical evidence link
   }
   ```

2. **`stores/registry.ts`** — new Zustand store persisted to localStorage:
   ```ts
   interface RegistryState {
     sessionIndex: Record<string, SessionMetadata>;  // id → lightweight metadata
     activeSessionId: string | null;
     settings: Settings;

     // Actions (all synchronous)
     setActiveSessionId: (id: string | null) => void;
     addSession: (metadata: SessionMetadata) => void;
     deleteSession: (id: string) => void;
     markSessionDone: (id: string) => void;
     updateSettings: (patch: Partial<Settings>) => void;
     updateSessionMetadata: (id: string, patch: Partial<SessionMetadata>) => void;
   }
   ```
   Persisted to localStorage key `"trust-review-registry"`. No async methods. No IDB awareness.

3. **`stores/session.ts`** — active session data only:
   - **State shape:** `{ status: StoreStatus, session, captures, evaluations, questionModes }`
   - **Status field:** `"empty"` (default), `"loading"`, `"active"` — models session lifecycle (AD-6)
   - **No persist middleware.** Data loaded/saved by hook.
   - Keep all existing mutations (addCapture, setEvaluation, updateCapture, etc.)
   - **Simplified linking actions:**
     - `linkCaptureToRubric(captureId, rubricId)` → finds/creates evaluation, adds `captureId` to `explicitEvidenceIds`
     - `unlinkCaptureFromRubric(captureId, rubricId)` → removes `captureId` from evaluation's `explicitEvidenceIds`
     - `removeCapture(captureId)` → removes capture + removes `captureId` from all evaluations' `explicitEvidenceIds`
   - Add `loadSession(data: SessionData)` — populates state from loaded data, sets status to "active" (caller sets status)
   - Add `clear()` — resets to empty state
   - Add `setStatus(s: StoreStatus)` — updates status field

4. **`lib/rubric.ts`** — add completion computation and linking selector:
   ```ts
   export function computeCompletion(
     evaluations: Evaluation[],
     rubric: RubricData,
   ): number {
     const totalQuestions = getRubricQuestionIds(rubric).length;
     const scored = evaluations.filter((e) => e.score !== "" && e.score !== undefined).length;
     return totalQuestions > 0 ? Math.round((scored / totalQuestions) * 100) : 0;
   }

   export function getLinkedRubricIdsForCapture(
     captureId: string,
     evaluations: Evaluation[],
   ): string[] {
     return evaluations
       .filter((e) => e.explicitEvidenceIds.includes(captureId))
       .map((e) => e.rubricId);
   }
   ```

### Phase 2: Session Storage + Orchestration Hook

**Files to create:**
- `lib/session-storage.ts` — simple IDB save/load/delete
- `hooks/useActiveSession.ts` — deepened hook with lifecycle orchestration

**Key changes:**

1. **`lib/session-storage.ts`** — thin IDB wrapper (no Zustand adapter):
   - Opens database `trust-review-sessions` with object store `sessions`
   - `saveToIDB(id: string, data: SessionData): Promise<void>` — writes to IDB
   - `loadFromIDB(id: string): Promise<SessionData | null>` — reads from IDB
   - `deleteFromIDB(id: string): Promise<void>` — deletes from IDB
   - `saveToIDBFireAndForget(id: string, data: SessionData): void` — calls `saveToIDB` without await. Used for close/switch where the caller doesn't need to wait for the write. IDB writes are durable even without awaiting.
   - Migration helper: `migrateLegacySession()` — reads legacy key, derives ID, writes to IDB (see Phase 3)

2. **`hooks/useActiveSession.ts`** — orchestration seam (AD-3):
   - Reads state from both stores
   - `useEffect` on `activeSessionId`: loads from IDB when switching in, saves to IDB when switching out
   - `useEffect` on `status === "active"`: subscribes to session store with 300ms debounced auto-save
   - Forwards all session store actions + registry `addSession`/`setActiveSessionId`
   - `closeSession()` — sets `activeSessionId` to null (triggers save via effect)
   - `switchToSession(id)` — saves current session immediately, clears, sets new activeSessionId
   - Components import this hook exclusively — no direct store imports

### Phase 3: Idempotent Migration

**Files to modify:**
- `components/App.tsx` — calls migration on startup

**Key changes:**

1. **Migration logic** (in `lib/session-storage.ts`):
   ```ts
   export function deterministicId(toolName: string, toolUrl: string, startTime: string): string {
     // Simple hash — local use only, no crypto needed
     const input = `trust-session:${toolName}:${toolUrl}:${startTime}`;
     let hash = 0;
     for (let i = 0; i < input.length; i++) {
       hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
     }
     return Math.abs(hash).toString(16).padStart(8, "0");
   }

   export async function migrateLegacySession(): Promise<void> {
     if (localStorage.getItem("trust-review-migrated")) return;

     const raw = localStorage.getItem("trust-review-session");
     if (!raw) {
       localStorage.setItem("trust-review-migrated", "1");
       return;
     }

     const data = JSON.parse(raw);
     const id = deterministicId(
       data.session?.toolName ?? "unknown",
       data.session?.toolUrl ?? "",
       data.session?.startTime ?? new Date().toISOString(),
     );

     // Idempotent: check if already migrated
     const existing = await loadFromIDB(id);
     if (existing) {
       // Already migrated — just update registry if needed
       const registry = useRegistryStore.getState();
       if (!registry.sessionIndex[id]) {
         registry.addSession({ ...data.session, id, status: "started" });
       }
       localStorage.removeItem("trust-review-session");
       localStorage.setItem("trust-review-migrated", "1");
       return;
     }

     // Migrate questionModes: "basic" → "standard"
     const modes: Record<string, string> = data.questionModes ?? {};
     for (const key of Object.keys(modes)) {
       if (modes[key] === "basic") modes[key] = "standard";
     }

     await saveToIDB(id, {
       metadata: { ...data.session, id, status: "started" },
       captures: data.captures ?? [],
       evaluations: data.evaluations ?? [],
       questionModes: modes as Record<string, "expert" | "standard">,
     });

     // Update registry
     useRegistryStore.getState().addSession({ ...data.session, id, status: "started" });

     // Only delete legacy key after IDB write confirmed
     localStorage.removeItem("trust-review-session");
     localStorage.setItem("trust-review-migrated", "1");
   }
   ```

2. **`App.tsx`** — calls `migrateLegacySession()` on mount, before rendering.

### Phase 4: App Shell (shared header, footer, routing)

**Files to create:**
- `components/AppShell.tsx` — shared header + footer wrapper

**Files to modify:**
- `components/App.tsx` — 3-way routing via hook status field
- `entrypoints/sidepanel.html` — add Nunito Sans to Google Fonts link

**Key changes:**

1. **`components/AppShell.tsx`**:
   - **Header** (sticky top): TRUST logo + "Information Tool Reviews" in display font (Nunito Sans)
   - **Footer** (sticky bottom): LISA-EIS logo + "LISA-EIS / University of Twente" as clickable link to `https://www.utwente.nl/en/library/`
   - Children slot for the active view content
   - Uses `flex flex-col h-screen` layout: header, flex-1 children, footer

2. **`components/App.tsx`** — routing via the hook's status field:
   ```tsx
   const { status, session } = useActiveSession();

   // Run migration on mount
   useEffect(() => { migrateLegacySession(); }, []);

   if (status === "active" && session) {
     const variant = getRubricById(session.rubricId);
     return (
       <AppShell>
         <RubricContext.Provider value={{ rubric: variant.data, usesAi: session.usesAi ?? true }}>
           <ActiveSession />
         </RubricContext.Provider>
       </AppShell>
     );
   }

   if (status === "loading") {
     return <AppShell><LoadingSpinner /></AppShell>;
   }

   return <AppShell><SessionManager /></AppShell>;
   ```

3. **`entrypoints/sidepanel.html`** — update Google Fonts link:
   ```
   Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&family=Nunito+Sans:wght@800;900
   ```

### Phase 5: Session Manager + Creation Modal

**Files to create:**
- `components/SessionManager.tsx` — home/management view
- `components/NewSessionModal.tsx` — modal version of SessionInit

**Files to delete:**
- `components/SessionInit.tsx` — fully replaced

**Key changes:**

1. **`components/SessionManager.tsx`**:
   - Hero section: TRUST logo + "Information Tool Reviews" subtitle (moved from SessionInit)
   - "Start New Review" button → opens `NewSessionModal`
   - Session list: reads `sessionIndex` from registry store (via `useRegistryStore` — SessionManager is the one component that talks to the registry directly, since it's a registry-management view, not an active-session view)
   - Each session row shows: favicon (16px img with fallback), tool name, status badge ("Started" / "Done"), start date (formatted)
   - Per-row controls: "Open" (calls `useActiveSession().switchToSession(id)`), external-link icon (opens `toolUrl`), download icon (exports .zip), trash icon (delete with confirm)
   - Settings section: reviewer name, email, preferred rubric — reads/writes registry `settings`
   - Empty state: "No reviews yet. Start your first review."
   - Compact card layout (not wide table) suited for 320-400px side panel

2. **`components/NewSessionModal.tsx`**:
   - Form fields extracted from `SessionInit.tsx` — no hero, no footer
   - **Prefill** on mount via `captureCurrentPageInfo()`:
     - `toolUrl` ← `tab.url`
     - `toolName` ← `tab.title`
     - `faviconUrl` ← `tab.favIconUrl`
   - **Tooltips**: `title` attributes on rubric variant selector and AI toggle
   - On submit: saves session to IDB first (`saveToIDB(id, data)`), then calls `registryStore.addSession(metadata)` + `registryStore.setActiveSessionId(id)`. The hook's effect detects `activeSessionId` change → loads from IDB → populates session store → sets status "active". This avoids a race where the hook loads from IDB before the save completes.
   - Reuses `.modal-backdrop` / `.modal-panel` CSS classes

3. Delete `components/SessionInit.tsx`.

### Phase 6: Active Session UI + Evaluation Decomposition

**Files to create:**
- `components/QualityGateSection.tsx` — QG questions rendering
- `components/ScoringSection.tsx` — scoring rubric questions rendering
- `components/EvidenceThumbnails.tsx` — promoted from Evaluation.tsx internal

**Files to modify:**
- `components/Evaluation.tsx` — decomposed into thin shell
- `components/ActiveSession.tsx` — home button, favicon, clickable URL

**Key changes:**

1. **`components/ActiveSession.tsx`**:
   - Add home button (left side of header): ← arrow, calls `useActiveSession().closeSession()`. Triggers save + clear via hook effect.
   - Show favicon: `<img src={session.faviconUrl} className="w-4 h-4" />` next to tool name. Fallback: first letter of tool name in a colored circle.
   - Clickable URL: `<a href={session.toolUrl} target="_blank" rel="noopener">` with mono styling

2. **`components/Evaluation.tsx`** — decomposed to ~80-line shell:
   - Tab navigation between "Quality Gates" and "Scoring Rubric"
   - ProgressCircle (kept inline)
   - Mode checkbox toggle (moved here from per-question)
   - Renders `QualityGateSection` or `ScoringSection` based on active tab
   - Own store selectors via `useActiveSession` hook

3. **`components/QualityGateSection.tsx`**:
   - Renders all quality gate categories and questions
   - Score deselection via custom radio approach:
     ```tsx
     const handleClick = (val: PassFailScore) => {
       if (ev?.score === val) setEvaluation(rubricId, { score: "" });
       else setEvaluation(rubricId, { score: val });
     };
     ```
   - Uses `role="radio"`, `aria-checked`, keyboard handlers for accessibility
   - N/A label: `"N/A — tool does not use AI"` (full text, not abbreviated)
   - N/A desaturation: `opacity-50` on `<details>` when `isAutoNa` is true
   - Evidence linking via `EvidenceThumbnails`
   - Own store selectors via `useActiveSession`

4. **`components/ScoringSection.tsx`**:
   - Renders all scoring rubric categories and questions
   - Same score deselection approach as QG (custom radio)
   - Same N/A handling
   - Evidence linking via `EvidenceThumbnails`
   - Own store selectors via `useActiveSession`

5. **`components/EvidenceThumbnails.tsx`**:
   - Promoted from internal component in Evaluation.tsx
   - Renders capture thumbnails with link/unlink actions
   - Accepts `rubricId`, `evidenceIds`, captures as props
   - Calls `linkCaptureToRubric`/`unlinkCaptureFromRubric` from `useActiveSession`

### Phase 7: Export "Done" State + Metadata Updates

**Files to modify:**
- `components/Metadata.tsx` — export marks done + return home
- `lib/export.ts` — update `getLinkedIds` to use canonical direction only

**Key changes:**

1. **`components/Metadata.tsx`**:
   - `handleExport`: after successful export, call `registryStore.markSessionDone(session.id)`. Then call `useActiveSession().closeSession()` to return to manager.
   - "Discard session" → calls `registryStore.deleteSession(session.id)` + `sessionStore.clear()` and returns to manager.
   - Remove double-confirm pattern for discard — management table has its own delete with confirm.

2. **`lib/export.ts`** — update `getLinkedIds`:
   - Remove the fallback logic that scans `captures` for `linkedRubricIds`
   - Use `explicitEvidenceIds` directly — it's now the only direction
   - For `capture_log.csv`'s `Tagged_Rubric_IDs` column: use `getLinkedRubricIdsForCapture(captureId, evaluations)` from rubric.ts

### Phase 8: Favicon Capture

**Files to modify:**
- `lib/capture.ts` — add page info helper

**Key changes:**

1. **`lib/capture.ts`**: Add `captureCurrentPageInfo()`:
   ```ts
   export async function captureCurrentPageInfo(): Promise<{
     url: string; title: string; faviconUrl?: string;
   }> {
     const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
     return {
       url: tab.url ?? "",
       title: tab.title ?? "",
       faviconUrl: tab.favIconUrl,
     };
   }
   ```
   Called from `NewSessionModal` on mount.

### Phase 9: Icon Redesign

**Files to modify:**
- `public/icon.svg` — Γ-shape redesign

**Design:** Left vertical stroke + top horizontal stroke forming an inverted-L/Γ shape. Transparent fill. ViewBox 32x32:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <path d="M6 4h20v6H12v18H6z" fill="#8e036c"/>
</svg>
```
After SVG update, regenerate PNGs at 16/19/32/38/48/128px (however they're currently generated — check build process).

### Phase 10: Tests

**Files to modify:**
- `tests/store.test.ts` — rewrite for new store architecture

**Files to create:**
- `tests/session-storage.test.ts` — IDB save/load/delete tests
- `tests/registry.test.ts` — registry store tests
- `tests/active-session-hook.test.ts` — hook orchestration tests

**Key changes:**

1. **`tests/registry.test.ts`**: Test `setActiveSessionId`, `addSession`, `deleteSession`, `markSessionDone`, `updateSettings`, `updateSessionMetadata`. All synchronous.

2. **`tests/store.test.ts`**: Keep existing mutation tests (addCapture, setEvaluation, etc.) — they work the same against the session store. Update factory helpers to include `id` field. Test `loadSession`, `clear`, `setStatus`. Test simplified linking (single-direction `explicitEvidenceIds`). Test "basic"→"standard" migration in `questionModes`. Test `removeCapture` cleans up `explicitEvidenceIds`.

3. **`tests/session-storage.test.ts`**: Test IDB save/load/delete, idempotent migration, deterministic ID derivation. Use `fake-indexeddb` for Node.js test environment.

4. **`tests/active-session-hook.test.ts`**: Test lifecycle orchestration: loads from IDB on `activeSessionId` change, saves on clear, debounced auto-save, race condition prevention (stale saves skipped).

5. **`tests/export.test.ts`**: Update `SessionMetadata` fixtures to include `id` field. Update linking tests to use `explicitEvidenceIds` only (no `linkedRubricIds`).

6. **`tests/rubric.test.ts`**: Add tests for `computeCompletion()` and `getLinkedRubricIdsForCapture()`. Update question mode assertions from `"basic"` to `"standard"`.

---

## Verification

1. `pnpm typecheck` — must pass
2. `pnpm build` — must build without errors
3. `pnpm test` / `vitest run` — all tests pass
4. Manual testing in browser:
   - Start new session → see it in management table
   - Open session → loading spinner → session renders
   - Make captures/scores → click home → session saved in table
   - Export session → status changes to "Done" in table
   - Delete session → removed from table
   - Score deselection: click selected score → it deselects
   - N/A items show desaturated appearance
   - Favicon appears in table and active session header
   - URL is clickable in active session
   - Expert mode checkbox toggles correctly
   - New session modal prefills URL and title from current tab
   - Legacy session migrates on first load
   - Switching between sessions preserves both

## Risk Areas

- **Loading gap eliminated structurally**: The `status` field ("loading") gives App.tsx an explicit state to render during the async IDB read. No "brief render with no session" — the spinner shows until data is ready.
- **Race conditions prevented structurally**: Auto-save subscription is gated on `status === "active"`. Session switch sets `status` to "empty" before clearing, so debounced saves from the old session can't fire. The debounced save also captures `activeSessionId` in its closure — if it doesn't match the current ID, it skips.
- **Migration is idempotent**: Deterministic ID derivation means re-running migration is safe. No duplicate sessions, no data loss window.
- **Favicon availability**: `tab.favIconUrl` not always populated. Treated as strictly optional — fallback (first letter of tool name) when missing.
- **No persist middleware for session store**: This is deliberate. The session store's data is large (MB of screenshots). Explicit save/load via the hook gives control over timing, prevents unwanted writes, and avoids the dynamic-key workaround.

## File Summary

### New Files (8)
| File | Purpose |
|---|---|
| `lib/session-storage.ts` | Simple IDB save/load/delete + migration |
| `stores/registry.ts` | Session index + settings store (localStorage, sync) |
| `hooks/useActiveSession.ts` | Orchestration seam: lifecycle + data access |
| `components/AppShell.tsx` | Shared header + footer wrapper |
| `components/SessionManager.tsx` | Session management home view |
| `components/QualityGateSection.tsx` | QG questions rendering (extracted from Evaluation.tsx) |
| `components/ScoringSection.tsx` | Scoring questions rendering (extracted from Evaluation.tsx) |
| `components/EvidenceThumbnails.tsx` | Evidence thumbnails (promoted from Evaluation.tsx internal) |

### New Files (Extracted) (1)
| File | Purpose |
|---|---|
| `components/NewSessionModal.tsx` | Modal form for new session creation |

### New Test Files (3)
| File | Purpose |
|---|---|
| `tests/registry.test.ts` | Registry store tests |
| `tests/session-storage.test.ts` | IDB adapter + migration tests |
| `tests/active-session-hook.test.ts` | Hook orchestration tests |

### Modified Files (10)
| File | Change |
|---|---|
| `lib/types.ts` | Add SessionStatus, StoreStatus, Settings, SessionData; add id/status/faviconUrl to SessionMetadata; remove linkedRubricIds from Capture; rename basic→standard |
| `stores/session.ts` | Remove persist; add status field; add loadSession/clear/setStatus; simplify linking to single-direction |
| `lib/rubric.ts` | Add computeCompletion(), getLinkedRubricIdsForCapture() |
| `lib/capture.ts` | Add captureCurrentPageInfo() |
| `lib/export.ts` | Update getLinkedIds to canonical direction only |
| `components/App.tsx` | 3-way routing via status field + migration call |
| `components/ActiveSession.tsx` | Home button, favicon, clickable URL |
| `components/Evaluation.tsx` | Decomposed to thin shell (~80 lines) |
| `components/Metadata.tsx` | Export marks done, delete returns home |
| `entrypoints/sidepanel.html` | Add Nunito Sans font |

### Deleted Files (1)
| File | Reason |
|---|---|
| `components/SessionInit.tsx` | Replaced by NewSessionModal + SessionManager |

### Modified Test Files (3)
| File | Change |
|---|---|
| `tests/store.test.ts` | Update for new store shape, add loadSession/clear/setStatus tests, single-direction linking, basic→standard migration |
| `tests/export.test.ts` | Update fixtures with id field, update linking tests |
| `tests/rubric.test.ts` | Add computeCompletion and getLinkedRubricIdsForCapture tests |
