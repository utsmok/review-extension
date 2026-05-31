/**
 * LLM-based measurements for TRUST rubric content.
 *
 * 1. Boundary discrimination: generate synthetic tool profiles at boundary levels,
 *    have an LLM score them, measure consistency.
 * 2. Behavioral grounding: have an LLM judge whether each score description
 *    describes observable behavior or abstract quality.
 *
 * Uses the eval tool's llm() function.
 */

import type {
  ScoringQuestion,
  QuestionMeasurement,
  BoundaryDiscriminationMetrics,
  BoundaryTestResult,
  LLMGroundingAssessment,
  MeasurementReport,
} from "./types.ts";

// ── Boundary discrimination ──

/**
 * Generate a synthetic tool profile description for a given question + target score level.
 * The profile is designed to sit right at the boundary between targetLevel and targetLevel+1.
 */
function generateBoundaryProfile(question: ScoringQuestion, targetLevel: string): string {
  const title = question.title;
  const lowerDesc = question[targetLevel as keyof ScoringQuestion] as unknown as string;
  const nextLevel = String(Number(targetLevel) + 1);
  const higherDesc = question[nextLevel as keyof ScoringQuestion] as unknown as string;

  if (!higherDesc) {
    // No higher level — generate a profile clearly at this level
    return `You are evaluating an academic search tool called "ScholarSearch Pro" on the criterion "${title}". 
The tool's behavior is: ${lowerDesc}
Generate a realistic evaluation scenario where the tool exhibits this behavior. Be specific about what you observe.`;
  }

  return `You are evaluating an academic search tool called "ScholarSearch Pro" on the criterion "${title}".
The tool's behavior is at the boundary between score ${targetLevel} and score ${nextLevel}:
- Score ${targetLevel}: ${lowerDesc}
- Score ${nextLevel}: ${higherDesc}

Generate a realistic evaluation scenario where the tool's behavior is ambiguous — it could reasonably be scored ${targetLevel} or ${nextLevel}. Be specific about what you observe.`;
}

const SCORING_PROMPT = `You are an academic librarian evaluating an AI-powered search tool using the TRUST framework.
You will be given a scoring criterion with descriptions for levels 0, 1, 2, and 3.
Then you will be given a specific tool scenario.

Score the tool based ONLY on the score-level descriptions provided. Do not use outside knowledge.
Respond with ONLY a single digit: 0, 1, 2, or 3. No explanation.`;

/**
 * Run the boundary discrimination test for a single question.
 * Uses the eval tool's llm() function.
 */
export async function measureBoundaryDiscrimination(
  questionKey: string,
  question: ScoringQuestion,
  llmFn: (prompt: string, system?: string) => Promise<string>,
  runsPerProfile: number = 3,
): Promise<BoundaryDiscriminationMetrics> {
  const results: BoundaryTestResult[] = [];

  // Test each boundary pair (0→1, 1→2, 2→3)
  for (const targetLevel of ["0", "1", "2"]) {
    const nextLevel = String(Number(targetLevel) + 1);

    // Build the score descriptions text
    const descriptionsText = [
      `Criterion: ${question.title}`,
      `Score 0: ${question["0"]}`,
      `Score 1: ${question["1"]}`,
      `Score 2: ${question["2"]}`,
      `Score 3: ${question["3"]}`,
    ].join("\n");

    // Generate a boundary profile
    const profilePrompt = generateBoundaryProfile(question, targetLevel);

    const fullPrompt = `${descriptionsText}\n\n---\n${profilePrompt}`;
    const systemPrompt = SCORING_PROMPT;

    // Run multiple times
    const assignedScores: string[] = [];
    for (let i = 0; i < runsPerProfile; i++) {
      try {
        const raw = await llmFn(fullPrompt, systemPrompt);
        // Extract just the digit
        const match = raw.trim().match(/^[0-3]$/);
        if (match) {
          assignedScores.push(match[0]);
        } else {
          // Try to find a digit anywhere in the response
          const looseMatch = raw.trim().match(/([0-3])/);
          assignedScores.push(looseMatch ? looseMatch[1] : "?");
        }
      } catch {
        assignedScores.push("?");
      }
    }

    // Calculate variance
    const numericScores = assignedScores.map(Number).filter((s) => !Number.isNaN(s));
    const isConsistent =
      numericScores.length > 0 && numericScores.every((s) => s === numericScores[0]);
    const maxVariance =
      numericScores.length > 1 ? Math.max(...numericScores) - Math.min(...numericScores) : 0;

    results.push({
      profile: `boundary ${targetLevel}→${nextLevel}`,
      targetLevel,
      assignedScores,
      isConsistent,
      maxVariance,
    });
  }

  const consistencyRate =
    results.length > 0 ? results.filter((r) => r.isConsistent).length / results.length : 0;
  const validResults = results.filter((r) => !r.assignedScores.includes("?"));
  const averageVariance =
    validResults.length > 0
      ? validResults.reduce((s, r) => s + r.maxVariance, 0) / validResults.length
      : 0;

  const weakBoundaries = results.filter((r) => !r.isConsistent).map((r) => r.profile);

  return {
    results,
    consistencyRate,
    averageVariance,
    weakBoundaries,
  };
}

