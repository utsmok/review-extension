import { useMemo, useState } from "react";
import { captureActiveTab } from "@/lib/capture";
import ConfirmDialog from "@/components/ConfirmDialog";
import EvidenceModal from "@/components/EvidenceModal";
import { getAccentKey, getCategoryLabel, getQuestionCode } from "@/lib/rubric";
import { useRubric } from "@/lib/rubric-context";
import type { Capture, PassFailScore, RubricScore, ScoringQuestion } from "@/lib/types";
import { useSessionStore } from "@/stores/session";

type ProgressState = "empty" | "partial" | "complete";

function ProgressCircle({ state }: { state: ProgressState }) {
  if (state === "empty") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--ut-slate)" strokeWidth="2" />
      </svg>
    );
  }
  if (state === "partial") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
        <path d="M8 2a6 6 0 0 1 0 12Z" fill="var(--state-warning)" />
        <circle cx="8" cy="8" r="6" fill="none" stroke="var(--state-warning)" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
      <circle cx="8" cy="8" r="6" fill="var(--state-success)" stroke="var(--state-success)" strokeWidth="2" />
    </svg>
  );
}

function getProgressState(hasScore: boolean, hasEvidence: boolean, hasNotes: boolean): ProgressState {
  const hasExtra = hasEvidence || hasNotes;
  if (hasScore && hasExtra) return "complete";
  if (hasScore || hasExtra) return "partial";
  return "empty";
}

