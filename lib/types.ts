export interface SessionMetadata {
  toolName: string;
  toolUrl: string;
  startTime: string;
  company?: string;
  pricing?: string;
  availability?: string;
  termsConditionsUrl?: string;
  notes?: string;
}

export interface Capture {
  id: string;
  timestamp: string;
  sourceUrl: string;
  pageTitle: string;
  screenshotBase64: string;
  annotatedScreenshotBase64?: string;
  htmlContent: string;
  notes: string;
  linkedRubricIds: string[];
}

export interface Evaluation {
  rubricId: string;
  score: string | number;
  notes: string;
  explicitEvidenceIds: string[];
}

export type PassFailScore = "pass" | "fail" | "";
export type RubricScore = 0 | 1 | 2 | 3 | "";

export interface PassFailQuestion {
  type: "pass_fail";
  title: string;
  requirement: string;
}

export interface ScoringQuestion {
  title: string;
  "0": string;
  "1": string;
  "2": string;
  "3": string;
}

export interface RubricData {
  framework_name: string;
  version: string;
  quality_gate: Record<string, Record<string, PassFailQuestion>>;
  scoring_rubric: Record<string, Record<string, ScoringQuestion>>;
}

export interface ReviewSummaryItem {
  id: string;
  score: number | null;
  level: string | null;
}

export interface ReviewSummaryCategory {
  id: string;
  label: string;
  accentKey: string;
  maxPossible: number;
  actual: number;
  items: ReviewSummaryItem[];
}

export interface ReviewSummaryQualityGate {
  allPassed: boolean;
  items: { id: string; requirement: string; result: "pass" | "fail" | null }[];
}

export interface ReviewSummary {
  schemaVersion: number;
  generatedAt: string;
  framework: { name: string; version: string };
  session: { toolName: string; toolUrl: string; startTime: string };
  qualityGates: ReviewSummaryQualityGate;
  scores: {
    aggregate: number;
    maxPossible: number;
    categories: Record<string, ReviewSummaryCategory>;
  };
}
