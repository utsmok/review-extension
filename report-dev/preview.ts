/**
 * TRUST Report Dev Preview
 *
 * Generates report HTML using the same production template functions,
 * but renders into an iframe for live preview with fixture data.
 * CSS loads as a proper stylesheet (HMR, source maps, DevTools).
 */
import trustFull from "@/data/rubrics/trust-full.json";
import { buildBusinessCardLabel, buildHtmlReport, buildNutritionLabel } from "@/lib/html-report";
import type {
  Capture,
  Evaluation,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "@/lib/types";

// ── Rubric ────────────────────────────────────────────────────────────

const RUBRIC = trustFull as unknown as RubricData;

// ── Fixture data builders ─────────────────────────────────────────────

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "ScholarAI",
    toolUrl: "https://scholarai.example.com/search",
    faviconUrl: "https://asta.allen.ai/favicon.ico",
    startTime: "2025-11-15T10:00:00.000Z",
    status: "done",
    description: "AI-powered academic search engine that synthesizes research papers.",
    company: "ScholarAI Inc.",
    pricing: "Freemium",
    availability: "Web, API",
    dataSources: ["PubMed", "arXiv", "Semantic Scholar", "CrossRef"],
    searchMethods: ["Semantic search", "Keyword search", "Citation graph traversal"],
    discipline: ["Biomedical", "Computer Science"],
    authenticationMethod: "Email / OAuth",
    termsConditionsUrl: "https://scholarai.example.com/terms",
    usesAi: true,
    ...overrides,
  };
}

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: crypto.randomUUID(),
    timestamp: "2025-11-15T10:01:00.000Z",
    sourceUrl: "https://scholarai.example.com/results?q=machine+learning",
    pageTitle: "Machine Learning Results — ScholarAI",
    screenshotBase64: "",
    htmlContent: "",
    notes: "",
    ...overrides,
  };
}

function makeEvaluation(rubricId: string, score: Evaluation["score"], notes = ""): Evaluation {
  return { rubricId, score, notes, explicitEvidenceIds: [] };
}

// ── Data states ───────────────────────────────────────────────────────

interface DataState {
  label: string;
  metadata: SessionMetadata;
  captures: Capture[];
  evaluations: Evaluation[];
  finalization: ReviewFinalization | null;
  quickNotes?: { id: string; text: string; timestamp: string }[];
}

function allQgIds(): string[] {
  const ids: string[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC.quality_gate)) {
    for (const qKey of Object.keys(questions as Record<string, unknown>)) {
      ids.push(`${cat}.${qKey}`);
    }
  }
  return ids;
}

function allScoringIds(): string[] {
  const ids: string[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC.scoring_rubric)) {
    for (const qKey of Object.keys(questions as Record<string, unknown>)) {
      ids.push(`${cat}.${qKey}`);
    }
  }
  return ids;
}

