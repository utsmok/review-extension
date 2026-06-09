# AUDIT: Workflow & User Flows

**Date:** 2026-06-09
**Scope:** Session lifecycle, capture, metadata, scoring, export, import, multi-session, keyboard shortcuts

---

## Summary

The TRUST Review Extension implements a structured evaluation workflow with auto-save, evidence capture, and ZIP export. The core session lifecycle (create → score → finalize → export) is complete and functional. Several workflow gaps and friction points were identified, ranging from missing undo paths to dual export paths that may confuse users. No critical data-loss bugs were found, but several P1 issues could cause confusion or lost work in edge cases.

---

## User Flow Diagrams

### 1. Session Lifecycle (Primary Flow)

```
AppShell (setup banner if no reviewer name)
  │
  ├─ SessionManager (no active session)
  │     │
  │     ├─ "Start New Review" → NewSessionModal
  │     │     ├─ Prefills toolName + toolUrl from active tab
  │     │     ├─ Toggle "Uses AI" (default: on)
  │     │     └─ Submit → createSession() → switchToSession()
  │     │
  │     ├─ Session Card → click → switchToSession()
  │     ├─ Session Card → Export → exportSessionById() → ZIP download
  │     ├─ Session Card → Import button → file picker → importSessionFromZipFile()
  │     └─ Session Card → Delete → ConfirmDialog → deleteSession()
  │
  └─ ActiveSession (session loaded)
        │
        ├─ Tab: Evaluation
        │     ├─ ScoreOverviewBar (sticky progress)
        │     ├─ Quality Gates (pass/fail/na/unsure per question)
        │     ├─ Scoring Rubric (0-3 per question, grouped by principle)
        │     ├─ "+ Capture Evidence" per question → captureActiveTab() → link
        │     └─ Evidence linking (explicitEvidenceIds)
        │
        ├─ Tab: Metadata
        │     ├─ Tool details (description, company, pricing, availability)
        │     ├─ Logo capture (screenshot + extract logo)
        │     ├─ T&C capture
        │     ├─ Pill fields (data sources, search methods, discipline, auth)
        │     ├─ "End Review & Export" → ZIP download → ExportCompleteScreen
        │     └─ "Discard review" → ConfirmDialog → deleteSession()
        │
        ├─ Tab: Finalize
        │     ├─ Grade selector (Pass / Conditional / Fail)
        │     ├─ Conclusion, Strengths, Weaknesses, Recommendations
        │     ├─ Autosave (50ms debounce, no finalizedAt)
        │     └─ "Save Finalization" → sets finalizedAt timestamp
        │
        └─ Tab: Captures
              ├─ Quick Capture button
              ├─ Grid/List view toggle
              ├─ Expand capture → notes, rubric tagging
              ├─ EvidenceModal (tldraw annotation)
              └─ Delete capture → ConfirmDialog
```

### 2. Capture Flow

```
Trigger: Quick Capture button (top bar) OR "+ Capture Evidence" on question
  │
  ├─ useCaptureAction().run()
  │     └─ captureActiveTab()
  │           ├─ Query active tab
  │           ├─ Validate URL scheme (http/https/file only)
  │           ├─ browser.tabs.captureVisibleTab() → PNG data URL
  │           ├─ browser.scripting.executeScript() → page HTML + title
  │           ├─ Size check (25 MB limit, truncate HTML if exceeded)
  │           └─ Return Capture object
  │
  ├─ addCapture() → Zustand store + saveScreenshot() to IDB
  │
  ├─ If from question: linkCaptureToRubric(captureId, rubricId)
  │
  └─ Captures tab: view, annotate (EvidenceModal), tag to rubric items
```

### 3. Export Flow

```
Trigger: "End Review & Export" button (Metadata tab) OR "Export" button (top bar)
  │
  ├─ canExport() check → warn if missing toolName/toolUrl
  │
  ├─ exportAndClose()
  │     ├─ saveCurrentSession() (flush to IDB)
  │     ├─ markDoneAndClose() (status → "done", close)
  │     ├─ load session from IDB (fresh)
  │     ├─ prepareExportArtifacts()
  │     │     ├─ Load screenshots from separate IDB store
  │     │     ├─ Generate CSVs (metadata, scores, capture log, conclusions)
  │     │     ├─ Generate session.json
  │     │     ├─ Generate HTML report + nutrition label
  │     │     └─ Collect image files
  │     ├─ assembleZip() → JSZip blob
  │     └─ downloadBlob() → trigger download
  │
  └─ Metadata tab: ExportCompleteScreen (success/failure, retry/done)
      Top bar: toast only, no completion screen
```

