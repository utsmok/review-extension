import { useCallback, useMemo } from "react";
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
          (isAutoNa &&
            val === "na" &&
            ev?.score !== "pass" &&
            ev?.score !== "fail" &&
            ev?.score !== "unsure");
        const isDisabled = isAutoNa && val !== "na";

        const handleClick = () => {
          if (isDisabled) return;
          if (ev?.score === val) {
            setEvaluation(rubricId, { score: "" });
          } else {
            setEvaluation(rubricId, { score: val });
          }
        };


        return (
          <label
            key={val}
            className="judgment-label cursor-pointer select-none"
            data-judgment={val}
            data-active={isActive ? "true" : "false"}
          >
            <input
              type="radio"
              name={rubricId}
              checked={isActive}
              onChange={handleClick}
              className="sr-only"
              disabled={isDisabled}
            />
            {val === "pass"
              ? "✓ Pass"
              : val === "fail"
                ? "✗ Fail"
                : val === "na"
                  ? "— N/A"
                  : "? Unsure"}
          </label>
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
  levels: ScoringQuestion,
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void,
) {
  return (
    <div role="radiogroup" className="my-ut-2">
      {([0, 1, 2, 3] as RubricScore[]).map((val) => {
        if (val === "") return null;
        const desc = levels[String(val) as "0" | "1" | "2" | "3"];
        const selected = scoreNum === val;

        const handleClick = () => {
          if (isAutoNa) return;
          if (selected) {
            setEvaluation(rubricId, { score: "" });
          } else {
            setEvaluation(rubricId, { score: val });
          }
        };


        return (
          <label
            key={val}
            className={`score-row ${selected ? "is-selected" : ""}`}
            data-score={val}
          >
            <input
              type="radio"
              name={rubricId}
              checked={selected}
              onChange={handleClick}
              className="sr-only"
              disabled={isAutoNa}
            />
            <span className="score-badge select-none">{val}</span>
            <span className="score-desc">{desc}</span>
          </label>
        );
      })}

      {/* N/A row */}
      <label
        className={`score-row ${isNa ? "is-selected" : ""}`}
        data-score="na"
      >
        <input
          type="radio"
          name={rubricId}
          checked={isNa}
          onChange={() => {
            if (isAutoNa) return;
            if (isNa) {
              setEvaluation(rubricId, { score: "" });
            } else {
              setEvaluation(rubricId, { score: "na" });
            }
          }}
          className="sr-only"
          disabled={isAutoNa}
        />
        <span className="score-badge select-none">—</span>
        <span className="score-desc">Not applicable</span>
      </label>

      {/* Unsure row */}
      <label
        className={`score-row ${isUnsure ? "is-selected" : ""}`}
        data-score="unsure"
      >
        <input
          type="radio"
          name={rubricId}
          checked={isUnsure}
          onChange={() => {
            if (isAutoNa) return;
            if (isUnsure) {
              setEvaluation(rubricId, { score: "" });
            } else {
              setEvaluation(rubricId, { score: "unsure" });
            }
          }}
          className="sr-only"
          disabled={isAutoNa}
        />
        <span className="score-badge select-none">?</span>
        <span className="score-desc">Insufficient information to score</span>
      </label>
    </div>
  );
}

interface QuestionSectionProps {
  section: "quality_gate" | "scoring_rubric";
  capturingFor: string | null;
  setCapturingFor: (id: string | null) => void;
  captureQueue: { enqueue: (fn: () => Promise<void>) => void; isCapturing: () => boolean };
  onConfirmRemove: (capture: Capture, rubricId: string) => void;
  onViewEvidence: (capture: Capture) => void;
}

export default function QuestionSection({
  section,
  capturingFor,
  setCapturingFor,
  captureQueue,
  onConfirmRemove,
  onViewEvidence,
}: QuestionSectionProps) {
  const { rubric, usesAi } = useRubric();
  const { evaluations, captures, setEvaluation, addCapture, linkCaptureToRubric } =
    useActiveSession();

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

  const handleCaptureEvidence = useCallback((rubricId: string) => {
    captureQueue.enqueue(async () => {
      setCapturingFor(rubricId);
      try {
        const capture = await captureActiveTab();
        addCapture(capture);
        linkCaptureToRubric(capture.id, rubricId);
      } catch (err) {
        console.error("Evidence capture failed:", err);
        toastError(
          err instanceof Error
            ? err.message
            : "Capture failed. Check tab permissions and try again.",
        );
      } finally {
        setCapturingFor(null);
      }
    });
  }, [captureQueue, setCapturingFor, addCapture, linkCaptureToRubric]);

  const isQG = section === "quality_gate";
  const rubricSection = isQG ? rubric.quality_gate : rubric.scoring_rubric;
  const headerText = isQG ? "Quality Gates" : "Scoring Rubric";
  const descriptionText = isQG
    ? "Mandatory pass/fail thresholds. Gate failures are flagged but you can continue scoring all questions."
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
            const isAiOnly = question.ai_only ?? false;
            const isAutoNa = isAiOnly && !usesAi;

            // Compute progress based on section type
            let hasScore: boolean;
            if (isQG) {
              hasScore =
                ev?.score === "pass" ||
                ev?.score === "fail" ||
                ev?.score === "na" ||
                ev?.score === "unsure";
            } else {
              const sn = typeof ev?.score === "number" ? (ev.score as number) : -1;
              hasScore = sn >= 0 || ev?.score === "na" || ev?.score === "unsure";
            }
            const hasNotes = !!(ev?.notes?.trim());
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
                  {/* QG: requirement text. Scoring: nothing extra. */}
                  {isQG && (
                    <p className="text-ut-xs text-ut-muted leading-relaxed mb-ut-2">
                      {(question as PassFailQuestion).requirement}
                    </p>
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
                        question as ScoringQuestion,
                        setEvaluation,
                      )}

                  {/* Background foldout */}
                  {question.background && (
                    <details className="question-foldout">
                      <summary className="question-foldout-summary">Background</summary>
                      <p className="question-foldout-content">{question.background}</p>
                    </details>
                  )}

                  {/* Examples foldout */}
                  {question.examples && (
                    <details className="question-foldout">
                      <summary className="question-foldout-summary">Examples</summary>
                      <div className="question-foldout-content">
                        {isQG
                          ? Object.entries((question as PassFailQuestion).examples ?? {}).map(
                              ([key, desc]) => (
                                <div key={key} className="example-row">
                                  <span className="example-label">
                                    {key === "pass" ? "Pass" : key === "fail" ? "Fail" : "N/A"}
                                  </span>
                                  <span className="example-desc">{desc}</span>
                                </div>
                              ),
                            )
                          : (["0", "1", "2", "3"] as const).map((level) => {
                              const ex = (question as ScoringQuestion).examples?.[level];
                              return ex ? (
                                <div key={level} className="example-row">
                                  <span className="example-badge">{level}</span>
                                  <span className="example-desc">{ex}</span>
                                </div>
                              ) : null;
                            })}
                      </div>
                    </details>
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
                    disabled={capturingFor === rubricId || captureQueue.isCapturing()}
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
