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
    default:
      return "○";
  }
}

// ---------------------------------------------------------------------------
// Rolling counter — animates the scored number when it changes
// ---------------------------------------------------------------------------

function RollingNumber({ value }: { value: number }) {
  const prevRef = useRef(value);
  const [displayOld, setDisplayOld] = useState(value);
  const [displayNew, setDisplayNew] = useState(value);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value !== prevRef.current) {
      setDisplayOld(prevRef.current);
      setDisplayNew(value);
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        prevRef.current = value;
      }, 300);
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  if (!animating) {
    return (
      <span className="score-overview-bar__scored" aria-live="polite">
        {value}
      </span>
    );
  }

  return (
    <span
      className="score-overview-bar__scored score-overview-bar__scored--rolling"
      aria-live="polite"
    >
      <span className="score-overview-bar__roll-old" key={`old-${displayOld}`}>
        {displayOld}
      </span>
      <span className="score-overview-bar__roll-new" key={`new-${displayNew}`}>
        {displayNew}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Badge button — mouse-reactive wave via CSS custom property
// ---------------------------------------------------------------------------

function BadgeButton({
  b,
  onNavigate,
  mouseX,
  barRef,
  index: _index,
}: {
  b: QuestionBadge;
  onNavigate: (id: string) => void;
  mouseX: number | null;
  barRef: React.RefObject<HTMLDivElement | null>;
  index: number;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const waveOffset = useMemo(() => {
    if (mouseX === null || !barRef.current || !btnRef.current) return 0;
    const barRect = barRef.current.getBoundingClientRect();
    const btnRect = btnRef.current.getBoundingClientRect();
    const btnCenter = btnRect.left + btnRect.width / 2 - barRect.left;
    const dist = Math.abs(mouseX - btnCenter);
    const maxDist = 120;
    if (dist > maxDist) return 0;
    const t = 1 - dist / maxDist;
    return Math.round(t * t * 4); // quadratic ease, max 4px
  }, [mouseX, barRef]);

  return (
    <button
      ref={btnRef}
      type="button"
      className={`score-overview-bar__badge ${b.state === "complete" ? "is-complete" : b.state === "partial" ? "is-partial" : ""}`}
      title={b.title}
      aria-label={`${b.title}, ${b.state}${b.evidenceCount > 0 ? `, ${b.evidenceCount} evidence item${b.evidenceCount !== 1 ? "s" : ""}` : ""}`}
      data-accent={b.accentKey}
      data-score={b.scoreValue || undefined}
      onClick={() => onNavigate(b.rubricId)}
      style={{ "--wave-y": `${waveOffset}px` } as React.CSSProperties}
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
// CSS confetti burst (no JS lib)
// ---------------------------------------------------------------------------

function ConfettiBurst() {
  // 8 particles radiating outward
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        angle: (360 / 8) * i,
        delay: i * 25,
        color:
          i % 4 === 0
            ? "var(--state-success)"
            : i % 4 === 1
              ? "var(--ut-blue)"
              : i % 4 === 2
                ? "var(--trust-magenta)"
                : "var(--score-2)",
      })),
    [],
  );

  return (
    <span className="score-overview-bar__confetti" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.angle}
          className="score-overview-bar__confetti-particle"
          style={
            {
              "--confetti-angle": `${p.angle}deg`,
              animationDelay: `${p.delay}ms`,
              "--confetti-color": p.color,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
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
  const barRef = useRef<HTMLDivElement>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);
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
          scoreValue:
            sn >= 0
              ? String(sn)
              : ev?.score === "na"
                ? "na"
                : ev?.score === "unsure"
                  ? "unsure"
                  : "",
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
  const [celebrating, setCelebrating] = useState(false);

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

  // Completion celebration: fire once when progress reaches 100%
  const prevCompleteRef = useRef(false);
  useEffect(() => {
    const isComplete = total > 0 && scored === total;
    if (isComplete && !prevCompleteRef.current) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 800);
      prevCompleteRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isComplete) {
      prevCompleteRef.current = false;
      setCelebrating(false);
    }
  }, [scored, total]);

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

  // Dynamic gradient based on average score quality
  const fillGradientStyle = {
    transform: `scaleX(${progressPct / 100})`,
    "--fill-start":
      avgScore < 0
        ? "var(--ut-slate)"
        : avgScore >= 2.5
          ? "var(--score-3)"
          : avgScore >= 1.5
            ? "var(--score-2)"
            : avgScore >= 0.5
              ? "var(--score-1)"
              : "var(--score-0)",
    "--fill-end":
      avgScore < 0
        ? "var(--ut-muted)"
        : avgScore >= 2.5
          ? "color-mix(in srgb, var(--score-3) 70%, var(--ut-blue))"
          : avgScore >= 1.5
            ? "color-mix(in srgb, var(--score-2) 70%, var(--ut-blue))"
            : avgScore >= 0.5
              ? "color-mix(in srgb, var(--score-1) 70%, var(--score-2))"
              : "color-mix(in srgb, var(--score-0) 70%, var(--score-1))",
  } as React.CSSProperties;

  // Navigate to question
  const navigateTo = (rubricId: string) => {
    const el = document.getElementById(`question-${rubricId}`);
    if (el) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        el.scrollIntoView({ block: "start" });
      }
      if (el instanceof HTMLDetailsElement && !el.open) {
        el.open = true;
      }
    }
  };

  // Find QG/scoring split index
  const qgCount = badges.filter((b) => b.section === "quality_gate").length;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  };

  const handleMouseLeave = () => setMouseX(null);

  return (
    <div
      ref={barRef}
      className={`score-overview-bar ${celebrating ? "score-overview-bar--celebrating" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="score-overview-bar__inner">
        {/* Fraction with rolling counter */}
        <span
          className={`score-overview-bar__fraction ${bumpFraction ? "score-overview-bar__fraction--bump" : ""}`}
        >
          <RollingNumber value={scored} />
          <span className="score-overview-bar__divider">/</span>
          <span className="score-overview-bar__total">{total}</span>
        </span>

        {/* Progress track with gradient fill + shimmer */}
        <span className="score-overview-bar__track">
          <span
            className={`score-overview-bar__fill ${glowFill ? "score-overview-bar__fill--glow" : ""}`}
            style={fillGradientStyle}
          />
        </span>

        {/* Thin separator before badges */}
        <span className="score-overview-bar__sep" aria-hidden="true" />

        {/* QG badges */}
        {badges.slice(0, qgCount).map((b, i) => (
          <BadgeButton
            key={b.rubricId}
            b={b}
            onNavigate={navigateTo}
            mouseX={mouseX}
            barRef={barRef}
            index={i}
          />
        ))}
        {/* Thin divider between QG and scoring */}
        {qgCount > 0 && qgCount < badges.length && (
          <span className="score-overview-bar__divider-line" aria-hidden="true" />
        )}

        {/* Scoring badges */}
        {badges.slice(qgCount).map((b, i) => (
          <BadgeButton
            key={b.rubricId}
            b={b}
            onNavigate={navigateTo}
            mouseX={mouseX}
            barRef={barRef}
            index={qgCount + i}
          />
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

      {/* Confetti burst on 100% completion */}
      {celebrating && <ConfettiBurst />}
    </div>
  );
}
