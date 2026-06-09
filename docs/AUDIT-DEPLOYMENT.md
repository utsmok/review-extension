# Deployment & CI/CD Audit

**Date:** 2026-06-09
**Scope:** Build config, CI/CD pipelines, release workflow, cross-browser support, packaging, dependencies, tooling config

---

## Summary

The TRUST Review Extension has a solid, no-friction CI/CD foundation: a single CI workflow runs the three essential gates (typecheck, lint, test), and a release workflow builds both Chrome and Firefox zips on tag push. The build is handled entirely by WXT with sensible defaults. However, there are notable gaps: no build verification in CI, no E2E tests in CI, no automated store submission, missing source archive for Firefox AMO compliance, and several dependency version ranges that have fallen behind their latest published versions. Cross-browser support relies on WXT's automatic `sidePanel` → `sidebar_action` mapping, which is correct but untested in CI.

**Overall health: Good, with improvement opportunities.**

---

## 1. CI/CD Pipeline Assessment

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`, PRs targeting `main`.

**Steps:**
1. `pnpm install --frozen-lockfile`
2. `pnpm wxt prepare` (generates `.wxt/` type stubs)
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm test`

**Assessment:**

- ✅ Uses `pnpm/action-setup@v6` with `--frozen-lockfile` — correct for reproducible builds.
- ✅ Node 22 matches `.nvmrc` (which specifies `22`).
- ✅ `actions/checkout@v6`, `actions/setup-node@v5` — current major versions.
- ✅ Three core gates (typecheck, lint, test) run in sequence.

### CodSpeed Workflow (`.github/workflows/codspeed.yml`)

**Triggers:** Push to `main`, PRs, manual dispatch.

Runs Vitest benchmarks via `@codspeed/vitest-plugin` in simulation mode. This is a performance regression monitor — useful for catching perf degradation in the export pipeline.

- ✅ Correctly configured with `mode: simulation`.
- ✅ Uses same Node/pnpm versions as CI.

### Release Workflow (`.github/workflows/release.yml`)

**Trigger:** Push of tags matching `v*`.

**Steps:**
1. Install + prepare
2. Run all gates (typecheck, lint, test)
3. `pnpm zip` — Chrome zip
4. `pnpm zip:firefox` — Firefox zip
5. Create GitHub Release via `softprops/action-gh-release@v3` with both zips attached

**Assessment:**

- ✅ Runs full gate suite before building — prevents broken releases.
- ✅ Produces both Chrome and Firefox zips.
- ✅ `generate_release_notes: true` auto-generates release notes from commits.
- ✅ `permissions: contents: write` correctly scoped for release creation.

---

## 2. Build Process Findings

### `wxt.config.ts`

- ✅ Clean, minimal config. WXT handles manifest generation, bundling, and dev server.
- ✅ Strict CSP: `script-src 'self'; object-src 'self'; connect-src 'self'` — no outbound network.
- ✅ Permissions are minimal: `sidePanel`, `activeTab`, `scripting`.
- ✅ Security posture documented inline in manifest config.
- ✅ `@vitejs/plugin-react` for JSX transform.

### `package.json` Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `dev` | Chrome dev server | ✅ |
| `dev:firefox` | Firefox dev server | ✅ |
| `build` | Chrome production build | ✅ |
| `build:firefox` | Firefox production build | ✅ |
| `zip` | Chrome distribution zip | ✅ |
| `zip:firefox` | Firefox distribution zip | ✅ |
| `clean` | Clean build artifacts | ✅ |
| `test` | Vitest unit tests | ✅ |
| `test:coverage` | Coverage report | ✅ |
| `test:watch` | Watch mode | ✅ |
| `typecheck` | TypeScript check | ✅ |
| `format` | Biome format | ✅ |
| `lint` / `lint:fix` | Biome lint | ✅ |
| `check` / `check:fix` | Biome check (format + lint) | ✅ |
| `test:e2e` | Playwright E2E | ✅ (local only) |
| `bench` | Benchmark suite | ✅ |

Script coverage is comprehensive. No missing capability.

### TypeScript Config (`tsconfig.json`)

- ✅ `strict: true` — full strict mode.
- ✅ `target: ESNext`, `module: ESNext`, `moduleResolution: Bundler` — correct for WXT/Vite.
- ✅ Path alias `@/*` maps to project root.
- ✅ Includes `.wxt/wxt.d.ts` for generated types.
- ✅ Excludes `.output`, `node_modules`, `tools`.

### TailwindCSS Config (`tailwind.config.ts`)

- ✅ Content paths correctly include `entrypoints/` and `components/`.
- ✅ Full design token system (colors, fonts, sizes, spacing, radii) via CSS variables.
- ✅ Custom animation for capture pulse.
- ✅ `satisfies Config` for type safety.

### PostCSS (`postcss.config.js`)