// Small solid screenshot data URLs so evidence + the lightbox render in the preview.
const SHOTS = [
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAS0lEQVR4AdXBAQEAIAyAME4XkxnfED4H25z7PmESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3EStxZaArLmCZTIAAAAAElFTkSuQmCC",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAS0lEQVR4AdXBAQEAIAyAME4IQ1nToD4H25x3P2ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESt4knAkJZMDZ0AAAAAElFTkSuQmCC",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAS0lEQVR4AdXBAQEAIAyAME4lo9rSEj4H29zzPmESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESt9Y6Au9GOyggAAAAAElFTkSuQmCC",
];
function buildDataStates(): Map<string, DataState> {
  const captures = [
    makeCapture({
      pageTitle: "Search results page",
      notes: "Default search for 'machine learning'",
      screenshotBase64: SHOTS[0],
    }),
    makeCapture({
      pageTitle: "Paper detail view",
      notes: "Clicked on first result",
      screenshotBase64: SHOTS[1],
    }),
    makeCapture({ pageTitle: "Settings panel", screenshotBase64: SHOTS[2] }),
  ];
  // Link captures to evaluations
  const captureIds = captures.map((c) => c.id);

  const states = new Map<string, DataState>();

  // Complete: all pass QG, all high scores
  {
    const evaluations = [
      ...allQgIds().map((id) => makeEvaluation(id, "pass")),
      ...allScoringIds().map((id, i) => makeEvaluation(id, i % 3 === 0 ? 2 : 3)),
    ];
    // Link some captures as evidence
    evaluations[5].explicitEvidenceIds = [captureIds[0]];
    evaluations[8].explicitEvidenceIds = [captureIds[1]];
    evaluations[12].explicitEvidenceIds = [captureIds[0], captureIds[2]];

    states.set("complete", {
      label: "Complete",
      metadata: makeMetadata(),
      captures,
      quickNotes: [
        {
          id: "qn-1",
          text: "Re-ranking looks opaque — no transparency controls exposed.",
          timestamp: "2025-11-15T11:25:00.000Z",
        },
        {
          id: "qn-2",
          text: "Citations are present but some link to a paywall.",
          timestamp: "2025-11-15T11:31:00.000Z",
        },
      ],
      evaluations,
      finalization: {
        grade: "pass",
        conclusion:
          "ScholarAI demonstrates strong transparency and reliability with minor gaps in data source disclosure.",
        strengths: [
          "Clear citation of sources",
          "Responsive interface",
          "Good coverage of biomedical literature",
        ],
        weaknesses: [
          "Limited transparency about ranking algorithm",
          "No API rate limit disclosure",
        ],
        recommendations:
          "Improve algorithm transparency documentation. Consider adding rate limit information.",
        finalizedAt: "2025-11-15T12:00:00.000Z",
      },
    });
  }

  // Partial: few questions answered
  {
    const evaluations = [
      makeEvaluation("privacy_and_security.data_privacy", "pass"),
      makeEvaluation("TR.data_source_clarity", 2),
      makeEvaluation("TR.attribution", 1, "Only partial attribution shown"),
    ];
    evaluations[1].explicitEvidenceIds = [captureIds[0]];

    states.set("partial", {
      label: "Partial",
      metadata: makeMetadata(),
      captures,
      quickNotes: [
        {
          id: "qn-1",
          text: "Only partially evaluated — need a second pass on attribution.",
          timestamp: "2025-11-15T10:48:00.000Z",
        },
      ],
      evaluations,
      finalization: null,
    });
  }

  // Failed QG
  {
    const qgIds = allQgIds();
    const evaluations = [
      makeEvaluation(qgIds[0], "fail"),
      makeEvaluation(qgIds[1], "pass"),
      ...allScoringIds().map((id) => makeEvaluation(id, 3)),
    ];

    states.set("failed-qg", {
      label: "Failed QG",
      metadata: makeMetadata(),
      captures,
      evaluations,
      finalization: null,
    });
  }

  // No evaluations
  states.set("no-eval", {
    label: "No Eval",
    metadata: makeMetadata(),
    captures,
    evaluations: [],
    finalization: null,
  });

  // Finalized as fail
  {
    const evaluations = [
      ...allQgIds().map((id) => makeEvaluation(id, "pass")),
      ...allScoringIds().map((id) => makeEvaluation(id, 1)),
    ];

    states.set("finalized-fail", {
      label: "Finalized Fail",
      metadata: makeMetadata(),
      captures,
      evaluations,
      finalization: {
        grade: "fail",
        conclusion: "Tool does not meet minimum requirements for reliability.",
        strengths: ["Fast search response"],
        weaknesses: [
          "Poor data source transparency",
          "No attribution",
          "Misleading results",
          "No error handling",
        ],
        recommendations: "Fundamental improvements needed before recommendation.",
        finalizedAt: "2025-11-15T12:00:00.000Z",
      },
    });
  }

  // Finalized as conditional
  {
    const evaluations = [
      ...allQgIds().map((id) => makeEvaluation(id, "pass")),
      ...allScoringIds().map((id, i) => makeEvaluation(id, i % 4 === 0 ? 1 : 3)),
    ];

    states.set("finalized-conditional", {
      label: "Finalized Conditional",
      metadata: makeMetadata(),
      captures,
      evaluations,
      finalization: {
        grade: "conditional",
        conclusion: "Acceptable with caveats regarding data source transparency.",
        strengths: ["Good search quality", "Wide coverage"],
        weaknesses: ["Opaque ranking algorithm"],
        recommendations: "Acceptable for use with awareness of ranking limitations.",
        finalizedAt: "2025-11-15T12:00:00.000Z",
      },
    });
  }

  return states;
}

