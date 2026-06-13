import { PRINCIPLES } from "./principles";
import { computeReportScores, type ReportScores } from "./report/compute-scores";
import { getQGQuestionCode, getQuestionCode, reportScoreColor } from "./rubric";
import type { Capture, Evaluation, ReviewFinalization, RubricData, SessionMetadata } from "./types";

// ── Sub-interfaces ─────────────────────────────────────────────────────

/** Pre-computed data for a single quality-gate question. */
export interface QualityGateRow {
  rubricId: string;
  code: string;
  requirement: string;
  result: "pass" | "fail" | null;
  color: string;
  label: string;
  notes: string;
  background?: string;
  examples?: Record<string, string>;
}

/** Pre-computed data for a single scoring question. */
export interface ScoringRow {
  rubricId: string;
  code: string;
  score: number;
  isNa: boolean;
  isUnsure: boolean;
  levelDescription: string;
  notes: string;
  customReasoning: string | undefined;
  evidenceIds: string[];
  isWeakEvidence: boolean;
  badgeColor: string;
  background?: string;
  examples?: Record<string, string>;
}

/** Pre-computed per-principle summary for the scoring sections. */
export interface PrincipleScoreRow {
  id: string;
  code: string;
  fullName: string;
  reportColor: string;
  total: number;
  max: number;
  avg: string;
  evidenceCount: number;
  catScores: (number | "na" | "unsure" | "" | undefined)[];
  questions: ScoringRow[];
}

/** Pre-computed capture info for rendering. */
export interface CaptureInfo {
  id: string;
  timestamp: string;
  pageTitle: string;
  sourceUrl: string;
  notes?: string;
  /** Compressed (or original) screenshot data URL for rendering. */
  compressedScreenshot: string;
  /** Original screenshot base64, used as fallback. */
  screenshotBase64: string;
  annotatedScreenshotBase64?: string;
}

/** Pre-computed finalization section data. */
export interface FinalizationSection {
  grade: string;
  conclusion: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string;
  finalizedAt: string;
}

/** Intermediate representation separating data computation from HTML rendering. */
export interface ReportModel {
  metadata: SessionMetadata;
  principleScores: PrincipleScoreRow[];
  qualityGateRows: QualityGateRow[];
  captures: CaptureInfo[];
  finalization: FinalizationSection | null;
  verdict: { label: string; color: string };
  scores: ReportScores;
  evalMap: Map<string, Evaluation>;
  rubric: RubricData;
  usesAi: boolean;
  /** Set of capture IDs that are linked to at least one evaluation. */
  linkedCaptureIds: Set<string>;
}

// ── Builder ────────────────────────────────────────────────────────────

/**
 * Pure data transformation: computes the intermediate ReportModel from raw
 * session data.  No HTML generation happens here.
 *
 * `compressedScreenshots` is a pre-built map of capture ID → compressed
 * data URL (for `buildHtmlReport`).  Pass an empty map for the nutrition
 * label path (which doesn't render evidence thumbnails).
 */
