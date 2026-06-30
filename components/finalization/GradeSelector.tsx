import { useCallback, useMemo } from "react";
import { useEditMode } from "@/components/edit-mode/EditModeContext";
import EditableText from "@/components/editor/EditableText";
import { useLabs } from "@/hooks/useLabs";

import { getActiveFrameworkConfig } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

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
  const { editMode } = useEditMode();
  const setGradeOverride = useFrameworkCustomizationStore((s) => s.setGradeOverride);
  // Re-render when grade customization changes so edits appear live.
  useFrameworkCustomizationStore((s) => s.customization);
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
        {grades.map((g, i) => {
          const selected = grade === g.value;
          if (editMode) {
            return (
              <div
                key={g.value}
                role="radio"
                aria-checked={selected}
                tabIndex={selected || (!grade && i === 0) ? 0 : -1}
                data-testid={`grade-card-${g.value}`}
                onClick={() => onGradeChange(g.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onGradeChange(g.value);
                  }
                }}
                className={`grade-btn px-ut-3 py-ut-3 rounded-ut-sm font-heading ${
                  selected
                    ? `${g.color} text-white is-selected`
                    : `border-2 border-ut-border ${g.tint} text-ut-text`
                } cursor-pointer`}
              >
                <EditableText
                  disabled={false}
                  multiline={false}
                  value={g.label}
                  onChange={(v) => setGradeOverride(g.value, { label: v })}
                  label={`${g.value} grade label`}
                  className={`text-ut-sm leading-snug ${selected ? "font-bold" : "font-semibold"}`}
                />
                <EditableText
                  disabled={false}
                  value={g.description}
                  onChange={(v) => setGradeOverride(g.value, { description: v })}
                  label={`${g.value} grade description`}
                  className="grade-btn__desc block text-ut-xs font-normal normal-case tracking-normal mt-0.5 leading-relaxed"
                />
              </div>
            );
          }
          return (
            <button
              key={g.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!grade && i === 0) ? 0 : -1}
              onClick={() => onGradeChange(g.value)}
              className={`grade-btn px-ut-3 py-ut-3 rounded-ut-sm font-heading font-semibold uppercase tracking-ut-label ${
                selected
                  ? `${g.color} text-white is-selected`
                  : `border-2 border-ut-border ${g.tint} text-ut-text hover:brightness-95`
              }`}
            >
              <span
                className={`text-ut-sm leading-snug ${selected ? "font-bold" : "font-semibold"}`}
              >
                {g.label}
              </span>
              <span className="grade-btn__desc block text-ut-xs font-normal normal-case tracking-normal mt-0.5 leading-relaxed">
                {g.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
