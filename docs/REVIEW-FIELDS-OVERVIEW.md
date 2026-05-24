# TRUST Review Extension — Fields, Questions & Choices Overview

> **Purpose**: Stand-alone reference for external developers to review every user-facing field, question, and choice in the TRUST review workflow, including where each is defined and how answers flow through the system.
>
> **Source**: Extracted entirely from the codebase. No external interpretation added.
>
> **Framework**: TRUST — UT Embedded Information Services (`trust-full` v1.0)

---

## Condensed Overview

A review session has four tabs, presented in a sidebar panel (Chrome sidePanel). The user encounters fields and questions in this order:

### 1. Settings (pre-session, global)
| Field | Type | Scope |
|---|---|---|
| Reviewer Name | Free text | Global (persists across sessions) |
| Reviewer Email | Free text | Global (persists across sessions) |

### 2. New Review Modal (session creation)
| Field | Type | Required | Notes |
|---|---|---|---|
| Tool Name | Free text | Yes | Auto-prefilled from active tab title |
| Tool URL | URL | Yes | Auto-prefilled from active tab URL |
| Tool uses AI / LLM | Checkbox (default: checked) | No | When unchecked, AI-only questions auto-scored N/A |

### 3. Metadata Tab — "Tool Details"
| Field | Type | Required | Notes |
|---|---|---|---|
| Review Notes | Multiline text | No | General observations; also populated by Quick Notes |
| Tool uses AI / LLM | Checkbox | No | Mirrors the session-creation value; can be toggled later |
| Tool Description | Single-line text | No | One-line summary of the tool |
| Company | Single-line text | No | e.g. "Elsevier" |
| Tool Logo URL | Capture-based | No | Screenshot + extracted logo URL via "Capture Page" button |
| Pricing | Single-line text | No | e.g. "Freemium, Subscription" |
| Access Level | Single-line text | No | e.g. "Institutional license required" |
| Terms & Conditions | Capture-based (multi) | No | Page captures with per-capture notes |
| Data Sources | Pill selector + custom | No | Multi-select from 11 predefined + freeform |
| Search Methods | Pill selector + custom | No | Multi-select from 6 predefined + freeform |
| Discipline | Pill selector + custom | No | Multi-select from 26 predefined + freeform |

### 4. Evaluation Tab
Two sections — **Quality Gates** (pass/fail) and **Scoring Rubric** (0–3 scale).

**Quality Gates** (2 questions across 2 categories):
| Code | Category | Title | Choices |
|---|---|---|---|
| PS1 | Privacy & Security | Training policy | ✓ Pass / ✗ Fail / — N/A / ? Unsure |
| AC1 | Accessibility | Accessibility | ✓ Pass / ✗ Fail / — N/A / ? Unsure |

**Scoring Rubric** (10 questions across 5 TRUST principles):
| Code | Principle | Title | Choices |
|---|---|---|---|
| TR1 | TR — Transparent | Data source clarity | 0 / 1 / 2 / 3 / N/A / Unsure |
| TR2 | TR — Transparent | Methodology disclosure | 0 / 1 / 2 / 3 / N/A / Unsure |
| RE1 | RE — Reliable | Accuracy and hallucination | 0 / 1 / 2 / 3 / N/A / Unsure |
| RE2 | RE — Reliable | Output consistency | 0 / 1 / 2 / 3 / N/A / Unsure |
| US1 | US — User-Centric | Workflow integration | 0 / 1 / 2 / 3 / N/A / Unsure |
| US2 | US — User-Centric | Critical thinking prompts | 0 / 1 / 2 / 3 / N/A / Unsure |
| SE1 | SE — Sound | Algorithmic fairness | 0 / 1 / 2 / 3 / N/A / Unsure |
| SE2 | SE — Sound | Data handling practices | 0 / 1 / 2 / 3 / N/A / Unsure |
| TC1 | TC — Traceable | Source attribution depth | 0 / 1 / 2 / 3 / N/A / Unsure |
| TC2 | TC — Traceable | Source quality indicators | 0 / 1 / 2 / 3 / N/A / Unsure |

Each question also has: notes (free text), evidence linking (0+ captures), and an optional custom score with reasoning.

### 5. Finalize Tab
| Field | Type | Required |
|---|---|---|
| Overall Grade | 3-way selector (Pass / Conditional / Fail) | Yes |
| Conclusion | Multiline text | No |
| Strengths | Editable bullet list (add/edit/remove items) | No |
| Weaknesses | Editable bullet list (add/edit/remove items) | No |
| Recommendations | Multiline text | No |

### 6. Captures Tab
Not a form per se — a gallery/grid of screenshot evidence. Each capture has:
- Screenshot thumbnail (auto-captured)
- Page title and URL (auto-populated)
- Notes (free text, editable)
- Rubric tag linking (checkboxes per question)
- Annotate action (opens EvidenceModal)
- Delete action

---

## Detailed Sections

---

### A. Settings (Global)

**Location**: `components/SettingsScreen.tsx` · stored in `stores/registry.ts` → `Settings` interface.

These fields are set once and persist across all sessions. They are included in exported reports.

#### A.1 Reviewer Name
- **Type**: Free text (`<input>`)
- **Placeholder**: "Reviewer name"
- **Usage**: Included in exported HTML report and session metadata. Displayed in the setup banner prompt if empty (banner dismissible).

#### A.2 Reviewer Email
- **Type**: Email (`<input type="email">`)
- **Placeholder**: "email@example.com"
- **Usage**: Included in exported HTML report.

#### A.3 Preferred Rubric
- **Type**: Hardcoded default `"trust-full"` in `stores/registry.ts` initial state
- **Not user-editable** in the current UI (no selector rendered)

#### A.4 Setup Banner Dismissed
- **Type**: Boolean flag, set when user clicks dismiss on the "Set up your reviewer name" banner
- **Default**: `false` (not dismissed)
- **Condition**: Banner shown only when `reviewerName === "" && !bannerDismissed`

---

### B. New Review Modal (Session Creation)

**Location**: `components/NewSessionModal.tsx`.

#### B.1 Tool Name
- **Type**: Free text (`<input>`, required)
- **Placeholder**: "e.g. Semantic Scholar"
- **Auto-prefill**: Yes — from `document.title` of the active browser tab via `captureCurrentPageInfo()`
- **Validation**: `toolName.trim()` must be non-empty to submit
- **Storage**: `SessionMetadata.toolName`
- **Usage**: Displayed in session header, session list, export filename, HTML report title, CSV `Tool_Name`

#### B.2 Tool URL
- **Type**: URL (`<input type="url">`, required)
- **Placeholder**: "https://..."
- **Auto-prefill**: Yes — from `location.href` of the active browser tab
- **Validation**: `toolUrl.trim()` must be non-empty to submit
- **Storage**: `SessionMetadata.toolUrl`
- **Usage**: Displayed as hostname link in session header. Exported as `Tool_URL` in CSV. Used in `canExport()` check (warns if missing). Completes the "Metadata" tab indicator.

