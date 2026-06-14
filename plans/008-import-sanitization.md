# Plan 008: Re-sanitize imported archive HTML (defense-in-depth against zip-borne XSS)

> **Executor instructions**: Follow step by step; run each verification before moving on. On a STOP condition, stop and report. Commit per Git workflow.
>
> **Drift check**: `git diff --stat b5554b5..HEAD -- lib/capture/sanitize.ts lib/export.ts`

## Status
- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `b5554b5`, 2026-06-14

## Why this matters
On capture, `archivePageHtml` strips scripts, iframes, event handlers, and dangerous URLs before the HTML is stored. The import path does the opposite: it reads `.html` files straight out of a foreign ZIP into `capture.htmlContent` with **no sanitization**. That raw HTML is later re-exported into CSP-less `.html` evidence files inside new export ZIPs — opening them in a browser fires any payload the original ZIP carried. Re-sanitizing on import closes the loop.

## Current state
- `lib/export.ts:206-218` — import reads `.html` from the ZIP and assigns `capture.htmlContent = html` directly (no sanitize).
- `lib/capture/sanitize.ts` — `archivePageHtml()` is DOM-based (operates on the live `document` via clone). Its strip phase removes: `script, iframe, object, embed, base (user-injected), frame, applet, noscript`; strips `on*` attributes; strips `javascript:`/`vbscript:`/`data:text/html` from `href/src/srcset/action/formaction/xlink:href`; strips `<meta http-equiv=refresh>`.
- `tests/sanitize.test.ts` — 14 thorough tests for `archivePageHtml` (model new tests on these).
- DOMParser is available both in the extension sidepanel context (runtime) and in jsdom (tests).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint | `pnpm lint` | exit 0 |
| Tests | `pnpm test -- sanitize` then `pnpm test -- import-session-zip` | all pass |
| Full | `pnpm test` | all pass |

## Scope
**In scope**: `lib/capture/sanitize.ts` (add `sanitizeArchiveHtml`), `lib/export.ts` (call it on import), `tests/sanitize.test.ts` (add cases), `lib/capture/index.ts` (re-export if needed).
**Out of scope**: `archivePageHtml` itself (do not change capture behavior); `lib/html-report.ts`.

## Git workflow
- One commit: `fix(security): re-sanitize imported archive HTML to block zip-borne XSS`

## Steps

### Step 1: Add `sanitizeArchiveHtml` to `lib/capture/sanitize.ts`
Add an exported pure function that parses a string with DOMParser, applies the same strip rules as `archivePageHtml`'s strip phase, and re-serializes. It must NOT fetch/inject CSS or a `<base>` (the captured archive already did that) — it only strips dangerous nodes/attributes:
```ts
/**
 * Re-sanitize an imported HTML archive string using the same strip rules as
 * archivePageHtml. Defense-in-depth: foreign ZIPs may carry unsanitized HTML.
 * Uses DOMParser (available in the extension sidepanel and in jsdom tests).
 */
export function sanitizeArchiveHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const dangerous = "script,iframe,object,embed,base,frame,applet,noscript";
  doc.querySelectorAll(dangerous).forEach((el) => el.remove());
  const urlAttrs = /^(href|src|srcset|action|formaction|xlink:href)$/i;
  const badScheme = /^\s*(javascript|vbscript|data:text\/html)/i;
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
      else if (urlAttrs.test(attr.name) && badScheme.test(attr.value)) el.removeAttribute(attr.name);
    }
  });
  doc.querySelectorAll('meta[http-equiv]').forEach((m) => {
    if (/refresh/i.test(m.getAttribute("http-equiv") ?? "")) m.remove();
  });
  return doc.documentElement.outerHTML;
}
```
If `lib/capture/index.ts` barrel-exports sanitize helpers, add `sanitizeArchiveHtml` there too.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Call it on the import path
In `lib/export.ts`, where `htmlContent` is assigned from the ZIP (~line 214-217), wrap the assignment:
```ts
import { sanitizeArchiveHtml } from "./capture/sanitize";
...
      if (htmlFile) {
        const raw = await htmlFile.async("string");
        checkBudget(raw.length);
        capture.htmlContent = sanitizeArchiveHtml(raw);
      }
```
(Place the import with the other relative imports at the top of `lib/export.ts`.)

**Verify**: `pnpm typecheck` → exit 0.

### Step 3: Add tests in `tests/sanitize.test.ts`
Add a new `describe("sanitizeArchiveHtml", ...)` block (same file, same jsdom env). Cases:
1. Strips `<script>alert(1)</script>` → output contains no `<script`.
2. Strips `onerror`/`onclick` handler attributes, preserves `class`.
3. Strips `href="javascript:..."` and `href="data:text/html,..."`, preserves `href="https://..."`.
4. Strips `<iframe>` and `<meta http-equiv="refresh">`.
5. Returns a string containing `<html` (well-formed serialization) for a minimal input.

Then in `tests/import-session-zip.test.ts` (or `import-session-zip-file.test.ts`), add one integration case: build a ZIP whose capture `.html` contains `<script>x</script>`, run the import, assert the resulting `capture.htmlContent` contains no `<script`.

**Verify**: `pnpm test -- sanitize` → all pass; `pnpm test -- import-session-zip` → all pass.

### Step 4: Commit
**Verify**: `pnpm typecheck && pnpm lint && pnpm test` → all exit 0. Commit.

## Done criteria
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] `sanitizeArchiveHtml` exists and strips script/on*/javascript:/data:text/html/iframe/meta-refresh
- [ ] `lib/export.ts` import path calls `sanitizeArchiveHtml` before storing `htmlContent`
- [ ] New unit tests (≥5) + 1 import integration test pass
- [ ] No files outside in-scope modified

## STOP conditions
- `DOMParser` is not available in the import-path runtime context (it should be — sidepanel is a normal page) → STOP and report; do not fall back to a regex stripper without reviewer sign-off.
- An existing import test asserts on exact `htmlContent` bytes and breaks due to DOMParser re-serialization → report the test; normalize the assertion to the sanitized shape rather than disabling sanitization.
