# Performance & Bundle Size Audit

**Date**: 2026-06-09
**Extension version**: 0.7.1
**Built output**: `.output/chrome-mv3/`
**Total built size**: 2.69 MB (raw), ~690 KB gzipped (JS+CSS only)

---

## Summary

The extension has a severe bundle size problem centered on a single 2.06 MB monolithic sidepanel chunk that loads eagerly on every panel open. The root cause is **tldraw** being statically bundled despite a `lazy()` import boundary — Vite tree-shakes the dynamic import but the tldraw code still lands in the main chunk because no separate async chunk is emitted. This adds an estimated 800KB–1.2MB of unused code to the critical load path. Secondary concerns include broad Zustand selector subscriptions causing over-rendering, and a CSS bundle inflated by Tailwind utility generation.

**Overall score**: 4/10

---

## Bundle Analysis

### File Size Table

| File | Raw Size | % of Total | Gzipped | Category |
|------|----------|------------|---------|----------|
| `chunks/sidepanel-HAtwv4iu.js` | 2,057,251 B | 76.4% | 597,544 B | App + tldraw (monolithic) |
| `assets/sidepanel-D_tJIbHR.css` | 147,118 B | 5.5% | 27,095 B | Tailwind CSS |
| `lisa-eis.png` | 141,799 B | 5.3% | — | Static asset |
| `chunks/jszip.min-C_9X9nxY.js` | 95,873 B | 3.6% | 28,133 B | JSZip (lazy) |
| `trust.png` | 63,505 B | 2.4% | — | Static asset |
| `ai.png` | 50,775 B | 1.9% | — | Static asset |
| `chunks/png-BtvyBVms.js` | 28,781 B | 1.1% | 8,685 B | pngjs (lazy) |
| `chunks/jpeg-js-C0MY04Jc.js` | 19,706 B | 0.7% | 8,144 B | jpeg-js (lazy) |
| `chunks/papaparse.min-C4eb2CQw.js` | 19,211 B | 0.7% | 7,007 B | PapaParse (lazy) |
| `chunks/logos-DA7wPXgx.js` | 18,062 B | 0.7% | 13,589 B | Logo data URLs |
| `ut-logo.png` | 16,606 B | 0.6% | — | Static asset |
| `chunks/sanitizeSvg-Wf4wwC1O.js` | 6,738 B | 0.3% | 3,014 B | SVG sanitizer (lazy) |
| Remaining files (icons, HTML, bg.js) | ~18,000 B | 0.7% | — | Misc |
| **Total** | **2,691,304 B** | **100%** | **~693 KB** | |

### Dependency Bundle Impact

| Dependency | Version | Est. Bundle Contribution | Lazy-loaded? |
|------------|---------|--------------------------|-------------|
| **tldraw** | ^5.0.1 | ~800 KB–1.2 MB raw | **NO** (broken lazy) |
| **react + react-dom** | ^19.0.0 | ~130 KB raw | No (core) |
| **zustand** | ^5.0.0 | ~3 KB raw | No (core) |
| **jszip** | ^3.10.1 | 95 KB raw | Yes ✅ |
| **papaparse** | ^5.4.1 | 19 KB raw | Yes ✅ |
| **pngjs** | ^7.0.0 | 29 KB raw | Yes ✅ |
| **jpeg-js** | ^0.4.4 | 20 KB raw | Yes ✅ |
| **tailwindcss** | ^3.4.17 | 0 KB (build-time) | N/A |

---

## Findings

### P0 — Critical

#### F1: tldraw eagerly bundled in main chunk despite `lazy()` call
- **Severity**: P0 — Critical
- **File**: `components/EvidenceModal.tsx:12`, built `chunks/sidepanel-HAtwv4iu.js`
- **Impact**: +800 KB–1.2 MB on critical load path. Side panel cannot render until entire tldraw library is parsed.
- **Evidence**: The `lazy(() => import("tldraw").then(...))` call exists in source, but analysis of the built output shows:
  - tldraw code (1,946 symbol references) is present in the sidepanel chunk
  - No separate tldraw chunk file exists in `.output/chrome-mv3/chunks/`
  - The `__vite__mapDeps` array does not include any tldraw chunk
  - The annotation editor is only used when a user explicitly opens evidence for a capture — typically 0–2 times per session
- **Root cause**: Vite does not emit a separate async chunk when the dynamic import target resolves to the same module graph as the main entry. This can occur when tldraw is imported at module scope in the same file (types imported at line 2–10) or when Vite's module preloading optimization inlines the async chunk.
- **Fix**: Move all tldraw type imports to use `import type` only, and ensure the lazy boundary is in a separate file:
  ```ts
  // components/EvidenceModal.tsx — remove direct tldraw imports
  // Create components/TldrawCanvas.tsx with the lazy boundary
  const Tldraw = lazy(() => import("tldraw").then(m => ({ default: m.Tldraw })));
  ```
  Additionally, configure Vite to force code-split tldraw via `build.rollupOptions.output.manualChunks`.