#### B.3 Tool Uses AI / LLM
- **Type**: Checkbox (default: checked)
- **Tooltip**: "Mark whether the tool uses AI or LLMs. If unchecked, AI-specific questions will be marked as not applicable."
- **Storage**: `SessionMetadata.usesAi`
- **Behavior when unchecked**: All rubric questions with `ai_only: true` are automatically scored N/A (grayed out, disabled, opacity reduced). A message appears: "AI-specific questions are marked as not applicable."
- **Propagation**: The `usesAi` value flows through `RubricContext` (`lib/contexts.tsx`) to all evaluation components.

#### B.4 Auto-captured fields (not user-editable in modal)
These are set automatically during session creation and not shown in the modal form:
- **ID**: UUID v4 (`uuid()`), stored as `SessionMetadata.id`
- **Start Time**: `new Date().toISOString()`, stored as `SessionMetadata.startTime`
- **Rubric ID**: Hardcoded `"trust-full"`, stored as `SessionMetadata.rubricId`
- **Status**: Hardcoded `"started"`, stored as `SessionMetadata.status`
- **Favicon URL**: From browser tab, stored as `SessionMetadata.faviconUrl` (optional)

---

### C. Metadata Tab — "Tool Details"

**Location**: `components/Metadata.tsx`. All fields update `SessionMetadata` via `updateMetadata()` (shallow merge in `stores/session.ts`).

#### C.1 Review Notes
- **Type**: Multiline text (`<textarea>`, 3 rows)
- **Placeholder**: "General observations, context..."
- **Storage**: `SessionMetadata.notes`
- **Additional input method**: "Quick Note" button in the session header appends timestamped entries: `[HH:MM] note text`
- **Usage**: Exported as `Notes` in `session_metadata.csv`. Included in HTML report.

#### C.2 Tool Uses AI / LLM (mirror)
- **Type**: Checkbox (default: `true`)
- **Same as B.3** but editable after session creation on the Metadata tab
- **Display**: When unchecked, shows info text "AI-specific questions are marked as not applicable."

#### C.3 Tool Description
- **Type**: Single-line text (`<input>`)
- **Placeholder**: "e.g. Citation-based searching through a visual interface"
- **Storage**: `SessionMetadata.description`
- **Usage**: Exported as `Tool_Description` in CSV. Included in HTML report. Used in redirect logic: if `description` is empty AND `dataSources` is empty on first open, user is redirected to Metadata tab.

#### C.4 Company
- **Type**: Single-line text (`<input>`)
- **Placeholder**: "e.g. Elsevier"
- **Storage**: `SessionMetadata.company`
- **Usage**: Exported as `Company` in CSV.

#### C.5 Tool Logo URL
- **Type**: Capture-based — not a text input. A "Capture Page" button captures the current browser tab and extracts the logo.
- **Capture button**: Calls `captureForMetadataField("toolLogoUrl")`, which returns `{ capture, logoUrl }`
- **Storage**: `SessionMetadata.toolLogoUrl` — stores the extracted logo image URL (SVG/PNG data URL or page URL)
- **Linked capture**: Stored as a `Capture` with `metadataField = "toolLogoUrl"`. Displayed inline with the source URL, a preview image (24×24px), and a remove button.
- **Quick action**: Also available as "Capture Logo" button in the session header bar.

#### C.6 Pricing
- **Type**: Single-line text (`<input>`)
- **Placeholder**: "e.g. Freemium, Subscription"
- **Storage**: `SessionMetadata.pricing`
- **Usage**: Exported as `Pricing` in CSV.

#### C.7 Access Level
- **Type**: Single-line text (`<input>`)
- **Placeholder**: "e.g. Institutional license required"
- **Storage**: `SessionMetadata.availability`
- **Usage**: Exported as `Availability` in CSV.

#### C.8 Terms & Conditions
- **Type**: Capture-based (multi-capture). A "Capture Page" button captures the current browser tab.
- **Capture button**: Calls `captureForMetadataField("termsConditionsUrl")`
- **Each capture shows**:
  - Source URL as a link
  - Page title
  - Notes field (free text, per-capture, placeholder: "Describe this evidence...")
  - Remove button
- **Storage**: Captures stored with `metadataField = "termsConditionsUrl"`. `SessionMetadata.termsConditionsUrl` updated to the captured page URL via Quick Action in header.
- **Quick action**: Also available as "Capture T&C" button in the session header bar.

#### C.9 Data Sources
- **Type**: Pill selector (multi-select) + custom entries
- **Predefined options** (11):
  1. CrossRef
  2. OpenAlex
  3. OpenCitations
  4. DataCite
  5. Scopus
  6. Web of Science
  7. PubMed
  8. Semantic Scholar
  9. Google Scholar
  10. IEEE Xplore
  11. JSTOR
- **Custom entries**: Text input with "Add custom source..." placeholder. Press Enter or click to add. Custom pills shown separately and removable.
- **Logic**: `getCustom(predefined, values)` identifies custom entries. Toggle predefined on/off. Custom entries are removable.
- **Storage**: `SessionMetadata.dataSources` (string array)
- **Usage**: Exported as semicolon-joined `Data_Sources` in CSV.

#### C.10 Search Methods
- **Type**: Pill selector (multi-select) + custom entries
- **Predefined options** (6):
  1. Keywords
  2. Semantic search
  3. Boolean queries
  4. Natural language
  5. Citation chaining
  6. Faceted filtering
- **Custom entries**: Text input with "Add custom method..." placeholder.
- **Storage**: `SessionMetadata.searchMethods` (string array)
- **Usage**: Exported as semicolon-joined `Search_Methods` in CSV.

#### C.11 Discipline
- **Type**: Pill selector (multi-select) + custom entries (scrollable list, max-height 12rem)
- **Predefined options** (26 — Elsevier journal classification categories):
  1. Agricultural and Biological Sciences
  2. Arts and Humanities
  3. Biochemistry Genetics and Molecular Biology
  4. Business Management and Accounting
  5. Chemical Engineering
  6. Chemistry
  7. Computer Science
  8. Decision Sciences
  9. Dentistry
  10. Earth and Planetary Sciences
  11. Economics Econometrics and Finance
  12. Energy
  13. Engineering
  14. Environmental Science
  15. Health Professions
  16. Immunology and Microbiology
  17. Materials Science
  18. Mathematics
  19. Medicine
  20. Neuroscience
  21. Nursing
  22. Pharmacology Toxicology and Pharmaceutics
  23. Physics and Astronomy
  24. Psychology
  25. Social Sciences
  26. Veterinary
- **Custom entries**: Text input with "Add custom discipline..." placeholder.
- **Storage**: `SessionMetadata.discipline` (string array)
- **Usage**: Exported as semicolon-joined `Discipline` in CSV.

#### C.12 Read-only summary fields
Displayed at the bottom of the Metadata tab (not user-editable):
- **Started**: `SessionMetadata.startTime` formatted as locale string
- **Captures**: Count of captures (warned in amber if 0)
- **Scored items**: Count of evaluations with non-empty score (warned in amber if 0)

#### C.13 Export and discard actions
- **"End Review & Export"** button: Calls `exportAndClose(rubric)`. Checks `canExport()` — warns if `toolName` or `toolUrl` are missing, but allows proceeding.
- **"Discard review"** button: Prompts confirmation ("This will permanently delete all captures, scores, and notes"), then calls `deleteSession()`.

