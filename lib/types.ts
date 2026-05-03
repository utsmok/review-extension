export interface SessionMetadata {
  toolName: string;
  toolUrl: string;
  startTime: string;
  rubricId?: string;
  usesAi?: boolean;
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

export type PassFailScore = "pass" | "fail" | "na" | "";
export type RubricScore = 0 | 1 | 2 | 3 | "na" | "";

export interface PassFailQuestion {
  type: "pass_fail";
  title: string;
  requirement: string;
  basic_requirement: string;
  ai_only?: boolean;
}

export interface ScoringQuestion {
  title: string;
  "0": string;
  "1": string;
  "2": string;
  "3": string;
  "0_basic"?: string;
  "1_basic"?: string;
  "2_basic"?: string;
  "3_basic"?: string;
  ai_only?: boolean;
}

export interface RubricData {
  framework_name: string;
  version: string;
  quality_gate: Record<string, Record<string, PassFailQuestion>>;
  scoring_rubric: Record<string, Record<string, ScoringQuestion>>;
}