- ✅ Standard `tailwindcss` + `autoprefixer`. Minimal and correct.

### Biome (`biome.json`)

- ✅ Replaces ESLint + Prettier — single tool, zero config conflicts.
- ✅ VCS integration enabled with `.gitignore` respect.
- ✅ Appropriate rule severities (warn for `noUnusedVariables`, `noExplicitAny`).
- ✅ Excludes `.agents`, `.claude`, `tools` directories.

### Vitest (`vitest.config.ts`)

- ✅ Uses `WxtVitest()` plugin for extension API stubs.
- ✅ Coverage thresholds: 65% statements, 60% branches, 70% functions.
- ✅ E2E directory excluded from unit tests.
- ✅ Coverage scoped to `lib/`, `stores/`, `hooks/` — the testable layers.

### Playwright (`playwright.config.ts`)

- ✅ Headed mode required (extension limitation).
- ✅ Single project: `chrome-extension`.
- ⚠️ No Firefox E2E project configured.

---

## 3. Release Workflow Assessment

### Version Bumping

- Versions are managed manually in `package.json`.
- CHANGELOG follows a clear format: version header, categorized sections (New, Fixed, Under the Hood).
- Tag format: `v*` (e.g., `v0.7.1`).

### Release Flow

1. Developer bumps `version` in `package.json`.
2. Developer pushes a `v*` tag.
3. CI runs all gates + builds both zips.
4. GitHub Release is created with auto-generated notes and both zip artifacts.

**What works well:**
- The release workflow is simple and deterministic.
- CHANGELOG quality is high — detailed, user-facing, well-organized.
- Both browser zips are built from the same commit.

**What could improve:**
- No automated `package.json` version bump script (risk of tag/version mismatch).
- No `npm run release` or `changeset` workflow to automate the bump+tag+push sequence.
- No Chrome Web Store or Firefox AMO auto-submission (e.g., `wxt submit`).

---

## 4. Cross-Browser Support Findings

### Chrome

- ✅ Primary target. Full `sidePanel` API support.
- ✅ `manifest_version: 3` via WXT defaults.
- ✅ CSP configured for Chrome Web Store compliance.
- ✅ `activeTab` permission justified by Chromium issue #40916430 (sidepanels don't receive `activeTab` on action click).

### Firefox

- ✅ Dedicated `dev:firefox`, `build:firefox`, `zip:firefox` scripts.
- ✅ WXT automatically converts `sidePanel` → `sidebar_action` for Firefox.
- ✅ WXT defaults to MV2 for Firefox (per WXT documentation), which is still supported.
- ⚠️ No `browser_specific_settings` with `gecko.id` in manifest — required for AMO submission of MV3 extensions. WXT may handle this internally, but it should be verified.
- ⚠️ No Firefox E2E tests in Playwright config.
- ⚠️ No source archive (`*-sources.zip`) for Firefox AMO review — AMO requires either a sources zip or a link to public source. The release workflow only produces the compiled extension zip.

### WXT Browser Handling

WXT automatically:
- Converts `sidePanel` manifest to `sidebar_action` for Firefox.
- Targets MV3 for Chrome, MV2 for Firefox.
- Handles `chrome.*` / `browser.*` API normalization.

This is correct and requires no additional configuration.

---

## 5. Dependency Health

### Production Dependencies

| Package | Required | Latest | Status |
|---------|----------|--------|--------|
| `react` | `^19.0.0` | 19.2.x | ⚠️ Behind — should widen or pin to `^19.2.0` |
| `react-dom` | `^19.0.0` | 19.2.x | ⚠️ Same as react |
| `zustand` | `^5.0.0` | 5.x | ✅ Current |
| `jszip` | `^3.10.1` | 3.10.x | ✅ Current |
| `papaparse` | `^5.4.1` | 5.x | ✅ Current |
| `tldraw` | `^5.0.1` | 5.x | ✅ Current |

### Dev Dependencies

| Package | Required | Latest | Status |
|---------|----------|--------|--------|
| `wxt` | `^0.20.0` | 0.20.26 | ✅ Within range |
| `@biomejs/biome` | `^2.4.13` | 2.4.x | ✅ Current |
| `vitest` | `^4.1.5` | 4.x | ✅ Current |
| `@vitest/coverage-v8` | `4.1.5` | 4.x | ⚠️ Pinned exact — should use `^4.1.5` to match vitest |
| `typescript` | `^5.7.0` | 5.x | ✅ Current |
| `tailwindcss` | `^3.4.17` | 3.x | ✅ Current (v4 exists but breaking) |
| `@playwright/test` | `^1.59.1` | 1.59.x | ✅ Current |
| `jsdom` | `^29.1.1` | 29.x | ✅ Current |

### Observations

