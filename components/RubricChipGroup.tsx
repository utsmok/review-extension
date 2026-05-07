import { getQuestionCode, getQGQuestionCode } from "@/lib/rubric";
import type { PassFailQuestion, ScoringQuestion } from "@/lib/types";

type RubricQuestion = PassFailQuestion | ScoringQuestion;

interface RubricChipGroupProps {
  questions: Record<string, RubricQuestion>;
  categoryKey: string;
  linkedIds: string[];
  usesAi: boolean;
  isQG?: boolean;
  onToggle: (rubricId: string, linked: boolean) => void;
}

export default function RubricChipGroup({
  questions,
  categoryKey,
  linkedIds,
  usesAi,
  isQG = false,
  onToggle,
}: RubricChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(questions).map(([qId, question], qIdx) => {
        const rubricId = `${categoryKey}.${qId}`;
        const linked = linkedIds.includes(rubricId);
        const isAutoNa = (question.ai_only ?? false) && !usesAi;
        const code = isQG
          ? getQGQuestionCode(categoryKey, qIdx)
          : getQuestionCode(categoryKey, qIdx);
        return (
          <button
            key={rubricId}
            className={`rubric-chip ${linked ? "" : "hover:border-ut-slate"} ${isAutoNa ? "opacity-40" : ""}`}
            data-linked={linked ? "true" : "false"}
            aria-label={`${code} ${question.title} ${linked ? "linked" : "unlinked"}`}
            type="button"
            title={isAutoNa ? "Not applicable — non-AI tool" : question.title}
            onClick={() => onToggle(rubricId, linked)}
          >
            {code}
            {isAutoNa ? "⁂" : ""}
          </button>
        );
      })}
    </div>
  );
}
