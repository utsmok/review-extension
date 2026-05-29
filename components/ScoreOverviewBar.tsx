import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAccentKey,
  getQGCategoryCode,
  getQGQuestionCode,
  getQuestionCode,
  getVisibleRubricQuestionIds,
} from "@/lib/rubric";
import { getProgressState, type ProgressState } from "@/lib/evaluation-state";
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
  evidenceCount: number;
  /** Normalised score for colouring: "0"–"3", "pass", "fail", "na", "unsure", or "" */
  scoreValue: string;
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

function BadgeButton({ b, onNavigate }: { b: QuestionBadge; onNavigate: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`score-overview-bar__badge ${b.state === "complete" ? "is-complete" : b.state === "partial" ? "is-partial" : ""}`}
      title={b.title}
      aria-label={`${b.title}, ${b.state}${b.evidenceCount > 0 ? `, ${b.evidenceCount} evidence item${b.evidenceCount !== 1 ? "s" : ""}` : ""}`}
      data-accent={b.accentKey}
      data-score={b.scoreValue || undefined}
      onClick={() => onNavigate(b.rubricId)}
    >
      <span className="score-overview-bar__code" aria-hidden="true">
        {b.code}
      </span>
      <span className="score-overview-bar__indicator" data-state={b.state} aria-hidden="true">
        {getStateIndicator(b.state)}
      </span>
      {b.evidenceCount > 0 && (
        <span
          className="score-overview-bar__evidence-count"
          title={`${b.evidenceCount} evidence item${b.evidenceCount !== 1 ? "s" : ""}`}
          aria-hidden="true"
        >
          {b.evidenceCount}
        </span>
      )}
    </button>
  );
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
    const capById = new Map(captures.map((c) => [c.id, c]));
    const map = new Map<string, Capture[]>();
    for (const ev of evaluations) {
      for (const cId of ev.explicitEvidenceIds) {
        const cap = capById.get(cId);
        if (cap) {
          const list = map.get(ev.rubricId);
          if (list) list.push(cap);
          else map.set(ev.rubricId, [cap]);
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
      const qgKeys = Object.keys(questions);
      for (const [qId, question] of Object.entries(questions)) {
        const isAiOnly = question.ai_only ?? false;
        if (!usesAi && isAiOnly) continue;

        const rubricId = `${category}.${qId}`;
        const qIdx = qgKeys.indexOf(qId);
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
          evidenceCount: evidence.length,
          scoreValue: typeof ev?.score === "string" ? ev.score : "",
        });
      }
    }

    // Scoring rubric
    for (const [category, questions] of Object.entries(rubric.scoring_rubric)) {
      const scoreKeys = Object.keys(questions);
      for (const [qId, question] of Object.entries(questions)) {
        const isAiOnly = question.ai_only ?? false;
        if (!usesAi && isAiOnly) continue;

        const rubricId = `${category}.${qId}`;
        const qIdx = scoreKeys.indexOf(qId);
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
          evidenceCount: evidence.length,
          scoreValue: sn >= 0 ? String(sn) : ev?.score === "na" ? "na" : ev?.score === "unsure" ? "unsure" : "",
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

  // Progress change detection for delight animations
  const prevScoredRef = useRef(scored);
  const [bumpFraction, setBumpFraction] = useState(false);
  const [glowFill, setGlowFill] = useState(false);

  useEffect(() => {
    if (scored > prevScoredRef.current) {
      setBumpFraction(true);
      setGlowFill(true);
      const timer = setTimeout(() => {
        setBumpFraction(false);
        setGlowFill(false);
      }, 300);
      prevScoredRef.current = scored;
      return () => clearTimeout(timer);
    }
    prevScoredRef.current = scored;
  }, [scored]);

  // Find first incomplete question
  const firstIncomplete = useMemo(() => {
    return badges.find((b) => !b.isAutoNa && b.state !== "complete") ?? null;
  }, [badges]);

  const progressPct = total > 0 ? Math.round((scored / total) * 100) : 0;

  // Compute average score for progress fill coloring
  const avgScore = useMemo(() => {
    const numericScores = evaluations
      .filter((e) => typeof e.score === "number")
      .map((e) => e.score as number);
    return numericScores.length > 0
      ? numericScores.reduce((a, b) => a + b, 0) / numericScores.length
      : -1;
  }, [evaluations]);

  const progressFillStyle = {
    width: `${progressPct}%`,
    "--fill-color":
      avgScore < 0
        ? "var(--ut-muted)"
        : avgScore >= 2.5
          ? "var(--score-3)"
          : avgScore >= 1.5
            ? "var(--score-2)"
            : avgScore >= 0.5
              ? "var(--score-1)"
              : "var(--score-0)",
  } as React.CSSProperties;

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
        <span className={`score-overview-bar__fraction ${bumpFraction ? "score-overview-bar__fraction--bump" : ""}`}>
          <span className="score-overview-bar__scored">{scored}</span>
          <span className="score-overview-bar__divider">/</span>
          <span className="score-overview-bar__total">{total}</span>
        </span>
        <span className="score-overview-bar__track">
          <span className={`score-overview-bar__fill ${glowFill ? "score-overview-bar__fill--glow" : ""}`} style={progressFillStyle} />
        </span>

        {/* Thin separator before badges */}
        <span className="score-overview-bar__sep" aria-hidden="true" />

        {/* QG badges */}
        {badges.slice(0, qgCount).map((b) => (
          <BadgeButton key={b.rubricId} b={b} onNavigate={navigateTo} />
        ))}

        {/* Thin divider between QG and scoring */}
        {qgCount > 0 && qgCount < badges.length && (
          <span className="score-overview-bar__divider-line" aria-hidden="true" />
        )}

        {/* Scoring badges */}
        {badges.slice(qgCount).map((b) => (
          <BadgeButton key={b.rubricId} b={b} onNavigate={navigateTo} />
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
