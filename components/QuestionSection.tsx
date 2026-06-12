import React, { useCallback, useMemo, useState } from "react";
import { useRubric } from "@/components/contexts";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useLabs } from "@/hooks/useLabs";
import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";
import { captureActiveTab } from "@/lib/capture";
import {
  getAccentKey,
  getCategoryLabel,
  getLinkedRubricIdsForCapture,
  getQGQuestionCode,
  getQuestionCode,
} from "@/lib/rubric";
import type { Capture, Evaluation, PassFailQuestion, ScoringQuestion } from "@/lib/types";
import { toastError } from "@/stores/toast";
import EvidenceThumbnails from "./EvidenceThumbnails";
import { getProgressState, ProgressCircle } from "./ProgressCircle";
import { DoneToggle } from "./question-section/DoneToggle";
import { PrincipleSummaryEditor } from "./question-section/PrincipleSummaryEditor";
import { QualityGateSection } from "./question-section/QualityGateSection";
import { QuestionNotes } from "./question-section/QuestionNotes";
import { ScoringScoreInputs } from "./question-section/ScoringScoreInputs";

const NO_CAPTURES: Capture[] = [];

function MiniCaptureImg({ capture }: { capture: Capture }) {
  const screenshotUrl = useScreenshotUrl(capture.id);
  const src = screenshotUrl ?? capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;
  return <img src={src} alt="" className="h-6 w-auto border border-ut-border" />;
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
      </summary>
      <div className="question-body">
        {/* QG: requirement text. Scoring: nothing extra. */}
        {isQG && (
          <p className="text-ut-sm text-ut-muted leading-relaxed mb-ut-2">
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
          <ScoringScoreInputs
            rubricId={rubricId}
            questionTitle={question.title}
            scoreNum={scoreNum}
            isNa={isNa}
            isUnsure={ev?.score === "unsure"}
            isAutoNa={isAutoNa}
            levels={question as ScoringQuestion}
            setEvaluation={setEvaluation}
            ev={ev}
          />
        )}

        {/* Related quality gate cross-reference */}
        {!isQG && (question as ScoringQuestion).related_gate && (
          <p className="text-ut-xs text-ut-slate italic mt-ut-1">
            Gate:{" "}
            <span className="font-mono not-italic">
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

        <div className="flex items-center gap-ut-2 mt-ut-2">
          <button
            type="button"
            className="text-ut-xs text-ut-blue hover:text-ut-darkblue font-mono uppercase tracking-ut-label"
            disabled={capturingFor === rubricId || isCapturing}
            onClick={() => handleCaptureEvidence(rubricId)}
          >
            {capturingFor === rubricId ? "Capturing..." : "+ Capture Evidence"}
          </button>

          <span className="text-ut-border" aria-hidden="true">
            |
          </span>

          <button
            type="button"
            className="text-ut-xs text-ut-blue hover:text-ut-darkblue font-mono uppercase tracking-ut-label"
            onClick={() => setLinkPopoverFor(linkPopoverFor === rubricId ? null : rubricId)}
          >
            {linkPopoverFor === rubricId ? "Close" : "Link existing"}
          </button>

          {!isAutoNa && (
            <DoneToggle
              isDone={!!ev?.manualDone}
              onToggle={() => setEvaluation(rubricId, { manualDone: !ev?.manualDone || undefined })}
            />
          )}
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
                    <MiniCaptureImg capture={c} />
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

        <div className="mt-ut-2">
          <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-muted mb-ut-1 block">
            Remarks
          </span>
          <QuestionNotes
            value={ev?.notes ?? ""}
            onChange={(value) => setEvaluation(rubricId, { notes: value })}
            placeholder={
              isQG
                ? "e.g., Privacy policy dated 2025-03; confirms no third-party sharing"
                : "e.g., Sources page lists 12 databases but no coverage dates provided"
            }
          />
        </div>
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

export function QuestionSection({
  section,
  capturingFor,
  setCapturingFor,
  captureQueue,
  onConfirmRemove,
  onViewEvidence,
}: QuestionSectionProps) {
  const { rubric, usesAi } = useRubric();
  const labs = useLabs();
  const [linkPopoverFor, setLinkPopoverFor] = useState<string | null>(null);
  const {
    evaluations,
    captures,
    setEvaluation,
    addCapture,
    linkCaptureToRubric,
    principleSummaries,
    setPrincipleSummary,
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
    ? "Mandatory pass/fail thresholds. Gate failures are flagged but you can continue scoring."
    : "";

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
    <section data-section-type={isQG ? "quality_gate" : "scoring_rubric"}>
      <h2
        className={`font-heading text-ut-heading font-bold uppercase tracking-ut-heading mb-ut-2 ${isQG ? "text-ut-navy" : "text-trust-magenta"}`}
      >
        {headerText}
      </h2>
      {descriptionText && (
        <p className="text-ut-sm text-ut-slate leading-normal mb-ut-5">{descriptionText}</p>
      )}
      {Object.entries(rubricSection).map(([category, questions]) => (
        <div
          key={category}
          className="mb-ut-3"
          data-accent-key={isQG ? "control" : getAccentKey(category)}
        >
          <h3 className="section-kicker">{getCategoryLabel(category)}</h3>
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
          {!isQG && labs.principleSummaries && (
            <PrincipleSummaryEditor
              categoryId={category}
              evaluations={evaluations}
              rubric={rubric}
              usesAi={usesAi}
              summary={principleSummaries.find((p) => p.categoryId === category)}
              onUpdate={setPrincipleSummary}
            />
          )}
        </div>
      ))}

      {/* Merged gate questions shown in QG section */}
      {isQG && mergedGates.length > 0 && (
        <div className="mb-ut-3">
          <h3 className="section-kicker">Merged Gates</h3>
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
                          ? "text-ut-green"
                          : gateResult === "fail"
                            ? "text-ut-red"
                            : "text-ut-slate"
                      }`}
                      style={
                        gateResult === "pass"
                          ? { background: "var(--judgment-pass-tint)" }
                          : gateResult === "fail"
                            ? { background: "var(--judgment-fail-tint)" }
                            : undefined
                      }
                    >
                      {gateResult === "pass" ? "✓" : gateResult === "fail" ? "✗" : "—"}
                    </span>
                  )}
                  <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
                  <span>{question.title}</span>
                </summary>
                <div className="question-body">
                  <p className="text-ut-xs text-ut-slate italic mt-ut-1">
                    Scored in the Scoring Rubric under <strong>{code}</strong>.
                    {gateResult === "pass" && " Currently: PASS."}
                    {gateResult === "fail" && " Currently: FAIL."}
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
