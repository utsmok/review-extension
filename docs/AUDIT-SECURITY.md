# Security & Permissions Audit

**Date:** 2026-06-09  
**Auditor:** Automated (SecurityAudit agent)  
**Scope:** Manifest permissions, CSP, content scripts, sanitization, HTML report generation, ZIP import/export, data storage, URL handling, dependencies  
**Build:** v0.7.1, chrome-mv3 manifest

---

## Summary

The TRUST Review Extension has a **well-designed security posture** with multiple defense layers: strict CSP, isolated content scripts, thorough HTML sanitization, and zero use of `eval`/`innerHTML`/`dangerouslySetInnerHTML`. The attack surface is small and well-controlled. The audit identified **5 low-severity findings** and **3 informational notes** — no critical or high-severity issues.

**Overall Rating: Good** — production-ready with minor hardening recommendations.

---

## Permission Analysis

### Declared Permissions

| Permission | Justification | Verdict |
|---|---|---|
| `sidePanel` | Required to render the extension UI as a Chrome side panel. Core functionality. | ✅ Justified |
| `activeTab` | Required to capture screenshots (`captureVisibleTab`) and read tab URL/title when the user clicks the extension action. | ✅ Justified |
| `scripting` | Required to inject `archivePageHtml` and `extractLogoFromPage` via `executeScript`. These are hardcoded, read-only DOM queries. | ✅ Justified |
| `<all_urls>` (host_permissions) | Required because side panels don't receive `activeTab` on user action (Chromium #40916430). Without this, the extension cannot capture tabs the user navigates to. | ⚠️ Justified but broad — see [P1] |

### Content Security Policy

```
script-src 'self'; object-src 'self'; connect-src 'self'
```

| Directive | Assessment |
|---|---|
| `script-src 'self'` | Blocks all remote script loading. No inline scripts. ✅ |
| `object-src 'self'` | Blocks plugin content. ✅ |
| `connect-src 'self'` | **Blocks all outbound network** from extension pages. The extension cannot phone home. ✅ |
| Missing `img-src` | Extension pages use data: URLs for screenshots. No explicit `img-src` — defaults to `*` which is fine since CSP only applies to extension pages. |
| Missing `style-src` | TailwindCSS uses build-time extraction. No runtime style injection needed. Acceptable. |

---

## Attack Surface Map

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER TAB                           │
│  ┌─────────────────┐    ┌─────────────────────┐         │
│  │ Page DOM         │◄───│ executeScript       │         │
│  │ (user visits)    │    │ (ISOLATED world)    │         │
│  └────────┬────────┘    └──────────┬──────────┘         │
│           │                        │                     │
│           ▼                        ▼                     │
│  ┌────────────────┐    ┌─────────────────────┐          │
│  │ captureVisibleTab│   │ archivePageHtml     │          │
│  │ (screenshot)    │    │ extractLogoFromPage │          │
│  └────────┬───────┘    └──────────┬──────────┘          │
│           │                        │                     │
└───────────┼────────────────────────┼─────────────────────┘
            │                        │
            ▼                        ▼
┌──────────────────────────────────────────────────────────┐
│                   SIDE PANEL (extension)                  │
│                                                          │
│  ┌─────────────┐  ┌───────────┐  ┌────────────────────┐ │
│  │ IndexedDB   │  │ ZIP Export │  │ HTML Report Gen    │ │
│  │ (local)     │  │ (download) │  │ (esc() + isSafeUrl)│ │
│  └─────────────┘  └───────────┘  └────────────────────┘ │
│  ┌─────────────┐  ┌───────────────────────────────────┐  │
│  │ ZIP Import  │  │ URL.createObjectURL (download)    │  │
│  │ (validate)  │  │ localStorage (zoom only)          │  │
│  └─────────────┘  └───────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘

No external servers. No postMessage. No network fetches from extension context.
```

---

## Findings

### Permissions

#### [P1] LOW — `<all_urls>` host permission is broad

**File:** `wxt.config.ts:19`  
**Manifest:** `"host_permissions": ["<all_urls>"]`

The extension requests access to all URLs. This is necessary due to Chromium bug #40916430 (side panels don't get `activeTab` on action click), but it means the extension technically has permission to inject scripts into any page at any time.

**Mitigating factors:**
- `executeScript` is only called on user-initiated capture actions
- All injected functions are hardcoded (not user-controlled)
- Functions run in `ISOLATED` world — no access to page JS context
- No programmatic content scripts in manifest

**Remediation:** Monitor Chromium #40916430 for resolution. When fixed, switch to `activeTab`-only and remove `<all_urls>`. Consider adding a comment in the manifest with the Chromium bug reference.

---

### Injection

#### [I1] LOW — Sanitized HTML in report uses template literals

**File:** `lib/html-report.ts:95` (and throughout)

User-controlled data (page titles, notes, descriptions) is embedded into HTML via template literals after passing through `esc()`. The `esc()` function correctly escapes `& < > ' "` — the five characters needed to break out of HTML context.