// ── LLM-based behavioral grounding assessment ──

const GROUNDING_PROMPT = `You are an expert in evaluation rubric design. You will be given a score-level description from an evaluation rubric.

Judge whether the description describes:
A) **Observable behavior** — concrete actions, states, or features a reviewer could directly verify (e.g., "links resolve to the specific article", "the tool displays a retraction warning")
B) **Abstract quality** — vague, subjective assessments (e.g., "good quality", "comprehensive", "limited coverage")

Respond in JSON format:
{
  "is_behavioral": true/false,
  "reasoning": "one sentence explanation"
}

Only one object per description. Be strict — "the tool seems to" or "appears to" is NOT observable behavior.`;

export async function measureLLMGrounding(
  questionKey: string,
  question: ScoringQuestion,
  llmFn: (prompt: string, system?: string) => Promise<string>,
): Promise<LLMGroundingAssessment> {
  const levels: LLMGroundingAssessment["levels"] = [];

  for (const lv of ["0", "1", "2", "3"] as const) {
    const description = question[lv];
    const prompt = `Score level ${lv}:\n"${description}"`;

    try {
      const raw = await llmFn(prompt, GROUNDING_PROMPT);
      // Try to parse JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        levels.push({
          level: lv,
          isBehavioral: parsed.is_behavioral === true,
          reasoning: parsed.reasoning || "no reasoning provided",
        });
      } else {
        levels.push({
          level: lv,
          isBehavioral: false,
          reasoning: `Could not parse LLM response`,
        });
      }
    } catch {
      levels.push({
        level: lv,
        isBehavioral: false,
        reasoning: "LLM call failed",
      });
    }
  }

  const behavioralFraction = levels.filter((l) => l.isBehavioral).length / levels.length;

  return {
    levels,
    behavioralFraction,
    passes: behavioralFraction >= 0.8,
  };
}

// ── Run all LLM measurements on a report ──

export async function runLLMMeasurements(
  report: MeasurementReport,
  rubric: { scoring_rubric: Record<string, Record<string, ScoringQuestion>> },
  llmFn: (prompt: string, system?: string) => Promise<string>,
  options?: { skipBoundary?: boolean; skipGrounding?: boolean },
): Promise<MeasurementReport> {
  const updated = structuredClone(report);

  for (const q of updated.questions) {
    if (q.ref.kind !== "scoring") continue;

    const principle = q.ref.principle;
    const key = q.ref.questionKey;
    const question = rubric.scoring_rubric[principle]?.[key];
    if (!question) continue;

    if (!options?.skipBoundary) {
      q.boundaryDiscrimination = await measureBoundaryDiscrimination(
        `${principle}.${key}`,
        question,
        llmFn,
      );
    }

    if (!options?.skipGrounding) {
      q.llmGrounding = await measureLLMGrounding(`${principle}.${key}`, question, llmFn);
    }
  }

  return updated;
}
