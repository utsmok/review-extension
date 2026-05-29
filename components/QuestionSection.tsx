import React, { useCallback, useMemo, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { captureActiveTab } from "@/lib/capture";
import { useRubric } from "@/lib/contexts";
import {
  getAccentKey,
  getCategoryLabel,
  getLinkedRubricIdsForCapture,
  getQGQuestionCode,
  getQuestionCode,
} from "@/lib/rubric";
import type {
  Capture,
  Evaluation,
  PassFailQuestion,
  RubricScore,
  ScoringQuestion,
} from "@/lib/types";
import { toastError } from "@/stores/toast";
import EvidenceThumbnails from "./EvidenceThumbnails";
import { getProgressState, ProgressCircle } from "./ProgressCircle";
import { ScoreOption } from "./ScoreOption";
import { DoneToggle } from "./question-section/DoneToggle";
import { QualityGateSection } from "./question-section/QualityGateSection";
import { QuestionNotes } from "./question-section/QuestionNotes";

const NO_CAPTURES: Capture[] = [];

function renderScoringScores(
  rubricId: string,
  questionTitle: string,
  scoreNum: number,
  isNa: boolean,
  isUnsure: boolean,
  isAutoNa: boolean,
  levels: ScoringQuestion,
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void,
  ev: Evaluation | undefined,
) {
  return (
    <div role="radiogroup" aria-label={`Rubric score for ${questionTitle}`} className="my-ut-2">
      {([0, 1, 2, 3] as RubricScore[]).map((val) => {
        if (val === "") return null;
        const desc = levels[String(val) as "0" | "1" | "2" | "3"];
        const selected = scoreNum === val;

        const handleClick = () => {
          if (isAutoNa) return;
          if (selected) {
            setEvaluation(rubricId, { score: "" });
          } else {
            setEvaluation(rubricId, { score: val, customScore: undefined });
          }
        };

        return (
          <ScoreOption
            key={val}
            name={rubricId}
            isActive={selected}
            isDisabled={isAutoNa}
            className={`score-row ${selected ? "is-selected" : ""}`}
            dataScore={val}
            onClick={handleClick}
          >
            <span className="score-badge select-none">{val}</span>
            <span className="score-desc">{desc}</span>
          </ScoreOption>
        );
      })}

      {/* N/A row */}
      <ScoreOption
        name={rubricId}
        isActive={isNa}
        isDisabled={isAutoNa}
        className={`score-row score-row--meta-separator ${isNa ? "is-selected" : ""}`}
        dataScore="na"
        onClick={() => {
          if (isAutoNa) return;
          if (isNa) {
            setEvaluation(rubricId, { score: "" });
          } else {
            setEvaluation(rubricId, { score: "na", customScore: undefined });
          }
        }}
      >
        <span className="score-badge select-none">—</span>
        <span className="score-desc">Not applicable</span>
      </ScoreOption>

      {/* Unsure row */}
      <ScoreOption
        name={rubricId}
        isActive={isUnsure}
        isDisabled={isAutoNa}
        className={`score-row ${isUnsure ? "is-selected" : ""}`}
        dataScore="unsure"
        onClick={() => {
          if (isAutoNa) return;
          if (isUnsure) {
            setEvaluation(rubricId, { score: "" });
          } else {
            setEvaluation(rubricId, { score: "unsure", customScore: undefined });
          }
        }}
      >
        <span className="score-badge select-none">?</span>
        <span className="score-desc">Insufficient information to score</span>
      </ScoreOption>
      {/* Custom/Wildcard score */}
      <div className="mt-ut-2 border-t border-ut-border pt-ut-2">
        <details className="question-foldout">
          <summary className="question-foldout-summary">Custom score</summary>
          <div className="question-foldout-content">
            <div className="flex gap-ut-2 mb-ut-2">
              {([0, 1, 2, 3] as RubricScore[]).map((val) => {
                if (val === "") return null;
                const selected = ev?.customScore?.score === val;
                return (
                  <button
                    key={val}
                    type="button"
                    className={`score-badge select-none ${selected ? "border-trust-magenta bg-trust-magenta text-white" : "border-ut-border"}`}
                    style={{ width: 28, height: 28 }}
                    onClick={() => {
                      if (isAutoNa) return;
                      const currentCustom = ev?.customScore;
                      setEvaluation(rubricId, {
                        score: val,
                        customScore: {
                          score: val as 0 | 1 | 2 | 3,
                          reasoning: currentCustom?.reasoning ?? "",
                        },
                      });
                    }}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
            <textarea
              className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 resize-y bg-ut-grey"
              rows={2}
              placeholder="Describe why the standard 0–3 scale does not apply and justify your custom score…"
              value={ev?.customScore?.reasoning ?? ""}
              onChange={(e) => {
                const currentScore = ev?.customScore?.score;
                if (currentScore !== undefined) {
                  setEvaluation(rubricId, {
                    customScore: { score: currentScore, reasoning: e.target.value },
                  });
                }
              }}
            />
          </div>
        </details>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionRow — memoised per-question row extracted from QuestionSection
// ---------------------------------------------------------------------------

interface QuestionRowProps {
  rubricId: string;
  qId: string;
  code: string;
  question: PassFailQuestion | ScoringQuestion;
  section: "quality_gate" | "scoring_rubric";
  category: string;
  evaluation: Evaluation | undefined;
  evidence: Capture[];
  allCaptures: Capture[];
  usesAi: boolean;
  capturingFor: string | null;
  isCapturing: boolean;
  linkPopoverFor: string | null;
  setLinkPopoverFor: (id: string | null) => void;
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void;
  linkCaptureToRubric: (captureId: string, rubricId: string) => void;
  handleCaptureEvidence: (rubricId: string) => void;
  onConfirmRemove: (capture: Capture, rubricId: string) => void;
  onViewEvidence: (capture: Capture) => void;
}

export const QuestionRow = React.memo(function QuestionRow({
  rubricId,
  qId,
  code,
  question,
  section,
  category,
  evaluation,
  evidence,
  allCaptures,
  usesAi,
  capturingFor,
  isCapturing,
  linkPopoverFor,
  setLinkPopoverFor,
  setEvaluation,
  linkCaptureToRubric,
  handleCaptureEvidence,
  onConfirmRemove,
  onViewEvidence,
}: QuestionRowProps) {
  const isQG = section === "quality_gate";
  const ev = evaluation;
  const isAiOnly = question.ai_only ?? false;
  const isAutoNa = isAiOnly && !usesAi;

  // Compute progress based on section type
  let hasScore: boolean;
  if (isQG) {
    hasScore =
      ev?.score === "pass" || ev?.score === "fail" || ev?.score === "na" || ev?.score === "unsure";
  } else {
    const sn = typeof ev?.score === "number" ? (ev.score as number) : -1;
    hasScore = sn >= 0 || ev?.score === "na" || ev?.score === "unsure";
  }
  const hasNotes = !!ev?.notes?.trim();
  const hasEvidence = evidence.length > 0;
  const progress = getProgressState(hasScore, hasEvidence, hasNotes, ev?.manualDone);

  // For scoring: determine scoreNum and isNa
  const scoreNum = typeof ev?.score === "number" ? (ev.score as number) : -1;
  const isNa = ev?.score === "na" || isAutoNa;

  return (
    <details
      key={qId}
      id={`question-${rubricId}`}
      className="question-details"
      data-accent-key={isQG ? "control" : getAccentKey(category)}
      style={isAutoNa ? { opacity: 0.5 } : undefined}
    >
      <summary>
        <ProgressCircle state={progress} />
        <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
        {hasScore && (
          <span
            className="summary-score-badge select-none"
            data-score={
              isQG
                ? ev?.score
                : isNa
                  ? "na"
                  : ev?.score === "unsure"
                    ? "unsure"
                    : scoreNum >= 0
                      ? scoreNum
                      : undefined
            }
            aria-hidden="true"
          >
            {isQG
              ? ev?.score === "pass"
                ? "✓"
                : ev?.score === "fail"
                  ? "✗"
                  : ev?.score === "na"
                    ? "—"
                    : "?"
              : isNa
                ? "—"
                : ev?.score === "unsure"
                  ? "?"
                  : scoreNum >= 0
                    ? scoreNum
                    : ""}
          </span>
        )}
        <span>{question.title}</span>
        {isAutoNa && (
          <span className="text-ut-xs text-ut-muted font-mono ml-1">
            N/A &mdash; tool does not use AI
          </span>
        )}
        {!isAutoNa && (
          <DoneToggle
            isDone={!!ev?.manualDone}
            onToggle={() => setEvaluation(rubricId, { manualDone: !ev?.manualDone || undefined })}
          />
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
        {isQG ? (
          <QualityGateSection
            rubricId={rubricId}
            questionTitle={question.title}
            score={ev}
            isAutoNa={isAutoNa}
            onScoreChange={setEvaluation}
          />
        ) : (
          renderScoringScores(
            rubricId,
            question.title,
            scoreNum,
            isNa,
            ev?.score === "unsure",
            isAutoNa,
            question as ScoringQuestion,
            setEvaluation,
            ev,
          )
        )}

        {/* Related quality gate cross-reference */}
        {!isQG && (question as ScoringQuestion).related_gate && (
          <p className="text-ut-xs text-ut-slate italic mt-ut-1">
            Builds on quality gate:{" "}
            <span className="font-mono font-bold not-italic">
              {(question as ScoringQuestion).related_gate}
            </span>
          </p>
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
                        <span
                          className="example-label"
                          data-score={key === "pass" ? "pass" : key === "fail" ? "fail" : "na"}
                        >
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
                        <span className="example-badge" data-score={level}>
                          {level}
                        </span>
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

        <div className="flex items-center gap-ut-1 mt-ut-1">
          <button
            type="button"
            className="text-ut-xs text-ut-blue hover:text-ut-darkblue font-mono uppercase tracking-ut-label"
            disabled={capturingFor === rubricId || isCapturing}
            onClick={() => handleCaptureEvidence(rubricId)}
          >
            {capturingFor === rubricId ? "Capturing..." : "+ Capture Evidence"}
          </button>

          <button
            type="button"
            className="text-ut-xs text-ut-blue hover:text-ut-darkblue font-mono uppercase tracking-ut-label"
            onClick={() => setLinkPopoverFor(linkPopoverFor === rubricId ? null : rubricId)}
          >
            {linkPopoverFor === rubricId ? "Close" : "Link existing"}
          </button>
        </div>
        {linkPopoverFor === rubricId && (
          <div className="border border-ut-border bg-ut-white rounded-ut-sm mt-ut-1 max-h-40 overflow-y-auto animate-[omp-fade-in_200ms_ease-out]">
            {allCaptures.length === 0 ? (
              <p className="text-ut-xs text-ut-muted p-ut-2">No captures yet</p>
            ) : (
              allCaptures.map((c) => {
                const isLinked = ev?.explicitEvidenceIds?.includes(c.id) ?? false;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full flex items-center gap-ut-2 px-ut-2 py-ut-1 text-left hover:bg-ut-grey transition-colors ${isLinked ? "opacity-50" : ""}`}
                    disabled={isLinked}
                    onClick={() => {
                      linkCaptureToRubric(c.id, rubricId);
                      setLinkPopoverFor(null);
                    }}
                  >
                    <img
                      src={c.annotatedScreenshotBase64 ?? c.screenshotBase64}
                      alt=""
                      className="h-6 w-auto border border-ut-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-ut-xs font-bold truncate">{c.pageTitle || "Capture"}</p>
                      <p className="text-ut-xs text-ut-muted truncate">
                        {new Date(c.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {isLinked && <span className="text-ut-xs text-ut-green">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        )}

        <QuestionNotes
          value={ev?.notes ?? ""}
          onChange={(value) => setEvaluation(rubricId, { notes: value })}
          placeholder={isQG ? "Notes / remarks..." : "Notes..."}
        />
      </div>
    </details>
  );
});

interface QuestionSectionProps {
  section: "quality_gate" | "scoring_rubric";
  capturingFor: string | null;
  setCapturingFor: (id: string | null) => void;
  captureQueue: { enqueue: (fn: () => Promise<void>) => void; isCapturing: boolean };
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
  const [linkPopoverFor, setLinkPopoverFor] = useState<string | null>(null);
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

  const handleCaptureEvidence = useCallback(
    (rubricId: string) => {
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
    },
    [captureQueue, setCapturingFor, addCapture, linkCaptureToRubric],
  );

  const isQG = section === "quality_gate";
  const rubricSection = isQG ? rubric.quality_gate : rubric.scoring_rubric;
  const headerText = isQG ? "Quality Gates" : "Scoring Rubric";
  const descriptionText = isQG
    ? "Mandatory pass/fail thresholds. Gate failures are flagged but you can continue scoring all questions."
    : "Score each criterion on a 0–3 scale.";

  // Collect merged-gate scoring questions for display in QG section
  const mergedGates = useMemo(() => {
    if (!isQG) return [];
    const result: { category: string; qId: string; question: ScoringQuestion; code: string }[] = [];
    for (const [cat, questions] of Object.entries(rubric.scoring_rubric)) {
      for (const [qId, q] of Object.entries(questions)) {
        const sq = q as ScoringQuestion;
        if (sq.merged_gate) {
          const idx = Object.keys(questions).indexOf(qId);
          result.push({ category: cat, qId, question: sq, code: getQuestionCode(cat, idx) });
        }
      }
    }
    return result;
  }, [isQG, rubric.scoring_rubric]);

  return (
    <section>
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta mb-ut-2">
        {headerText}
      </h2>
      <p className="text-ut-xs text-ut-slate mb-ut-5">{descriptionText}</p>
      {Object.entries(rubricSection).map(([category, questions]) => (
        <div key={category} className="mb-ut-3">
          <h3 className="section-kicker mb-1">{getCategoryLabel(category)}</h3>
          {Object.entries(questions).map(([qId, questionRaw], qIdx) => {
            const question = questionRaw as PassFailQuestion | ScoringQuestion;
            const rubricId = `${category}.${qId}`;
            const code = isQG ? getQGQuestionCode(category, qIdx) : getQuestionCode(category, qIdx);

            return (
              <QuestionRow
                key={qId}
                rubricId={rubricId}
                qId={qId}
                code={code}
                question={question}
                section={section}
                category={category}
                evaluation={evaluationMap.get(rubricId)}
                evidence={captureMap.get(rubricId) ?? NO_CAPTURES}
                allCaptures={captures}
                usesAi={usesAi}
                capturingFor={capturingFor}
                isCapturing={captureQueue.isCapturing}
                linkPopoverFor={linkPopoverFor}
                setLinkPopoverFor={setLinkPopoverFor}
                setEvaluation={setEvaluation}
                linkCaptureToRubric={linkCaptureToRubric}
                handleCaptureEvidence={handleCaptureEvidence}
                onConfirmRemove={onConfirmRemove}
                onViewEvidence={onViewEvidence}
              />
            );
          })}
        </div>
      ))}

      {/* Merged gate questions shown in QG section */}
      {isQG && mergedGates.length > 0 && (
        <div className="mb-ut-3">
          <h3 className="section-kicker mb-1">Merged Gates</h3>
          {mergedGates.map(({ category, qId, question, code }) => {
            const rubricId = `${category}.${qId}`;
            const ev = evaluationMap.get(rubricId);
            // Gate badge: score > 0 = pass, score === 0 = fail, no score = unanswered
            const gateResult =
              typeof ev?.score === "number" && ev.score > 0
                ? "pass"
                : typeof ev?.score === "number" && ev.score === 0
                  ? "fail"
                  : ev?.score === "na"
                    ? "na"
                    : null;

            return (
              <details key={qId} className="question-details" data-accent-key="control">
                <summary>
                  {gateResult && (
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-ut-xs font-bold mr-1 ${
                        gateResult === "pass"
                          ? "bg-ut-green/20 text-ut-green"
                          : gateResult === "fail"
                            ? "bg-red-200 text-red-700"
                            : "bg-ut-grey text-ut-slate"
                      }`}
                    >
                      {gateResult === "pass" ? "✓" : gateResult === "fail" ? "✗" : "—"}
                    </span>
                  )}
                  <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
                  <span>{question.title}</span>
                  <span className="text-ut-xs text-ut-muted ml-1">(merged)</span>
                </summary>
                <div className="question-body">
                  <p className="text-ut-xs text-ut-slate italic mt-ut-1">
                    This gate is merged with{" "}
                    <strong>
                      {code} ({question.title})
                    </strong>{" "}
                    in the Scoring Rubric. Score it there.
                    {gateResult === "pass" && " Currently: PASS (score > 0)."}
                    {gateResult === "fail" && " Currently: FAIL (score = 0)."}
                    {gateResult === "na" && " Currently: N/A."}
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
