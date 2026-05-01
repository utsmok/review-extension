# Implementation Specification: Academic Info-Tool Evaluation Extension

## 1. Project Overview
A browser extension to facilitate systematic, session-based UX and functionality reviews of academic search engines and databases. The tool allows users to maintain a persistent evaluation session, capture viewport screenshots and full DOM HTML, tag evidence, and score the tool against a predefined JSON rubric (the "TRUST" framework). Everything is processed locally and exported as a `.zip` file containing data (CSVs), evidence, and a human-readable PDF report.

## 2. Tech Stack
*   **Extension Framework:** [WXT (wxt.dev)](https://wxt.dev/)
*   **Frontend UI:** React.js with TailwindCSS
*   **State Management:** Zustand (persistent session state)
*   **File Generation:** `JSZip`, `pdfmake`, `papaparse`
*   **Capture:** Native `chrome.tabs.captureVisibleTab` + DOM serialization via content script

## 3. Data Models

```typescript
type SessionMetadata = {
  toolName: string;
  toolUrl: string;
  startTime: string;        // ISO
  company?: string;
  pricing?: string;
  availability?: string;
  termsConditionsUrl?: string;
};

type Capture = {
  id: string;               // UUID
  timestamp: string;        // ISO
  sourceUrl: string;
  screenshotBase64: string;
  htmlContent: string;      // Serialized DOM
  notes: string;
  linkedRubricIds: string[];
};

type Evaluation = {
  rubricId: string;
  score: string | number;
  notes: string;
  explicitEvidenceIds: string[];
};
```

## 4. UI/UX Flow

Side panel (`chrome.sidePanel`) — user browses normally while interacting with the tool.

### View 1: Session Initialization
- Required: Tool Name, Tool URL
- Optional fields behind accordion: Pricing, Company, etc.

### View 2: Active Session (3 tabs)

#### Tab A: Captures & Evidence
- Quick Capture button (viewport + DOM)
- Capture list with thumbnails
- Per-capture: notes textarea, rubric tagging multi-select

#### Tab B: Evaluation (Rubric)
- Quality gates: pass/fail radio buttons
- Scoring rubric: 0-3 scale with descriptions
- Auto-display evidence thumbnails linked to each rubric item
- "Add Evidence" button for instant capture tied to question

#### Tab C: Tool Metadata
- Editable metadata form
- "End Session & Export" button

## 5. Export Pipeline

Triggered on "End Session". Background worker compiles state into `.zip`:

```
📁 evidence/
  capture_[UUID].png
  capture_[UUID].html
📄 Evaluation_Report_[ToolName].pdf
📊 session_metadata.csv
📊 rubric_scores.csv
📊 capture_log.csv
```

### CSV Schemas

**rubric_scores.csv** — one row per question:
`Rubric_Category, Question_ID, Score, Notes, Linked_Capture_IDs`

**capture_log.csv** — one row per capture:
`Capture_ID, Timestamp, URL_Captured, User_Notes, Tagged_Rubric_IDs`

## 6. Implementation Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Skeleton & state (WXT + React + Zustand) | ✅ Scaffolded |
| 2 | UI layout (side panel tabs, dynamic rubric rendering) | ✅ Scaffolded |
| 3 | Capture engine (screenshot + DOM serialization) | 🔲 Basic — needs SingleFile integration |
| 4 | Workflow binding (bi-directional capture ↔ rubric linking) | ✅ Scaffolded |
| 5 | Export engine (JSZip + papaparse + PDF) | 🔲 Skeleton — needs PDF polish |
