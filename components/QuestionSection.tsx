import { useMemo } from "react";
import { captureActiveTab } from "@/lib/capture";
import {
  getAccentKey,
  getCategoryLabel,
  getLinkedRubricIdsForCapture,
  getQuestionCode,
} from "@/lib/rubric";
import { useRubric } from "@/lib/rubric-context";
import type {
  Capture,
  Evaluation,
  PassFailQuestion,
  PassFailScore,
  RubricScore,
  ScoringQuestion,
} from "@/lib/types";
import { useActiveSession } from "@/hooks/useActiveSession";
import { toastError } from "@/stores/toast";
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

function renderQGScores(
  rubricId: string,
  ev: Evaluation | undefined,
  isAutoNa: boolean,
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void,
) {
  return (
    <div role="radiogroup" className="flex gap-ut-2 mb-ut-2">
      {(["pass", "fail", "na", "unsure"] as PassFailScore[]).map((val) => {
        const isActive =
          ev?.score === val ||
          (isAutoNa && val === "na" && ev?.score !== "pass" && ev?.score !== "fail" && ev?.score !== "unsure");
        const isDisabled = isAutoNa && val !== "na";

        const handleClick = () => {
          if (isDisabled) return;
          if (ev?.score === val) {
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
          <span
            key={val}
            role="radio"
            aria-checked={isActive}
            tabIndex={isDisabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className="judgment-label cursor-pointer select-none"
            data-judgment={val}
            data-active={isActive ? "true" : "false"}
          >
            {val === "pass" ? "✓ Pass" : val === "fail" ? "✗ Fail" : val === "na" ? "— N/A" : "? Unsure"}
          </span>
        );
      })}
    </div>
  );
}

function renderScoringScores(
  rubricId: string,
  scoreNum: number,
  isNa: boolean,
  isUnsure: boolean,
  isAutoNa: boolean,
  mode: "expert" | "standard",
  levels: ScoringQuestion,
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void,
) {
  return (
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
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={isAutoNa ? -1 : 0}
            role="radio"
            aria-checked={selected}
          >
            <span className="score-badge select-none">
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
      >
        <span className="score-badge select-none">
          —
        </span>
        <span className="score-desc">Not applicable</span>
      </div>

      {/* Unsure row */}
      <div
        className={`score-row ${isUnsure ? "is-selected" : ""}`}
        data-score="unsure"
        role="radio"
        aria-checked={isUnsure}
        tabIndex={isAutoNa ? -1 : 0}
        onClick={() => {
          if (isAutoNa) return;
          if (isUnsure) {
            setEvaluation(rubricId, { score: "" });
          } else {
            setEvaluation(rubricId, { score: "unsure" });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (isAutoNa) return;
            if (isUnsure) {
              setEvaluation(rubricId, { score: "" });
            } else {
              setEvaluation(rubricId, { score: "unsure" });
            }
          }
        }}
      >
        <span className="score-badge select-none">
          ?
        </span>
        <span className="score-desc">Insufficient information to score</span>
      </div>
    </div>
  );
}

interface QuestionSectionProps {
  section: "quality_gate" | "scoring_rubric";
  capturingFor: string | null;
  setCapturingFor: (id: string | null) => void;
  onConfirmRemove: (capture: Capture, rubricId: string) => void;
  onViewEvidence: (capture: Capture) => void;
}

export default function QuestionSection({
  section,
  capturingFor,
  setCapturingFor,
  onConfirmRemove,
  onViewEvidence,
}: QuestionSectionProps) {
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
      toastError(err instanceof Error ? err.message : "Capture failed. Check tab permissions and try again.");
    } finally {
      setCapturingFor(null);
    }
  };

  const isQG = section === "quality_gate";
  const rubricSection = isQG ? rubric.quality_gate : rubric.scoring_rubric;
  const headerText = isQG ? "Quality Gates" : "Scoring Rubric";
  const descriptionText = isQG
    ? "Mandatory pass/fail thresholds. Any fail halts the review."
    : "Score each criterion on a 0–3 scale.";

  return (
    <section>
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta mb-ut-2">
        {headerText}
      </h2>
      <p className="text-ut-xs text-ut-slate mb-ut-2">{descriptionText}</p>
      {Object.entries(rubricSection).map(([category, questions]) => (
        <div key={category} className="mb-ut-3">
          <h3 className="section-kicker mb-1">{getCategoryLabel(category)}</h3>
          {Object.entries(questions).map(([qId, questionRaw], qIdx) => {
            const question = questionRaw as PassFailQuestion | ScoringQuestion;
            const rubricId = `${category}.${qId}`;
            const code = getQuestionCode(category, qIdx);
            const ev = evaluationMap.get(rubricId);
            const evidence = captureMap.get(rubricId) ?? [];
            const mode = questionModes[rubricId] ?? "expert";
            const isAiOnly = question.ai_only ?? false;
            const isAutoNa = isAiOnly && !usesAi;

            // Compute progress based on section type
            let hasScore: boolean;
            if (isQG) {
              hasScore = ev?.score === "pass" || ev?.score === "fail" || ev?.score === "na" || ev?.score === "unsure";
            } else {
              const sn = typeof ev?.score === "number" ? (ev.score as number) : -1;
              hasScore = sn >= 0 || ev?.score === "na" || ev?.score === "unsure";
            }
            const hasNotes = !!(ev?.notes && ev.notes.trim());
            const hasEvidence = evidence.length > 0;
            const progress = getProgressState(hasScore, hasEvidence, hasNotes);

            // For scoring: determine scoreNum and isNa
            const scoreNum = typeof ev?.score === "number" ? (ev.score as number) : -1;
            const isNa = ev?.score === "na" || ev?.score === "unsure" || isAutoNa;

            return (
              <details
                key={qId}
                className="question-details"
                data-accent-key={isQG ? "control" : getAccentKey(category)}
                style={isAutoNa ? { opacity: 0.5 } : undefined}
              >
                <summary>
                  <ProgressCircle state={progress} />
                  <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
                  <span>{question.title}</span>
                  {isAutoNa && (
                    <span className="text-ut-xs text-ut-muted font-mono ml-1">
                      N/A &mdash; tool does not use AI
                    </span>
                  )}
                </summary>
                <div className="question-body">
                  {/* QG: requirement text + mode toggle. Scoring: mode toggle only. */}
                  {isQG ? (
                    <div className="flex items-center justify-between mb-ut-2">
                      <p className="text-ut-xs text-ut-muted leading-relaxed flex-1">
                        {mode === "standard" && (question as PassFailQuestion).basic_requirement
                          ? (question as PassFailQuestion).basic_requirement
                          : (question as PassFailQuestion).requirement}
                      </p>
                      <label className="mode-toggle ml-2 shrink-0" title={`Switch to ${mode === "expert" ? "standard" : "expert"} wording`}>
                        <input
                          type="checkbox"
                          aria-label="Standard wording"
                          checked={mode === "standard"}
                          onChange={() =>
                            setQuestionMode(rubricId, mode === "expert" ? "standard" : "expert")
                          }
                        />
                        <span className="mode-toggle-track" />
                        <span className="mode-toggle-label">{mode === "expert" ? "Expert" : "Standard"}</span>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end mb-ut-1">
                      <label className="mode-toggle shrink-0" title={`Switch to ${mode === "expert" ? "standard" : "expert"} wording`}>
                        <input
                          type="checkbox"
                          aria-label="Standard wording"
                          checked={mode === "standard"}
                          onChange={() =>
                            setQuestionMode(rubricId, mode === "expert" ? "standard" : "expert")
                          }
                        />
                        <span className="mode-toggle-track" />
                        <span className="mode-toggle-label">{mode === "expert" ? "Expert" : "Standard"}</span>
                      </label>
                    </div>
                  )}

                  {/* Score UI */}
                  {isQG
                    ? renderQGScores(rubricId, ev, isAutoNa, setEvaluation)
                    : renderScoringScores(
                        rubricId,
                        scoreNum,
                        isNa,
                        ev?.score === "unsure",
                        isAutoNa,
                        mode,
                        question as ScoringQuestion,
                        setEvaluation,
                      )}

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
                    placeholder={isQG ? "Notes / remarks..." : "Notes..."}
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