**Assessment:** The `esc()` implementation is correct and applied consistently. All user data in the HTML report passes through `esc()` before interpolation. The `safeLink()` function additionally validates URLs with `isSafeUrl()` (http/https only) before creating `<a>` tags. No injection vectors found.

**One concern:** `esc()` is a custom implementation rather than a battle-tested library. While the logic is sound, any future modification could introduce gaps.

**Remediation:** Add a unit test that verifies `esc()` against a corpus of XSS payloads (e.g., the OWASP XSS cheat sheet). This would protect against future regressions.

#### [I2] LOW — Archived HTML may contain residual CSS-based attacks

**File:** `lib/capture/sanitize.ts:57-137`

The sanitizer strips scripts, iframes, event handlers, and dangerous URL schemes. However, it does **not** strip:
- `<style>` blocks that could use `url()` to make network requests when the archive is viewed
- CSS `expression()` (IE-only, negligible in modern browsers)
- CSS-based clickjacking via absolute positioning

**Assessment:** Low risk. The archived HTML is stored in IndexedDB and only rendered in the standalone HTML report where all images are inlined as data: URLs. The report CSP (`default-src 'none'; img-src data:`) would block any CSS url() attempts in that context. However, if a user opens the raw capture HTML from the ZIP export in a browser, the CSS could trigger requests to the original domain.

**Remediation:** Consider stripping or rewriting CSS `url()` references in archived HTML to data: URLs or removing them entirely, since the archive is meant to be a snapshot.

#### [I3] INFO — `srcset` attribute not sanitized

**File:** `lib/capture/sanitize.ts:79-94`

The dangerous URL attribute list (`href`, `src`, `action`, `formaction`, `xlink:href`) does not include `srcset`. While `srcset` values are not directly executable, they could load external resources when the archive is viewed.

**Assessment:** Negligible. `srcset` only controls image sources and cannot execute script. The archive is primarily stored, not rendered.

**Remediation:** Add `srcset` to the URL sanitization list for completeness.

---

### Sanitization

#### [S1] GOOD — Comprehensive archive sanitization

**File:** `lib/capture/sanitize.ts`

The sanitizer performs the following steps in order:
1. ✅ Inlines all linked stylesheets
2. ✅ Resolves `@import` in inline styles
3. ✅ Strips `<script>`, `<noscript>`, `<iframe>`, `<object>`, `<embed>`, `<frame>`, `<applet>`, `<base>`
4. ✅ Strips all `on*` event handler attributes
5. ✅ Sanitizes `javascript:`, `vbscript:`, `data:text/html` in URL attributes
6. ✅ Removes `<meta http-equiv="refresh">`
7. ✅ Makes relative URLs absolute
8. ✅ Injects archive metadata comment

**Notable:** CSS `@import` resolution (line 27-51) fetches external CSS and inlines it. This is a **read-only DOM operation** in the page context — the fetched CSS is inserted as text content, not executed. The CSP `connect-src 'self'` does not apply here because `fetch()` runs in the page context (ISOLATED world, not extension page).

---

### Data Handling

#### [D1] LOW — ZIP import path traversal check could be stricter

**File:** `lib/export.ts:97-104`

Path traversal protection checks for `/`, `..`, and `\` in entry names. However, it does not check for:
- URL-encoded path traversal sequences (e.g., `%2e%2e%2f`)
- Mixed encoding (`..%2f`)

**Assessment:** JSZip's `loadAsync` parses entry names as strings, and the `zip.file()` lookup uses exact string matching — not filesystem path resolution. So even if a malicious entry name contains `..`, it won't actually escape the ZIP structure when accessed via `zip.file(name)`. The check is defense-in-depth rather than load-bearing.

**Remediation:** Add a decode-and-re-check step for URL-encoded sequences for defense-in-depth:
```ts
const decoded = decodeURIComponent(name);
if (decoded.startsWith("/") || decoded.includes("..")) { ... }
```

#### [D2] INFO — Session data stored unencrypted in IndexedDB

**File:** `stores/session.ts:13-16`, `lib/session-repository.ts`, `lib/screenshot-store.ts`

All session data (evaluations, notes, screenshots, HTML archives) is stored in IndexedDB without encryption. This is documented in the code comments.

**Assessment:** Acceptable. IndexedDB is scoped to the extension origin, so other extensions and web pages cannot access it. The data is user-generated evaluation notes, not sensitive credentials. Encryption would add complexity with minimal security benefit for the threat model of a local-only browser extension.

**Remediation:** None required. Current design is appropriate for the threat model.

#### [D3] GOOD — ZIP import has comprehensive validation

**File:** `lib/export.ts:36-190`

The import pipeline validates:
- ✅ Max compressed size (200 MB)
- ✅ Max entry count (500)
- ✅ Max uncompressed bytes (500 MB) with running budget
- ✅ Path traversal in entry names
- ✅ Required `session.json` file
- ✅ Schema validation (metadata.id, metadata.toolName, captures array, evaluations array)
- ✅ Filename sanitization via `sanitizeFilename()` (strips `<>:"/\|?*` and control characters)

