import type { FinalizationGrade } from "@/lib/types";

const GRADES: { value: FinalizationGrade; label: string; color: string; tint: string }[] = [
  { value: "pass", label: "Pass", color: "bg-ut-green", tint: "bg-grade-pass-tint" },
  {
    value: "conditional",
    label: "Conditional",
    color: "bg-score-1-strong",
    tint: "bg-grade-conditional-tint",
  },
  { value: "fail", label: "Fail", color: "bg-ut-red", tint: "bg-grade-fail-tint" },
];

interface GradeSelectorProps {
  grade: FinalizationGrade | "";
  onGradeChange: (grade: FinalizationGrade) => void;
}

export default function GradeSelector({ grade, onGradeChange }: GradeSelectorProps) {
  return (
    <div>
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-1 block">
        Overall Grade
      </span>
      <div className="flex gap-ut-2">
        {GRADES.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => onGradeChange(g.value)}
            className={`grade-btn flex-1 px-ut-3 py-ut-2 rounded-ut-sm text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase ${
              grade === g.value
                ? `${g.color} text-white is-selected`
                : `border border-ut-border ${g.tint} text-ut-text hover:brightness-95`
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
