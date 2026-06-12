import { useRubric } from "@/components/contexts";
import RubricChipGroup from "@/components/RubricChipGroup";
import { getAccentKey, getCategoryLabel } from "@/lib/rubric";

interface RubricTaggingSectionProps {
  linkedRubricIds: string[];
  onToggle: (rubricId: string, linked: boolean) => void;
  /** Whether to wrap in an open <details> with summary header */
  showDetails?: boolean;
  /** Fires when the <details> element is toggled (grid view uses this to collapse) */
  onDetailsToggle?: (e: React.SyntheticEvent<HTMLDetailsElement>) => void;
}

export default function RubricTaggingSection({
  linkedRubricIds,
  onToggle,
  showDetails = true,
  onDetailsToggle,
}: RubricTaggingSectionProps) {
  const { rubric, usesAi } = useRubric();

  const content = (
    <div className="mt-ut-2 space-y-ut-2">
      {/* Quality Gates */}
      <div>
        <p className="section-kicker mb-ut-1">Quality Gates</p>
        {Object.entries(rubric.quality_gate).map(([cat, questions]) => (
          <div key={cat} className="mb-ut-1" data-accent-key="control">
            <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
            <RubricChipGroup
              questions={questions}
              categoryKey={cat}
              linkedIds={linkedRubricIds}
              usesAi={usesAi}
              isQG
              onToggle={onToggle}
            />
          </div>
        ))}
      </div>

      {/* Scoring Rubric */}
      <div>
        <p className="section-kicker mb-ut-1">Scoring Rubric</p>
        {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
          <div key={cat} className="mb-ut-1" data-accent-key={getAccentKey(cat)}>
            <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
            <RubricChipGroup
              questions={questions}
              categoryKey={cat}
              linkedIds={linkedRubricIds}
              usesAi={usesAi}
              onToggle={onToggle}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (showDetails) {
    return (
      <details open className="mt-ut-2" onToggle={onDetailsToggle}>
        <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-muted cursor-pointer hover:text-ut-navy">
          Tag to rubric items ({linkedRubricIds.length})
        </summary>
        {content}
      </details>
    );
  }

  return content;
}