const DATA_STATES = buildDataStates();

// ── Render ────────────────────────────────────────────────────────────

async function renderReport(variant: string, dataStateKey: string): Promise<string> {
  const state = DATA_STATES.get(dataStateKey);
  if (!state) return "<p>Unknown data state</p>";

  switch (variant) {
    case "full":
      return await buildHtmlReport(
        state.metadata,
        state.captures,
        state.evaluations,
        RUBRIC,
        state.finalization,
        { name: "Dr. Jane Reviewer", email: "reviewer@university.edu" },
        state.quickNotes ?? [],
      );
    case "nutrition":
      return await buildNutritionLabel(
        state.metadata,
        state.evaluations,
        RUBRIC,
        state.finalization,
      );
    case "card":
      return await buildBusinessCardLabel(
        state.metadata,
        state.evaluations,
        RUBRIC,
        state.finalization,
      );
    default:
      return "<p>Unknown variant</p>";
  }
}

// ── DOM wiring ────────────────────────────────────────────────────────

const variantSelect = document.getElementById("variant") as HTMLSelectElement;
const dataSelect = document.getElementById("data-state") as HTMLSelectElement;
const viewportSelect = document.getElementById("viewport-size") as HTMLSelectElement;
const viewportDiv = document.getElementById("viewport") as HTMLDivElement;
const viewportInfo = document.getElementById("viewport-info") as HTMLDivElement;
const printBtn = document.getElementById("btn-print") as HTMLButtonElement;

let iframe: HTMLIFrameElement | null = null;

async function update() {
  const variant = variantSelect.value;
  const dataState = dataSelect.value;
  const width = Number.parseInt(viewportSelect.value, 10);

  // Update viewport
  if (width > 0) {
    viewportDiv.style.maxWidth = `${width}px`;
    viewportInfo.textContent = `Viewport: ${width}px · Variant: ${variant} · Data: ${dataSelect.options[dataSelect.selectedIndex].text}`;
  } else {
    viewportDiv.style.maxWidth = "100%";
    viewportInfo.textContent = `Viewport: full width · Variant: ${variant} · Data: ${dataSelect.options[dataSelect.selectedIndex].text}`;
  }

  // Generate report HTML
  const html = await renderReport(variant, dataState);

  // Create or reuse iframe
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.title = "Report Preview";
    viewportDiv.appendChild(iframe);
  }

  // Write into iframe
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  // Auto-resize iframe height
  const resize = () => {
    if (!iframe) return;
    const h = doc.documentElement?.scrollHeight ?? doc.body?.scrollHeight ?? 600;
    iframe.style.height = `${h + 20}px`;
  };

  // Observe size changes (images loading etc.)
  new ResizeObserver(resize).observe(doc.body);
  resize();
}

// Print button opens the report in a new window for printing
printBtn.addEventListener("click", () => {
  const variant = variantSelect.value;
  const dataState = dataSelect.value;
  renderReport(variant, dataState).then((html) => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.print();
    }
  });
});

variantSelect.addEventListener("change", update);
dataSelect.addEventListener("change", update);
viewportSelect.addEventListener("change", update);

// Initial render
update();
