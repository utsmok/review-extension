// @vitest-environment jsdom
/**
 * Generate standalone report HTML files for visual auditing.
 * Run: pnpm vitest run tests/report-generate.test.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import trustFull from "@/data/rubrics/trust-full.json";
import { buildBusinessCardLabel, buildHtmlReport, buildNutritionLabel } from "@/lib/html-report";
import type {
  Capture,
  Evaluation,
  ReviewFinalization,
  RubricData,
  SessionMetadata,
} from "@/lib/types";

vi.mock("@/lib/logos", () => ({
  TRUST_LOGO: "data:image/svg+xml,trust",
  LISA_EIS_LOGO: "data:image/svg+xml,lisa",
  UT_LOGO: "data:image/svg+xml,ut",
}));

const RUBRIC = trustFull as unknown as RubricData;
const OUT = resolve(import.meta.dirname, "..", "report-dev", "audit");

function makeMetadata(): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "ScholarAI",
    toolUrl: "https://scholarai.example.com/search",
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
}

function makeCapture(n: number): Capture {
  return {
    id: crypto.randomUUID(),
    timestamp: `2025-11-15T10:0${n}:00.000Z`,
    sourceUrl: `https://scholarai.example.com/results?q=test+page+${n}`,
    pageTitle: `Test Page ${n}`,
    screenshotBase64: "",
    htmlContent: "",
    notes: n === 1 ? "Default search results" : "",
  };
}

function qgIds(): string[] {
  const ids: string[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC.quality_gate)) {
    for (const qKey of Object.keys(questions as Record<string, unknown>)) {
      ids.push(`${cat}.${qKey}`);
    }
  }
  return ids;
}

function scoringIds(): string[] {
  const ids: string[] = [];
  for (const [cat, questions] of Object.entries(RUBRIC.scoring_rubric)) {
    for (const qKey of Object.keys(questions as Record<string, unknown>)) {
      ids.push(`${cat}.${qKey}`);
    }
  }
  return ids;
}

const generated = new Map<string, string>();

describe("Report generation for audit", () => {
  const metadata = makeMetadata();
  const captures = [makeCapture(1), makeCapture(2), makeCapture(3)];

  it("generates complete full report", async () => {
    const evaluations: Evaluation[] = [
      ...qgIds().map((id) => ({
        rubricId: id,
        score: "pass" as const,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
      ...scoringIds().map((id, i) => ({
        rubricId: id,
        score: (i % 3 === 0 ? 2 : 3) as 2 | 3,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
    ];
    const finalization: ReviewFinalization = {
      grade: "pass",
      conclusion: "ScholarAI demonstrates strong transparency and reliability with minor gaps.",
      strengths: ["Clear citation of sources", "Responsive interface", "Good coverage"],
      weaknesses: ["Limited algorithm transparency", "No rate limit disclosure"],
      recommendations: "Improve algorithm transparency documentation.",
      finalizedAt: "2025-11-15T12:00:00.000Z",
    };
    const html = await buildHtmlReport(metadata, captures, evaluations, RUBRIC, finalization, {
      name: "Dr. Jane Reviewer",
    });
    expect(html).toContain("<!DOCTYPE html>");
    generated.set("full-report.html", html);
  });

  it("generates nutrition label", async () => {
    const evaluations: Evaluation[] = [
      ...qgIds().map((id) => ({
        rubricId: id,
        score: "pass" as const,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
      ...scoringIds().map((id, i) => ({
        rubricId: id,
        score: (i % 3 === 0 ? 2 : 3) as 2 | 3,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
    ];
    const finalization: ReviewFinalization = {
      grade: "pass",
      conclusion: "Strong tool.",
      strengths: ["Good"],
      weaknesses: ["Bad"],
      recommendations: "Improve.",
      finalizedAt: "2025-11-15T12:00:00.000Z",
    };
    const html = await buildNutritionLabel(metadata, evaluations, RUBRIC, finalization);
    expect(html).toContain("<!DOCTYPE html>");
    generated.set("nutrition-label.html", html);
  });

  it("generates business card label", async () => {
    const evaluations: Evaluation[] = [
      ...qgIds().map((id) => ({
        rubricId: id,
        score: "pass" as const,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
      ...scoringIds().map((id, i) => ({
        rubricId: id,
        score: (i % 3 === 0 ? 2 : 3) as 2 | 3,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
    ];
    const finalization: ReviewFinalization = {
      grade: "pass",
      conclusion: "Strong tool.",
      strengths: ["Good"],
      weaknesses: ["Bad"],
      recommendations: "Improve.",
      finalizedAt: "2025-11-15T12:00:00.000Z",
    };
    const html = await buildBusinessCardLabel(metadata, evaluations, RUBRIC, finalization);
    expect(html).toContain("<!DOCTYPE html>");
    generated.set("business-card.html", html);
  });

  it("generates partial report", async () => {
    const partialEvals: Evaluation[] = [
      {
        rubricId: "privacy_and_security.data_privacy",
        score: "pass",
        notes: "",
        explicitEvidenceIds: [],
      },
      { rubricId: "TR.data_source_clarity", score: 2, notes: "", explicitEvidenceIds: [] },
      {
        rubricId: "TR.attribution",
        score: 1,
        notes: "Only partial attribution",
        explicitEvidenceIds: [],
      },
    ];
    const html = await buildHtmlReport(metadata, captures, partialEvals, RUBRIC, null);
    expect(html).toContain("<!DOCTYPE html>");
    generated.set("partial-report.html", html);
  });

  it("generates failed-QG report", async () => {
    const failedEvals: Evaluation[] = [
      { rubricId: qgIds()[0], score: "fail", notes: "", explicitEvidenceIds: [] },
      { rubricId: qgIds()[1], score: "pass", notes: "", explicitEvidenceIds: [] },
      ...scoringIds().map((id) => ({
        rubricId: id,
        score: 3 as const,
        notes: "",
        explicitEvidenceIds: [] as string[],
      })),
    ];
    const html = await buildHtmlReport(metadata, captures, failedEvals, RUBRIC, null);
    expect(html).toContain("<!DOCTYPE html>");
    generated.set("failed-qg-report.html", html);
  });
});

afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  for (const [name, html] of generated) {
    writeFileSync(resolve(OUT, name), html);
  }
  console.log(`\nGenerated ${generated.size} report files in ${OUT}`);
});
