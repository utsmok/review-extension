export type SessionStatus = "started" | "done";
export type StoreStatus = "empty" | "loading" | "active";

export interface Settings {
  reviewerName: string;
  reviewerEmail: string;
  preferredRubric: string;
}

export interface SessionMetadata {
  id: string;             // uuid
  toolName: string;
  toolUrl: string;
  startTime: string;
  rubricId?: string;
  usesAi?: boolean;
  status: SessionStatus;
  faviconUrl?: string;
  company?: string;
  pricing?: string;
  availability?: string;
  termsConditionsUrl?: string;
  notes?: string;
}

export interface SessionData {
  metadata: SessionMetadata;
  captures: Capture[];
  evaluations: Evaluation[];
  questionModes: Record<string, "expert" | "standard">;
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
}

export type QualityGateScore = "pass" | "fail" | "na" | "";
export type ScoringScore = 0 | 1 | 2 | 3 | "na" | "";
export type EvaluationScore = QualityGateScore | ScoringScore;

export interface Evaluation {
  rubricId: string;
  score: EvaluationScore;
  notes: string;
  explicitEvidenceIds: string[];
}

export type PassFailScore = QualityGateScore;
export type RubricScore = ScoringScore;

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