- **React 19.0.0 → 19.2.x:** The semver range `^19.0.0` will resolve to the latest 19.x, so this is safe in practice. However, React 19.2 introduced improvements and a security fix (FormData regression). The lockfile likely has the latest, but the range floor could be raised.
- **`@vitest/coverage-v8` pinned to exact `4.1.5`** while `vitest` uses `^4.1.5`. These should be kept in sync — if vitest updates to 4.2.x in the lockfile, coverage-v8 stays at 4.1.5, which may cause version mismatch issues.
- **No known critical CVEs** in production dependencies.
- **`jpeg-js@0.4.4`** is a devDependency used for test image conversion. No production exposure.
- **TailwindCSS v4** is available but is a breaking migration. v3 is the correct choice for stability.

---

## 6. Findings

### P1 — No Build Verification in CI

**CI runs typecheck, lint, and test, but never runs `pnpm build`.** A broken build (missing imports, asset issues, manifest errors) would not be caught until the release workflow. The release workflow does build (via `zip`), but the failure happens later in the pipeline and provides slower feedback.

**Recommendation:** Add `pnpm build` to `ci.yml` after the test step:
```yaml
- run: pnpm build
```

### P1 — No Firefox Source Archive for AMO

Firefox AMO requires either a `*-sources.zip` or a link to public source code for review. The release workflow only produces the compiled extension zips. Without a source archive, Firefox distribution through AMO will require manual source submission.

**Recommendation:** Add a source archive step to `release.yml`:
```yaml
- run: pnpm zip:firefox -- --src
```
Or use WXT's built-in `wxt zip --browser firefox --src` to produce the sources zip, and include it in the release artifacts.

### P2 — E2E Tests Not Run in CI

Playwright E2E tests exist (`e2e/` directory, 5 spec files) but are not run in any CI workflow. E2E tests are the only way to verify extension loading, sidepanel rendering, and full user flows. Running them locally only means regressions can slip through on PRs.

**Recommendation:** Add an E2E job to `ci.yml`. Extension E2E requires headed mode, which needs a display server on CI:
```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: pnpm/action-setup@v6
      with:
        version: 10
    - uses: actions/setup-node@v5
      with:
        node-version: 22
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - run: pnpm exec playwright install --with-deps chromium
    - run: xvfb-run pnpm test:e2e
```

### P2 — No Automated Store Submission

The release workflow creates a GitHub Release with zip artifacts but does not submit to Chrome Web Store or Firefox AMO. Submission is entirely manual.

**Recommendation:** WXT provides `wxt submit` for automated store submission. Consider adding store credentials as GitHub secrets and adding submission steps to the release workflow:
```yaml
- run: pnpm wxt submit --chrome-zip .output/*-chrome.zip
  env:
    CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
    CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
    CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
    CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
```

### P2 — `@vitest/coverage-v8` Pinned to Exact Version

`@vitest/coverage-v8` is pinned to `"4.1.5"` (exact) while `vitest` uses `"^4.1.5"`. If the lockfile resolves vitest to a newer patch/minor, the coverage provider may be mismatched.

**Recommendation:** Change to `"^4.1.5"` to match the vitest range:
```json
"@vitest/coverage-v8": "^4.1.5"
```

### P3 — No `npm run release` Automation

Version bump → tag → push is a manual process. There's no script to ensure `package.json` version matches the tag, or to validate the CHANGELOG has an entry for the new version.

**Recommendation:** Add a `release` script that bumps the version, verifies CHANGELOG entry, creates the git tag, and pushes:
```json
"release": "wxt zip && echo 'Tag v$(node -p \"require('./package.json').version\") and push to trigger release'"
```
Or adopt a tool like `changesets` for structured version management.

### P3 — `.nvmrc` Contains Only Major Version

`.nvmrc` contains `22` (major only). While `nvm` resolves this to the latest 22.x, it means different developers may get different Node versions.

**Recommendation:** Pin to a specific minor/patch for consistency:
```
22.16.0
```

### P3 — No Firefox E2E Configuration

Playwright config has only a `chrome-extension` project. There's no Firefox E2E project to verify `sidebar_action` behavior, manifest conversion, or browser-specific rendering.

**Recommendation:** Add a Firefox project to `playwright.config.ts` and a corresponding `test:e2e:firefox` script. This validates WXT's automatic sidePanel → sidebar_action conversion.

---

## 7. Recommendations Summary

| Priority | Finding | Effort |
|----------|---------|--------|
| P1 | Add `pnpm build` to CI workflow | Low |
| P1 | Add Firefox source archive to release workflow | Low |
| P2 | Run E2E tests in CI (xvfb-run) | Medium |
| P2 | Add automated store submission (WXT submit) | Medium |
| P2 | Fix `@vitest/coverage-v8` version pin | Trivial |
| P3 | Add release automation script | Low |
| P3 | Pin `.nvmrc` to specific Node version | Trivial |
| P3 | Add Firefox E2E test project | Medium |


**Decision:** Implement all recommendations as flagged.
