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
  /** Authentication method for accessing the tool */
  authenticationMethod?: string;
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
  /** Metadata field this capture is evidence for (e.g. "termsConditionsUrl", "toolLogoUrl") */
  metadataField?: string;
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
  manualDone?: boolean;
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
  readonly type: "pass_fail";
  readonly title: string;
  readonly requirement: string;
  readonly background?: string;
  readonly examples?: {
    readonly pass: string;
    readonly fail: string;
    readonly na?: string;
  };
  readonly ai_only?: boolean;
}

export interface ScoringQuestion {
  readonly title: string;
  readonly "0": string;
  readonly "1": string;
  readonly "2": string;
  readonly "3": string;
  readonly background?: string;
  readonly examples?: {
    readonly "0": string;
    readonly "1": string;
    readonly "2": string;
    readonly "3": string;
  };
  readonly ai_only?: boolean;
  readonly related_gate?: string;
  readonly merged_gate?: boolean;
}

export type HexColor = `#${string}`;

export interface RubricData {
  readonly framework_name: string;
  readonly version: string;
  readonly quality_gate: Readonly<Record<string, Readonly<Record<string, Readonly<PassFailQuestion>>>>>;
  readonly scoring_rubric: Readonly<Record<string, Readonly<Record<string, Readonly<ScoringQuestion>>>>>;
}
