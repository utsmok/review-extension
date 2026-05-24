# Review: Documentation Quality, Commit Structure & Infrastructure

**Reviewer:** 49-ReviewDocsAndCommits | **Date:** 2026-05-24 | **Scope:** v0.3.0..HEAD (16 commits)

---

## Summary

The 16 commits since v0.3.0 are well-structured with atomic conventional-commit messages. Infrastructure changes are clean. However, the two new documentation files contain **significant factual inaccuracies** that would mislead external reviewers. `REVIEW-FIELDS-OVERVIEW.md` was written against the v1.0 rubric structure and not updated for v1.1 changes. `RUBRIC-CONTENT-REVIEW.md` contains a false P1 finding and several inaccurate cross-reference claims. Both docs will rot quickly due to missing versioning metadata.

---

## Findings

### D-01. REVIEW-FIELDS-OVERVIEW.md references stale rubric v1.0 — P2

**Location:** `docs/REVIEW-FIELDS-OVERVIEW.md` line 8

**Severity:** P2 | **Confidence:** 1.0

The header states `trust-full v1.0` but the actual rubric in `data/rubrics/trust-full.json` is version `1.1` (upgraded in commit `caf0ad4`). This cascades into every downstream claim in the document.

```
> **Framework**: TRUST — UT Embedded Information Services (`trust-full` v1.0)
```

**Recommendation:** Update to `v1.1`.

---

### D-02. REVIEW-FIELDS-OVERVIEW.md lists only 2 quality gate questions (actual: 4) — P1

**Location:** `docs/REVIEW-FIELDS-OVERVIEW.md` lines 51–56

**Severity:** P1 | **Confidence:** 1.0

The condensed overview and detailed section D.1 show only 2 QG questions (PS1 "Training policy", AC1 "Accessibility") across 2 categories. The actual v1.1 rubric has **4 QG questions across 3 categories**:

| Actual code | Title | ai_only |
|---|---|---|
| PS1 `data_privacy` | Data privacy policy | false |
| PS2 `training_policy` | AI model training policy | true |
| IP1 `ip_preservation` | Intellectual property preservation | false |
| AC1 `compliance` | Accessibility | false |