---

*Continued in Part 2 (Evaluation Tab — Rubric Questions in Detail)...*

---

### D. Evaluation Tab — Rubric Questions

**Location**: `components/Evaluation.tsx` renders `components/QuestionSection.tsx` which renders `QuestionRow` components. Rubric data loaded from `data/rubrics/trust-full.json`.

**Per-question common fields** (every question has these):
- **Score**: Section-specific (see below)
- **Notes**: Free-text textarea (2 rows), placeholder "Notes / remarks..." (QG) or "Notes..."
- **Evidence**: 0+ linked captures. Each capture shows a thumbnail with remove/view actions. Two attachment methods:
  - "+ Capture Evidence" — captures current tab and auto-links
  - "Link existing" — popover listing all captures, click to link
- **Custom Score** (scoring questions only): Collapsible "Custom score" section with a 0–3 badge selector and a required reasoning textarea ("Required: explain your custom scoring reasoning..."). Stored as `Evaluation.customScore: { score: 0|1|2|3, reasoning: string }`.

**Auto-N/A behavior**: Questions with `ai_only: true` are automatically scored N/A when `SessionMetadata.usesAi` is `false`. The question is grayed out (opacity 0.5), score buttons disabled, and "N/A — tool does not use AI" is shown in the summary.

**Progress indicator**: Each question shows a `ProgressCircle` with state based on:
- **Empty** (no score, no notes, no evidence)
- **Partial** (has score but no notes or evidence, OR has notes/evidence but no score)
- **Complete** (has score AND at least one of notes/evidence)

**Status board**: Top of the Evaluation tab shows a progress bar (`scored/total`), completion percentage, and per-category chips with scored/total counts.

#### D.1 Quality Gates

**Section description**: "Mandatory pass/fail thresholds. Gate failures are flagged but you can continue scoring all questions."

**Score choices** (same for all QG questions):
| Value | Label | Badge |
|---|---|---|
| `pass` | ✓ Pass | Green check |
| `fail` | ✗ Fail | Red cross |
| `na` | — N/A | Gray dash |
| `unsure` | ? Unsure | Gray question mark |

**Categories and questions:**

##### D.1.1 Privacy & Security (category key: `privacy_and_security`, code prefix: `PS`)

**PS1 — Training policy**
- **Type**: `pass_fail`
- **AI-only**: Yes (`ai_only: true`)
- **Requirement**: "Vendor must explicitly state that user queries/inputs/uploads are NOT used to train future models."
- **Background**: "Academic users frequently input sensitive or unpublished research material into search tools. If a tool uses these inputs to train its models, it could leak proprietary research, pre-publication findings, or confidential institutional data. A clear opt-out or non-training policy is essential for trust in academic contexts. Look for this statement in the privacy policy, terms of service, or a dedicated AI ethics page."
- **Examples**:
  - **Pass**: "The tool's documentation includes a section titled 'Data and AI Training' that states: 'User queries, uploaded documents, and search interactions are never used to train, fine-tune, or improve our AI models.' This is confirmed on the privacy policy page dated within the last 12 months."
  - **Fail**: "The terms of service state that 'interactions with the service may be used to improve our products and services' with no option to opt out, or there is no mention of training data practices at all."

##### D.1.2 Accessibility (category key: `accessibility`, code prefix: `AC`)

**AC1 — Accessibility**
- **Type**: `pass_fail`
- **AI-only**: No (`ai_only: false`)
- **Requirement**: "Tool must support keyboard navigation to all major features, allow text resizing to at least 200% without content loss, and provide alt text for images. An accessibility statement or conformance claim (e.g., WCAG 2.1 AA) is strong supporting evidence."
- **Background**: "Accessibility is a legal requirement in many jurisdictions (EU Accessibility Act, Section 508 in the US) and an ethical imperative for tools used in publicly funded institutions. Academic tools must be usable by people with visual, motor, or cognitive disabilities. Reviewers should test keyboard-only navigation, zoom the browser to 200%, and check whether images have meaningful alt text. An accessibility statement demonstrates institutional commitment."
- **Examples**:
  - **Pass**: "You can navigate to all search features, settings, and export options using only the Tab and Enter keys. Zooming the browser to 200% preserves the layout with no overlapping text or hidden controls. The tool's footer links to an accessibility statement declaring WCAG 2.1 AA conformance."
  - **Fail**: "Critical features such as the search filters or export button cannot be reached via keyboard — they only respond to mouse clicks. Zooming to 200% causes the navigation menu to overflow and become partially hidden."

#### D.2 Scoring Rubric

**Section description**: "Score each criterion on a 0–3 scale."

**Score choices** (same for all scoring questions):
| Value | Badge | Label |
|---|---|---|
| `0` | 0 (red) | Level description text |
| `1` | 1 (orange) | Level description text |
| `2` | 2 (teal) | Level description text |
| `3` | 3 (green) | Level description text |
| `na` | — | Not applicable |
| `unsure` | ? | Insufficient information to score |

Each level description is specific to the question (see below).

##### D.2.1 TR — Transparent (category key: `TR`, accent: `tr`)

**TR1 — Data source clarity**
- **AI-only**: No (`ai_only: false`)
- **Level descriptions**:
  - **0**: "Sources are opaque — no information about what the tool indexes."
  - **1**: "General source types mentioned (e.g., 'scientific articles', 'patents') but no specific databases named."
  - **2**: "Key databases, publishers, or indices are identified by name."
  - **3**: "Complete list of indexed sources with coverage dates and update frequency."
- **Background**: "Source transparency is the first step toward reproducible research. When a tool discloses which databases, publishers, and indices it searches, users can assess whether its coverage is adequate for their discipline and identify potential blind spots. Without this information, researchers cannot evaluate whether the tool's results are comprehensive or skewed toward particular sources. Look for a dedicated 'Sources' or 'Coverage' page, or documentation within the tool's help section."
- **Examples**:
  - **0**: "The tool's website and help documentation make no mention of which databases or publishers it searches. A 'Sources' page does not exist, and support inquiries return vague responses like 'we search the best academic sources.'"
  - **1**: "The tool says it covers 'peer-reviewed journals, conference proceedings, and patents' but does not name any specific databases (e.g., Scopus, IEEE Xplore, PubMed) or indicate the scope of coverage."
  - **2**: "The documentation lists Scopus, Web of Science, IEEE Xplore, and PubMed as indexed sources. It mentions 'additional regional databases' without naming them or specifying coverage dates."
  - **3**: "A dedicated 'Data Sources' page lists 47 databases with coverage periods (e.g., 'PubMed: 1950–present', 'arXiv: 1991–present') and a 'Last updated' timestamp showing the list was refreshed within the past month."

**TR2 — Methodology disclosure**
- **AI-only**: Yes (`ai_only: true`)
- **Level descriptions**:
  - **0**: "Black box — no explanation of how the tool works."
  - **1**: "Vague claims of using 'AI' without specifying what kind."
  - **2**: "Names the underlying model or technology (e.g., 'GPT-4', 'BERT-based search') and describes the retrieval approach at a high level."
  - **3**: "Documents the full pipeline: retrieval method, ranking/filtering, generation model, and any post-processing steps."