### 4. Import Flow

```
Trigger: "Import Review" button (SessionManager)
  │
  ├─ File picker → handleImport()
  │     └─ importSessionFromZipFile(zipBlob)
  │           ├─ Size check (200 MB compressed)
  │           ├─ Entry count check (500 max)
  │           ├─ Path traversal protection
  │           ├─ Parse session.json + validate
  │           ├─ Reassemble screenshots from image files
  │           ├─ Reassemble HTML content
  │           ├─ Check for duplicate ID → error if exists
  │           ├─ Persist screenshots to separate IDB store
  │           ├─ Strip screenshots, save session to IDB
  │           └─ Register in registry
  │
  └─ switchToSession() → loads into active view
```

### 5. Auto-Save Flow

```
Trigger: Any Zustand store mutation (subscribe listener)
  │
  ├─ initAutoSave() singleton (from useActiveSession mount)
  │     ├─ Zustand subscribe: 1s debounce → autoSaveFlush()
  │     └─ visibilitychange: immediate flush on panel hidden
  │
  ├─ autoSaveFlush()
  │     ├─ Rate limit: 3s minimum between saves
  │     ├─ Guard: skip if session switched since schedule
  │     ├─ Persist screenshots to separate IDB store
  │     ├─ Strip screenshots from session data
  │     └─ Save to IDB via repository
  │
  └─ Events: trust-save-succeeded / trust-save-failed (for save indicator)
```

---

## Findings

### P0 — Critical

_None found._

### P1 — High

#### W-01: Dual export paths with different completion experiences

**File:** `components/Metadata.tsx:574-588`, `components/ActiveSession.tsx:315-341`

The "End Review & Export" button on the Metadata tab triggers a full `exportAndClose()` that navigates to `ExportCompleteScreen` with success/failure details and a retry button. The "Export" button in the top action bar calls the same `exportAndClose()` but shows only a toast — there is no `ExportCompleteScreen` for this path. If the top-bar export fails, the user has no retry mechanism and may not notice the failure.

**Impact:** Silent export failure from top bar. Users may believe export succeeded when it did not.

**Recommendation:** Either unify both paths to show `ExportCompleteScreen`, or at minimum show a failure toast with retry instructions from the top-bar path.

**Decision:** Agreed. However, also ensure that export always works -- at least, ensure no blockers present in the code. Obviously external errors (disk write errors, external permissions, etc) are out of scope and should be flagged with an error message as described.

---

#### W-02: Export closes the session, discarding the in-memory state

**File:** `hooks/useActiveSession.ts:70-88`

`exportAndClose()` calls `markDoneAndClose()` which sets session status to "done" and closes it. The user is returned to SessionManager. If the export ZIP had an issue (e.g., corrupted download), the user cannot retry from within the session — they must re-open the session from the card list, but it's now marked "done" and the store is cleared.

**Impact:** If the download fails or the user accidentally closes the ZIP save dialog, they must re-open the session and export again.

**Recommendation:** Consider an export-and-stay option, or at minimum ensure the SessionManager export button on "done" sessions works as a retry path (it does — `exportSessionById` loads from IDB). Document this in the UI.

**Decision:** exporting should not close the session. Remove the automatic closing/discarding of the current review.

---

#### W-03: No undo for destructive actions on captures

**File:** `stores/session.ts:92-110`

`removeCapture` immediately deletes from state, removes evidence links from all evaluations, and deletes the screenshot from the separate IDB store. There is no undo mechanism. The confirm dialog is the only guard.

**Impact:** Accidental capture deletion removes all linked evidence from evaluations with no recovery path.

**Recommendation:** Add a soft-delete with undo timeout (5–10 seconds), or at minimum warn the user about linked evidence being removed.

**Decision:** Agreed. Implement as recommended.
---

#### W-04: Finalization autosave can create empty/placeholder finalization records

**File:** `components/FinalizationScreen.tsx:43-65`

