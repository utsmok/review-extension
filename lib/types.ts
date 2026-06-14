/** Lifecycle state of a review session. */
export type SessionStatus = "started" | "in-progress" | "done";
/** Overall status of the session store (empty = no session, loading = hydrating, active = ready). */
export type StoreStatus = "empty" | "loading" | "active";

export interface Settings {
  reviewerName: string;
  reviewerEmail: string;
  setupBannerDismissed?: boolean;
  labs: LabsSettings;
}

/** Experimental features that users opt into via the Labs settings section. */
export interface LabsSettings {
  /** Enable 6-level recommendation grades instead of 3-level. */
  enhancedRecommendation?: boolean;
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

/** Full session data as stored in IndexedDB and exported ZIP (session.json). */
export interface SessionData {
  metadata: SessionMetadata;
  captures: Capture[];
  evaluations: Evaluation[];
  questionModes?: Record<string, "expert" | "standard">;
  finalization: ReviewFinalization | null;
  schemaVersion?: number;
  quickNotes?: Array<{ id: string; text: string; timestamp: string }>;
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

/** Quality gate (pass/fail) score values. */
export type QualityGateScore = "pass" | "fail" | "na" | "unsure" | "";
/** Scoring rubric (0–3) score values. */
export type ScoringScore = 0 | 1 | 2 | 3 | "na" | "unsure" | "";
/** Union of all possible score values across quality gate and scoring questions. */
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

/** Final verdict grade assigned during review finalization. */
export type FinalizationGrade =
  | "pass"
  | "conditional"
  | "fail"
  | "recommended"
  | "recommended_with_caveats"
  | "needs_review"
  | "pilot_only"
  | "not_recommended"
  | "out_of_scope";

export interface ReviewFinalization {
  conclusion: string;
  grade: FinalizationGrade;
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  finalizedAt: string;
}

/** Alias for quality gate scores (semantic clarity at call sites). */
export type PassFailScore = QualityGateScore;
/** Alias for scoring rubric scores (semantic clarity at call sites). */
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
  /** Whether this scoring question extends/subsumes a quality gate topic.
   * When true, the question deepens evaluation of a gate's domain
   * (e.g., SE2 extends QG1 data privacy, TC1 extends citation attribution). */
  readonly merged_gate?: boolean;
}

/** CSS hex color string (e.g. "#ff0000"). */
export type HexColor = `#${string}`;

export interface RubricData {
  readonly framework_name: string;
  readonly version: string;
  readonly quality_gate: Readonly<
    Record<string, Readonly<Record<string, Readonly<PassFailQuestion>>>>
  >;
  readonly scoring_rubric: Readonly<
    Record<string, Readonly<Record<string, Readonly<ScoringQuestion>>>>
  >;
}
