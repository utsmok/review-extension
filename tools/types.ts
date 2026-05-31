/**
 * Types for the TRUST rubric measurement and improvement loop.
 */

// ── Rubric data model (mirrors data/rubrics/trust-full.json) ──

export interface QualityGateQuestion {
  type: "pass_fail";
  title: string;
  requirement: string;
  background: string;
  examples: { pass: string; fail: string };
  ai_only: boolean;
}

export interface ScoringQuestion {
  title: string;
  background: string;
  "0": string;
  "1": string;
  "2": string;
  "3": string;
  examples: Record<string, string>;
  ai_only: boolean;
  related_gate?: string;
  merged_gate?: boolean;
}

export interface RubricData {
  id: string;
  framework_name: string;
  version: string;
  quality_gate: Record<string, Record<string, QualityGateQuestion>>;
  scoring_rubric: Record<string, Record<string, ScoringQuestion>>;
}

// ── Question identifiers ──

export type QuestionKind = "quality_gate" | "scoring";

export interface QuestionRef {
  kind: QuestionKind;
  principle: string; // e.g. "TR", "RE", or group name for QGs
  questionKey: string; // e.g. "data_source_clarity"
  title: string;
}

// ── Static analysis metrics ──

export interface ScoreLevelMetrics {
  level: string; // "0" | "1" | "2" | "3"
  wordCount: number;
  charCount: number;
}

export interface BackgroundMetrics {
  wordCount: number;
  /** 0-1: fraction of text that is "what to look for" instructional content */
  instructionalRatio: number;
  /** Whether the background mentions N/A or "not applicable" conditions */
  hasNAConditions: boolean;
  /** Number of distinct instruction sentences (imperative verbs like "look for", "test", "review") */
  instructionCount: number;
}

export interface BalanceMetrics {
  levels: ScoreLevelMetrics[];
  averageWordCount: number;
  /** Min/avg ratio — flags if any level is < 50% of average */
  minRatio: number;
  /** Max/avg ratio — flags if any level is > 200% of average */
  maxRatio: number;
  isBalanced: boolean;
}

export interface BehavioralGroundingMetrics {
  /** Per-level: is the description describing observable behavior? */
  levels: { level: string; isBehavioral: boolean; reason: string }[];
  /** Fraction of levels that are behavioral */
  behavioralFraction: number;
  passes: boolean;
}

export interface ExampleCoverageMetrics {
  expectedLevels: string[];
  presentLevels: string[];
  missingLevels: string[];
  isComplete: boolean;
}

// ── LLM-based metrics ──

export interface BoundaryTestResult {
  /** The synthetic tool profile description */
  profile: string;
  /** What score the profile was designed to elicit */
  targetLevel: string;
  /** Scores the LLM assigned across runs */
  assignedScores: string[];
  /** Whether all runs agreed */
  isConsistent: boolean;
  /** Max deviation in score levels */
  maxVariance: number;
}

export interface BoundaryDiscriminationMetrics {
  results: BoundaryTestResult[];
  /** Fraction of profiles where the LLM was consistent */
  consistencyRate: number;
  /** Average variance across all profiles */
  averageVariance: number;
  /** Specific boundary pairs that are ambiguous */
  weakBoundaries: string[];
}

export interface LLMGroundingAssessment {
  levels: { level: string; isBehavioral: boolean; reasoning: string }[];
  behavioralFraction: number;
  passes: boolean;
}

// ── Per-question measurement report ──

export interface QuestionMeasurement {
  ref: QuestionRef;
  // Static metrics (always present)
  background: BackgroundMetrics;
  balance: BalanceMetrics;
  heuristicGrounding: BehavioralGroundingMetrics;
  examples: ExampleCoverageMetrics;
  // Flags from static analysis
  flags: MetricFlag[];
  // LLM metrics (present after LLM pass)
  boundaryDiscrimination?: BoundaryDiscriminationMetrics;
  llmGrounding?: LLMGroundingAssessment;
}

export interface MetricFlag {
  severity: "info" | "warning" | "fail";
  metric: string;
  message: string;
}

// ── Full report ──

export interface MeasurementReport {
  timestamp: string;
  rubricId: string;
  rubricVersion: string;
  questions: QuestionMeasurement[];
  summary: {
    totalQuestions: number;
    totalFlags: number;
    flagsBySeverity: Record<string, number>;
    weakestQuestions: string[]; // question keys sorted by flag count
    averageBackgroundWords: number;
    averageBalanceRatio: number;
    averageBehavioralFraction: number;
  };
}

// ── Rewrite artifacts ──

export interface RewriteProposal {
  ref: QuestionRef;
  field: string; // "background" | "0" | "1" | "2" | "3"
  original: string;
  proposed: string;
  rationale: string;
}

export interface RewriteResult {
  proposals: RewriteProposal[];
  /** Updated rubric data (deep clone with rewrites applied) */
  updatedRubric: RubricData;
}

// ── Iteration state ──

export interface IterationState {
  iteration: number;
  beforeReport: MeasurementReport;
  afterReport?: MeasurementReport;
  rewrites?: RewriteResult;
  accepted: string[]; // question keys whose rewrites were accepted
  rolledBack: string[]; // question keys whose rewrites were rolled back
  delta?: {
    flagsReduced: number;
    metricsImproved: string[];
    metricsRegressed: string[];
  };
}
