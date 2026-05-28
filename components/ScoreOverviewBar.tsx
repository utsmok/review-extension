import { useMemo } from "react";
import {
  getAccentKey,
  getQGCategoryCode,
  getQGQuestionCode,
  getQuestionCode,
  getVisibleRubricQuestionIds,
} from "@/lib/rubric";
import { getProgressState, type ProgressState } from "@/components/ProgressCircle";
import type { Capture, Evaluation, RubricData } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuestionBadge {
  rubricId: string;
  code: string;
  title: string;
  section: "quality_gate" | "scoring_rubric";
  accentKey: string;
  state: ProgressState;
  isAutoNa: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStateIndicator(state: ProgressState): string {
  switch (state) {
    case "complete":
      return "✓";
    case "partial":
      return "●";
    case "empty":
      return "○";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScoreOverviewBarProps {
  evaluations: Evaluation[];
  captures: Capture[];
  rubric: RubricData;
  usesAi: boolean;
}

export default function ScoreOverviewBar({
  evaluations,
  captures,
  rubric,
  usesAi,
}: ScoreOverviewBarProps) {
  const evalMap = useMemo(() => new Map(evaluations.map((e) => [e.rubricId, e])), [evaluations]);

  // Build capture→rubricId reverse index
  const captureMap = useMemo(() => {
    const map = new Map<string, Capture[]>();
    for (const c of captures) {
      for (const ev of evaluations) {
        if (ev.explicitEvidenceIds.includes(c.id)) {
          const list = map.get(ev.rubricId);
          if (list) list.push(c);
          else map.set(ev.rubricId, [c]);
        }
      }
    }
    return map;
  }, [captures, evaluations]);

  // Build per-question badge data
  const badges = useMemo((): QuestionBadge[] => {
    const result: QuestionBadge[] = [];

    // Quality gates
    for (const [category, questions] of Object.entries(rubric.quality_gate)) {
      const catCode = getQGCategoryCode(category);
      for (const [qId, question] of Object.entries(questions)) {
        const isAiOnly = question.ai_only ?? false;
        if (!usesAi && isAiOnly) continue;

        const rubricId = `${category}.${qId}`;
        const qIdx = Object.keys(questions).indexOf(qId);
        const ev = evalMap.get(rubricId);
        const evidence = captureMap.get(rubricId) ?? [];
        const isAutoNa = isAiOnly && !usesAi;

        const hasScore =
          ev?.score === "pass" ||
          ev?.score === "fail" ||
          ev?.score === "na" ||
          ev?.score === "unsure";
        const hasNotes = !!ev?.notes?.trim();
        const hasEvidence = evidence.length > 0;

        result.push({
          rubricId,
          code: getQGQuestionCode(category, qIdx),
          title: `${catCode}${qIdx + 1}: ${question.title}`,
          section: "quality_gate",
          accentKey: "control",
          state: getProgressState(hasScore, hasEvidence, hasNotes, ev?.manualDone),
          isAutoNa,
        });
      }
    }

    // Scoring rubric
    for (const [category, questions] of Object.entries(rubric.scoring_rubric)) {
      for (const [qId, question] of Object.entries(questions)) {
        const isAiOnly = question.ai_only ?? false;
        if (!usesAi && isAiOnly) continue;

        const rubricId = `${category}.${qId}`;
        const qIdx = Object.keys(questions).indexOf(qId);
        const ev = evalMap.get(rubricId);
        const evidence = captureMap.get(rubricId) ?? [];
        const isAutoNa = isAiOnly && !usesAi;

        const sn = typeof ev?.score === "number" ? (ev.score as number) : -1;
        const hasScore = sn >= 0 || ev?.score === "na" || ev?.score === "unsure";
        const hasNotes = !!ev?.notes?.trim();
        const hasEvidence = evidence.length > 0;

        result.push({
          rubricId,
          code: getQuestionCode(category, qIdx),
          title: `${getQuestionCode(category, qIdx)}: ${question.title}`,
          section: "scoring_rubric",
          accentKey: getAccentKey(category),
          state: getProgressState(hasScore, hasEvidence, hasNotes, ev?.manualDone),
          isAutoNa,
        });
      }
    }

    return result;
  }, [rubric, usesAi, evalMap, captureMap]);

  // Scored count
  const { scored, total } = useMemo(() => {
    const visibleIds = new Set(getVisibleRubricQuestionIds(rubric, usesAi));
    const scoredCount = evaluations.filter(
      (e) => visibleIds.has(e.rubricId) && e.score !== "" && e.score !== undefined,
    ).length;
    return { scored: scoredCount, total: visibleIds.size };
  }, [evaluations, rubric, usesAi]);

  // Find first incomplete question
  const firstIncomplete = useMemo(() => {
    return badges.find((b) => !b.isAutoNa && b.state !== "complete") ?? null;
  }, [badges]);

  const progressPct = total > 0 ? Math.round((scored / total) * 100) : 0;

  // Navigate to question
  const navigateTo = (rubricId: string) => {
    const el = document.getElementById(`question-${rubricId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
      }
    }
  };

  // Find QG/scoring split index
  const qgCount = badges.filter((b) => b.section === "quality_gate").length;

  return (
    <div className="score-overview-bar">
      <div className="score-overview-bar__inner">
        {/* Fraction + progress */}
        <span className="score-overview-bar__fraction">
          <span className="score-overview-bar__scored">{scored}</span>
          <span className="score-overview-bar__divider">/</span>
          <span className="score-overview-bar__total">{total}</span>
        </span>
        <span className="score-overview-bar__track">
          <span className="score-overview-bar__fill" style={{ width: `${progressPct}%` }} />
        </span>

        {/* Thin separator before badges */}
        <span className="score-overview-bar__sep" aria-hidden="true" />

        {/* QG badges */}
        {badges.slice(0, qgCount).map((b) => (
          <button
            key={b.rubricId}
            type="button"
            className={`score-overview-bar__badge ${b.state === "complete" ? "is-complete" : b.state === "partial" ? "is-partial" : ""}`}
            title={b.title}
            data-accent={b.accentKey}
            onClick={() => navigateTo(b.rubricId)}
          >
            <span className="score-overview-bar__code">{b.code}</span>
            <span className="score-overview-bar__indicator" data-state={b.state}>
              {getStateIndicator(b.state)}
            </span>
          </button>
        ))}

        {/* Thin divider between QG and scoring */}
        {qgCount > 0 && qgCount < badges.length && (
          <span className="score-overview-bar__divider-line" aria-hidden="true" />
        )}

        {/* Scoring badges */}
        {badges.slice(qgCount).map((b) => (
          <button
            key={b.rubricId}
            type="button"
            className={`score-overview-bar__badge ${b.state === "complete" ? "is-complete" : b.state === "partial" ? "is-partial" : ""}`}
            title={b.title}
            data-accent={b.accentKey}
            onClick={() => navigateTo(b.rubricId)}
          >
            <span className="score-overview-bar__code">{b.code}</span>
            <span className="score-overview-bar__indicator" data-state={b.state}>
              {getStateIndicator(b.state)}
            </span>
          </button>
        ))}

        {/* First needs work */}
        {firstIncomplete && (
          <button
            type="button"
            className="score-overview-bar__next"
            title={`Jump to: ${firstIncomplete.title}`}
            onClick={() => navigateTo(firstIncomplete.rubricId)}
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}
