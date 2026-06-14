# Plan 007: Harden session lifecycle — switch guard + delete/import error handling

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat b5554b5..HEAD -- lib/session-lifecycle.ts components/SessionManager.tsx`

## Status
- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `b5554b5`, 2026-06-14

## Why this matters
`switchToSession` is async and called fire-and-forget; two rapid clicks interleave saves and clears, silently losing the in-memory session loaded by the first click. `deleteSession` and `importSessionFromZipFile` have no try-catch — an IDB failure (quota, corrupt store) leaves orphaned screenshots/session data in IndexedDB with no toast and no registry cleanup. These are silent-data-loss paths.

## Current state
- `lib/session-lifecycle.ts:275-288` — `deleteSession`: awaits `load` → `delete` → `deleteScreenshotsForCaptures` → `registry.deleteSession`, no try-catch.
- `lib/session-lifecycle.ts:291-295` — `switchToSession`: `await saveCurrentSession(); clear(); setActiveSessionId(id)` — no guard against re-entrancy.
- `lib/session-lifecycle.ts:362-387` — `importSessionFromZipFile`: saves screenshots (376-380) then session (384) then registry (385), no try-catch; partial failure orphans screenshots.
- `components/SessionManager.tsx:240` — `onSwitch={() => switchToSession(s.id)}` (fire-and-forget).
- Exemplar error pattern: `markDoneAndClose` (session-lifecycle.ts:300-305) uses try/catch + `toastError`. Match it.
- `toastError`, `toastWarning` imported from `@/stores/toast` (already imported at line 10).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- session-lifecycle` | all pass |
| Full | `pnpm test` | all pass |

## Scope
**In scope**: `lib/session-lifecycle.ts`, `tests/session-lifecycle.test.ts` (add cases), `tests/review-lifecycle.test.ts` (if it covers these paths).
**Out of scope**: `stores/session.ts`, `lib/session-repository.ts`, `components/SessionManager.tsx` (the switch guard belongs in the lifecycle function, not the component).

## Git workflow
- One commit: `fix(lifecycle): guard session switch and handle delete/import errors`

## Steps

### Step 1: Add a re-entrancy guard to switchToSession
Add a module-level guard near the other module-level refs (around line 22-26, after `lastSaveSignature`):
```ts
let switching = false;
```
Wrap `switchToSession` so concurrent calls are ignored:
```ts
export async function switchToSession(id: string): Promise<void> {
  if (switching) return;
  switching = true;
  try {
    await saveCurrentSession();
    useSessionStore.getState().clear();
    useRegistryStore.getState().setActiveSessionId(id);
  } finally {
    switching = false;
  }
}
```
**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Wrap deleteSession in try/catch
```ts
export async function deleteSession(id: string): Promise<void> {
  const { activeSessionId } = useRegistryStore.getState();
  if (activeSessionId === id) {
    useSessionStore.getState().clear();
  }
  try {
    const data = await getRepository().load(id);
    const captureIds = data?.captures.map((c) => c.id) ?? [];
    await getRepository().delete(id);
    await deleteScreenshotsForCaptures(captureIds);
  } catch (err) {
    console.error("Failed to delete session from IDB:", err);
    toastError("Could not fully remove this review's stored data. It may reappear on reload.");
  } finally {
    // Always remove from the registry so the card disappears from the UI.
    useRegistryStore.getState().deleteSession(id);
  }
}
```
**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Wrap importSessionFromZipFile in try/catch with rollback
If the session save fails after screenshots were persisted, clean up the orphaned screenshots. Capture the saved screenshot IDs so rollback can delete them:
```ts
export async function importSessionFromZipFile(zipBlob: Blob): Promise<string> {
  const data = await importSessionFromZip(zipBlob);
  let id = data.metadata.id;
  const existing = useRegistryStore.getState().sessionIndex[id];
  if (existing) {
    id = crypto.randomUUID();
    data.metadata = { ...data.metadata, id };
    toastWarning(`A review of "${existing.toolName}" already exists. Imported as a copy.`);
  }
  const savedCaptureIds: string[] = [];
  try {
    for (const c of data.captures) {
      if (c.screenshotBase64) {
        await saveScreenshot(c);
        savedCaptureIds.push(c.id);
      }
    }
    const strippedCaptures = stripScreenshots(data.captures);
    await getRepository().save(id, { ...data, captures: strippedCaptures });
    useRegistryStore.getState().addSession(data.metadata);
    return id;
  } catch (err) {
    console.error("Failed to import session:", err);
    await deleteScreenshotsForCaptures(savedCaptureIds).catch(() => {});
    toastError("Import failed. Could not save the review.");
    throw err;
  }
}
```
**Verify**: `pnpm typecheck` → exit 0.

### Step 4: Add tests
In `tests/session-lifecycle.test.ts` (model after existing cases there — uses `fake-indexeddb`), add:
1. `switchToSession` called twice rapidly: the second call is a no-op while the first is in flight (assert `clear` called once, active id set to the first target).
2. `deleteSession` when `getRepository().delete` rejects: registry entry still removed, `toastError` called, no unhandled rejection.
3. `importSessionFromZipFile` when `getRepository().save` rejects: saved screenshots are cleaned up (mock `deleteScreenshotsForCaptures` and assert it was called with the saved ids), `toastError` called, error re-thrown.

Use the existing test's mock setup for `getRepository()` / `fake-indexeddb`. If mocking `getRepository` is hard in this file, mock at the `session-repository` level to force rejection.

**Verify**: `pnpm test -- session-lifecycle` → all pass, including 3 new cases.

### Step 5: Commit
**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all exit 0. Commit.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] 3 new tests pass (switch guard, delete-error, import-rollback)
- [ ] `switchToSession` has a re-entrancy guard
- [ ] `deleteSession` and `importSessionFromZipFile` wrapped in try/catch with toasts
- [ ] No files outside in-scope modified

## STOP conditions
- The test file's mocking approach for `getRepository()` doesn't allow forcing a rejection → STOP and report; do not restructure the repository layer.
- Existing `session-lifecycle` tests fail after the guard change → report (the guard may need to reset on early-return, but the `finally` handles that).
