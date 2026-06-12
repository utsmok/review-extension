# Plan 001: Add Batch Export for All Sessions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6cafd76..HEAD -- components/SessionManager.tsx lib/export-pipeline.ts lib/session-lifecycle.ts stores/registry.ts lib/types.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `6cafd76`, 2026-06-12

## Why this matters

Librarians often evaluate 5–10 tools in a cycle and need to export all reviews for archival or sharing. Currently each session requires a separate export click. A single "Export All" action that produces one ZIP containing every completed review saves significant time and reduces the risk of forgetting a session.

## Current state

- `components/SessionManager.tsx:53-75` — `handleExport(id)` exports one session at a time via `exportSessionById(id)`.
- `lib/session-lifecycle.ts:262-277` — `exportSessionById(id)` loads a single session from IDB, calls `prepareExportArtifacts` + `assembleZip`, returns a Blob.
- `lib/export-pipeline.ts:350-384` — `assembleZip(artifacts)` takes a single `ExportArtifacts` and produces one ZIP.
- `stores/registry.ts:12` — `sessionIndex: Record<string, SessionMetadata>` holds all sessions.
- `components/SessionManager.tsx:122-148` — UI has "Start New Review" and "Import Review" buttons in the hero section.

The existing export pipeline is already modular: `prepareExportArtifacts` does data prep, `assembleZip` does ZIP assembly. A batch export needs to call `prepareExportArtifacts` per session, then assemble all artifacts into a single ZIP.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Typecheck | `pnpm typecheck`         | exit 0, no errors   |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm lint`              | exit 0              |
| Build     | `pnpm build`             | exit 0              |

## Scope

**In scope**:
- `lib/session-lifecycle.ts` — add `exportAllSessions()` function
- `lib/export-pipeline.ts` — add `assembleBatchZip()` function
- `components/SessionManager.tsx` — add "Export All" button
- New test file for batch export logic

**Out of scope**:
- `lib/html-report.ts` — no report changes
- `lib/types.ts` — no type changes
- `components/SessionCard` — per-card export stays unchanged
- Any comparison or summary report inside the batch ZIP

## Git workflow

- Branch: `feature/001-batch-export`
- Commit per step; message style: conventional commits (e.g., `feat(export): add batch export for all sessions`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `assembleBatchZip` to `lib/export-pipeline.ts`

Add a new exported function that takes an array of `ExportArtifacts` (one per session) and produces a single ZIP. Each session's files go into a subfolder named after the sanitized tool name.

The function should:
1. Import JSZip dynamically (same pattern as `assembleZip`).
2. For each artifact, create a folder using the sanitized tool name from the report filename (strip `Evaluation_Report_` prefix and `.html` suffix).
3. Inside each folder, add all files the same way `assembleZip` does (images, CSVs, HTML reports, session.json).
4. Add a root-level `manifest.json` with: `{ "version": 1, "exportDate": "<ISO>", "sessionCount": N, "sessions": [{ "toolName": "...", "grade": "..." }] }`.
5. Return the ZIP blob.

```typescript
export async function assembleBatchZip(
  sessions: Array<{ artifacts: ExportArtifacts; toolName: string; grade?: string }>,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const { artifacts, toolName, grade } of sessions) {
    const folder = zip.folder(sanitizeFilename(toolName));
    if (!folder) continue;

    for (const [filename, base64] of artifacts.imageFiles) {
      folder.file(filename, base64, { base64: true });
    }
    for (const [filename, content] of artifacts.captureHtmlFiles) {
      folder.file(filename, content);
    }
    folder.file("session_metadata.csv", artifacts.metadataCsv);
    folder.file("rubric_scores.csv", artifacts.scoresCsv);
    folder.file("capture_log.csv", artifacts.captureLogCsv);
    if (artifacts.conclusionsCsv) {
      folder.file("review_conclusions.csv", artifacts.conclusionsCsv);
    }
    folder.file("session.json", artifacts.sessionJson);
    folder.file(artifacts.reportFilename, artifacts.htmlReport);
    folder.file(artifacts.labelFilename, artifacts.nutritionLabel);
  }

  // Root manifest
  zip.file("manifest.json", JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    sessionCount: sessions.length,
    sessions: sessions.map(({ toolName, grade }) => ({
      toolName,
      grade: grade ?? "not finalized",
    })),
  }, null, 2));

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 2: Add `exportAllSessions` to `lib/session-lifecycle.ts`

