# Security & Performance Review

**Reviewer**: Security/Performance pass
**Date**: 2026-05-28
**Scope**: lib/html-report.ts, lib/capture.ts, lib/export.ts, lib/auto-save.ts, lib/session-repository.ts, lib/image-convert.ts, wxt.config.ts, hooks/useActiveSession.ts, stores/

---

## 1. Security

### 1.1 XSS — HTML Report Generation (lib/html-report.ts)

**Verdict: WELL-HANDLED — one residual risk.**

The `esc()` function (line 42) correctly escapes `& < > ' "` with a fast-path regex guard. All user-controlled text is routed through `esc()` before interpolation: notes, page titles, tool names, descriptions, URLs, strengths/weaknesses, recommendations, rubric text, custom reasoning.

URLs are handled by `safeLink()` which validates `https?://` and escapes the value. Image `src` attributes in evidence sections (line 181, 394) use `screenshotBase64` (a data-URL) or compressed data-URLs — never raw user input.

**Residual risk — `<img src="${compressedScreenshots.get(cid) ?? c.screenshotBase64}">`** (lines 181, 394).
The `screenshotBase64` field comes from `capture.ts` as a browser-generated PNG data-URL. If a corrupted IDB entry contained a non-data-URL value (e.g. `javascript:...`), it would be injected into an `<img src>`. The browser would not execute JS from an `<img>` tag, so practical exploitability is nil. But it's worth validating the prefix is `data:image/` before embedding.

**`safeLink` bypass risk**: `isSafeUrl` only checks prefix `https?://`. A URL like `https://evil.example.com` passes. This is *correct behavior* — links open in new tabs with `rel="noopener noreferrer"`. No XSS.

### 1.2 DOM Capture Sanitization (lib/capture.ts)

**Verdict: THOROUGH.**

`archivePageHtml()` runs in the *page's content script context* and produces an HTML archive. Sanitization before storage:

1. Removes `<script>`, `<noscript>`, `<iframe>`, `<object>`, `<embed>`, `<frame>`, `<applet>`, `<base>` (line 96-103)
2. Strips all `on*` event handler attributes (line 106-110)
3. Removes `javascript:`, `vbscript:`, `data:text/html` from `href/src/action/formaction/xlink:href` (line 113-124)
4. Removes `<meta http-equiv="refresh">` (line 127-129)
5. URL scheme allowlist on capture: only `http:`, `https:`, `file:` (line 5, 191-200)
6. Size limit: 25 MB per capture (line 6, 238-242)

**One gap**: `<style>` tag CSS is not sanitized. A crafted page could include CSS `@import` or `url()` references to external resources. When the archive is later opened in a browser (from the exported ZIP), these would trigger network requests. Not a code-execution risk, but leaks the viewer's IP. **Low severity** since archives are opened locally from saved files.

### 1.3 ZIP Import (lib/export.ts)

**Verdict: WELL-HARDENED.**

- Size limit: 200 MB compressed, 500 MB uncompressed (lines 318-320)
- Entry count limit: 500 entries (line 319)
- `validateSessionData()` validates structural types before use (lines 321-351)
- `checkBudget()` tracks cumulative bytes read (lines 378-386)
- `sanitizeFilename()` strips path traversal characters (lines 14-27)
- Filename injection into ZIP entries uses `sanitizeFilename()` (lines 300, 305)

**No path traversal risk**: JSZip writes entries by name; `sanitizeFilename` strips `<>:"/\|?*` and control characters.

### 1.4 Extension Permissions (wxt.config.ts)

**Current permissions**:
- `sidePanel`, `activeTab`, `tabs`, `scripting`
- `host_permissions: ["<all_urls>"]`

**Issue P2 — Overly broad `host_permissions`**. The extension uses `browser.scripting.executeScript` and `browser.tabs.captureVisibleTab`, which require `host_permissions`. However, `<all_urls>` grants access to every page at install time. If the extension only needs to capture the active tab when the user explicitly triggers a capture, `activeTab` suffices for `captureVisibleTab`. The `scripting` permission with `activeTab` should allow content script injection on the active tab without `<all_urls>`.

**Recommendation**: Test whether removing `<all_urls>` and relying on `activeTab` (which grants per-tab origin permission on user gesture) is sufficient. If so, remove it — this is the Chrome MV3 best practice.

### 1.5 Content Security Policy

