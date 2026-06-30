import type { Evaluation, RubricScore, ScoringQuestion } from "@/lib/types";
import { ScoreOption } from "../ScoreOption";

interface ScoringScoreInputsProps {
  rubricId: string;
  questionTitle: string;
  scoreNum: number;
  isNa: boolean;
  isUnsure: boolean;
  isAutoNa: boolean;
  levels: ScoringQuestion;
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void;
  ev: Evaluation | undefined;
}

export function ScoringScoreInputs({
  rubricId,
  questionTitle,
  scoreNum,
  isNa,
  isUnsure,
  isAutoNa,
  levels,
  setEvaluation,
  ev,
}: ScoringScoreInputsProps) {
  return (
    <div role="radiogroup" aria-label={`Rubric score for ${questionTitle}`} className="mt-ut-1">
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
            {/* TODO(phase4): inline score-level anchor editing */}
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
      <div className="mt-ut-2">
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
              className="w-full border border-ut-border rounded-ut-sm text-ut-sm p-ut-2 resize-y bg-ut-grey"
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