- **Background**: "Understanding how a tool processes queries and generates results is essential for interpreting its outputs. This question evaluates whether the tool explains its underlying technology — retrieval method, ranking algorithm, and any AI generation steps. In academic contexts, researchers need to know whether results are purely retrieved from indexed databases or synthesized by a language model, as this affects how they interpret and cite the output. This question only applies to AI-powered tools."
- **Examples**:
  - **0**: "The tool's 'How it works' page simply says 'Our advanced technology finds the best results for your research.' No technical documentation, white papers, or methodology descriptions exist anywhere on the site."
  - **1**: "The marketing copy says 'Powered by cutting-edge AI' and 'Uses machine learning to deliver relevant results' but does not specify what kind of AI, what models are used, or how results are ranked."
  - **2**: "The documentation states: 'We use a BERT-based semantic search model to retrieve relevant passages from indexed literature, combined with a GPT-4 summarization layer for synthesized answers.' The retrieval and ranking process is described at a conceptual level."
  - **3**: "A technical white paper details the full pipeline: (1) query expansion using fine-tuned T5, (2) hybrid BM25 + dense retrieval from a 200M passage index, (3) cross-encoder re-ranking, (4) GPT-4 answer generation with chain-of-thought prompting, and (5) post-processing citation verification against the retrieved passages."

##### D.2.2 RE — Reliable (category key: `RE`, accent: `re`)

**RE1 — Accuracy and hallucination**
- **AI-only**: Yes (`ai_only: true`)
- **Level descriptions**:
  - **0**: "Multiple fabricated claims or citations per session — the tool routinely generates information that cannot be verified in the source literature."
  - **1**: "Occasional errors — the tool is mostly correct but sometimes gets details wrong (misattributed findings, incorrect citation details, or minor factual errors)."
  - **2**: "High accuracy with only minor nuances missed — claims are verifiable and citations point to real papers, though synthesis may oversimplify complex findings."
  - **3**: "Consistently accurate across all tested queries — no fabricated claims, no fake citations, and synthesis accurately reflects the source material."
- **Background**: "AI-powered search tools can generate plausible-sounding but fabricated claims, fake citations, or misattributed findings — a phenomenon known as hallucination. In academic research, this is particularly dangerous because users may incorporate inaccurate information into their work. This question assesses how frequently the tool produces verifiable errors across multiple test queries. Test with domain-specific queries where you can verify claims against known literature. This question only applies to AI-powered tools."
- **Examples**:
  - **0**: "When asked about the effectiveness of a specific drug treatment, the tool cites a 2023 Nature paper by 'Johnson et al.' that does not exist. Cross-referencing three other claims reveals that two of the five cited papers are fabricated, and one real paper is cited with an incorrect conclusion."
  - **1**: "The tool correctly summarizes a body of literature on climate feedback loops but attributes a key finding to the wrong author and slightly misstates the effect size. Most citations resolve to real papers, but the details are occasionally off."
  - **2**: "Across ten test queries, all cited papers exist and are correctly attributed. One query oversimplifies a nuanced debate by presenting a contested finding as settled consensus, but no fabricated claims or fake citations appear."
  - **3**: "Every claim across all test queries is verifiable against the original sources. Citations resolve to real papers with correct authors, years, and findings. The tool accurately represents the state of the literature, including areas of ongoing debate."

**RE2 — Output consistency**
- **AI-only**: No (`ai_only: false`)
- **Level descriptions**:
  - **0**: "Core claims change between runs — asking the same question twice produces substantively different conclusions."
  - **1**: "Moderate variation — the same query sometimes yields noticeably different results, requiring re-prompting to get a reliable answer."
  - **2**: "Consistent core claims with minor surface variation — the substance is the same but phrasing or source selection may differ slightly."
  - **3**: "Highly reproducible — the tool produces substantively equivalent answers (same claims, same sources) across repeated runs."
- **Background**: "A reliable research tool should produce substantively equivalent answers when given the same query multiple times. High variance — where the same question yields different conclusions, sources, or recommendations on successive runs — undermines trust and makes the tool unsuitable for systematic work. This question evaluates reproducibility by asking the reviewer to submit identical queries and compare the substance of the responses. Small surface-level differences in phrasing are acceptable; substantive differences in claims or conclusions are not."
- **Examples**:
  - **0**: "Asking 'What is the evidence for intermittent fasting and weight loss?' three times produces three different conclusions: one says 'strong evidence,' another says 'mixed evidence,' and a third says 'limited evidence.' The cited papers differ entirely across runs."
  - **1**: "The same query run five times mostly agrees on the conclusion ('moderate evidence') but in two runs, the tool recommends a specific meta-analysis that does not appear in the other three runs. The user would need to re-run the query to feel confident about the result."
  - **2**: "Across three runs, the tool consistently identifies the same three key studies and reaches the same conclusion. The phrasing varies slightly ('strong evidence' vs. 'compelling evidence') and one run includes an additional secondary source, but the core claims are stable."
  - **3**: "Running the identical query five times produces the same substantive answer: same five key papers cited, same conclusion, same effect sizes reported. Only trivial phrasing differences exist between runs."

##### D.2.3 US — User-Centric (category key: `US`, accent: `uc`)

**US1 — Workflow integration**
- **AI-only**: No (`ai_only: false`)
- **Level descriptions**:
  - **0**: "Siloed, no export."
  - **1**: "Manual copy-paste only."
  - **2**: "Supports basic RIS/BibTeX exports."
  - **3**: "Seamless integration (e.g., direct Zotero/EndNote push, API hooks)."
- **Background**: "Research is a multi-tool workflow: search results need to flow into reference managers, citation tools, and writing environments. A tool that traps results in a silo — with no export or integration options — creates friction and discourages systematic use. This question evaluates whether and how well the tool connects to established academic workflows. Look for export formats (BibTeX, RIS, CSV), direct integrations (Zotero, EndNote, Mendeley), API access, or browser extension support."
- **Examples**:
  - **0**: "There is no export button, no download option, and no API documentation. The only way to save results is to manually select and copy text from the browser, then paste it into another application."
  - **1**: "Results can be selected and copied as plain text, but there is no structured export. The user must manually re-enter citation details into their reference manager."
  - **2**: "The tool has an 'Export' button that downloads selected references as a BibTeX or RIS file, which can be imported into Zotero or EndNote. No direct integration or browser extension is available."
  - **3**: "Clicking the Zotero connector icon in the browser toolbar automatically captures the displayed references with full metadata. The tool also offers a REST API with documentation for programmatic access, and supports direct export to EndNote, Mendeley, and BibTeX."

**US2 — Critical thinking prompts**
- **AI-only**: Yes (`ai_only: true`)
- **Level descriptions**:
  - **0**: "Presents AI outputs as authoritative facts with no caveats, no source visibility, and no prompting toward verification."
  - **1**: "Includes a generic disclaimer (e.g., 'AI may make mistakes', 'always verify sources') but does not actively surface source material."
  - **2**: "Surfaces source material alongside generated text — the user can see original excerpts and compare them to the tool's summary."
  - **3**: "Actively prompts the user to verify, compare, or evaluate — e.g., confidence indicators, explicit verification prompts, source comparison tools, or built-in fact-checking aids."