export function buildReportModel(
  metadata: SessionMetadata,
  captures: Capture[],
  evaluations: Evaluation[],
  rubric: RubricData,
  finalization: ReviewFinalization | null,
  compressedScreenshots: Map<string, string>,
): ReportModel {
  const usesAi = metadata.usesAi ?? true;
  const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));
  const scores = computeReportScores(evaluations, rubric, finalization, evalMap, usesAi);

  // ── Principle score rows ────────────────────────────────────────────

  // Pre-compute evidence count per principle
  const evidenceByPrinciple = new Map<string, Set<string>>();
  for (const e of evaluations) {
    const dot = e.rubricId.indexOf(".");
    const prefix = dot === -1 ? e.rubricId : e.rubricId.substring(0, dot);
    let captureSet = evidenceByPrinciple.get(prefix);
    if (!captureSet) {
      captureSet = new Set<string>();
      evidenceByPrinciple.set(prefix, captureSet);
    }
    for (const cid of e.explicitEvidenceIds) {
      captureSet.add(cid);
    }
  }

  const principleScoreRows: PrincipleScoreRow[] = PRINCIPLES.filter(
    (p) => p.id in rubric.scoring_rubric,
  ).map((p) => {
    const reportColor = p.reportColor;
    const questions = rubric.scoring_rubric[p.id];
    const catScores = scores.catScores.get(p.id) ?? [];
    const evidenceCount = evidenceByPrinciple.get(p.id)?.size ?? 0;

    let numSum = 0;
    let numCount = 0;
    for (const s of catScores) {
      if (typeof s === "number") {
        numSum += s;
        numCount++;
      }
    }
    const avg = numCount > 0 ? (numSum / numCount).toFixed(1) : "—";

    const entries = Object.entries(questions).filter(
      ([, q]) => usesAi || !(q as { ai_only?: boolean }).ai_only,
    );

    const scoringRows: ScoringRow[] = entries.map(([qId, levels], qIdx) => {
      const rubricId = `${p.id}.${qId}`;
      const ev = evalMap.get(rubricId);
      const isNa = ev?.score === "na";
      const isUnsure = ev?.score === "unsure";
      const score = typeof ev?.score === "number" ? ev.score : -1;
      const code = getQuestionCode(p.id, qIdx);
      const customReasoning = ev?.customScore?.reasoning;

      // Level description mirrors html-report.ts logic exactly
      let levelDescription: string;
      if (isNa) {
        levelDescription = "Not applicable";
      } else if (isUnsure) {
        levelDescription = "Insufficient information";
      } else if (customReasoning) {
        levelDescription = customReasoning;
      } else if (score >= 0) {
        levelDescription = (levels as unknown as Record<string, string>)[String(score)] ?? "—";
      } else {
        levelDescription = "—";
      }

      const isWeakEvidence = score >= 0 && score <= 1;
      const badgeColor = reportScoreColor(
        isNa ? "na" : isUnsure ? "unsure" : score >= 0 ? (score as 0 | 1 | 2 | 3) : undefined,
      );

      const hasBackground = !!(levels as { background?: string }).background;
      const hasExamples = !!(levels as { examples?: Record<string, string> }).examples;

      return {
        rubricId,
        code,
        score,
        isNa,
        isUnsure,
        levelDescription,
        notes: ev?.notes ?? "",
        customReasoning,
        evidenceIds: ev?.explicitEvidenceIds ?? [],
        isWeakEvidence,
        badgeColor,
        background: hasBackground ? (levels as { background?: string }).background : undefined,
        examples: hasExamples
          ? (levels as { examples?: Record<string, string> }).examples
          : undefined,
      };
    });

    return {
      id: p.id,
      code: p.code,
      fullName: p.fullName,
      reportColor,
      total: numSum,
      max: numCount * 3,
      avg,
      evidenceCount,
      catScores,
      questions: scoringRows,
    };
  });

  // ── Quality gate rows ───────────────────────────────────────────────

  const qualityGateRows: QualityGateRow[] = [];
  for (const [cat, questions] of Object.entries(rubric.quality_gate)) {
    const questionEntries = Object.entries(questions);
    for (let qIdx = 0; qIdx < questionEntries.length; qIdx++) {
      const [qId, q] = questionEntries[qIdx];
      if (!usesAi && (q as { ai_only?: boolean }).ai_only) continue;

      const ev = evalMap.get(`${cat}.${qId}`);
      const result = ev?.score === "pass" ? "pass" : ev?.score === "fail" ? "fail" : null;
      const color = result === "pass" ? "#3d7249" : result === "fail" ? "#c60c30" : "#52677c";
      const label = result === "pass" ? "PASS" : result === "fail" ? "FAIL" : "—";

      qualityGateRows.push({
        rubricId: `${cat}.${qId}`,
        code: getQGQuestionCode(cat, qIdx),
        requirement: q.requirement,
        result,
        color,
        label,
        notes: ev?.notes ?? "",
        background: q.background || undefined,
        examples: q.examples || undefined,
      });
    }
  }

  // ── Capture info ────────────────────────────────────────────────────

  const captureInfos: CaptureInfo[] = captures.map((c) => ({
    id: c.id,
    timestamp: c.timestamp,
    pageTitle: c.pageTitle,
    sourceUrl: c.sourceUrl,
    notes: c.notes || undefined,
    compressedScreenshot: compressedScreenshots.get(c.id) ?? c.screenshotBase64,
    screenshotBase64: c.screenshotBase64,
    annotatedScreenshotBase64: c.annotatedScreenshotBase64,
  }));

  // ── Linked capture IDs ──────────────────────────────────────────────

  const linkedCaptureIds = new Set<string>();
  for (const e of evaluations) {
    for (const cid of e.explicitEvidenceIds) {
      linkedCaptureIds.add(cid);
    }
  }

  // ── Finalization section ────────────────────────────────────────────

  const finalizationSection: FinalizationSection | null = finalization
    ? {
        grade: finalization.grade,
        conclusion: finalization.conclusion,
        strengths: finalization.strengths,
        weaknesses: finalization.weaknesses,
        recommendations: finalization.recommendations,
        finalizedAt: finalization.finalizedAt,
      }
    : null;

  return {
    metadata,
    principleScores: principleScoreRows,
    qualityGateRows,
    captures: captureInfos,
    finalization: finalizationSection,
    verdict: { label: scores.verdict, color: scores.verdictColor },
    scores,
    evalMap,
    rubric,
    usesAi,
    linkedCaptureIds,
  };
}
