import { ScoreOption } from "../ScoreOption";
import type { Evaluation, PassFailScore } from "@/lib/types";

interface QualityGateSectionProps {
  rubricId: string;
  questionTitle: string;
  score: Evaluation | undefined;
  isAutoNa: boolean;
  onScoreChange: (rubricId: string, patch: Partial<Evaluation>) => void;
}

export function QualityGateSection({
  rubricId,
  questionTitle,
  score,
  isAutoNa,
  onScoreChange,
}: QualityGateSectionProps) {
  return (
    <div
      role="radiogroup"
      aria-label={`Quality gate score for ${questionTitle}`}
      className="flex gap-ut-2 mb-ut-2"
    >
      {(["pass", "fail", "na", "unsure"] as PassFailScore[]).map((val) => {
        const isActive =
          score?.score === val ||
          (isAutoNa &&
            val === "na" &&
            score?.score !== "pass" &&
            score?.score !== "fail" &&
            score?.score !== "unsure");
        const isDisabled = isAutoNa && val !== "na";

        const handleClick = () => {
          if (isDisabled) return;
          if (score?.score === val) {
            onScoreChange(rubricId, { score: "" });
          } else {
            onScoreChange(rubricId, { score: val });
          }
        };

        return (
          <ScoreOption
            key={val}
            name={rubricId}
            isActive={isActive}
            isDisabled={isDisabled}
            className="judgment-label cursor-pointer select-none"
            dataJudgment={val}
            onClick={handleClick}
          >
            {val === "pass"
              ? "✓ Pass"
              : val === "fail"
                ? "✗ Fail"
                : val === "na"
                  ? "— N/A"
                  : "? Unsure"}
          </ScoreOption>
        );
      })}
    </div>
  );
}