- **Background**: "AI search tools that present outputs as authoritative facts — without caveats, source visibility, or verification prompts — risk encouraging passive acceptance. This is particularly concerning in academic settings where critical evaluation of sources is a core skill. The best tools actively support the user's judgment by surfacing original source material, flagging uncertainty, providing confidence indicators, or offering built-in comparison tools. This question only applies to AI-powered tools."
- **Examples**:
  - **0**: "The tool generates a paragraph summarizing research findings with no source links, no disclaimer, and no indication that the text is AI-generated. It reads like an authoritative encyclopedia entry."
  - **1**: "A small banner at the top of every response says 'AI-generated content may contain errors. Always verify with original sources.' However, no source links are provided within the response itself, and there is no way to see what the tool based its answer on."
  - **2**: "Each claim in the generated response has a numbered reference that expands to show the original passage from the source paper, with highlighted text showing exactly what the tool used as the basis for its summary. The user can read both the original and the synthesis side by side."
  - **3**: "In addition to showing original source excerpts, the tool displays a confidence score for each claim (e.g., 'High confidence — supported by 3 independent studies'), flags claims where sources disagree ('This finding is contested — see alternative view'), and includes a 'Compare sources' button that opens a side-by-side view of all referenced papers."

##### D.2.4 SE — Sound (category key: `SE`, accent: `se`)

**SE1 — Algorithmic fairness**
- **AI-only**: No (`ai_only: false`)
- **Level descriptions**:
  - **0**: "No evidence that the tool considers fairness — results appear systematically skewed (e.g., exclusively English-language, Western-published sources) without acknowledgment."
  - **1**: "The tool acknowledges potential bias but provides no concrete evidence of mitigation efforts or diverse source coverage."
  - **2**: "The tool demonstrates diverse source coverage in results (e.g., surfaces non-English or non-Western research for relevant queries) OR documents active bias mitigation measures."
  - **3**: "The tool both demonstrates diverse results AND publishes transparency reports on source coverage, geographic scope, and fairness metrics."
- **Background**: "Search tools can systematically favor certain perspectives, languages, regions, or publication venues — often reflecting biases in their training data, indexing sources, or ranking algorithms. In academic search, this can manifest as over-representation of English-language, Western-published, or high-impact-journal sources at the expense of research from the Global South, non-English publications, or smaller venues. This question evaluates whether the tool acknowledges and mitigates these biases. Test with queries that should return diverse geographic and linguistic results."
- **Examples**:
  - **0**: "Searching for 'agricultural adaptation strategies' returns exclusively US and European sources despite the topic being extensively studied in Sub-Saharan Africa and South Asia. The tool's documentation makes no mention of source diversity, geographic balance, or bias mitigation."
  - **1**: "The tool's 'About' page states 'We strive for diverse and representative search results' but provides no data on source distribution, no documentation of mitigation techniques, and test queries still return predominantly English-language Western sources."
  - **2**: "Searching for 'traditional medicine research' surfaces results from journals published in India, China, Brazil, and Nigeria alongside European and North American sources. The tool's documentation describes a re-ranking step that promotes geographic diversity, though no quantitative metrics are published."
  - **3**: "The tool publishes a quarterly 'Source Diversity Report' showing the geographic distribution of indexed sources and search results. A built-in 'Perspectives' filter lets users see results from underrepresented regions, and the documentation details the debiasing techniques applied to the ranking algorithm."

**SE2 — Data handling practices**
- **AI-only**: No (`ai_only: false`)
- **Related gate**: `privacy_and_security.data_privacy` — displayed as "Builds on quality gate: privacy_and_security.data_privacy"
- **Merged gate**: Yes (`merged_gate: true`) — displayed in the QG section as a "Merged Gate" with a read-only summary pointing back to this scoring question. The merged gate badge shows: score > 0 = PASS, score = 0 = FAIL, N/A = N/A.
- **Level descriptions**:
  - **0**: "No transparency about data retention, encryption, or breach notification — privacy policy is vague or missing on these topics."
  - **1**: "Privacy policy exists but provides only generic statements about data protection without specifics on retention or security."
  - **2**: "Clearly states data retention periods and encryption practices (e.g., 'data stored for 30 days', 'encrypted at rest')."
  - **3**: "Comprehensive data handling documentation: retention periods, encryption standards, breach notification policy, data residency, and user data export/deletion options."
- **Background**: "Beyond the basic privacy policy (covered by the quality gate), this question evaluates the depth and specificity of the tool's data handling practices. Researchers need to know exactly how long their data is retained, whether it is encrypted, what happens in case of a breach, and whether they can export or delete their data. Strong data handling practices are especially important for tools used in institutional settings where data governance policies may apply. Look for specifics — not just 'we protect your data' but actual retention periods, encryption standards, and breach notification timelines."
- **Examples**:
  - **0**: "The privacy policy says 'We take data protection seriously and employ industry-standard security measures' but does not mention retention periods, encryption methods, breach notification, data residency, or any mechanism for users to access or delete their data."
  - **1**: "The privacy policy includes a section on data protection that says 'Your data is stored securely and protected with encryption' but does not specify the encryption standard, how long data is kept, or what happens if a breach occurs."
  - **2**: "The tool's documentation states: 'Search queries are retained for 30 days and then permanently deleted. All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Users can request data deletion via their account settings.'"
  - **3**: "A comprehensive 'Data Handling' page covers: retention periods per data type (queries: 30 days, account data: until deletion request), encryption standards (AES-256 at rest, TLS 1.3 in transit), breach notification within 72 hours per GDPR, data residency (EU servers for EU users), and a one-click 'Export my data' and 'Delete my data' feature in account settings."

##### D.2.5 TC — Traceable (category key: `TC`, accent: `tc`)

**TC1 — Source attribution depth**
- **AI-only**: No (`ai_only: false`)
- **Related gate**: `traceability.citation_mechanism` — displayed as "Builds on quality gate: traceability.citation_mechanism"
- **Merged gate**: Yes (`merged_gate: true`) — same merged-gate display logic as SE2
- **Level descriptions**:
  - **0**: "Broken or missing links."
  - **1**: "Links to journal landing pages only."
  - **2**: "Deep links to paper abstracts."
  - **3**: "Deep links to specific paragraphs or segments (RAG-level)."
- **Background**: "The depth of source linking determines how efficiently a researcher can verify claims and locate original material. A tool that links to a journal homepage requires the user to manually search for the specific article; a tool that links directly to the relevant passage saves significant time and enables precise verification. This question evaluates the granularity of citation links — from broken links (worst) to paragraph-level deep links (best). Test by clicking citations in the tool's output and noting where they lead."
- **Examples**:
  - **0**: "The tool shows reference numbers in its output, but clicking them does nothing — there are no hyperlinks. Alternatively, the links exist but resolve to 404 error pages or redirect to the tool's own homepage."
  - **1**: "Citation links resolve to the publisher's journal homepage (e.g., nature.com) but not to the specific article. The user must search within the journal site to find the referenced paper."
  - **2**: "Each citation links directly to the article's abstract page on the publisher's site (e.g., doi.org/10.1038/s41586-023-12345). The user can immediately access the paper's metadata and abstract."
  - **3**: "Citations link to the exact passage within the source document that supports the claim — for example, a specific page in a PDF or a highlighted paragraph in an open-access article. The tool uses RAG (Retrieval-Augmented Generation) with passage-level attribution."

