/**
 * Autoresearch loop harness for TRUST rubric improvement.
 *
 * Orchestrates: measure → rewrite → measure → compare → accept/rollback
 *
 * Usage (via eval tool):
 *   import { runLoop } from "./tools/loop.ts";
 *   const result = await runLoop(llm, { maxIterations: 3 });
 */

import type { RubricData, MeasurementReport, IterationState, RewriteProposal } from "./types.ts";
import { measureRubric, formatReport } from "./measure-static.ts";
import { runLLMMeasurements, measureBoundaryDiscrimination } from "./measure-llm.ts";
import { rewritePass, applyProposals } from "./rewrite.ts";

// ── Load/save rubric ──

function loadRubric(): RubricData {
  // @ts-ignore — running in eval context with fs access
  const fs = require("fs");
  const path = require("path");
  const rubricPath = path.join(process.cwd(), "data/rubrics/trust-full.json");
  const raw = fs.readFileSync(rubricPath, "utf-8");
  return JSON.parse(raw);
}

function saveRubric(rubric: RubricData, filePath: string): void {
  // @ts-ignore
  const fs = require("fs");
  const content = JSON.stringify(rubric, null, 2) + "\n";
  fs.writeFileSync(filePath, content, "utf-8");
}

function saveReport(report: MeasurementReport, filePath: string): void {
  // @ts-ignore
  const fs = require("fs");
  const content = formatReport(report);
  fs.writeFileSync(filePath, content, "utf-8");
}

function saveJSON(data: unknown, filePath: string): void {
  // @ts-ignore
  const fs = require("fs");
  const content = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, content, "utf-8");
}

// ── Delta computation ──

function computeDelta(
  before: MeasurementReport,
  after: MeasurementReport,
): IterationState["delta"] {
  let flagsReduced = 0;
  const metricsImproved: string[] = [];
  const metricsRegressed: string[] = [];

  // Compare per-question metrics
  for (const bq of before.questions) {
    const key = `${bq.ref.principle}.${bq.ref.questionKey}`;
    const aq = after.questions.find((q) => `${q.ref.principle}.${q.ref.questionKey}` === key);
    if (!aq) continue;

    // Flags reduced
    flagsReduced += bq.flags.length - aq.flags.length;

    // Background word count
    if (aq.background.wordCount < bq.background.wordCount) {
      metricsImproved.push(`${key}.background.length`);
    } else if (aq.background.wordCount > bq.background.wordCount) {
      metricsRegressed.push(`${key}.background.length`);
    }

    // Balance
    if (aq.balance.isBalanced && !bq.balance.isBalanced) {
      metricsImproved.push(`${key}.balance`);
    } else if (!aq.balance.isBalanced && bq.balance.isBalanced) {
      metricsRegressed.push(`${key}.balance`);
    }

    // Behavioral grounding
    if (aq.heuristicGrounding.behavioralFraction > bq.heuristicGrounding.behavioralFraction) {
      metricsImproved.push(`${key}.behavioral`);
    } else if (
      aq.heuristicGrounding.behavioralFraction < bq.heuristicGrounding.behavioralFraction
    ) {
      metricsRegressed.push(`${key}.behavioral`);
    }
  }

  return { flagsReduced, metricsImproved, metricsRegressed };
}

// ── Main loop ──

export interface LoopOptions {
  /** Maximum iterations (default: 2) */
  maxIterations?: number;
  /** Maximum questions to rewrite per iteration (default: 5) */
  maxQuestionsPerIteration?: number;
  /** Whether to run LLM boundary discrimination (expensive) */
  runBoundaryTest?: boolean;
  /** Whether to run LLM grounding assessment */
  runLLMGrounding?: boolean;
  /** LLM function from eval tool */
  llmFn: (prompt: string, system?: string) => Promise<string>;
  /** Output directory for reports (default: tools/output) */
  outputDir?: string;
}