function EvidenceThumbnails({
  captures,
  rubricId,
  onConfirmRemove,
  onViewEvidence,
}: {
  captures: Capture[];
  rubricId: string;
  onConfirmRemove: (capture: Capture, rubricId: string) => void;
  onViewEvidence: (capture: Capture) => void;
}) {
  if (captures.length === 0) return null;
  return (
    <div className="mb-ut-2">
      <p className="text-ut-xs font-heading font-bold text-ut-slate uppercase mb-1">
        Evidence ({captures.length})
      </p>
      <div className="flex gap-1 overflow-x-auto">
        {captures.map((c) => (
          <div key={c.id} className="evidence-thumb-wrap">
            <img
              src={c.annotatedScreenshotBase64 ?? c.screenshotBase64}
              alt="Evidence"
              loading="lazy"
            />
            <div className="evidence-thumb-overlay">
              <button
                type="button"
                className="btn-remove"
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmRemove(c, rubricId);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line x1="3" y1="3" x2="9" y2="9" stroke="#fff" strokeWidth="2" />
                  <line x1="9" y1="3" x2="3" y2="9" stroke="#fff" strokeWidth="2" />
                </svg>
              </button>
              <button
                type="button"
                className="btn-view"
                title="View & annotate"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewEvidence(c);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4Z" stroke="#fff" strokeWidth="1.2" />
                  <circle cx="6" cy="6" r="1.5" stroke="#fff" strokeWidth="1.2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLevelDesc(
  levels: ScoringQuestion,
  val: number,
  mode: "expert" | "basic",
): string {
  if (mode === "basic") {
    const basicKey = `${val}_basic` as keyof ScoringQuestion;
    const basic = levels[basicKey];
    if (typeof basic === "string") return basic;
  }
  return levels[String(val) as "0" | "1" | "2" | "3"];
}

export default function Evaluation() {
  const { rubric, usesAi } = useRubric();
  const evaluations = useSessionStore((s) => s.evaluations);
  const captures = useSessionStore((s) => s.captures);
  const questionModes = useSessionStore((s) => s.questionModes);
  const setEvaluation = useSessionStore((s) => s.setEvaluation);
  const setQuestionMode = useSessionStore((s) => s.setQuestionMode);
  const addCapture = useSessionStore((s) => s.addCapture);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore((s) => s.unlinkCaptureFromRubric);
  const removeCapture = useSessionStore((s) => s.removeCapture);

  const [capturingFor, setCapturingFor] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ capture: Capture; rubricId: string } | null>(null);
  const [viewCapture, setViewCapture] = useState<Capture | null>(null);

  const evaluationMap = useMemo(
    () => new Map(evaluations.map((e) => [e.rubricId, e])),
    [evaluations],
  );

  const captureMap = useMemo(() => {
    const map = new Map<string, Capture[]>();
    for (const c of captures) {
      for (const rid of c.linkedRubricIds) {
        const list = map.get(rid);
        if (list) list.push(c);
        else map.set(rid, [c]);
      }
    }
    return map;
  }, [captures]);

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

  const handleConfirmRemove = (capture: Capture, rubricId: string) => {
    setConfirmTarget({ capture, rubricId });
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4">
      {/* Quality Gates */}
      <section>
        <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-ut-navy mb-ut-2">
          Quality Gates
        </h2>
        <p className="text-ut-xs text-ut-slate mb-ut-2">
          Mandatory pass/fail thresholds. Any fail halts the review.
        </p>
        {Object.entries(rubric.quality_gate).map(([category, questions]) => (
          <div key={category} className="mb-ut-3">
            <h3 className="section-kicker mb-1">{getCategoryLabel(category)}</h3>
            {Object.entries(questions).map(([qId, question], qIdx) => {
              const rubricId = `${category}.${qId}`;
              const code = getQuestionCode(category, qIdx);
              const ev = evaluationMap.get(rubricId);
              const evidence = captureMap.get(rubricId) ?? [];
              const mode = questionModes[rubricId] ?? "expert";
              const isAiOnly = question.ai_only ?? false;
              const isAutoNa = isAiOnly && !usesAi;

              const hasScore = ev?.score === "pass" || ev?.score === "fail" || ev?.score === "na";
              const hasNotes = !!(ev?.notes && ev.notes.trim());
              const hasEvidence = evidence.length > 0;
              const progress = getProgressState(hasScore, hasEvidence, hasNotes);

              const requirement = mode === "basic" && question.basic_requirement
                ? question.basic_requirement
                : question.requirement;

              return (
                <details key={qId} className="question-details" data-accent-key="control">
                  <summary>
                    <ProgressCircle state={progress} />
                    <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
                    <span>{question.title}</span>
                    {isAutoNa && (
                      <span className="text-ut-xs text-ut-muted font-mono ml-1">N/A — non-AI</span>
                    )}
                  </summary>
                  <div className="question-body">
                    <div className="flex items-center justify-between mb-ut-2">
                      <p className="text-ut-xs text-ut-muted leading-relaxed flex-1">
                        {requirement}
                      </p>
                      <button
                        type="button"
                        className="text-ut-xs text-ut-slate hover:text-ut-text font-mono uppercase tracking-ut-label ml-2 shrink-0"
                        onClick={() => setQuestionMode(rubricId, mode === "expert" ? "basic" : "expert")}
                        title={`Switch to ${mode === "expert" ? "basic" : "expert"} wording`}
                      >
                        {mode === "expert" ? "Expert" : "Basic"}
                      </button>
                    </div>

                    <div className="flex gap-ut-2 mb-ut-2">
                      {(["pass", "fail", "na"] as PassFailScore[]).map((val) => (
                        <label
                          key={val}
                          className="judgment-label"
                          data-judgment={val === "na" ? "fail" : val}
                          data-active={ev?.score === val || (isAutoNa && val === "na") ? "true" : "false"}
                        >
                          <input
                            type="radio"
                            name={rubricId}
                            checked={ev?.score === val || (isAutoNa && val === "na" && ev?.score !== "pass" && ev?.score !== "fail")}
                            disabled={isAutoNa && val !== "na"}
                            onChange={() => setEvaluation(rubricId, { score: val })}
                          />
                          {val === "pass" ? "✓ Pass" : val === "fail" ? "✗ Fail" : "— N/A"}
                        </label>
                      ))}
                    </div>

                    <EvidenceThumbnails
                      captures={evidence}
                      rubricId={rubricId}
                      onConfirmRemove={handleConfirmRemove}
                      onViewEvidence={setViewCapture}
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
                      placeholder="Notes / remarks..."
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

      {/* Scoring Rubric */}
      <section>
        <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-ut-navy mb-ut-2">
          Scoring Rubric
        </h2>
        <p className="text-ut-xs text-ut-slate mb-ut-2">Score each criterion on a 0–3 scale.</p>
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
                <details key={qId} className="question-details" data-accent-key={getAccentKey(category)}>
                  <summary>
                    <ProgressCircle state={progress} />
                    <span className="font-mono text-ut-slate text-ut-xs">{code}</span>
                    <span>{levels.title}</span>
                    {isAutoNa && (
                      <span className="text-ut-xs text-ut-muted font-mono ml-1">N/A — non-AI</span>
                    )}
                  </summary>
                  <div className="question-body">
                    <div className="flex items-center justify-end mb-ut-1">
                      <button
                        type="button"
                        className="text-ut-xs text-ut-slate hover:text-ut-text font-mono uppercase tracking-ut-label shrink-0"
                        onClick={() => setQuestionMode(rubricId, mode === "expert" ? "basic" : "expert")}
                        title={`Switch to ${mode === "expert" ? "basic" : "expert"} wording`}
                      >
                        {mode === "expert" ? "Expert" : "Basic"}
                      </button>
                    </div>

                    {/* Bundled score rows */}
                    <div className="my-ut-2">
                      {([0, 1, 2, 3] as RubricScore[]).map((val) => {
                        if (val === "") return null;
                        const desc = getLevelDesc(levels, val as number, mode);
                        const selected = scoreNum === val;
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
                              disabled={isAutoNa}
                              onChange={() => setEvaluation(rubricId, { score: val })}
                              className="sr-only"
                            />
                            <span className="score-badge">{val}</span>
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
                          onChange={() => setEvaluation(rubricId, { score: "na" })}
                          className="sr-only"
                        />
                        <span className="score-badge">—</span>
                        <span className="score-desc">Not applicable</span>
                      </label>
                    </div>

                    <EvidenceThumbnails
                      captures={evidence}
                      rubricId={rubricId}
                      onConfirmRemove={handleConfirmRemove}
                      onViewEvidence={setViewCapture}
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

      {/* Confirm dialog */}
      {confirmTarget && (
        <ConfirmDialog
          message="Remove this evidence?"
          onRemoveTag={() => {
            unlinkCaptureFromRubric(confirmTarget.capture.id, confirmTarget.rubricId);
            setConfirmTarget(null);
          }}
          onDelete={() => {
            removeCapture(confirmTarget.capture.id);
            setConfirmTarget(null);
          }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Evidence modal */}
      {viewCapture && (
        <EvidenceModal
          capture={viewCapture}
          onClose={() => setViewCapture(null)}
        />
      )}
    </div>
  );
}