**TC2 — Source quality indicators**
- **AI-only**: No (`ai_only: false`)
- **Level descriptions**:
  - **0**: "Includes retracted or predatory sources without any warning or flag."
  - **1**: "No filtering or labeling of source quality — all sources appear equivalent."
  - **2**: "Categorizes sources by type (e.g., preprint vs. peer-reviewed)."
  - **3**: "Provides contextual quality indicators: retraction status, citation count, publication type, and whether the source is open access."
- **Background**: "Not all academic sources are equal: papers may be retracted, published in predatory journals, or exist only as non-peer-reviewed preprints. A tool that treats all sources identically — without any quality indicators — makes it harder for researchers to assess the reliability of the evidence behind a claim. This question evaluates whether the tool provides contextual quality metadata such as retraction status, peer-review labels, citation counts, and publication type. Look for quality badges, labels, or metadata near each cited source."
- **Examples**:
  - **0**: "The tool cites a paper that was retracted in 2022 due to data fabrication, with no indication of the retraction. It also includes sources from a known predatory publisher on Beall's list, presented identically to legitimate journal articles."
  - **1**: "All cited sources appear with the same formatting and no quality labels. There is no distinction between a Nature peer-reviewed article, a preprint on arXiv, and a blog post — all look equally authoritative in the tool's output."
  - **2**: "Each source is labeled as either 'Peer-reviewed article', 'Preprint', 'Conference paper', or 'Thesis'. The tool filters out known predatory journals but does not show citation counts or retraction status."
  - **3**: "Each cited source displays: a 'Peer-reviewed' or 'Preprint' badge, the citation count from Semantic Scholar, a retraction warning flag (e.g., 'This paper was retracted on 2024-01-15'), an 'Open Access' icon when the full text is freely available, and the journal's impact factor quartile."

---

### E. Finalize Tab — Review Finalization

**Location**: `components/FinalizationScreen.tsx`. Stored as `ReviewFinalization` in `SessionData.finalization` via `stores/session.ts` → `setFinalization()`.

**Autosave**: All fields are debounced-autosaved (50ms) whenever `grade` is non-empty. `finalizedAt` is NOT set by autosave — only by the explicit "Save Finalization" button.

#### E.1 Overall Grade
- **Type**: 3-way button selector
- **Required**: Yes (enables the "Save Finalization" button)
- **Choices**:
  | Value | Label | Active Style | Inactive Style |
  |---|---|---|---|
  | `pass` | Pass | `bg-ut-green` (green) + white text | `bg-grade-pass-tint` + border |
  | `conditional` | Conditional | `bg-score-1-strong` (orange) + white text | `bg-grade-conditional-tint` + border |
  | `fail` | Fail | `bg-ut-red` (red) + white text | `bg-grade-fail-tint` + border |
- **Storage**: `ReviewFinalization.grade` (type: `FinalizationGrade = "pass" | "conditional" | "fail"`)
- **Usage**: Exported as `Grade` in `review_conclusions.csv`. Displayed in HTML report and nutrition label.

#### E.2 Conclusion
- **Type**: Multiline text (`<textarea>`, 4 rows)
- **Placeholder**: "Overall summary of the review..."
- **Storage**: `ReviewFinalization.conclusion` (trimmed on save)
- **Usage**: Exported as `Conclusion` in CSV.

#### E.3 Strengths
- **Type**: Editable bullet list (`BulletListEditor` component)
- **Placeholder**: "Describe a strength..."
- **Interaction**: Type + Enter or "Add" button. Each item has inline "edit" and "remove" actions. Editing opens an inline text input; Enter confirms, Escape cancels. Emptying an item during edit removes it.
- **Storage**: `ReviewFinalization.strengths` (string array, trimmed, empty strings filtered)
- **Usage**: Exported as semicolon-joined `Strengths` in CSV.

#### E.4 Weaknesses
- **Type**: Editable bullet list (same `BulletListEditor` component)
- **Placeholder**: "Describe a weakness..."
- **Interaction**: Same as Strengths above.
- **Storage**: `ReviewFinalization.weaknesses` (string array, trimmed, empty strings filtered)
- **Usage**: Exported as semicolon-joined `Weaknesses` in CSV.

#### E.5 Recommendations
- **Type**: Multiline text (`<textarea>`, 3 rows)
- **Placeholder**: "Suggestions for improvement..."
- **Storage**: `ReviewFinalization.recommendations` (trimmed on save)
- **Usage**: Exported as `Recommendations` in CSV.

#### E.6 Save / Finalization actions
- **"Save Finalization"** button: Sets `finalizedAt` to `new Date().toISOString()`. Cancels pending autosave. Shows "Saved" indicator with green checkmark. Enables the "Finalized" banner with timestamp and "Export review →" link.
- **"Clear Finalization"** button (shown only when finalization exists): Prompts to clear all fields. Sets `finalization` to `null`.
- **Read-only "Finalized" banner**: Shown when `finalizedAt` is set. Displays timestamp and "Ready to export" with a link to the Metadata tab.

---

### F. Captures Tab — Evidence Gallery

**Location**: `components/Captures.tsx`. Captures are stored as `Capture[]` in `SessionData.captures`.

Each capture is a screenshot + HTML snapshot of a browser tab, optionally annotated. They serve as evidence linked to rubric questions and metadata fields.

#### F.1 Capture creation
- **"+ Quick Capture"** button: Captures current active tab via `captureActiveTab()`. Auto-populates `id` (UUID), `timestamp`, `sourceUrl`, `pageTitle`, `screenshotBase64`, `htmlContent`.
- **"+ Capture Evidence"** (per-question): Same capture, but auto-links to the rubric question.
- **Quick actions** (session header):
  - "Quick Capture" — same as Quick Capture button
  - "Capture T&C" — captures and sets `metadataField = "termsConditionsUrl"`, updates `SessionMetadata.termsConditionsUrl`
  - "Capture Logo" — captures and extracts logo URL, sets `metadataField = "toolLogoUrl"`, updates `SessionMetadata.toolLogoUrl`

#### F.2 Per-capture fields
| Field | Type | Editable | Notes |
|---|---|---|---|
| Screenshot | Image (auto-captured) | No | Displayed as thumbnail. Optionally has annotated version. |
| Page Title | String (auto-captured) | No | From `document.title` |
| Source URL | String (auto-captured) | No | From `location.href` |
| Timestamp | ISO string (auto-captured) | No | Displayed as locale date/time |
| Notes | Free text | Yes | Textarea (2 rows), placeholder "Notes..." |
| Rubric tags | Multi-select | Yes | See F.3 below |
| Metadata field | String or null | No | Set automatically when captured for a specific metadata field |

