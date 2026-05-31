/**
 * LLM-powered rewrite step for TRUST rubric content improvement.
 *
 * Takes a measurement report + current rubric, identifies weakest questions,
 * and proposes rewrites for flagged fields.
 */

import type {
  RubricData,
  ScoringQuestion,
  QualityGateQuestion,
  QuestionMeasurement,
  RewriteProposal,
  RewriteResult,
} from "./types.ts";

const REWRITE_SYSTEM_PROMPT = `You are an expert rubric designer for academic tool evaluation frameworks. You improve evaluation rubrics used by academic librarians.

Your guiding quality standards:

## Background Text
Each question's background field must answer three questions in this order:
1. Why this matters — 1–2 sentences establishing the academic rationale
2. What to look for — concrete, actionable evaluation instructions (not abstract principles)
3. Edge cases / N/A conditions — when the question does not apply, and why

Anti-patterns to avoid:
- Mixing motivation with evaluation instructions in the same paragraph
- Repeating the score-level descriptions in the background
- Writing for an AI researcher instead of a librarian
- Omitting N/A conditions

Target: ≤150 words. Clear instructional/evaluation split.

## Score-Level Descriptions (0, 1, 2, 3)
Each score level must:
- Describe OBSERVABLE BEHAVIOR, not abstract quality ("links resolve to the specific article" not "good attribution")
- Be DISCRIMINATING — a reviewer can distinguish level 2 from level 3 without re-reading
- Be approximately EQUAL IN DETAIL across all 4 levels (no one-sentence level 2 next to a paragraph level 3)
- Use QUALITATIVE THRESHOLDS, not just quantity

## Examples
Each example must:
- Describe a concrete, realistic scenario — a specific tool behavior a reviewer could actually observe
- Be anchored to observable evidence — "the privacy policy states..." not "the tool seems to..."
- Cover the boundary between adjacent levels, not just the easy cases

## Critical Rules
- Preserve the scoring semantics. A score of 2 must mean approximately the same thing before and after the rewrite.
- Do NOT change the title.
- Do NOT change the ai_only flag.
- Keep the JSON structure identical.
- Respond with ONLY the rewritten field value as plain text. No JSON wrapping, no markdown, no explanation.`;