**No CSP is configured** in `wxt.config.ts`. WXT's default MV3 manifest sets a reasonable CSP for the extension pages (`script-src 'self'`). The sidepanel loads only bundled code — no external scripts, no `eval()`, no `new Function()`. React components don't use `dangerouslySetInnerHTML`. **No action needed**, but adding an explicit `content_security_policy` to the manifest would be defense-in-depth.

### 1.6 Network Requests

Three `fetch()` calls found, all appropriate:
1. `capture.ts:22` — Fetches CSS from the page being archived (runs in page context, expected)
2. `capture.ts:43` — Resolves `@import` in archived stylesheets (same context)
3. `capture.ts:326` — Fetches logo image from evaluated page for metadata

No telemetry, no analytics, no external API calls. All data stays local.

### 1.7 Storage

- Session data: IndexedDB only. No `localStorage` for sensitive data.
- Registry (session index): Zustand `persist` middleware → localStorage (`trust-review-registry`). Contains only `SessionMetadata` (tool name, URL, timestamps). No secrets, no credentials. **Acceptable**.
- No `sessionStorage` usage.

---

## 2. Performance

### 2.1 Bundle Size

**Dependencies to watch**:
- `tldraw` — large canvas/drawing library (~400KB+ gzipped). Used for screenshot annotation. Ensure it's code-split and only loaded when the annotation feature is activated.
- `jszip`, `papaparse`, `pngjs`, `jpeg-js` — used only at export/import time. Already dynamically imported. Good.
- `uuid` — small, but generates crypto-random UUIDs. Could use `crypto.randomUUID()` (available in MV3 Chrome) to drop the dependency. **Minor win**.

### 2.2 IDB Efficiency