#### F2: 2.06 MB monolithic sidepanel chunk
- **Severity**: P0 — Critical
- **File**: `wxt.config.ts` (no splitting config), built output
- **Impact**: Entire app code parsed/before first paint. No streaming or progressive loading.
- **Evidence**: Sidepanel chunk is 76.4% of total bundle. Vite config (`wxt.config.ts:38-40`) uses only `plugins: [react()]` with no `build.rollupOptions` for code splitting.
- **Fix**: Configure manual chunks in `wxt.config.ts`:
  ```ts
  vite: () => ({
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-tldraw': ['tldraw'],
          },
        },
      },
    },
  }),
  ```

### P1 — High

#### F3: Broad Zustand selectors cause over-rendering
- **Severity**: P1 — High
- **File**: `hooks/useSessionData.ts:4-11`, `hooks/useActiveSession.ts:13-15`
- **Impact**: Every Zustand state change triggers re-renders in all consumers of `useActiveSession()` even if the changed field is irrelevant.
- **Evidence**: `useSessionData()` subscribes to 5 individual selectors but returns them as a new object each call. In `useActiveSession()`, the returned `data` object is consumed, and any field change causes the parent component and all children to re-render.
  ```ts
  // useSessionData.ts — creates new object reference every time any selector fires
  const status = useSessionStore((s) => s.status);
  const session = useSessionStore((s) => s.session);
  // ... returns { status, session, captures, evaluations, finalization }
  ```
  Combined with the fact that `setEvaluation()` creates a new `evaluations` array on every score change, and `ActiveSession` passes `evaluations` as a dependency to `useMemo` for `evaluationComplete`, every rubric score change cascades re-renders through the entire component tree.
- **Fix**: Use `useShallow` from zustand/react/shallow for object equality, or restructure selectors to only subscribe to the specific fields each component needs. Consider `React.memo` on leaf components like `TabCheck`.

#### F4: CSS bundle 147 KB for a side panel
- **Severity**: P1 — High
- **File**: `assets/sidepanel-D_tJIbHR.css` (27 KB gzipped)
- **Impact**: Unnecessary CSS parsing on panel open.
- **Evidence**: Tailwind 3 generates all utility classes referenced in components. With a custom design system using `ut-` spacing, `trust-` colors, and principle accent colors, the utility count is high. The gzipped size (27 KB) is moderate but the raw 147 KB is large for a side panel.
- **Fix**: Audit unused utilities. Consider switching to Tailwind 4 (Rust-based, per-component CSS) or using `tailwindcss-animate` sparingly. Enable `content` scanning strictness in `tailwind.config.js`.

### P2 — Medium

#### F5: `export-pipeline.ts` question lookup uses repeated string splitting
- **Severity**: P2 — Medium
- **File**: `lib/export-pipeline.ts:135-192`
- **Impact**: O(n×m) string operations on every export where n = questions, m = lookup depth.
- **Evidence**: Four helper functions (`questionTitle`, `questionType`, `questionAiOnly`, `questionCode`) all split `rubricId` by `.` independently and traverse the rubric object. In `prepareExportArtifacts`, these are called for every question ID via `allQuestionIds.map(...)`.
- **Fix**: Pre-compute a flat `Map<rubricId, QuestionMeta>` once at export start, then look up by key.

#### F6: No `React.memo` on any component
- **Severity**: P2 — Medium
- **File**: All components in `components/`
- **Impact**: Every parent re-render cascades to all children. In a rubric with 30+ questions, scoring one question re-renders all question rows.
- **Evidence**: Search for `React.memo` and `export default memo` across components/ returns zero results. `QuestionSection` (657 lines) renders per-question but has no memoization boundary.
- **Fix**: Wrap `QuestionSection`, `ScoreOption`, and `EvidenceThumbnails` in `React.memo`. Use `useCallback` for handlers passed to child components.

#### F7: Sanitize clones entire DOM document
- **Severity**: P2 — Medium
- **File**: `lib/capture/sanitize.ts:6`
- **Impact**: `doc.cloneNode(true)` deep-clones the entire page DOM including all images, canvases, and shadow roots. On complex pages (e.g., Google Scholar results), this can pause the main thread for 100ms+.
- **Evidence**: The function clones first, then strips scripts/iframes/event handlers. No size limit or timeout on the clone operation.
- **Fix**: Consider a lightweight HTML serialization approach using `document.documentElement.outerHTML` with post-processing regex stripping, avoiding the heavy DOM clone.

#### F8: Image assets not optimized
- **Severity**: P2 — Medium
- **File**: `lisa-eis.png` (142 KB), `trust.png` (64 KB), `ai.png` (51 KB)
- **Impact**: 257 KB of unoptimized PNGs shipped in the extension package.
- **Evidence**: These are full-resolution PNGs. `lisa-eis.png` at 142 KB could likely be a JPEG at ~20 KB. The WXT build does not include image optimization.
- **Fix**: Convert to WebP or optimized JPEG. Add `vite-plugin-imagemin` to the build pipeline.