The autosave fires on any field change with a 50ms debounce, as long as `grade` is set. If a user selects a grade but hasn't filled in conclusion/strengths/weaknesses yet, an incomplete `ReviewFinalization` object is persisted to the store (and then auto-saved to IDB). While `finalizedAt` is not set (correct), the mere presence of a finalization object causes the Finalize tab to show as "complete" (with checkmark) since `finalizeComplete` is `!!finalization`.

**Impact:** The Finalize tab shows a completion checkmark as soon as a grade is selected, even with empty conclusion. Misleading progress indicator.

**Recommendation:** Make `finalizeComplete` check for both `finalization?.finalizedAt` AND a minimum set of filled fields (at minimum grade + conclusion).

**Decision:** Agreed. Implement as recommended.

---

### P2 — Medium

#### W-05: Metadata "End Review & Export" does not require finalization

**File:** `components/Metadata.tsx:574-588`

The export button has a `canExport()` check that only verifies `toolName` and `toolUrl`. It does not check whether the review has been finalized (grade, conclusion, strengths, weaknesses). A user can export a review with no finalization at all. The warning about "Review not finalized" is shown above the button, but nothing blocks the export.

**Impact:** Incomplete reviews may be exported without conclusions, reducing audit quality.

**Recommendation:** Add a confirmation dialog when exporting without finalization (similar to the missing-fields confirmation). Consider requiring at least a grade before export.

**Decision:** This is intended: exporting current state is always allowed, not just for final reviews, as it also serves as a backup method, and a way to share progress with other devices/users. Mark as won't fix.

---

#### W-06: Keyboard shortcut "?" requires Shift, shown as "?" in help

**File:** `components/ActiveSession.tsx:385`, `hooks/useKeyboardShortcuts.ts:29`

The shortcut is registered as `"Shift+?"` but displayed in the help popover as just `?`. Since `?` requires `Shift+/` on US keyboards, the actual shortcut is `Shift+Shift+/` which resolves to `Shift+?`. This works because the key combination resolves correctly, but the help text is misleading — pressing bare `?` on most keyboards requires Shift, and users may not realize they need to press Shift.

**Impact:** Minor confusion about how to trigger the help panel.

**Recommendation:** Show the shortcut as `Shift + /` or `?` with a note that Shift is required. Alternatively, register both `"?"` and `"Shift+?"` paths.

**Decision:** Agreed. Implement as recommended, also using the 'alternatively' solution: show shorcut as  `Shift + /` / `?`; AND register  `"?"` and `"Shift+/"` as the actual key combos that trigger the shortcut.

---

#### W-07: Quick Note appends to metadata.notes, no way to view notes in context

**File:** `components/ActiveSession.tsx:123-133`

Quick Notes are appended to `session.notes` with a timestamp prefix. The only place to view these notes is on the Metadata tab's "Review Notes" textarea, where quick notes appear interleaved with any manually typed notes. There's no dedicated note list or way to distinguish quick notes from regular notes.

**Impact:** Notes accumulate without structure. No way to review just quick notes or see a timeline.

**Recommendation:** Consider a dedicated notes list view, or at minimum visually distinguish quick notes (e.g., with a bullet prefix) in the metadata textarea.

**Decision:** Agreed. Perhaps use a similar component as the strengths/weaknesses interface. Also include the list of notes w/ timestamps in the final report, at the end.

---

#### W-08: Capture annotation (EvidenceModal) uses lazy-loaded tldraw with no loading indicator

**File:** `components/EvidenceModal.tsx:12`

`Tldraw` is loaded via `React.lazy()`. The `Suspense` wrapper does not have a fallback loading indicator. On slow connections or cold starts, the annotation modal may appear blank for a moment before tldraw loads.

**Impact:** Blank modal during tldraw load may confuse users.

**Recommendation:** Add a `fallback={<LoadingSpinner />}` to the `Suspense` wrapper around `Tldraw`.

**Decision:** Agreed.

---

#### W-09: Import rejects on duplicate ID but offers no merge/rename option

**File:** `lib/session-lifecycle.ts:258-264`

`importSessionFromZipFile` throws an error if a session with the same ID already exists. The error message says "Delete it first if you want to re-import." There's no option to import as a new session (with a fresh ID) or to overwrite.

