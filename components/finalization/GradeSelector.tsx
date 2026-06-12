import type { FinalizationGrade } from "@/lib/types";
import { useLabs } from "@/hooks/useLabs";

const GRADES: {
  value: FinalizationGrade;
  label: string;
  description: string;
  color: string;
  tint: string;
}[] = [
  {
    value: "pass",
    label: "Pass",
    description: "Meets TRUST standards for institutional recommendation",
    color: "bg-ut-green",
    tint: "bg-grade-pass-tint",
  },
  {
    value: "conditional",
    label: "Conditional",
    description: "Acceptable with documented caveats",
    color: "bg-score-1-strong",
    tint: "bg-grade-conditional-tint",
  },
  {
    value: "fail",
    label: "Fail",
    description: "Does not meet minimum standards",
    color: "bg-ut-red",
    tint: "bg-grade-fail-tint",
  },
];

const ENHANCED_GRADES = [
  ...GRADES,
  {
    value: "recommended" as FinalizationGrade,
    label: "Recommended",
    description: "Exceeds TRUST standards",
    color: "bg-ut-green",
    tint: "bg-grade-pass-tint",
  },
  {
    value: "recommended_with_caveats" as FinalizationGrade,
    label: "With Caveats",
    description: "Recommended with documented limitations",
    color: "bg-score-1-strong",
    tint: "bg-grade-conditional-tint",
  },
  {
    value: "needs_review" as FinalizationGrade,
    label: "Needs Review",
    description: "Insufficient evidence for recommendation",
    color: "bg-ut-muted",
    tint: "bg-gray-100",
  },
  {
    value: "pilot_only" as FinalizationGrade,
    label: "Pilot Only",
    description: "Suitable only for limited pilot use",
    color: "bg-amber-600",
    tint: "bg-amber-50",
  },
  {
    value: "not_recommended" as FinalizationGrade,
    label: "Not Recommended",
    description: "Does not meet minimum standards",
    color: "bg-ut-red",
    tint: "bg-grade-fail-tint",
  },
  {
    value: "out_of_scope" as FinalizationGrade,
    label: "Out of Scope",
    description: "Falls outside TRUST evaluation criteria",
    color: "bg-gray-500",
    tint: "bg-gray-100",
  },
];

interface GradeSelectorProps {
  grade: FinalizationGrade | "";
  onGradeChange: (grade: FinalizationGrade) => void;
}

export default function GradeSelector({ grade, onGradeChange }: GradeSelectorProps) {
  const labs = useLabs();
  const grades = labs.enhancedRecommendation ? ENHANCED_GRADES : GRADES;
  return (
    <div>
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-1 block">
        Overall Grade
      </span>
      <div className="flex gap-ut-2">
        {grades.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onGradeChange(g.value)}
            className={`grade-btn flex-1 px-ut-3 py-ut-3 rounded-ut-sm font-heading font-semibold uppercase tracking-ut-label ${
              grade === g.value
                ? `${g.color} text-white is-selected`
                : `border-2 border-ut-border ${g.tint} text-ut-text hover:brightness-95`
            }`}
          >
            <span
              className={`text-ut-sm leading-snug ${grade === g.value ? "font-bold" : "font-semibold"}`}
            >
              {g.label}
            </span>
            <span className="grade-btn__desc block text-ut-xs font-normal normal-case tracking-normal mt-0.5 leading-relaxed">
              {g.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