### P3 — Low

#### F9: Benchmark coverage is good but missing critical paths
- **Severity**: P3 — Low
- **Files**: `bench/*.bench.ts` (7 files)
- **Coverage assessment**:
  - ✅ `sanitizeFilename` — covered
  - ✅ `minifyHtml` / `minifyCss` — covered
  - ✅ `base64ToUint8Array` / `uint8ArrayToBase64` — covered
  - ✅ `computeReportScores` — covered
  - ✅ `scoreColor` / `distributionBar` / `qualityGateResults` / `principleAverage` — covered
  - ❌ `buildHtmlReport` — **NOT benchmarked** (the 23KB function is the most expensive export operation)
  - ❌ `prepareExportArtifacts` — **NOT benchmarked** (full pipeline)
  - ❌ `archivePageHtml` / DOM sanitization — **NOT benchmarked** (most expensive capture operation)
  - ❌ `assembleZip` — **NOT benchmarked** (DEFLATE compression at level 9)
- **Fix**: Add benchmarks for `buildHtmlReport` with realistic data (30+ evaluations, 10+ captures), `archivePageHtml` with a complex DOM fixture, and the full `prepareExportArtifacts` pipeline.

#### F10: ZIP compression level 9 is overkill
- **Severity**: P3 — Low
- **File**: `lib/export-pipeline.ts:378-379`
- **Impact**: Level 9 DEFLATE is ~3x slower than level 6 with <5% size improvement for already-compressed images.
- **Evidence**: `compressionOptions: { level: 9 }` — maximum compression for ZIP containing mostly base64 images (already compressed) and CSV/HTML text.
- **Fix**: Use level 6 (default) or level 1 for a better speed/size tradeoff.

#### F11: Logos chunk (18 KB) loads eagerly via dynamic import
- **Severity**: P3 — Low
- **File**: `lib/html-report.ts:9`, built `chunks/logos-DA7wPXgx.js`
- **Impact**: Minor — 18 KB chunk loaded on first report build, not on panel open.
- **Evidence**: The `_logos` lazy import is correctly cached. This is working as intended.

---

## Benchmark Coverage Summary

| Module | Benchmarked? | File |
|--------|-------------|------|
| `sanitizeFilename` | ✅ | `bench/sanitize.bench.ts`, `bench/export.bench.ts` |
| `minifyHtml` / `minifyCss` | ✅ | `bench/export.bench.ts` |
| `base64ToUint8Array` / `uint8ArrayToBase64` | ✅ | `bench/image-convert.bench.ts` |
| `computeReportScores` | ✅ | `bench/compute-scores.bench.ts` |
| `scoreColor` / `distributionBar` | ✅ | `bench/html-report.bench.ts` |
| `qualityGateResults` / `principleAverage` | ✅ | `bench/html-report.bench.ts` |
| `rubric` helpers | ✅ | `bench/rubric.bench.ts` |
| `buildHtmlReport` | ❌ | — |
| `prepareExportArtifacts` | ❌ | — |
| `archivePageHtml` (DOM clone) | ❌ | — |
| `assembleZip` (DEFLATE) | ❌ | — |

---

## Optimization Recommendations (Prioritized)

### Immediate — High Impact
1. **Fix tldraw code splitting** (F1): Move lazy boundary to separate file, add `manualChunks` config. Expected impact: **−800 KB to −1.2 MB from critical path**, ~600 KB gzipped → ~100 KB gzipped initial load.
2. **Add Vite manual chunks** (F2): Split React, tldraw, and app code into separate chunks for browser caching. Expected impact: **Better cache semantics, parallel parsing**.

### Short-term — Medium Impact
3. **Fix Zustand selector over-rendering** (F3): Use `useShallow` or granular selectors. Expected impact: **50–80% fewer re-renders on scoring changes**.
4. **Add `React.memo` to question components** (F6): Memoize `QuestionSection`, `ScoreOption`, `EvidenceThumbnails`. Expected impact: **O(1) re-renders per score change instead of O(n)**.
5. **Optimize static images** (F8): Convert PNGs to WebP/JPEG. Expected impact: **−200 KB package size**.

### Long-term — Polish
6. **Pre-compute rubric lookup map** (F5): Build `Map<rubricId, meta>` once per export. Expected impact: Minor speedup on export.
7. **Add missing benchmarks** (F9): Cover `buildHtmlReport`, `archivePageHtml`, and full pipeline.
8. **Reduce ZIP compression level** (F10): Level 6 instead of 9. Expected impact: **2–3x faster export**.
9. **Consider lightweight DOM capture** (F7): Replace `cloneNode(true)` with `outerHTML` + regex. Expected impact: Faster captures on complex pages.
