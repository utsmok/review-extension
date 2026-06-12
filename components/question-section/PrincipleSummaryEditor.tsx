import { useCallback, useEffect, useMemo, useState } from "react";
import { generatePrincipleSummaries } from "@/lib/rubric";
import type { Evaluation, PrincipleSummary, RubricData } from "@/lib/types";

interface PrincipleSummaryEditorProps {
  categoryId: string;
  evaluations: Evaluation[];
  rubric: RubricData;
  usesAi: boolean;
  summary: PrincipleSummary | undefined;
  onUpdate: (categoryId: string, patch: Partial<PrincipleSummary>) => void;
}

export function PrincipleSummaryEditor({
  categoryId,
  evaluations,
  rubric,
  usesAi,
  summary,
  onUpdate,
}: PrincipleSummaryEditorProps) {
  const [open, setOpen] = useState(false);

  // Generate auto-observations from current evaluations
  const autoObservations = useMemo(() => {
    const all = generatePrincipleSummaries(evaluations, rubric, usesAi);
    return all.find((s) => s.categoryId === categoryId)?.observations ?? "No questions scored yet.";
  }, [evaluations, rubric, usesAi, categoryId]);

  // Refresh auto-observations when they change (only if user hasn't written custom)
  useEffect(() => {
    if (!summary?.customObservations && summary?.observations !== autoObservations) {
      onUpdate(categoryId, {
        categoryId,
        observations: autoObservations,
      });
    }
  }, [autoObservations, categoryId, onUpdate, summary]);

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onUpdate(categoryId, {
        categoryId,
        observations: autoObservations,
        customObservations: value || undefined,
      });
    },
    [categoryId, autoObservations, onUpdate],
  );

  const handleReset = useCallback(() => {
    onUpdate(categoryId, {
      categoryId,
      observations: autoObservations,
      customObservations: undefined,
    });
  }, [categoryId, autoObservations, onUpdate]);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="mt-2 mb-4 border border-dashed border-ut-slate/30 rounded-lg bg-ut-light-grey/50"
    >
      <summary className="cursor-pointer px-3 py-2 text-ut-sm font-medium text-ut-navy select-none">
        Principle Summary
      </summary>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-ut-xs text-ut-slate italic bg-white/60 rounded p-2">
            {summary?.observations || autoObservations}
          </div>
          <textarea
            className="w-full border border-ut-slate/20 rounded p-2 text-ut-sm min-h-[60px] resize-y"
            placeholder="Add your own observations…"
            value={summary?.customObservations ?? ""}
            onChange={handleCustomChange}
          />
          {summary?.customObservations && (
            <button
              type="button"
              onClick={handleReset}
              className="text-ut-xs text-trust-magenta hover:underline"
            >
              Reset to auto-generated
            </button>
          )}
        </div>
      )}
    </details>
  );
}
