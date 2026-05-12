/**
 * Benchmark: measure the size of the exported ZIP blob.
 *
 * Run via: bash autoresearch.sh
 * Metric: METRIC zip_bytes=<value>
 */
import { describe, expect, it } from "vitest";
import { exportSession } from "@/lib/export";
import {
  makeMetadata,
  makeCapture,
  makeEvaluation,
  makeFinalization,
  RUBRIC,
} from "./fixtures/index";
import { v4 as uuid } from "uuid";

function buildSession() {
  const metadata = makeMetadata({ toolName: "Google Scholar" });

  const captures = [];
  for (let i = 0; i < 5; i++) {
    captures.push(
      makeCapture({
        id: uuid(),
        sourceUrl: `https://scholar.google.com/scholar?q=deep+learning+page${i}`,
        pageTitle: `Deep Learning Results - Page ${i}`,
        htmlContent: `<!DOCTYPE html><html><head><title>Page ${i}</title><style>body{font-family:sans-serif;margin:2em}h1{color:#333}.result{border-bottom:1px solid #ddd;padding:1em 0}.title{font-weight:bold}.snippet{color:#555}.url{color:green;font-size:0.9em}</style></head><body><h1>Scholar Results for "deep learning" — Page ${i}</h1>${Array.from({ length: 10 }, (_, j) => `<div class="result"><div class="title">Paper ${j}: Advances in Neural Information Processing Systems</div><div class="url">https://papers.nips.cc/paper/${i * 10 + j}</div><div class="snippet">We present a novel approach to deep reinforcement learning that achieves state-of-the-art results on multiple benchmark tasks including Atari games and continuous control problems.</div></div>`).join("")}</body></html>`,
      }),
    );
  }

  const evaluations = [
    makeEvaluation({
      rubricId: "TR.data_source_clarity",
      score: 2,
      notes: "Multiple databases listed but sources not individually documented",
      explicitEvidenceIds: [captures[0].id],
    }),
    makeEvaluation({
      rubricId: "TR.search_method_transparency",
      score: 3,
      notes: "Boolean operators, filters, and sorting all documented",
      explicitEvidenceIds: [captures[1].id, captures[2].id],
    }),
    makeEvaluation({
      rubricId: "TR.result_presentation",
      score: 1,
      notes: "Results shown in a simple list with minimal metadata",
      explicitEvidenceIds: [],
    }),
    makeEvaluation({
      rubricId: "SE.algorithmic_fairness",
      score: 2,
      notes: "No information about ranking algorithm fairness",
      explicitEvidenceIds: [captures[3].id],
    }),
    makeEvaluation({
      rubricId: "RE.variance_consistency",
      score: "na",
      notes: "Single search session, variance not applicable",
      explicitEvidenceIds: [],
    }),
    makeEvaluation({
      rubricId: "SE.index_coverage",
      score: 3,
      notes: "Claims to index 389 million articles across many publishers",
      explicitEvidenceIds: [captures[4].id],
    }),
  ];

  const finalization = makeFinalization({
    grade: "conditional",
    conclusion:
      "Google Scholar provides good coverage and search capabilities but lacks transparency in ranking methodology.",
    strengths: ["Large index", "Good search operators", "Citation tracking"],
    weaknesses: ["Opaque ranking algorithm", "No API documentation for search"],
    recommendations:
      "Use as primary tool but supplement with manual verification of result ordering bias.",
  });

  return { metadata, captures, evaluations, finalization };
}

describe("export size benchmark", () => {
  it("measures ZIP export size", async () => {
    const { metadata, captures, evaluations, finalization } = buildSession();
    const blob = await exportSession(metadata, captures, evaluations, RUBRIC, finalization);

    // Break down uncompressed sizes for diagnosis
    const sessionJson = JSON.stringify({ metadata, captures, evaluations, finalization });
    const csvDups = [metadata, evaluations, captures, finalization]
      .map((v) => JSON.stringify(v).length)
      .reduce((a, b) => a + b, 0);

    // Print the metric line for the harness to parse
    console.log(`METRIC zip_bytes=${blob.size}`);
    console.log(`ASI session_json_bytes=${sessionJson.length}`);
    console.log(`ASI csv_duplication_estimate=${csvDups}`);
    console.log(`  Captures: ${captures.length}`);
    console.log(`  Evaluations: ${evaluations.length}`);
    console.log(`  Has finalization: true`);

    // Sanity check: blob must be non-trivial
    expect(blob.size).toBeGreaterThan(1000);
  });
});
