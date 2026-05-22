export type SessionStatus = "started" | "done";
export type StoreStatus = "empty" | "loading" | "active";

export interface Settings {
  reviewerName: string;
  reviewerEmail: string;
  preferredRubric: string;
  setupBannerDismissed?: boolean;
}

export interface SessionMetadata {
  id: string; // uuid
  toolName: string;
  toolUrl: string;
  startTime: string;
  rubricId?: string;
  usesAi?: boolean;
  status: SessionStatus;
  faviconUrl?: string;
  /** URL or data URL for the reviewed tool's logo */
  toolLogoUrl?: string;
  /** One-line to one-paragraph summary of the tool */
  description?: string;
  company?: string;
  pricing?: string;
  availability?: string;
  termsConditionsUrl?: string;
  /** Structured data sources the tool indexes */
  dataSources?: string[];
  /** Search methods the tool supports */
  searchMethods?: string[];
  /** Academic discipline context */
  discipline?: string[];
  notes?: string;
  finalizedAt?: string;
}

export interface SessionData {
  metadata: SessionMetadata;
  captures: Capture[];
  evaluations: Evaluation[];
  questionModes?: Record<string, "expert" | "standard">;
  finalization: ReviewFinalization | null;
  schemaVersion?: number;
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

export type QualityGateScore = "pass" | "fail" | "na" | "unsure" | "";
export type ScoringScore = 0 | 1 | 2 | 3 | "na" | "unsure" | "";
export type EvaluationScore = QualityGateScore | ScoringScore;

export interface Evaluation {
  rubricId: string;
  score: EvaluationScore;
  notes: string;
  explicitEvidenceIds: string[];
  customScore?: {
    score: 0 | 1 | 2 | 3;
    reasoning: string;
  };
}

export type FinalizationGrade = "pass" | "conditional" | "fail";

export interface ReviewFinalization {
  conclusion: string;
  grade: FinalizationGrade;
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  finalizedAt: string;
}

export type PassFailScore = QualityGateScore;
export type RubricScore = ScoringScore;

export interface PassFailQuestion {
  type: "pass_fail";
  title: string;
  requirement: string;
  background?: string;
  examples?: {
    pass: string;
    fail: string;
    na?: string;
  };
  ai_only?: boolean;
}

export interface ScoringQuestion {
  title: string;
  "0": string;
  "1": string;
  "2": string;
  "3": string;
  background?: string;
  examples?: {
    "0": string;
    "1": string;
    "2": string;
    "3": string;
  };
  ai_only?: boolean;
  related_gate?: string;
  merged_gate?: boolean;
}

export interface RubricData {
  framework_name: string;
  version: string;
  quality_gate: Record<string, Record<string, PassFailQuestion>>;
  scoring_rubric: Record<string, Record<string, ScoringQuestion>>;
}
