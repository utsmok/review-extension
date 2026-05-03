import { useMemo } from "react";
import { captureActiveTab } from "@/lib/capture";
import {
  getAccentKey,
  getCategoryLabel,
  getLinkedRubricIdsForCapture,
  getQuestionCode,
} from "@/lib/rubric";
import { useRubric } from "@/lib/rubric-context";
import type { Capture, RubricScore, ScoringQuestion } from "@/lib/types";
import { useActiveSession } from "@/hooks/useActiveSession";
import EvidenceThumbnails from "./EvidenceThumbnails";
import { ProgressCircle, getProgressState } from "./ProgressCircle";

function getLevelDesc(
  levels: ScoringQuestion,
  val: number,
  mode: "expert" | "standard",
): string {
  if (mode === "standard") {
    const basicKey = `${val}_basic` as keyof ScoringQuestion;
    const basic = levels[basicKey];
    if (typeof basic === "string") return basic;
  }
  return levels[String(val) as "0" | "1" | "2" | "3"];
}

interface ScoringSectionProps {
  capturingFor: string | null;
  setCapturingFor: (id: string | null) => void;
  onConfirmRemove: (capture: Capture, rubricId: string) => void;
  onViewEvidence: (capture: Capture) => void;
}

export default function ScoringSection({
  capturingFor,
  setCapturingFor,
  onConfirmRemove,
  onViewEvidence,
}: ScoringSectionProps) {
  const { rubric, usesAi } = useRubric();
  const {
    evaluations,
    captures,
    questionModes,
    setEvaluation,
    setQuestionMode,
    addCapture,
    linkCaptureToRubric,
  } = useActiveSession();

  const evaluationMap = useMemo(
    () => new Map(evaluations.map((e) => [e.rubricId, e])),
    [evaluations],
  );

  const captureMap = useMemo(() => {
    const map = new Map<string, Capture[]>();
    for (const c of captures) {
      const linkedIds = getLinkedRubricIdsForCapture(c.id, evaluations);
      for (const rid of linkedIds) {
        const list = map.get(rid);
        if (list) list.push(c);
        else map.set(rid, [c]);
      }
    }
    return map;
  }, [captures, evaluations]);

  const handleCaptureEvidence = async (rubricId: string) => {
    setCapturingFor(rubricId);
    try {
      const capture = await captureActiveTab();
      addCapture(capture);
      linkCaptureToRubric(capture.id, rubricId);
    } catch (err) {
      console.error("Evidence capture failed:", err);
    } finally {
      setCapturingFor(null);
    }
  };

  return (
    <section>
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta mb-ut-2">
        Scoring Rubric
      </h2>
      <p className="text-ut-xs text-ut-slate mb-ut-2">Score each criterion on a 0&ndash;3 scale.</p>
      {Object.entries(rubric.scoring_rubric).map(([category, questions]) => (
        <div key={category} className="mb-ut-3">
          <h3 className="section-kicker mb-1">{getCategoryLabel(category)}</h3>
          {Object.entries(questions).map(([qId, levels], qIdx) => {
            const rubricId = `${category}.${qId}`;
            const code = getQuestionCode(category, qIdx);
            const ev = evaluationMap.get(rubricId);
            const evidence = captureMap.get(rubricId) ?? [];
            const mode = questionModes[rubricId] ?? "expert";
            const isAiOnly = levels.ai_only ?? false;
            const isAutoNa = isAiOnly && !usesAi;

            const scoreNum = typeof ev?.score === "number" ? (ev.score as number) : -1;
            const isNa = ev?.score === "na" || isAutoNa;
            const hasScore = scoreNum >= 0 || isNa;
            const hasNotes = !!(ev?.notes && ev.notes.trim());
            const hasEvidence = evidence.length > 0;
            const progress = getProgressState(hasScore, hasEvidence, hasNotes);

            return (
              <details
                key={qId}
                className="question-details"
                data-accent-key={getAccentKey(category)}
                style={isAutoNa ? { opacity: 0.5 } : undefined}
              >
                <summary>
                  <ProgressCircle state={progress} />
                  <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
                  <span>{levels.title}</span>
                  {isAutoNa && (
                    <span className="text-ut-xs text-ut-muted font-mono ml-1">
                      N/A &mdash; tool does not use AI
                    </span>
                  )}
                </summary>
                <div className="question-body">
                  <div className="flex items-center justify-end mb-ut-1">
                    <button
                      type="button"
                      className="text-ut-xs text-ut-slate hover:text-ut-text font-mono uppercase tracking-ut-label shrink-0"
                      onClick={() =>
                        setQuestionMode(rubricId, mode === "expert" ? "standard" : "expert")
                      }
                      title={`Switch to ${mode === "expert" ? "standard" : "expert"} wording`}
                    >
                      {mode === "expert" ? "Expert" : "Standard"}
                    </button>
                  </div>

                  {/* Bundled score rows */}
                  <div role="radiogroup" className="my-ut-2">
                    {([0, 1, 2, 3] as RubricScore[]).map((val) => {
                      if (val === "") return null;
                      const desc = getLevelDesc(levels, val as number, mode);
                      const selected = scoreNum === val;

                      const handleClick = () => {
                        if (isAutoNa) return;
                        if (selected) {
                          setEvaluation(rubricId, { score: "" });
                        } else {
                          setEvaluation(rubricId, { score: val });
                        }
                      };

                      const handleKeyDown = (e: React.KeyboardEvent) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          handleClick();
                        }
                      };

                      return (
                        <div
                          key={val}
                          className={`score-row ${selected ? "is-selected" : ""}`}
                          data-score={val}
                        >
                          <span
                            role="radio"
                            aria-checked={selected}
                            tabIndex={isAutoNa ? -1 : 0}
                            onClick={handleClick}
                            onKeyDown={handleKeyDown}
                            className="score-badge cursor-pointer select-none"
                          >
                            {val}
                          </span>
                          <span className="score-desc">{desc}</span>
                        </div>
                      );
                    })}

                    {/* N/A row */}
                    <div
                      className={`score-row ${isNa ? "is-selected" : ""}`}
                      data-score="na"
                    >
                      <span
                        role="radio"
                        aria-checked={isNa}
                        tabIndex={isAutoNa ? -1 : 0}
                        onClick={() => {
                          if (isAutoNa) return;
                          if (isNa) {
                            setEvaluation(rubricId, { score: "" });
                          } else {
                            setEvaluation(rubricId, { score: "na" });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            if (isAutoNa) return;
                            if (isNa) {
                              setEvaluation(rubricId, { score: "" });
                            } else {
                              setEvaluation(rubricId, { score: "na" });
                            }
                          }
                        }}
                        className="score-badge cursor-pointer select-none"
                      >
                        —
                      </span>
                      <span className="score-desc">Not applicable</span>
                    </div>
                  </div>

                  <EvidenceThumbnails
                    captures={evidence}
                    rubricId={rubricId}
                    onConfirmRemove={onConfirmRemove}
                    onViewEvidence={onViewEvidence}
                  />

                  <button
                    type="button"
                    className="text-ut-xs text-ut-blue hover:text-ut-darkblue font-mono uppercase tracking-ut-label"
                    disabled={capturingFor === rubricId}
                    onClick={() => handleCaptureEvidence(rubricId)}
                  >
                    {capturingFor === rubricId ? "Capturing..." : "+ Capture Evidence"}
                  </button>

                  <textarea
                    className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 mt-ut-2 resize-y bg-ut-grey"
                    rows={2}
                    placeholder="Notes..."
                    value={ev?.notes ?? ""}
                    onChange={(e) => setEvaluation(rubricId, { notes: e.target.value })}
                  />
                </div>
              </details>
            );
          })}
        </div>
      ))}
    </section>
  );
}