**Impact:** If a user exports from one browser and tries to import on another where the same session exists, they must delete the existing session first, losing all work.

**Recommendation:** Offer to import with a new ID (copy) when a duplicate is detected.

**Decision:** Agreed.

---

#### W-10: No breadcrumb or progress indicator for overall review completion

**File:** `components/ActiveSession.tsx`

Tab completion checkmarks show per-tab status, but there's no overall progress indicator (e.g., "3/5 steps complete") visible at all times. The `ScoreOverviewBar` shows rubric completion but not the broader workflow (metadata filled? finalized? captures taken?).

**Impact:** Users may not know what's left to complete before they can export.

**Recommendation:** Add a small progress summary (e.g., "Metadata ✓ | Evaluation 60% | Finalize ○ | Captures 3") visible in the tab bar area.

**Decision:** Agreed.
---

### P3 — Low

#### W-11: Tab order differs from logical workflow order

**File:** `components/ActiveSession.tsx:14`

Tabs are ordered: Evaluation → Metadata → Finalize → Captures. The logical workflow is: fill metadata → capture evidence → score → finalize → export. Evaluation is first, but metadata (tool details) is logically upstream. The banner on non-Metadata tabs nudges users to complete metadata, but the tab order doesn't match the expected workflow.

**Impact:** Minor friction for first-time users following the natural workflow.

**Recommendation:** Consider reordering to: Metadata → Captures → Evaluation → Finalize, matching the intended workflow. Or add numbered step indicators.

---

#### W-12: Setup banner dismiss is permanent with no way to re-show

**File:** `components/AppShell.tsx:86-90`

The setup banner (prompting reviewer name) is dismissed permanently via `setupBannerDismissed` in settings. There's no way to re-show it if dismissed accidentally, and no indication in settings that it was dismissed.

**Impact:** Low — reviewer name can still be set in settings. Banner is just a nudge.

**Recommendation:** Add a "Show setup tips" toggle in settings, or just remove the permanent dismiss flag and let the banner auto-hide once reviewerName is set.

**Decision:** Agreed: remove the permanent dismiss flag and let the banner auto-hide once reviewerName is set.

---

#### W-13: Quick Capture button has no visual feedback during capture

**File:** `components/ActiveSession.tsx:190-217`

The Quick Capture button disables during capture (`disabled={capturing}`) but shows no spinner, progress indicator, or visual change beyond the disabled state.

**Impact:** Users may not realize a capture is in progress on slow machines.

**Recommendation:** Add a brief animation or spinner overlay on the capture button while capturing.

**Decision:** Agreed

---

#### W-14: Metadata T&C capture doesn't auto-fill termsConditionsUrl field

**File:** `components/ActiveSession.tsx:227-232`

The top-bar "Capture T&C" button captures the page AND sets `termsConditionsUrl` to the captured page's URL. The Metadata tab's "Capture Page" button for T&C does NOT auto-fill the URL field — it only creates a capture linked to the field.

**Impact:** Inconsistent behavior between the two T&C capture entry points.

**Recommendation:** Either both should auto-fill the URL, or neither should. The top-bar behavior (auto-fill) is more useful.

**Decision:** Agreed, both should fill the URL.

---

#### W-15: Session card export does not update session status to "done"

**File:** `components/SessionManager.tsx:51-73`

`handleExport` on session cards calls `exportSessionById()` which loads from IDB and builds the ZIP. It does NOT call `markDoneAndClose()` — the session status remains "started" even after export from the session list. Only the Metadata tab export path updates status to "done".

**Impact:** Sessions exported from the card list don't get marked as complete, creating inconsistency.

**Recommendation:** Either mark sessions as done when exported from cards, or remove the export-from-card feature and direct users to open the session first.

**Decision:** Agreed. Remove the 'mark as done' function from the export completely: as described earlier it serves more purposes. Instead, add a button/toggle on the main overview to mark a review as done. If we want to automate it, it should be marked as done once if the export is triggered when certain conditions are met, e.g. all questions are answered and the finalization is completely filled or something.
---

#### W-16: No confirmation when closing session with unsaved quick note text

**File:** `components/ActiveSession.tsx:458-498`

If a user opens the quick note overlay and types text, then clicks "Close review" (X button), the quick note overlay is dismissed via the Escape handler, but the text is silently discarded. There's no "unsaved note" warning.

