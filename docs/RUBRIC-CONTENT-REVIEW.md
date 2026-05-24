# TRUST Rubric Content Review

**Date:** 2026-05-23 | **Rubric version:** 1.1 | **Reviewer:** Automated audit against codebase

---

## 1. Structural Overview

| Aspect | Value |
|---|---|
| Framework | TRUST — UT Embedded Information Services |
| Version | 1.1 |
| Quality gate categories | 3 (Privacy & Security, Intellectual Property, Accessibility) |
| Quality gate questions | 4 (PS1, PS2, IP1, AC1) |
| Scoring categories | 5 (TR, RE, US, SE, TC) |
| Scoring questions | 10 |
| **Total questions** | **14** |
| Data file | `data/rubrics/trust-full.json` |
| Loader | `data/rubrics/index.ts` → `trustFull` export |
| Types | `lib/types.ts` → `RubricData`, `PassFailQuestion`, `ScoringQuestion` |

---

## 2. Quality Gates

### 2.1 Category Map & Codes

| JSON key | Display code | Display label | Questions |
|---|---|---|---|
| `privacy_and_security` | PS | Privacy & Security | 2 |
| `intellectual_property` | IP | Intellectual Property | 1 |
| `accessibility` | AC | Accessibility | 1 |

Code mapping defined in `lib/rubric.ts` → `QG_CATEGORY_CODES`. Labels in `CATEGORY_LABELS`.

### 2.2 Question Inventory

| Code | JSON key | Title | Type | `ai_only` | Has background | Has examples |
|---|---|---|---|---|---|---|
| PS1 | `privacy_and_security.data_privacy` | Data privacy policy | pass_fail | **false** | ✓ | ✓ (pass, fail) |
| PS2 | `privacy_and_security.training_policy` | AI model training policy | pass_fail | **true** | ✓ | ✓ (pass, fail) |
| IP1 | `intellectual_property.ip_preservation` | Intellectual property preservation | pass_fail | **false** | ✓ | ✓ (pass, fail) |
| AC1 | `accessibility.compliance` | Accessibility | pass_fail | **false** | ✓ | ✓ (pass, fail) |

### 2.3 Quality Gate — Detailed Findings

