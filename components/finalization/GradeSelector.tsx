import { useCallback, useMemo } from "react";
import { useLabs } from "@/hooks/useLabs";

import { getActiveFrameworkConfig } from "@/lib/framework-config";

const CORE_GRADE_IDS = ["pass", "conditional", "fail"] as const;
const ALL_GRADE_IDS = [
  "pass",
  "conditional",
  "fail",
  "recommended",
  "recommended_with_caveats",
  "needs_review",
  "pilot_only",
  "not_recommended",
  "out_of_scope",
] as const;

function getGradeOptions(enhanced: boolean) {
  const ids = enhanced ? ALL_GRADE_IDS : CORE_GRADE_IDS;
  const byId = new Map(getActiveFrameworkConfig().grades.map((g) => [g.id, g]));
  return ids
    .map((id) => byId.get(id))
    .filter((g): g is NonNullable<typeof g> => g !== undefined)
    .map((g) => ({
      value: g.id,
      label: g.label,
      description: g.description,
      color: g.color,
      tint: g.tint,
    }));
}

interface GradeSelectorProps {
  grade: string;
  onGradeChange: (grade: string) => void;
}

export default function GradeSelector({ grade, onGradeChange }: GradeSelectorProps) {
  const labs = useLabs();
  const grades = useMemo(
    () => getGradeOptions(Boolean(labs.enhancedRecommendation)),
    [labs.enhancedRecommendation],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = grade ? grades.findIndex((g) => g.value === grade) : 0;
      if (idx < 0) return;
      let next = idx;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (idx + 1) % grades.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (idx - 1 + grades.length) % grades.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = grades.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      onGradeChange(grades[next].value);
      const radios = e.currentTarget.querySelectorAll('[role="radio"]');
      (radios[next] as HTMLElement | undefined)?.focus();
    },
    [grade, grades, onGradeChange],
  );

  return (
    <div>
      <span
        id="grade-selector-label"
        className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-1 block"
      >
        Overall Grade
      </span>
      <div
        role="radiogroup"
        aria-labelledby="grade-selector-label"
        className="grid grid-cols-3 gap-ut-2"
        onKeyDown={handleKeyDown}
      >
        {grades.map((g, i) => (
          <button
            key={g.value}
            type="button"
            role="radio"
            aria-checked={grade === g.value}
            tabIndex={grade === g.value || (!grade && i === 0) ? 0 : -1}
            onClick={() => onGradeChange(g.value)}
            className={`grade-btn px-ut-3 py-ut-3 rounded-ut-sm font-heading font-semibold uppercase tracking-ut-label ${
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