function buildRewritePrompt(
  questionKey: string,
  question: ScoringQuestion,
  field: string,
  flags: string[],
): string {
  const currentValue =
    field === "background" ? question.background : question[field as "0" | "1" | "2" | "3"];

  const surroundingContext: string[] = [];
  if (field === "background") {
    surroundingContext.push(`Title: ${question.title}`);
    for (const lv of ["0", "1", "2", "3"] as const) {
      surroundingContext.push(`Score ${lv}: ${question[lv]}`);
    }
  } else {
    surroundingContext.push(`Title: ${question.title}`);
    surroundingContext.push(`Background: ${question.background}`);
    for (const lv of ["0", "1", "2", "3"] as const) {
      if (lv !== field) {
        surroundingContext.push(`Score ${lv}: ${question[lv]}`);
      }
    }
  }

  return `Improve the following rubric field.

Question: ${questionKey} ("${question.title}")
Field to rewrite: ${field}
Current value (${wordCount(currentValue)} words):
"""
${currentValue}
"""

Context (other fields in this question):
${surroundingContext.join("\n")}

Issues detected:
${flags.map((f) => `- ${f}`).join("\n")}

Rewrite the ${field} field to address the issues above. Maintain the same scoring semantics. Output ONLY the rewritten text.`;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Determine which fields to rewrite for a question based on its flags.
 */
function identifyFieldsToRewrite(
  measurement: QuestionMeasurement,
): { field: string; flags: string[] }[] {
  const fieldFlags: Record<string, string[]> = {};

  for (const flag of measurement.flags) {
    // Map flag metric to field
    let field: string | null = null;
    if (flag.metric.startsWith("background.")) {
      field = "background";
    } else if (flag.metric === "score.balance") {
      // Rewrite all levels to fix balance
      for (const lv of ["0", "1", "2", "3"]) {
        if (!fieldFlags[lv]) fieldFlags[lv] = [];
        fieldFlags[lv].push(flag.message);
      }
      continue;
    } else if (flag.metric === "score.behavioral") {
      // Rewrite only the non-behavioral levels
      const nonBehavioral = measurement.heuristicGrounding.levels
        .filter((l) => !l.isBehavioral)
        .map((l) => l.level);
      for (const lv of nonBehavioral) {
        if (!fieldFlags[lv]) fieldFlags[lv] = [];
        fieldFlags[lv].push(flag.message);
      }
      continue;
    } else if (flag.metric === "examples.coverage") {
      // Examples are not rewritten by this step — they need manual creation
      continue;
    }

    if (field) {
      if (!fieldFlags[field]) fieldFlags[field] = [];
      fieldFlags[field].push(flag.message);
    }
  }

  return Object.entries(fieldFlags).map(([field, flags]) => ({ field, flags }));
}

/**
 * Rewrite a single question's flagged fields using the LLM.
 */
export async function rewriteQuestion(
  questionKey: string,
  question: ScoringQuestion,
  measurement: QuestionMeasurement,
  llmFn: (prompt: string, system?: string) => Promise<string>,
): Promise<RewriteProposal[]> {
  const fieldsToRewrite = identifyFieldsToRewrite(measurement);
  const proposals: RewriteProposal[] = [];

  for (const { field, flags } of fieldsToRewrite) {
    const prompt = buildRewritePrompt(questionKey, question, field, flags);

    try {
      const proposed = await llmFn(prompt, REWRITE_SYSTEM_PROMPT);

      // Clean up — remove markdown wrapping if present
      let cleaned = proposed.trim();
      if (cleaned.startsWith('"""')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('"""')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      const original =
        field === "background" ? question.background : question[field as "0" | "1" | "2" | "3"];

      // Only propose if meaningfully different (not just whitespace)
      if (cleaned !== original && cleaned.length > 10) {
        proposals.push({
          ref: measurement.ref,
          field,
          original,
          proposed: cleaned,
          rationale: flags.join("; "),
        });
      }
    } catch {
      // Skip failed rewrites
    }
  }

  return proposals;
}

/**
 * Apply accepted proposals to a deep clone of the rubric.
 */
export function applyProposals(
  rubric: RubricData,
  proposals: RewriteProposal[],
  acceptedKeys: Set<string>,
): RubricData {
  const updated = structuredClone(rubric);

  for (const proposal of proposals) {
    const key = `${proposal.ref.principle}.${proposal.ref.questionKey}.${proposal.field}`;
    if (!acceptedKeys.has(key)) continue;

    const { principle, questionKey } = proposal.ref;

    if (proposal.ref.kind === "scoring") {
      const question = updated.scoring_rubric[principle]?.[questionKey];
      if (!question) continue;

      if (proposal.field === "background") {
        question.background = proposal.proposed;
      } else if (["0", "1", "2", "3"].includes(proposal.field)) {
        (question as Record<string, unknown>)[proposal.field] = proposal.proposed;
      }
    }
    // Quality gate questions not rewritten in this iteration
  }

  return updated;
}

/**
 * Full rewrite pass: identify weakest questions, rewrite their flagged fields.
 */
export async function rewritePass(
  rubric: RubricData,
  report: QuestionMeasurement[],
  llmFn: (prompt: string, system?: string) => Promise<string>,
  maxQuestions?: number,
): Promise<RewriteResult> {
  // Sort by flag count, focus on questions with the most issues
  const candidates = [...report]
    .filter((q) => q.flags.length > 0)
    .sort((a, b) => b.flags.length - a.flags.length);

  const toRewrite = maxQuestions ? candidates.slice(0, maxQuestions) : candidates;

  const allProposals: RewriteProposal[] = [];

  for (const measurement of toRewrite) {
    if (measurement.ref.kind !== "scoring") continue;

    const { principle, questionKey } = measurement.ref;
    const question = rubric.scoring_rubric[principle]?.[questionKey];
    if (!question) continue;

    const proposals = await rewriteQuestion(
      `${principle}.${questionKey}`,
      question,
      measurement,
      llmFn,
    );
    allProposals.push(...proposals);
  }

  // Auto-accept all proposals (the loop harness handles rollback)
  const acceptedKeys = new Set(
    allProposals.map((p) => `${p.ref.principle}.${p.ref.questionKey}.${p.field}`),
  );
  const updatedRubric = applyProposals(rubric, allProposals, acceptedKeys);

  return { proposals: allProposals, updatedRubric };
}