**`IdbSessionRepository.save()` (session-repository.ts:71-98)**:
- Calls `JSON.stringify(data)` on every save for quota checking (line 77). The `SessionData` includes base64 screenshot strings — potentially megabytes. This stringify is thrown away if quota is sufficient.
- **Recommendation P2**: Skip `JSON.stringify` for quota check. Use `navigator.storage.estimate()` alone (it's already called). If you need payload size, approximate from screenshot count × avg size rather than serializing the entire object.

**No IDB indexing**: The store uses a simple key-value structure (`sessions` object store with UUID keys). `load(id)` is O(1) by primary key. `listAll()` is not present in the repository — sessions are listed from the registry (localStorage). This is fine for the current scale.

### 2.3 HTML Report Generation

**`buildHtmlReport()` (html-report.ts:624)**:
- Compresses all screenshots in parallel with `Promise.all` (line 637-642). Each screenshot creates a `new Image()`, decodes, draws to canvas, re-encodes as JPEG. For sessions with many captures (20+), this creates significant memory pressure as all images are processed simultaneously.
- **Recommendation P2**: Process screenshots in batches of 4-6 to cap memory. Use `p-limit` or a simple semaphore.

**`minifyHtml()` and `minifyCss()` (export.ts)**: Pre-compiled regex patterns, single-pass processing. Efficient. CSS variable resolution is clever. No issues.

### 2.4 Auto-Save

**`lib/auto-save.ts`**: 300ms debounce, single subscription. Flushes on `visibilitychange` (panel close). The stale-session guard (line 42) prevents a debounced save from overwriting a different session. **Well-designed**.

**One concern**: `flush()` reads the *entire* store state on every flush:
```ts
const { session: s, captures: c, evaluations: e, finalization: f } = useSessionStore.getState();
```
Then calls `getRepository().save()` which serializes everything. For a session with 50 captures and large screenshots, this runs every 300ms during active editing. The IDB write itself is async, but `JSON.stringify` of multi-MB objects is synchronous and blocks the main thread.

**Recommendation P2**: Add a dirty flag to avoid serializing when nothing changed. Or increase debounce to 1000ms — 300ms is aggressive for data this large.

### 2.5 Image Processing

**`compressCaptureScreenshot()` (image-convert.ts)**: Uses WebP at 95% quality. Falls back to JPEG. The browser-path `canvasConvert()` limits to native resolution (no `maxDimension`), which is correct for archival quality.

**`pngToJpeg()` (image-convert.ts)**: Called once per capture per export. For 50 captures, that's 50 sequential canvas operations (not parallelized). This is actually fine — parallel canvas encoding can cause memory spikes.

### 2.6 React Rendering

Selectors in `useActiveSession` use individual `useSessionStore((s) => s.field)` — correct Zustand pattern to avoid unnecessary re-renders. No `dangerouslySetInnerHTML` anywhere. Components use Tailwind classes, not runtime style computation.

---

## 3. Reliability

### 3.1 Data Loss Scenarios

**Scenario: Extension update / IDB schema migration**
- `SCHEMA_VERSION = 3`. `onupgradeneeded` only creates the store if missing. `migrateSessionData()` handles in-memory transformation on load. However, there's no migration path for IDB structure changes — only data format changes. If a future version changes the object store schema, `onupgradeneeded` would need to handle data migration. Current code only creates, never migrates stores. **Low risk** — the store is simple key-value.

**Scenario: IDB quota exceeded**
- `save()` has a quota warning at 80% headroom (line 79) but still attempts the write. If the write fails, `save()` returns `false`, auto-save shows a toast. **User is warned**. The `compressCaptureScreenshot()` reduces PNGs to WebP at 95% — good compression. The 25 MB per-capture limit prevents runaway growth.

**Scenario: Browser crashes mid-write**
- IDB transactions are atomic. A partial write either completes or is rolled back. Previous save is not destroyed until new write completes. **Safe**.

**Scenario: Concurrent tabs with the extension open**
- `onversionchange` handler (line 50) closes the DB connection when another tab triggers an upgrade. The `getDB()` method reconnects on next access. **Handled correctly**. However, two tabs writing the same session could cause last-write-wins data loss. The auto-save's `scheduledSessionId` guard mitigates this within a single tab but not across tabs.

**Scenario: Fire-and-forget save in `markDoneAndClose()`**
- `markDoneAndClose` calls `saveCurrentSession()` (fire-and-forget) then immediately clears the store and sets activeSessionId to null. If the save fails, the session is marked done in the registry but data may not be persisted. The session store is cleared regardless.
- **Recommendation P1**: `markDoneAndClose` should use `saveCurrentSessionAsync()` (awaited) instead of fire-and-forget, then only clear on success.

### 3.2 Error Recovery

- `loadSessionById` catches errors, resets to empty state, and shows a toast. **Good**.
- `captureActiveTab()` throws descriptive errors for invalid URLs, no tab, etc. Callers catch and toast. **Good**.
- `exportSession()` and `importSessionFromZip()` have size limits and validation. Import throws with descriptive messages. **Good**.

### 3.3 State Consistency

- `switchToSession` awaits `saveCurrentSessionAsync()` before clearing. **Correct**.
- `deleteSession` deletes from IDB first, then registry. If IDB delete fails, registry entry stays (orphan in IDB is better than dangling registry reference). **Correct ordering**.
- `useActiveSession` effect-1 (line 19-44): When `activeSessionId` goes null, it saves current session. But it reads from `useSessionStore.getState()` synchronously — if the session was already cleared by another effect, the save is skipped (null check). **Race condition possible** if two effects fire in the same React batch. The auto-save `flush()` has the same guard. Low risk in practice.

---

## 4. Findings Summary

| ID | Severity | Category | Finding |
|----|----------|----------|---------|
| S1 | P2 | Permissions | `<all_urls>` host_permissions may be unnecessary with `activeTab` |
| S2 | P3 | Defense-in-depth | No explicit CSP in manifest (WXT default is reasonable) |
| S3 | P3 | Archive leak | Captured CSS may contain external `url()` references that phone home when archive is opened |
| P1 | P2 | Perf | Auto-save serializes entire SessionData (multi-MB) every 300ms via JSON.stringify for quota check |
| P2 | P2 | Perf | Screenshot compression in buildHtmlReport runs all in parallel — memory spike risk with many captures |
| P3 | P3 | Bundle | `uuid` dependency replaceable with `crypto.randomUUID()` |
| R1 | **P1** | Reliability | `markDoneAndClose` uses fire-and-forget save — data loss if save fails |
| R2 | P3 | Reliability | Cross-tab session writes are last-write-wins with no detection |

### Priority Actions

1. **R1** — Change `markDoneAndClose` to await save before clearing. One-line fix.
2. **P1** — Remove `JSON.stringify` from quota guard in `save()`, or approximate payload size.
3. **S1** — Test removing `<all_urls>` in favor of `activeTab`-only access.
4. **P2** — Batch screenshot compression in `buildHtmlReport` (4-6 at a time).