The doc misses PS2 (data privacy — new in v1.1), the entire `intellectual_property` category with IP1 (new in v1.1), and incorrectly labels PS1 as "Training policy" with `ai_only: true` (that's actually PS2). The detailed section D.1.1 compounds this by showing PS1 with PS2's requirement text.

**Root cause:** Document was written against v0.3.0 rubric (v1.0) which only had 2 QG questions (`training_policy`, `compliance`). It was not updated after the v1.1 rubric upgrade (commit `caf0ad4`) which split privacy into two questions and added the IP gate.

---

### D-03. REVIEW-FIELDS-OVERVIEW.md omits Authentication Method metadata field — P2

**Location:** `docs/REVIEW-FIELDS-OVERVIEW.md` lines 17–28 (condensed overview), section C

**Severity:** P2 | **Confidence:** 1.0

The condensed overview lists 9 metadata fields (ending at Discipline with "26 predefined"). The detailed section C goes from C.11 (Discipline) to C.12 (Read-only summary), skipping Authentication Method. This is a new v1.1 field:

- Added to `SessionMetadata` type in `lib/types.ts` (commit `caf0ad4`)
- Rendered as single-select pill selector in `components/Metadata.tsx` with 8 options: SSO/SAML, IP Authentication, OpenAthens, Proxy (EZproxy), LibKey, Email-only, API Key, None required
- Rendered in HTML report (commit `5909018`)
- Exported in CSV

**Recommendation:** Add C.12 Authentication Method between current C.11 and C.12, renumber subsequent sections.

---

### D-04. REVIEW-FIELDS-OVERVIEW.md states wrong discipline count (26, actual: 34) — P2

**Location:** `docs/REVIEW-FIELDS-OVERVIEW.md` line 27

**Severity:** P2 | **Confidence:** 1.0

States "Multi-select from 26 predefined + freeform". The actual `DISCIPLINE_OPTIONS` array in `components/Metadata.tsx` has **34 entries**. Eight entries were added in v1.1: 6 humanities subcategories (History and Archaeology, Languages and Literature, Philosophy and Ethics, Performing Arts, Visual Arts and Design, Religious Studies) replacing the old "Arts and Humanities" single entry, plus 3 new social science entries (Education and Educational Research, Law Policy and Criminology, Political Science and International Relations, Sociology Anthropology and Social Work).

---

### D-05. RUBRIC-CONTENT-REVIEW.md reports false P1 finding (stale related_gate) — P2

**Location:** `docs/RUBRIC-CONTENT-REVIEW.md` §2.5 and consolidated issue list §8

**Severity:** P2 | **Confidence:** 1.0

The document reports as its **only P1 issue**:

> `TC.source_attribution_depth` has `"related_gate": "traceability.citation_mechanism"`. The `traceability` category no longer exists.

This is **factually incorrect**. The current v1.1 rubric JSON does not contain a `related_gate` field on TC1 at all — verified by `Object.keys()` on the JSON object returning only `['0','1','2','3','title','background','examples','ai_only','merged_gate']`. The stale reference existed in v0.3.0 (v1.0) and was cleaned up in the v1.1 upgrade (commit `caf0ad4`).

**Impact:** External reviewers following this doc would investigate a non-existent bug. The P1 severity rating in the consolidated issue list is based on a false premise.

---

### D-06. RUBRIC-CONTENT-REVIEW.md incorrectly states report doesn't render 6 metadata fields — P2

**Location:** `docs/RUBRIC-CONTENT-REVIEW.md` §6.4, §7.3

**Severity:** P2 | **Confidence:** 1.0

The cross-reference table in §7.3 and findings in §6.4 state that `company`, `pricing`, `availability`, `termsConditionsUrl`, `authenticationMethod`, and `usesAi` are NOT rendered in the HTML report header (marked with ✗). In reality, all six were added to `lib/html-report.ts` in commit `5909018`, which is part of this same commit series. The doc was likely written from code inspection before that commit was included.

Specific false claims:
- §6.4 LOW finding: "`authenticationMethod` was added in v1.1 but is not rendered in the HTML report" — It IS rendered
- §6.4 INFO finding: "The report header does NOT display: company, pricing, availability, termsConditionsUrl, authenticationMethod, usesAi" — All ARE displayed
- §7.3 table: 6 rows show ✗ for "Report header" column — All should be ✓

---

### D-07. RUBRIC-CONTENT-REVIEW.md states wrong discipline count (31, actual: 34) — P3

**Location:** `docs/RUBRIC-CONTENT-REVIEW.md` §4.5

**Severity:** P3 | **Confidence:** 1.0

Claims "31 predefined" options broken down as "6 humanities + 25 STEM/Social Sciences". The actual count is 34. The STEM list in the doc omits: Education and Educational Research, Law Policy and Criminology, Political Science and International Relations, Sociology Anthropology and Social Work — all present in `DISCIPLINE_OPTIONS`.

---

### D-08. CHANGELOG.md not updated for post-v0.3.0 changes — P2

**Location:** `CHANGELOG.md`

**Severity:** P2 | **Confidence:** 1.0

The CHANGELOG covers v0.3.0 (2026-05-22) as the latest entry. Since then, 16 commits added significant features: rubric v1.1 upgrade, image compression, dynamic completion denominator, procurement/access metadata rendering, UX audit fixes, and the new documentation. A v0.3.1 (or v0.4.0) entry should be added before release.

---

### D-09. Neither doc has versioning metadata for freshness — P3

**Location:** `docs/REVIEW-FIELDS-OVERVIEW.md`, `docs/RUBRIC-CONTENT-REVIEW.md`

**Severity:** P3 | **Confidence:** 1.0

`REVIEW-FIELDS-OVERVIEW.md` has no date, no git ref, and references the wrong rubric version. `RUBRIC-CONTENT-REVIEW.md` has a date (2026-05-23) but no "verified against" git commit or rubric version beyond the header. Both documents describe a data structure (rubric JSON, component props) that changes frequently — without a git ref, readers cannot tell when the doc was last accurate.

**Recommendation:** Add a header like `Verified against: v0.3.0..HEAD (commit <hash>)` to both docs.

---

## Documentation Quality Assessment

| Aspect | REVIEW-FIELDS-OVERVIEW.md | RUBRIC-CONTENT-REVIEW.md |
|---|---|---|
| Accuracy | **Poor** — written against v1.0 rubric, 4 major factual errors | **Mixed** — P1 finding is false, report rendering claims outdated, but most question-level analysis is correct |
| Completeness | **Incomplete** — missing 2 QG questions, entire IP category, authentication method field | **Good** — covers all questions, scoring logic, export rendering, cross-references |
| Freshness | **Poor** — no date, wrong version | **Fair** — dated but no git ref; already inaccurate after 1 day |
| Usefulness | **High potential** — excellent structure, just needs v1.1 update | **High** — actionable issue list (once false P1 is corrected) |

---

## Commit Quality Assessment

### Positive observations

1. **Atomic commits.** Each commit addresses a single concern. No commit mixes unrelated feature work with style or test changes.
2. **Conventional commits.** All 16 messages follow `type(scope): description` format consistently. Scopes are accurate.
3. **Logical ordering.** Foundation changes (design tokens, CSS) come first, then feature work (rubric, capture), then tests, then documentation. Any commit could be cherry-picked independently.
4. **Good commit bodies.** Commits with complex changes (e.g., `88fff9f`, `5ac711c`, `caf0ad4`) include bullet-point bodies explaining what changed and why.
5. **Style-only commits are pure.** Import sorting (`2d3f8d1`, `06ea037`) and CSS reformatting (`9c75e1e`) contain no behavioral changes.

### Minor observations

- `91bbc16` (test lint fixes) precedes `caf0ad4` (rubric v1.1 upgrade). The lint fixes address pre-existing warnings unrelated to the rubric changes. Clean ordering.
- `5909018` (report rendering) comes after `72cecf7` (UX fixes) but before test updates. This is fine — the report rendering is independent of the UI changes.

### No issues found with commit structure.

---

## Positive Observations

1. **`review-context.md`** is accurate and well-organized. All claims verified against code: 14 questions, v1.1, usesAi toggle, merged gates, image compression strategy.
2. **Commit `d0c19b9`** correctly places documentation as the final commit in the series, after all code changes.
3. **`vitest.bench.config.ts`** change is purely cosmetic (import ordering) — no behavioral impact on benchmark configuration.
4. **The RUBRIC-CONTENT-REVIEW.md per-question analysis** (§3.5) is thorough and mostly accurate at the individual question level. The background text, level descriptors, and example coverage are correctly documented.
5. **Both docs use excellent structure** — tables, cross-references, data flow diagrams. The REVIEW-FIELDS-OVERVIEW.md in particular would be an outstanding reference once the factual errors are corrected.
