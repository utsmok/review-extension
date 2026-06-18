/**
 * Generate a real standalone report HTML file for visual/interaction QA.
 * Run: pnpm exec vite-node scripts/gen-standalone.ts
 *
 * Produces report-dev/standalone-report.html with evidence + unlinked
 * captures + quickNotes so the lightbox/popover/quick-notes paths are
 * exercisable in a real browser tab (not the preview app's doc.write iframe).
 */
import { writeFileSync } from "node:fs";
import trustFull from "../data/rubrics/trust-full.json";
import { buildHtmlReport } from "../lib/html-report";
import type {
  Capture,
  Evaluation,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "../lib/types";

const RUBRIC = trustFull as unknown as RubricData;

// Tiny solid PNG data URLs (blue / green / violet).
const SHOTS = [
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAS0lEQVR4AdXBAQEAIAyAME4XkxnfED4H25z7PmESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3EStxZaArLmCZTIAAAAAElFTkSuQmCC",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAS0lEQVR4AdXBAQEAIAyAME4IQ1nToD4H25x3P2ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESt4knAkJZMDZ0AAAAAElFTkSuQmCC",
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgCAYAAABU1PscAAAAS0lEQVR4AdXBAQEAIAyAME4lo9rSEj4H29zzPmESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESJ3ESt9Y6Au9GOyggAAAAAElFTkSuQmCC",
];

const metadata: SessionMetadata = {
  id: "gen-standalone",
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
};

function makeCapture(i: number, over: Partial<Capture> = {}): Capture {
  return {
    id: `cap-${i}`,
    timestamp: "2025-11-15T10:01:00.000Z",
    sourceUrl: "https://scholarai.example.com/results?q=machine+learning",
    pageTitle: ["Search results page", "Paper detail view", "Settings panel"][i] ?? "Capture",
    screenshotBase64: SHOTS[i % SHOTS.length],
    htmlContent: "",
    notes: ["Default search for 'machine learning'", "Clicked on first result", ""][i] ?? "",
    ...over,
  };
}

function allIds(section: "quality_gate" | "scoring_rubric"): string[] {
  const ids: string[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC[section])) {
    for (const qKey of Object.keys(questions as Record<string, unknown>)) {
      ids.push(`${cat}.${qKey}`);
    }
  }
  return ids;
}

const captures: Capture[] = [makeCapture(0), makeCapture(1), makeCapture(2)];

const evals: Evaluation[] = [
  ...allIds("quality_gate").map((id, i) => ({
    rubricId: id,
    score: (i === 0 ? "fail" : "pass") as Evaluation["score"],
    notes: "",
    explicitEvidenceIds: [] as string[],
  })),
  ...allIds("scoring_rubric").map((id, i) => ({
    rubricId: id,
    score: (i % 3 === 0 ? 2 : 3) as Evaluation["score"],
    notes: "",
    explicitEvidenceIds: [] as string[],
  })),
];
// Link evidence to a few scoring questions; leave capture[2] unlinked (Additional Evidence).
const scoringIds = allIds("scoring_rubric");
const byId = (id: string) => evals.find((e) => e.rubricId === id)!;
byId(scoringIds[1] ?? scoringIds[0]).explicitEvidenceIds = [captures[0].id];
byId(scoringIds[4] ?? scoringIds[1]).explicitEvidenceIds = [captures[1].id];

const finalization: ReviewFinalization = {
  grade: "pass",
  conclusion:
    "ScholarAI demonstrates strong transparency and reliability with minor gaps in data source disclosure.",
  strengths: ["Clear citation of sources", "Responsive interface", "Good biomedical coverage"],
  weaknesses: ["Limited transparency about ranking algorithm", "No API rate limit disclosure"],
  recommendations:
    "Improve algorithm transparency documentation. Consider adding rate limit information.",
  finalizedAt: "2025-11-15T12:00:00.000Z",
};

const quickNotes = [
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
];

const html = await buildHtmlReport(
  metadata,
  captures,
  evals,
  RUBRIC,
  finalization,
  { name: "Dr. Jane Reviewer", email: "reviewer@university.edu" },
  quickNotes,
);

writeFileSync("report-dev/standalone-report.html", html);
console.log(`Wrote report-dev/standalone-report.html (${html.length} bytes)`);