Add a new exported function that iterates all sessions in the registry, loads each from IDB, calls `prepareExportArtifacts`, collects results, and calls `assembleBatchZip`.

```typescript
export async function exportAllSessions(): Promise<Blob> {
  const { sessionIndex } = useRegistryStore.getState();
  const repo = getRepository();
  const rubric = RUBRIC_DATA;
  const reviewer: ReviewerInfo | undefined = /* read from registry settings */;
  const entries: Array<{ artifacts: ExportArtifacts; toolName: string; grade?: string }> = [];

  for (const [id, meta] of Object.entries(sessionIndex)) {
    const data = await repo.load(id);
    if (!data) continue;

    const settings = useRegistryStore.getState().settings;
    const reviewerInfo = settings.reviewerName
      ? { name: settings.reviewerName, email: settings.reviewerEmail }
      : undefined;

    const artifacts = await prepareExportArtifacts(
      meta,
      data.captures,
      data.evaluations,
      rubric,
      data.finalization,
      data.quickNotes,
      reviewerInfo,
    );

    entries.push({
      artifacts,
      toolName: meta.toolName,
      grade: data.finalization?.grade,
    });
  }

  if (entries.length === 0) throw new Error("No sessions to export");
  return assembleBatchZip(entries);
}
```

Match the existing `exportSessionById` pattern for how it reads settings and calls `prepareExportArtifacts`. Import `ReviewerInfo` from `./export-pipeline`.

**Verify**: `pnpm typecheck` → exit 0

### Step 3: Add "Export All" button to SessionManager

Add a button in the hero section (below "Import Review") that triggers batch export.

In `components/SessionManager.tsx`:

1. Import `exportAllSessions` from `@/lib/session-lifecycle`.
2. Add an `handleExportAll` handler (similar pattern to `handleExport` but using `exportAllSessions`).
3. Add the button, visible only when `sessions.length > 1`.

```tsx
{sessions.length > 1 && (
  <button
    type="button"
    className="border border-ut-border text-ut-navy rounded-ut-sm px-ut-4 py-ut-2 text-ut-xs font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-grey transition-all w-full mt-ut-2 disabled:opacity-50"
    onClick={handleExportAll}
    disabled={exportingAll}
  >
    {exportingAll ? "Exporting\u2026" : "Export All Reviews"}
  </button>
)}
```

**Verify**: `pnpm typecheck` → exit 0

### Step 4: Add tests

Create `tests/batch-export.test.ts`:

1. Test `assembleBatchZip` with 2+ mock `ExportArtifacts` objects — verify the ZIP contains subfolders, manifest, and all files.
2. Test that empty sessions list throws.
3. Test manifest content structure.

Use the existing test patterns from `tests/export-pipeline.test.ts` as the structural model.

**Verify**: `pnpm test -- tests/batch-export.test.ts` → all pass

## Test plan

- New tests in `tests/batch-export.test.ts` covering:
  - `assembleBatchZip` with 2 sessions → correct folder structure
  - `assembleBatchZip` with 0 sessions → throws
  - Manifest JSON has correct version, date, and session entries
- Pattern: follow `tests/export-pipeline.test.ts`
- Verification: `pnpm test` → all pass, including new tests

## Done criteria

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; new tests for batch export exist and pass
- [ ] `pnpm lint` exits 0
- [ ] `pnpm build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.
- `exportAllSessions` cannot iterate the registry without loading all sessions into memory simultaneously (for large session counts this could be a perf concern — report if session count is expected to exceed 50).

## Maintenance notes

- The batch export ZIP structure should remain compatible with the single-session import flow — each subfolder is a valid single-session export.
- If a comparison report is added later (Plan for side-by-side comparison), it would go into the batch ZIP as a root-level file alongside `manifest.json`.
- The `manifest.json` version field allows future format changes without breaking importers.
