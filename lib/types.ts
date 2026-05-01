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
  screenshotBase64: string;
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

export type PassFailScore = 'pass' | 'fail' | '';
export type RubricScore = 0 | 1 | 2 | 3 | '';

export interface PassFailQuestion {
  type: 'pass_fail';
  requirement: string;
}

export interface ScoringQuestion {
  '0': string;
  '1': string;
  '2': string;
  '3': string;
}

export interface RubricData {
  framework_name: string;
  version: string;
  quality_gate: Record<string, Record<string, PassFailQuestion>>;
  scoring_rubric: Record<string, Record<string, ScoringQuestion>>;
}