---

### Dependencies

#### [DEP1] INFO — jszip@3.10.1: No known vulnerabilities

**CVE-2021-23413** (prototype pollution) affected jszip < 3.7.0. Version 3.10.1 is **not affected**.  
**CVE-2022-48285** (path traversal via loadAsync) was reported for JSZip but requires writing extracted files to disk — the extension uses JSZip purely in-memory. The extension's own path traversal checks in `importSessionFromZip` provide additional protection.

**Remediation:** None required.

#### [DEP2] INFO — papaparse@5.4.1: ReDoS in older versions

PapaParse ≤ 5.1.x had a ReDoS vulnerability (inefficient regex complexity). Version 5.4.1 is **not affected**. The extension uses PapaParse only for CSV **export** (unparse), not parsing untrusted CSV input.

**Remediation:** None required.

#### [DEP3] INFO — tldraw@^5.0.1: No known CVEs

No published CVEs or security advisories found for tldraw as of 2026-06-09. The library is used solely for the screenshot annotation canvas.

**Remediation:** None required.

---

## Security Controls Checklist

| Control | Status | Details |
|---|---|---|
| No `eval()` / `new Function()` / `document.write()` | ✅ Confirmed | Search across entire codebase found zero instances in production code |
| No `innerHTML` / `dangerouslySetInnerHTML` | ✅ Confirmed | Zero instances in components/ or entrypoints/ |
| No `postMessage` to web pages | ✅ Confirmed | No postMessage usage found |
| `window.open` URL validation | ✅ Confirmed | `components/SessionManager.tsx:346` validates `^https?://` |
| CSP blocks outbound network | ✅ Confirmed | `connect-src 'self'` in manifest |
| Content scripts in ISOLATED world | ✅ Confirmed | `world: "ISOLATED"` on all `executeScript` calls |
| URL scheme allowlist on capture | ✅ Confirmed | `lib/capture/browser.ts:5` allows `http:`, `https:`, `file:` only |
| HTML escaping in report | ✅ Confirmed | `esc()` applied to all user data in `html-report.ts` |
| URL validation in report links | ✅ Confirmed | `isSafeUrl()` requires `https?://` scheme |
| Filename sanitization in export | ✅ Confirmed | `sanitizeFilename()` strips path separators and special chars |
| ZIP import size limits | ✅ Confirmed | 200 MB compressed, 500 MB uncompressed, 500 entries max |
| ZIP import path traversal check | ✅ Confirmed | Blocks `/`, `..`, `\` in entry names |
| ZIP import schema validation | ✅ Confirmed | Validates metadata fields, capture/evaluation arrays |
| No localStorage for sensitive data | ✅ Confirmed | Only zoom preference stored in localStorage |
| Object URL cleanup | ✅ Confirmed | `downloadBlob` revokes after 10s timeout |
| Size limits on capture | ✅ Confirmed | 25 MB max per capture (`lib/capture/browser.ts:6`) |
| Report CSP in generated HTML | ✅ Confirmed | `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:` |

---

## Recommendations Summary

| ID | Severity | Recommendation | Effort |
|---|---|---|---|
| P1 | LOW | Monitor Chromium #40916430; switch to activeTab-only when resolved | Future |
| I1 | LOW | Add XSS corpus test for `esc()` function | Small |
| I2 | LOW | Strip CSS `url()` references in archived HTML stored in ZIP | Medium |
| I3 | INFO | Add `srcset` to sanitized URL attribute list | Trivial |
| D1 | LOW | Add URL-decode re-check in ZIP path traversal validation | Small |

---

## Positive Observations

1. **Defense in depth:** Multiple layers of protection — CSP, isolated worlds, URL validation, HTML escaping, size limits, schema validation.
2. **No outbound network:** `connect-src 'self'` ensures the extension truly cannot send data externally.
3. **Hardcoded content scripts:** All `executeScript` functions are static — no user-controlled code injection possible.
4. **Comprehensive ZIP import validation:** Size limits, entry count, path traversal, and schema checks all present.
5. **Well-documented security posture:** Inline comments in `wxt.config.ts` clearly document the threat model.
6. **URL.createObjectURL cleanup:** Properly revoked after download with timeout fallback.
7. **Crypto.randomUUID:** Used for all ID generation — no predictable IDs.