export async function runLoop(options: LoopOptions): Promise<IterationState[]> {
  const {
    maxIterations = 2,
    maxQuestionsPerIteration = 5,
    runBoundaryTest = false,
    runLLMGrounding = false,
    llmFn,
    outputDir = "tools/output",
  } = options;

  // @ts-ignore
  const fs = require("fs");
  // @ts-ignore
  const path = require("path");

  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });

  const iterations: IterationState[] = [];
  let currentRubric = loadRubric();

  for (let i = 0; i < maxIterations; i++) {
    console.log(`\n=== Iteration ${i + 1} ===\n`);

    // ── Measure ──
    console.log("Measuring current rubric...");
    const beforeReport = measureRubric(currentRubric);
    saveReport(beforeReport, path.join(outputDir, `iter-${i + 1}-before.md`));
    saveJSON(beforeReport, path.join(outputDir, `iter-${i + 1}-before.json`));
    console.log(
      `  Flags: ${beforeReport.summary.totalFlags} (${beforeReport.summary.flagsBySeverity.fail || 0} fail, ${beforeReport.summary.flagsBySeverity.warning || 0} warning, ${beforeReport.summary.flagsBySeverity.info || 0} info)`,
    );

    // Optionally run LLM measurements
    let enrichedReport = beforeReport;
    if (runBoundaryTest || runLLMGrounding) {
      console.log("Running LLM measurements...");
      enrichedReport = await runLLMMeasurements(beforeReport, currentRubric, llmFn, {
        skipBoundary: !runBoundaryTest,
        skipGrounding: !runLLMGrounding,
      });
      saveJSON(enrichedReport, path.join(outputDir, `iter-${i + 1}-llm.json`));
    }

    // ── Check convergence ──
    if (beforeReport.summary.totalFlags === 0) {
      console.log("No flags remaining — converged!");
      iterations.push({
        iteration: i + 1,
        beforeReport: enrichedReport,
        accepted: [],
        rolledBack: [],
      });
      break;
    }

    // ── Rewrite ──
    console.log(`Rewriting up to ${maxQuestionsPerIteration} weakest questions...`);
    const rewriteResult = await rewritePass(
      currentRubric,
      enrichedReport.questions,
      llmFn,
      maxQuestionsPerIteration,
    );
    console.log(`  Generated ${rewriteResult.proposals.length} rewrite proposals`);

    if (rewriteResult.proposals.length === 0) {
      console.log("No rewrites proposed — stopping.");
      iterations.push({
        iteration: i + 1,
        beforeReport: enrichedReport,
        rewrites: rewriteResult,
        accepted: [],
        rolledBack: [],
      });
      break;
    }

    // ── Re-measure ──
    console.log("Re-measuring after rewrites...");
    const afterReport = measureRubric(rewriteResult.updatedRubric);
    saveReport(afterReport, path.join(outputDir, `iter-${i + 1}-after.md`));
    saveJSON(afterReport, path.join(outputDir, `iter-${i + 1}-after.json`));

    // ── Compare ──
    const delta = computeDelta(enrichedReport, afterReport);
    console.log(`  Flags reduced: ${delta.flagsReduced}`);
    console.log(`  Improved: ${delta.metricsImproved.length} metrics`);
    console.log(`  Regressed: ${delta.metricsRegressed.length} metrics`);

    // ── Accept/rollback ──
    // Auto-accept if net improvement; rollback regressed questions
    const accepted: string[] = [];
    const rolledBack: string[] = [];

    if (delta.flagsReduced > 0) {
      // Accept all proposals (net improvement)
      currentRubric = rewriteResult.updatedRubric;
      for (const p of rewriteResult.proposals) {
        accepted.push(`${p.ref.principle}.${p.ref.questionKey}.${p.field}`);
      }

      // Roll back specific regressed questions
      for (const regressed of delta.metricsRegressed) {
        // Don't rollback the whole question, just note it
        rolledBack.push(regressed);
      }
    } else {
      // Net regression — roll back everything
      rolledBack.push(
        ...rewriteResult.proposals.map((p) => `${p.ref.principle}.${p.ref.questionKey}.${p.field}`),
      );
      console.log("  Net regression detected — rolling back all rewrites.");
    }

    iterations.push({
      iteration: i + 1,
      beforeReport: enrichedReport,
      afterReport,
      rewrites: rewriteResult,
      accepted,
      rolledBack,
      delta,
    });

    // Check if we're making progress
    if (delta.flagsReduced <= 0) {
      console.log("No improvement in this iteration — stopping loop.");
      break;
    }
  }

  // ── Save final rubric ──
  const finalPath = path.join(outputDir, "rubric-improved.json");
  saveRubric(currentRubric, finalPath);
  console.log(`\nFinal rubric saved to: ${finalPath}`);

  // ── Summary ──
  const summaryPath = path.join(outputDir, "loop-summary.txt");
  const summaryLines: string[] = [
    "TRUST Rubric Improvement Loop — Summary",
    "=".repeat(40),
    "",
    `Iterations: ${iterations.length}`,
    "",
  ];
  for (const iter of iterations) {
    summaryLines.push(`--- Iteration ${iter.iteration} ---`);
    summaryLines.push(`  Flags before: ${iter.beforeReport.summary.totalFlags}`);
    if (iter.afterReport) {
      summaryLines.push(`  Flags after: ${iter.afterReport.summary.totalFlags}`);
    }
    if (iter.delta) {
      summaryLines.push(`  Net flags reduced: ${iter.delta.flagsReduced}`);
      summaryLines.push(
        `  Improved: ${iter.delta.metricsImproved.length}, Regressed: ${iter.delta.metricsRegressed.length}`,
      );
    }
    summaryLines.push(`  Accepted: ${iter.accepted.length} rewrites`);
    summaryLines.push(`  Rolled back: ${iter.rolledBack.length}`);
    summaryLines.push("");
  }
  // @ts-ignore
  fs.writeFileSync(summaryPath, summaryLines.join("\n"), "utf-8");

  return iterations;
}

// ── Baseline-only run (no rewriting, just measurement) ──

export async function runBaseline(
  llmFn?: (prompt: string, system?: string) => Promise<string>,
  outputDir?: string,
): Promise<MeasurementReport> {
  // @ts-ignore
  const path = require("path");
  const out = outputDir ?? "tools/output";

  // @ts-ignore
  const fs = require("fs");
  fs.mkdirSync(out, { recursive: true });

  const rubric = loadRubric();
  const report = measureRubric(rubric);

  saveReport(report, path.join(out, "baseline.md"));
  saveJSON(report, path.join(out, "baseline.json"));

  // Optionally enrich with LLM measurements
  if (llmFn) {
    console.log("Running LLM boundary discrimination test...");
    const enriched = await runLLMMeasurements(report, rubric, llmFn, {
      skipGrounding: false,
      skipBoundary: false,
    });
    saveJSON(enriched, path.join(out, "baseline-llm.json"));

    // Print boundary test results
    for (const q of enriched.questions) {
      if (q.ref.kind !== "scoring" || !q.boundaryDiscrimination) continue;
      const bd = q.boundaryDiscrimination;
      if (bd.weakBoundaries.length > 0) {
        console.log(
          `  ${q.ref.principle}.${q.ref.questionKey}: weak boundaries: ${bd.weakBoundaries.join(", ")}`,
        );
      }
    }

    return enriched;
  }

  return report;
}