#### PS1 — Data privacy policy
- **Requirement:** Vendor must explicitly state user data is not sold/shared with advertisers or used for profiling.
- **Background:** 3 paragraphs. Covers non-AI tools too. Good guidance on where to look.
- **Examples:** Pass and fail only. No `na` example.
- **Issue [INFO]:** No N/A example. Every other QG question also lacks an N/A example. This is consistent but means reviewers have no guidance for when N/A applies. Consider whether N/A is ever valid here (e.g., tool has no privacy policy at all vs. N/A because it's not web-based).

#### PS2 — AI model training policy
- **Requirement:** Vendor must state user inputs are NOT used to train AI models.
- **`ai_only: true`** — only shown when `usesAi` checkbox is checked.
- **Background:** Good. Explicitly says "This gate applies only to AI-powered tools."
- **Examples:** Pass and fail. No N/A example.
- **Issue [LOW]:** The `ai_only` flag means when `usesAi=false`, this question is auto-N/A'd in the UI. But `computeReportScores` counts it in `totalQGQuestions` regardless, so completion % includes it even when hidden. See §6.3.

#### IP1 — Intellectual property preservation
- **Requirement:** TOS must state user retains full copyright/IP over uploads.
- **Background:** 2 paragraphs. Good detail on TOS sections to review.
- **Examples:** Pass and fail.
- **New in v1.1.** No issues found.

#### AC1 — Accessibility
- **Requirement:** Keyboard nav to all features, 200% zoom, alt text. WCAG 2.1 AA claim is supporting evidence.
- **Background:** Good. Mentions legal requirements (EU, Section 508).
- **Examples:** Pass and fail.
- **Issue [LOW]:** The pass example mentions a footer accessibility statement. The fail example mentions mouse-only controls. Neither tests screen reader compatibility, though the requirement only covers keyboard/zoom/alt-text. Scope is clear but narrow.

### 2.4 Gate Scoring

- Score type: `QualityGateScore = "pass" | "fail" | "na" | "unsure" | ""`
- UI renders 4 radio options: pass, fail, N/A, unsure
- Gate results are **purely informational** — `canExport()` does NOT check gate status
- `computeReportScores` tracks `allPassed`, `anyFail` for report verdict logic
- Report nutrition label surfaces failed/unsure gates under "Quality Gate Issues"

### 2.5 Merged Gates

Two scoring questions have `merged_gate: true`:

| Scoring question | `merged_gate` | Render behavior |
|---|---|---|
| `SE.data_handling` | `true` (linked to `privacy_and_security.data_privacy`) | Shown as read-only badge in QG section |
| `TC.source_attribution_depth` | `true` (no `related_gate` — standalone gate) | Shown as read-only badge in QG section |

**Note:** The v1.0 rubric had a stale `related_gate: "traceability.citation_mechanism"` on TC1, but this was removed during the v1.1 upgrade. Both merged gates function correctly — badges render from the question's own title/code, not from `related_gate`.

**Note:** Merged gates are scored on the 0–3 rubric scale, but displayed in the QG section with pass/fail badges where score > 0 = PASS, score = 0 = FAIL. The `related_gate` field is not consumed by any code — it's documentation-only.

---

## 3. Scoring Rubric

### 3.1 Category Map & Codes

| JSON key | Display code | Full name (principles.ts) | Color | Questions |
|---|---|---|---|---|
| `TR` | TR | Transparency | `#2563eb` | 2 |
| `RE` | RE | Reliability | `#16a34a` | 2 |
| `US` | US | Usability | `#9333ea` | 2 |
| `SE` | SE | Soundness | `#ea580c` | 2 |
| `TC` | TC | Traceability | `#0d9488` | 2 |

Code mapping: `ACCENT_KEYS` in `lib/rubric.ts` maps keys to CSS variable suffixes (`tr`, `re`, `uc`, `se`, `tc`).
Full names: `PRINCIPLES` array in `lib/principles.ts`.
Display labels: `CATEGORY_LABELS` in `lib/rubric.ts` uses format `"XX — FullName"`.

**Issue [INFO]:** `PRINCIPLE_NAMES` (noun: "Transparency", "Reliability", etc.) is distinct from `CATEGORY_LABELS` (adjective phrase: "TR — Transparent"). The nutrition label uses `PRINCIPLE_NAMES`; the evaluation UI uses `getCategoryLabel()` which returns `CATEGORY_LABELS`. Both are correct but the inconsistency is worth noting.

### 3.2 Question Inventory

| Code | JSON key | Title | `ai_only` | `merged_gate` | Has background | Has examples |
|---|---|---|---|---|---|---|
| TR1 | `TR.data_source_clarity` | Data source clarity | false | — | ✓ | ✓ (0,1,2,3) |
| TR2 | `TR.methodology_disclosure` | Methodology disclosure | **true** | — | ✓ | ✓ (0,1,2,3) |
| RE1 | `RE.accuracy_and_hallucination` | Accuracy and hallucination | **true** | — | ✓ | ✓ (0,1,2,3) |
| RE2 | `RE.variance_consistency` | Output consistency | false | — | ✓ | ✓ (0,1,2,3) |
| US1 | `US.workflow_integration` | Workflow integration | false | — | ✓ | ✓ (0,1,2,3) |
| US2 | `US.cognitive_guardrails` | Critical thinking prompts | **true** | — | ✓ | ✓ (0,1,2,3) |
| SE1 | `SE.algorithmic_fairness` | Bibliographic equity & diversity | false | — | ✓ | ✓ (0,1,2,3) |
| SE2 | `SE.data_handling` | Data handling practices | false | **true** | ✓ | ✓ (0,1,2,3) |
| TC1 | `TC.source_attribution_depth` | Source attribution depth | false | **true** | ✓ | ✓ (0,1,2,3) |
| TC2 | `TC.bibliometric_credibility` | Source quality indicators | false | — | ✓ | ✓ (0,1,2,3) |

### 3.3 `ai_only` Distribution

4 of 14 total questions are `ai_only: true`: PS2, TR2, RE1, US2.
When `usesAi=false`, these are auto-set to N/A in the UI and excluded from scoring.

### 3.4 Scoring Scale

All scoring questions use a 0–3 scale:

| Score | Semantic meaning |
|---|---|
| 0 | Worst / absent / non-compliant |
| 1 | Partial / minimal / vague |
| 2 | Good / present / documented |
| 3 | Excellent / comprehensive / verified |

Additional states: `"na"`, `"unsure"`, `""` (unanswered).
Type: `ScoringScore = 0 | 1 | 2 | 3 | "na" | "unsure" | ""`.

### 3.5 Scoring — Detailed Findings

#### TR1 — Data source clarity
- **Background:** Long (4 paragraphs). Good guidance on where to look. Includes explicit clarification distinguishing macro-level scope (TR1) from item-level metadata (TC2).
- **Level descriptors:** Clear escalation from "opaque" → "general types" → "named databases" → "complete list with dates".
- **Examples:** All 4 levels present. Good specificity (e.g., "47 databases with coverage periods").
- **No issues.**

#### TR2 — Methodology disclosure
- **`ai_only: true`.** Only applies to AI tools.
- **Background:** 3 paragraphs. Good plain-language guidance for non-technical reviewers ("Reviewers do not need to verify the mathematics").
- **Level descriptors:** Black box → vague AI claims → names tech + high-level → full pipeline docs.
- **Examples:** All 4 levels. Good concrete examples (T5, BM25, cross-encoder, GPT-4).
- **Issue [INFO]:** Last sentence of background: "This question only applies to AI-powered tools." This is redundant with the `ai_only` flag and UI behavior. Not harmful but slightly verbose.

#### RE1 — Accuracy and hallucination
- **`ai_only: true`.**
- **Background:** Very long. Includes a **5-query testing protocol**: (1) broad conceptual, (2) niche specific, (3) recent research, (4) negative/boundary test, (5) synthesis test.
- **Level descriptors:** Fabricated claims → occasional errors → high accuracy → consistently accurate.
- **Examples:** All 4 levels. Each example is a concrete scenario.
- **No issues.** Well-structured.

#### RE2 — Output consistency
- **`ai_only: false`** — applies to all tools, not just AI.
- **Background:** Explains reproducibility. Distinguishes "surface-level" variation (acceptable) from "substantive" variation (not).
- **Level descriptors:** Core claims change → moderate variation → consistent core → highly reproducible.
- **Examples:** All 4 levels.
- **Issue [LOW]:** For non-AI tools (e.g., traditional database search), "output consistency" is trivially score=3 since deterministic queries return deterministic results. The question is most meaningful for AI tools. Consider making this `ai_only: true` as well, or clarify what "consistency" means for non-AI tools (e.g., index update frequency causing result drift).

#### US1 — Workflow integration
- **`ai_only: false`.**
- **Background:** Explains export formats, reference manager integrations, API.
- **Level descriptors:** Siloed → copy-paste → RIS/BibTeX → seamless integration.
- **Examples:** All 4 levels.
- **No issues.**

#### US2 — Critical thinking prompts
- **`ai_only: true`.**
- **Background:** Explains passive acceptance risk. Good framing.
- **Level descriptors:** Authoritative facts → generic disclaimer → source material surfaced → active verification prompts.
- **Examples:** All 4 levels.
- **No issues.**

#### SE1 — Bibliographic equity & diversity
- **`ai_only: false`.** Renamed from "Algorithmic fairness" in v1.1.
- **JSON key remains `algorithmic_fairness`** — preserved for data compatibility.
- **Background:** Covers language/region/venue bias. Good.
- **Level descriptors:** Systematically skewed → acknowledges but no evidence → demonstrates diversity → diversity + transparency reports.
- **Examples:** All 4 levels.
- **No issues.**

#### SE2 — Data handling practices
- **`merged_gate: true`.** Related gate: `privacy_and_security.data_privacy`.
- **`related_gate` field is present and valid.**
- **Background:** 2 paragraphs. Clarifies distinction from PS1 quality gate.
- **Level descriptors:** Vague/missing → generic statements → states retention + encryption → comprehensive docs.
- **Examples:** All 4 levels.
- **Issue [INFO]:** As a merged gate, this question appears twice in the UI: (1) in the Scoring Rubric section as a full 0–3 question, and (2) in the Quality Gates section as a read-only badge reflecting the score. This is by design.

#### TC1 — Source attribution depth
- **`merged_gate: true`.** No `related_gate` field (removed in v1.1).
- **Background:** 2 paragraphs. Good explanation of citation granularity.
- **Level descriptors:** Broken/missing → journal landing page → abstract deep link → paragraph deep link (RAG).
- **Examples:** All 4 levels.

#### TC2 — Source quality indicators
- **`ai_only: false`.**
- **Background:** 3 paragraphs. Includes explicit clarification distinguishing item-level metadata enrichment (TC2) from macro-level scope (TR1). Good cross-reference.
- **Level descriptors:** Retracted sources without warning → no quality labeling → categorized by type → contextual quality indicators.
- **Examples:** All 4 levels. Mentions Beall's list, Semantic Scholar citation counts.
- **No issues.**

---

## 4. Metadata Fields

### 4.1 Session Creation (NewSessionModal)

| Field | Type | Required | Source |
|---|---|---|---|
| Tool Name | `string` | **yes** | Auto-prefilled from tab title |
| Tool URL | `string` | **yes** | Auto-prefilled from tab URL |
| Tool uses AI / LLM | `boolean` | no (defaults `true`) | Checkbox |

Set on creation: `id` (UUID), `startTime` (ISO), `rubricId` ("trust-full"), `status` ("started"), `faviconUrl` (from tab).

### 4.2 Metadata Tab Fields

| Field | Type | Input style | Source |
|---|---|---|---|
| Review Notes | `string?` | Textarea | Free text |
| Tool uses AI / LLM | `boolean?` | Checkbox | Toggle (defaults `true`) |
| Tool Description | `string?` | Text input | Free text |
| Company | `string?` | Text input | Free text |
| Tool Logo URL | `string?` | Text input + capture button | Capture or paste |
| Pricing | `string?` | Text input | Free text |
| Access Level | `string?` | Text input | Free text |
| Terms & Conditions | `string?` | Text input + capture button | Capture or paste |
| Data Sources | `string[]?` | Multi-select pills + custom | 11 predefined options |
| Search Methods | `string[]?` | Multi-select pills + custom | 6 predefined options |
| Discipline | `string[]?` | Multi-select pills + custom | 31 predefined options |
| Authentication Method | `string?` | Single-select pills | 8 predefined options |

### 4.3 Data Source Options (11)

CrossRef, OpenAlex, OpenCitations, DataCite, Scopus, Web of Science, PubMed, Semantic Scholar, Google Scholar, IEEE Xplore, JSTOR.

Custom entries allowed.

### 4.4 Search Method Options (6)

Keywords, Semantic search, Boolean queries, Natural language, Citation chaining, Faceted filtering.

Custom entries allowed.

### 4.5 Discipline Options (31)

**Humanities subcategories (6, new in v1.1):** History and Archaeology, Languages and Literature, Philosophy and Ethics, Performing Arts, Visual Arts and Design, Religious Studies.

**STEM/Social Sciences (25):** Agricultural and Biological Sciences, Biochemistry Genetics and Molecular Biology, Business Management and Accounting, Chemical Engineering, Chemistry, Computer Science, Decision Sciences, Dentistry, Earth and Planetary Sciences, Economics Econometrics and Finance, Energy, Engineering, Environmental Science, Health Professions, Immunology and Microbiology, Materials Science, Mathematics, Medicine, Neuroscience, Nursing, Pharmacology Toxicology and Pharmaceutics, Physics and Astronomy, Psychology, Social Sciences, Veterinary.

**Issue [LOW]:** "Social Sciences" is a single entry covering sociology, political science, anthropology, law, education, etc. Similarly compressed compared to the 6 humanities entries. The Elsevier-based taxonomy is inherently uneven.

Custom entries allowed.

### 4.6 Authentication Method Options (8)

SSO/SAML, IP Authentication, OpenAthens, Proxy (EZproxy), LibKey, Email-only, API Key, None required.

Single-select only. Clicking selected option deselects it (sets `undefined`).
No custom entries.

### 4.7 Finalization Fields

| Field | Type | Required |
|---|---|---|
| Overall Grade | `"pass" \| "conditional" \| "fail"` | **yes** (to save) |
| Conclusion | `string` | no |
| Strengths | `string[]` | no |
| Weaknesses | `string[]` | no |
| Recommendations | `string` | no |

Autosaved as draft (50ms debounce). Formal "Lock & Finalize" sets `finalizedAt` timestamp.

---

## 5. Scoring & Verdict Logic

### 5.1 Principle Averages

`principleAverage()` in `lib/rubric.ts`:
- Iterates all questions in a scoring category.
- Only numeric scores (0–3) contribute to sum and count.
- `"na"`, `"unsure"`, `""`, and `undefined` are excluded from both numerator and denominator.
- Returns `null` if all questions are excluded (no numeric scores).

### 5.2 Overall Score

`computeReportScores()` in `lib/report/compute-scores.ts`:
- `totalActual` = sum of all numeric scores across all 5 categories.
- `totalMax` = count of numeric scores × 3.
- `ratio = totalActual / totalMax`.
- "na" and "unsure" excluded from both numerator and denominator.

### 5.3 Verdict Logic

Priority order:

1. **Finalized** → Uses reviewer's grade: `pass`→RECOMMENDED, `conditional`→CAUTION, `fail`→NOT RECOMMENDED.
2. **No evaluation** → "NOT EVALUATED" (grey).
3. **Incomplete** → "INCOMPLETE" (grey). Incomplete = answered < total.
4. **Computed** → `computedFailed ? "NOT RECOMMENDED" : "RECOMMENDED"`.

`computedFailed` is true if ANY of:
- `anyFail` = at least one QG question scored "fail"
- `ratio < 0.6` (below 60% of max)
- `principleFail` = any principle's average < 1.0

### 5.4 Score Circles (Nutrition Label)

`scoreCircles()` uses half-integer thresholds:
- 0 circles: avg < 0.5
- 1 circle: avg < 1.5
- 2 circles: avg < 2.5
- 3 circles: avg < 3.0 (but ≥ 2.5)
- 4 circles: avg ≥ 3.0

**Issue [INFO]:** The "4 circles" path (`avg >= 3`) is effectively the same as "3 circles" since the max score per question is 3 and averages cannot exceed 3. It will only show if all questions in a category score exactly 3. This is by design — a "perfect score" indicator.

### 5.5 Completion Tracking

- `totalQuestions` = scoring questions + QG questions = 14.
- `answeredQuestions` = questions with any non-empty score (including "na" and "unsure").
- `isComplete` = `answeredQuestions >= totalQuestions`.

**Issue [P2 — COMPLETION COUNT INCLUDES HIDDEN QUESTIONS]:** When `usesAi=false`, 4 `ai_only` questions are auto-N/A'd in the UI. But `totalQuestions` still counts 14. This means completion shows as e.g. "14/14" even though the user only interacted with 10. Conversely, if the auto-N/A hasn't fired yet, completion could show "10/14". The `Metadata.tsx` `clearAiOnlyScores()` function handles this on toggle, but the count itself is potentially confusing.

---

## 6. Export & Report Rendering

### 6.1 HTML Report Structure

`buildHtmlReport()` produces a self-contained HTML page with:

1. **Nutrition Label** — compact summary card
2. **Report Header** — tool name, URL, description, data sources, search methods, discipline, notes
3. **Table of Contents** — links to each scoring category
4. **Quality Gates Table** — code, result badge, requirement, notes + expandable background/examples
5. **Category Sections** — per-principle: header (code, name, score/avg/evidence count, distribution bar), then question rows (code, score badge, level description, notes) + expandable background/examples + evidence screenshots
6. **Finalization Section** — verdict bar, conclusion, strengths, weaknesses, recommendations
7. **Unlinked Evidence** — captures not linked to any question

### 6.2 Nutrition Label

Compact card showing:
- Tool name + logo + URL
- Verdict stamp (RECOMMENDED / CAUTION / NOT RECOMMENDED / INCOMPLETE / NOT EVALUATED)
- Completion count (e.g., "14/14 questions answered")
- Failed/unsure quality gate items
- 5 principle columns with score circles
- Overall score circle
- Strengths/weaknesses split
- LISA-EIS / UT branding footer

### 6.3 CSV Export

3 normalized CSVs in ZIP:
- `metadata.csv` — session metadata fields
- `evaluations.csv` — rubricId, score, notes per question
- `captures.csv` — capture ID, URL, title, notes

### 6.4 Rendering — Findings

**Resolved:** The report header now renders `company`, `pricing`, `availability`, `termsConditionsUrl`, `authenticationMethod`, and `usesAi`. All six fields were added in commit `5909018`.

---

## 7. Cross-Reference: Where Data Flows

### 7.1 Question Data Flow

```
trust-full.json
  ↓ (loaded by data/rubrics/index.ts)
  ↓
components/QuestionSection.tsx  → Renders questions in Evaluation tab
components/Evaluation.tsx       → Progress bar, category summary, tab shell
stores/session.ts               → evaluations: Evaluation[]
  ↓
lib/rubric.ts                   → Scoring functions (averages, completion, gate results)
lib/report/compute-scores.ts    → Verdict, ratio, principle fail detection
lib/html-report.ts              → HTML report generation
lib/export.ts                   → ZIP export (HTML + CSVs)
```

### 7.2 Metadata Data Flow

```
components/NewSessionModal.tsx  → Creates SessionMetadata (name, url, usesAi, favicon)
components/Metadata.tsx         → Edits all metadata fields
stores/session.ts               → metadata: SessionMetadata
  ↓
lib/html-report.ts              → Report header (partial fields only)
lib/export.ts                   → CSV export
```

### 7.3 Fields Rendered in Report vs. Collected

| Field | Collected | Report header | CSV export |
|---|---|---|---|
| toolName | ✓ | ✓ | ✓ |
| toolUrl | ✓ | ✓ | ✓ |
| description | ✓ | ✓ | ✓ |
| company | ✓ | ✗ | ✓ |
| pricing | ✓ | ✗ | ✓ |
| availability | ✓ | ✗ | ✓ |
| termsConditionsUrl | ✓ | ✗ | ✓ |
| dataSources | ✓ | ✓ | ✓ |
| searchMethods | ✓ | ✓ | ✓ |
| discipline | ✓ | ✓ | ✓ |
| authenticationMethod | ✓ | ✗ | ✓ |
| usesAi | ✓ | ✗ | ✓ |
| notes | ✓ | ✓ | ✓ |
| toolLogoUrl | ✓ | ✓ (logo img) | ✓ |
| faviconUrl | ✓ | fallback logo | ✓ |
| startTime | ✓ | ✓ | ✓ |
| finalizedAt | ✓ | ✓ (footer) | ✓ |

---

## 8. Consolidated Issue List

### P1 — Must Fix

| # | Location | Issue |
|---|---|---|
| ~~1~~ | ~~`TC.source_attribution_depth.related_gate`~~ | **Resolved:** Stale reference was removed during v1.1 upgrade. No action needed. |

### P2 — Should Fix

| # | Location | Issue |
|---|---|---|
| 2 | `computeReportScores` / UI completion counter | `totalQuestions` counts all 14 questions including `ai_only` ones. When `usesAi=false`, 4 questions are hidden but still counted toward total. Completion display may be confusing ("10/14" when user answered all visible questions). |

### LOW — Nice to Fix

| # | Location | Issue |
|---|---|---|
| 3 | `RE.variance_consistency` | `ai_only: false` but question is most meaningful for AI tools. Non-AI deterministic search trivially scores 3. Consider `ai_only: true` or clarify scope for non-AI. |
| 4 | ~~`lib/html-report.ts`~~ | **Resolved:** `authenticationMethod` is now rendered in the HTML report header. |
| 5 | All QG questions | No N/A examples in any quality gate question. Reviewers have no guidance for when N/A applies. |
| 6 | Discipline options | "Social Sciences" is a single monolithic entry; humanities got 6 subcategories in v1.1 but social sciences remains compressed. |

### INFO — No Action Needed

| # | Location | Note |
|---|---|---|
| 7 | `PRINCIPLE_NAMES` vs `CATEGORY_LABELS` | Nouns vs adjective phrases ("Transparency" vs "TR — Transparent"). Both correct, used in different contexts. |
| 8 | TR2 background | Redundant "This question only applies to AI-powered tools" when `ai_only` flag handles this. |
| 9 | SE2 / TC1 merged gates | Appear in both Scoring Rubric (interactive) and QG section (read-only badge). By design. |
| 10 | ~~Report header~~ | **Resolved:** `company`, `pricing`, `availability`, `termsConditionsUrl`, `usesAi` are now rendered in the report header. |
| 11 | Score circles 4th position | Only fills when all questions score exactly 3 (perfect score indicator). By design. |
