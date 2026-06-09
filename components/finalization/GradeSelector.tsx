import type { FinalizationGrade } from "@/lib/types";

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