#### F.3 Rubric tagging
Each capture can be linked to 0+ rubric questions. In the Captures tab, the expanded capture details show:
- **Quality Gates section**: All QG questions as toggleable chips, grouped by category
- **Scoring Rubric section**: All scoring questions as toggleable chips, grouped by principle (TR, RE, US, SE, TC)
- **AI-only handling**: Questions with `ai_only: true` are shown differently when `usesAi` is false (disabled)
- **Tag count**: Displayed as "N tags" next to the capture

Linking is bidirectional — the same link is visible from both the Captures tab and the Evaluation tab.

#### F.4 View modes
- **Grid view** (default): 2-column grid of thumbnail cards, newest first. Paginated at 12 captures with "Show more/less".
- **List view**: Compact rows showing URL, title, date, metadata field, annotate/delete buttons.

#### F.5 Annotate action
Opens `EvidenceModal` (`components/EvidenceModal.tsx`) for drawing annotations on the screenshot.

#### F.6 Delete action
Prompts "Delete this capture? This cannot be undone." Removing a capture also:
- Removes it from all `Evaluation.explicitEvidenceIds` arrays
- Clears the linked `SessionMetadata` field if it was a `toolLogoUrl` or `termsConditionsUrl` capture

---

### G. Quick Actions (Session Header)

**Location**: `components/ActiveSession.tsx` header bar. Available regardless of which tab is active.

| Button | Action |
|---|---|
| Quick Note | Opens a text input; appends `[HH:MM] text` to `SessionMetadata.notes` |
| Quick Capture | Captures current tab, adds to captures |
| Capture T&C | Captures current tab, links to `termsConditionsUrl` metadata field |
| Capture Logo | Captures current tab, extracts logo, links to `toolLogoUrl` metadata field |

---

## Addendum: File Locations and Cross-References

### Where Each Field/Question Is Defined

| Item | Definition Location | Modifiable via JSON? |
|---|---|---|
| **Settings: reviewerName, reviewerEmail** | `stores/registry.ts` → `Settings` interface + initial state | No — hardcoded defaults, stored in localStorage |
| **Settings: preferredRubric** | `stores/registry.ts` → initial state `preferredRubric: "trust-full"` | No — hardcoded default |
| **Settings: setupBannerDismissed** | `stores/registry.ts` → `Settings` interface | No — runtime flag |
| **New Review: toolName, toolUrl, usesAi** | `components/NewSessionModal.tsx` — form fields | No — UI component |
| **New Review: rubricId** | `components/NewSessionModal.tsx` — hardcoded `"trust-full"` | No — hardcoded |
| **New Review: id, startTime, status, faviconUrl** | `components/NewSessionModal.tsx` — auto-generated | No — runtime |
| **Metadata: all fields** | `components/Metadata.tsx` — form fields + `lib/types.ts` → `SessionMetadata` | No — UI component |
| **Metadata: Data Sources options** | `components/Metadata.tsx` → `DATA_SOURCE_OPTIONS` const | No — hardcoded array |
| **Metadata: Search Methods options** | `components/Metadata.tsx` → `SEARCH_METHOD_OPTIONS` const | No — hardcoded array |
| **Metadata: Discipline options** | `components/Metadata.tsx` → `DISCIPLINE_OPTIONS` const | No — hardcoded array |
| **QG: PS1 Training policy** | `data/rubrics/trust-full.json` → `quality_gate.privacy_and_security.training_policy` | **Yes — JSON** |
| **QG: AC1 Accessibility** | `data/rubrics/trust-full.json` → `quality_gate.accessibility.compliance` | **Yes — JSON** |
| **Scoring: TR1 Data source clarity** | `data/rubrics/trust-full.json` → `scoring_rubric.TR.data_source_clarity` | **Yes — JSON** |
| **Scoring: TR2 Methodology disclosure** | `data/rubrics/trust-full.json` → `scoring_rubric.TR.methodology_disclosure` | **Yes — JSON** |
| **Scoring: RE1 Accuracy and hallucination** | `data/rubrics/trust-full.json` → `scoring_rubric.RE.accuracy_and_hallucination` | **Yes — JSON** |
| **Scoring: RE2 Output consistency** | `data/rubrics/trust-full.json` → `scoring_rubric.RE.variance_consistency` | **Yes — JSON** |
| **Scoring: US1 Workflow integration** | `data/rubrics/trust-full.json` → `scoring_rubric.US.workflow_integration` | **Yes — JSON** |
| **Scoring: US2 Critical thinking prompts** | `data/rubrics/trust-full.json` → `scoring_rubric.US.cognitive_guardrails` | **Yes — JSON** |
| **Scoring: SE1 Algorithmic fairness** | `data/rubrics/trust-full.json` → `scoring_rubric.SE.algorithmic_fairness` | **Yes — JSON** |
| **Scoring: SE2 Data handling practices** | `data/rubrics/trust-full.json` → `scoring_rubric.SE.data_handling` | **Yes — JSON** |
| **Scoring: TC1 Source attribution depth** | `data/rubrics/trust-full.json` → `scoring_rubric.TC.source_attribution_depth` | **Yes — JSON** |
| **Scoring: TC2 Source quality indicators** | `data/rubrics/trust-full.json` → `scoring_rubric.TC.bibliometric_credibility` | **Yes — JSON** |
| **Finalization: all fields** | `components/FinalizationScreen.tsx` — form fields + `lib/types.ts` → `ReviewFinalization` | No — UI component |
| **Finalization: grade options** | `components/FinalizationScreen.tsx` → `GRADES` const + `lib/types.ts` → `FinalizationGrade` | No — hardcoded |
| **Capture: all fields** | `lib/capture.ts` — auto-populated + `lib/types.ts` → `Capture` | No — runtime |
| **Score choices (QG)** | `lib/types.ts` → `QualityGateScore` + `components/QuestionSection.tsx` → `renderQGScores()` | No — hardcoded union type |
| **Score choices (Scoring)** | `lib/types.ts` → `ScoringScore` + `components/QuestionSection.tsx` → `renderScoringScores()` | No — hardcoded union type |
| **Question codes** | `lib/rubric.ts` → `getQGQuestionCode()`, `getQuestionCode()`, `QG_CATEGORY_CODES` | No — computed |
| **Category labels** | `lib/rubric.ts` → `CATEGORY_LABELS` const | No — hardcoded map |
| **Accent keys (colors)** | `lib/rubric.ts` → `ACCENT_KEYS` const | No — hardcoded map |

### Where Answers Are Used (Cross-References)