**Impact:** Minor — quick notes are ephemeral by nature, but users may expect auto-save behavior.

**Recommendation:** Either auto-save the note on close, or warn about unsaved text.

**Decision:** agreed. auto-save if possible.

---

#### W-17: Help popover lists "?" shortcut but actual binding is "Shift+?"

**File:** `components/ActiveSession.tsx:383-387`

The help popover shows `<kbd>?</kbd>` but the registered shortcut is `"Shift+?"`. The `useKeyboardShortcuts` hook builds the key string as `Shift+?` because `e.shiftKey` is true and `e.key` is `"?"`. This works in practice, but the display could be clearer.

**Impact:** Negligible — `?` naturally requires Shift on standard keyboards.

**Recommendation:** No action needed; note for documentation clarity.

**Decision:** already handled earlier.

---

## Recommendations

### Priority Actions (P1)

1. **Unify export completion experience** — Both the Metadata tab and top-bar export should show the `ExportCompleteScreen` or at least a consistent failure/success treatment.
2. **Fix Finalize tab checkmark** — Change `finalizeComplete` to require `finalizedAt` (formal save), not just any finalization object.
3. **Add undo for capture deletion** — Implement soft-delete with a 5-second undo window.
4. **Add export-without-finalization warning** — Require explicit confirmation when exporting an unfinalized review.

### Quality Improvements (P2)

5. **Reorder tabs** to match logical workflow: Metadata → Captures → Evaluation → Finalize.
6. **Add loading fallback** for tldraw `Suspense` in `EvidenceModal`.
7. **Offer copy-on-import** when duplicate session ID is detected.
8. **Unify T&C capture behavior** between top-bar and Metadata tab.
9. **Mark sessions as done** when exported from session cards.

### Nice-to-Have (P3)

10. **Add capture button spinner** during screenshot capture.
11. **Restructure quick notes** with visual distinction from manual notes.
12. **Add overall workflow progress indicator** across all tabs.
13. **Auto-save quick note** on session close.

---

## Compliance with Best Practices

Based on [Firefox Extension UX Best Practices](https://extensionworkshop.com/documentation/develop/user-experience-best-practices/) and Nielsen's Usability Heuristics:

| Principle | Status | Notes |
|---|---|---|
| **Keep it focused** | ✓ | Single purpose: structured evaluation. Clear scope. |
| **Give users what they need, where they need it** | ⚠ | Side panel is correct pattern. Capture buttons are contextual. Missing: no overall progress. |
| **Keep the user informed** | ⚠ | Auto-save indicator exists. Missing: export failure from top bar, capture progress feedback. |
| **Onboarding** | ✓ | Setup banner for reviewer name. Help popover with shortcuts. |
| **Consistency** | ⚠ | Dual export paths have different UX. Tab order doesn't match workflow. |
| **Error prevention** | ⚠ | Confirm dialogs exist for delete. Missing: undo for capture deletion, export-without-finalization warning. |
| **Visibility of system status** | ⚠ | Tab checkmarks show per-section status. Missing: overall workflow progress, export status from top bar. |
| **User control and freedom** | ⚠ | No undo for capture deletion. Import doesn't offer merge/rename on conflict. |

---

## Auto-Save Assessment

The auto-save system is well-designed:

- **Singleton pattern** with `initAutoSave()`/`teardownAutoSave()` prevents duplicate subscribers.
- **1-second debounce** prevents excessive IDB writes.
- **3-second rate limit** prevents rapid-fire saves.
- **Visibility flush** ensures data is persisted when the panel is hidden.
- **Signature check** avoids redundant saves when only non-significant state changed.
- **Separate screenshot store** prevents large base64 strings from being written on every keystroke.

**Gap:** The signature check (`evaluations.length:captures.length:finalizedAt`) does not detect metadata changes (toolName, notes, etc.) or evaluation score changes (same length, different scores). A metadata change like updating the tool URL won't trigger a save unless evaluations/captures count also changes. However, the visibility flush (on panel close) ensures all state is persisted, so this is mitigated for normal use.

**Recommendation:** Expand the signature to include a hash of metadata fields and evaluation scores for more robust dirty detection.

**Decision:** agreed, but only add this if it is not too much work/refactoring/code bloat. Otherwise it's too low a priority.