| Source Field | Used By | Location |
|---|---|---|
| `SessionMetadata.toolName` | Session header display, export filename, CSV `Tool_Name`, HTML report title, `canExport()` check | `ActiveSession.tsx`, `export.ts`, `Metadata.tsx` |
| `SessionMetadata.toolUrl` | Session header link, CSV `Tool_URL`, `canExport()` check, metadata completion indicator | `ActiveSession.tsx`, `export.ts`, `Metadata.tsx` |
| `SessionMetadata.usesAi` | Auto-N/A for `ai_only` questions, RubricContext provider, QG/scoring disabled states, Captures tab chips | `contexts.tsx`, `QuestionSection.tsx`, `Captures.tsx` |
| `SessionMetadata.notes` | Quick Note appends to it, CSV `Notes`, HTML report | `ActiveSession.tsx`, `export.ts` |
| `SessionMetadata.description` | First-open redirect logic (empty → redirect to Metadata tab), CSV `Tool_Description` | `ActiveSession.tsx`, `export.ts` |
| `SessionMetadata.dataSources` | First-open redirect logic (empty → redirect), CSV `Data_Sources` (semicolon-joined) | `ActiveSession.tsx`, `export.ts` |
| `SessionMetadata.toolLogoUrl` | Logo preview image in Metadata tab, HTML report | `Metadata.tsx`, `html-report.ts` |
| `SessionMetadata.termsConditionsUrl` | Updated by T&C quick capture, HTML report | `ActiveSession.tsx`, `html-report.ts` |
| `SessionMetadata.startTime` | Metadata summary display, CSV `Start_Time` | `Metadata.tsx`, `export.ts` |
| `SessionMetadata.faviconUrl` | Session header favicon image | `ActiveSession.tsx` |
| `SessionMetadata.finalizedAt` | Set by `setFinalization()` when finalization saved. Controls "Finalized" banner, metadata summary timestamp | `FinalizationScreen.tsx`, `Metadata.tsx`, `stores/session.ts` |
| `Settings.reviewerName` | Setup banner visibility, HTML report | `AppShell.tsx`, `html-report.ts` |
| `Settings.reviewerEmail` | HTML report | `html-report.ts` |
| `Evaluation.score` | Completion progress, category scores, principle averages, quality gate results, HTML report, CSV `Score` | `Evaluation.tsx`, `rubric.ts`, `html-report.ts`, `export.ts` |
| `Evaluation.notes` | Progress indicator (partial vs complete), CSV `Notes` | `QuestionSection.tsx`, `export.ts` |
| `Evaluation.explicitEvidenceIds` | Evidence thumbnails per question, capture linking, capture tag count, CSV `Linked_Capture_IDs` | `QuestionSection.tsx`, `Captures.tsx`, `export.ts` |
| `Evaluation.customScore` | CSV `Custom_Reasoning`, HTML report | `export.ts` |
| `ReviewFinalization.grade` | CSV `Grade`, HTML report nutrition label, metadata "Finalized" status | `export.ts`, `html-report.ts`, `Metadata.tsx` |
| `ReviewFinalization.conclusion` | CSV `Conclusion`, HTML report | `export.ts`, `html-report.ts` |
| `ReviewFinalization.strengths` | CSV `Strengths` (semicolon-joined), HTML report | `export.ts`, `html-report.ts` |
| `ReviewFinalization.weaknesses` | CSV `Weaknesses` (semicolon-joined), HTML report | `export.ts`, `html-report.ts` |
| `ReviewFinalization.recommendations` | CSV `Recommendations`, HTML report | `export.ts`, `html-report.ts` |
| `ReviewFinalization.finalizedAt` | "Finalized" banner timestamp, CSV `Finalized_At`, metadata summary | `FinalizationScreen.tsx`, `export.ts`, `Metadata.tsx` |
| `Capture` (all fields) | Captures tab gallery, Evidence thumbnails, CSV `capture_log.csv`, ZIP evidence files, HTML report | `Captures.tsx`, `QuestionSection.tsx`, `export.ts` |
| `Capture.metadataField` | Metadata tab linked capture panels (logo, T&C), capture removal cleanup | `Metadata.tsx`, `stores/session.ts` |
| Rubric question `ai_only` | Disables scoring UI, grays out question, auto-N/A | `QuestionSection.tsx` |
| Rubric question `related_gate` | "Builds on quality gate: ..." cross-reference display | `QuestionSection.tsx` |
| Rubric question `merged_gate` | Renders as read-only merged gate in QG section with pass/fail badge derived from score | `QuestionSection.tsx` |

### Scoring Calculations

These functions consume evaluation scores and produce derived values for the HTML report:

| Calculation | Function | Location | Inputs | Output |
|---|---|---|---|---|
| Completion % | `computeCompletion()` | `lib/rubric.ts` | `Evaluation[]`, `RubricData` | `0–100` (percentage of scored questions) |
| Quality gate results | `qualityGateResults()` | `lib/rubric.ts` | `Evaluation[]`, `RubricData` | Array of `{ id, label, result: pass\|fail\|na\|unsure\|null }` |
| Category scores | `getCategoryScores()` | `lib/rubric.ts` | `categoryId`, `Evaluation[]`, `RubricData` | Array of raw scores per question |
| Principle average | `principleAverage()` | `lib/rubric.ts` | `categoryId`, `Evaluation[]`, `RubricData` | `number \| null` (mean of numeric scores) |
| Distribution bar | `distributionBar()` | `lib/rubric.ts` | `scores[]` | HTML string with colored segments |
| Score color | `scoreColor()` | `lib/rubric.ts` | `number \| "na" \| "unsure"` | Hex color string |

### Session Data Persistence

| Storage | Mechanism | Location |
|---|---|---|
| Session data (captures, evaluations, metadata, finalization) | IndexedDB via `lib/session-repository.ts` | Persisted per-session |
| Session index + settings | Zustand `persist` middleware → localStorage key `"trust-review-registry"` | `stores/registry.ts` |
| Active session state (in-memory) | Zustand store (no persistence — loaded from IDB) | `stores/session.ts` |
| Auto-save | Debounced save to IDB on every state change | `lib/auto-save.ts` |
| Export | ZIP file download (HTML report + CSVs + evidence images + session.json) | `lib/export.ts` |

### Key Type Definitions

| Type | File | Purpose |
|---|---|---|
| `SessionMetadata` | `lib/types.ts` | All metadata fields for a review session |
| `SessionData` | `lib/types.ts` | Complete session (metadata + captures + evaluations + finalization) |
| `Capture` | `lib/types.ts` | Screenshot evidence with notes and rubric links |
| `Evaluation` | `lib/types.ts` | Score + notes + evidence IDs + optional custom score for one rubric question |
| `ReviewFinalization` | `lib/types.ts` | Grade + conclusion + strengths + weaknesses + recommendations |
| `RubricData` | `lib/types.ts` | Full rubric structure (quality gates + scoring questions) |
| `PassFailQuestion` | `lib/types.ts` | QG question structure (title, requirement, background, examples, ai_only) |
| `ScoringQuestion` | `lib/types.ts` | Scoring question structure (title, levels 0-3, background, examples, ai_only, related_gate, merged_gate) |
| `Settings` | `lib/types.ts` | Reviewer profile (name, email, preferred rubric, banner dismissed) |
| `FinalizationGrade` | `lib/types.ts` | `"pass" \| "conditional" \| "fail"` |
| `QualityGateScore` | `lib/types.ts` | `"pass" \| "fail" \| "na" \| "unsure" \| ""` |
| `ScoringScore` | `lib/types.ts` | `0 \| 1 \| 2 \| 3 \| "na" \| "unsure" \| ""` |
