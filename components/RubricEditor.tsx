import { useCallback, useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CollapsibleRow,
  EditorShell,
  editorInputClass,
  LabeledField,
  Section,
} from "@/components/editor";
import { getActiveRubric } from "@/lib/rubric-schema";
import type { RubricData } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Hook that re-renders when the customization store changes. */
function useActiveRubric(): RubricData {
  const customization = useFrameworkCustomizationStore((s) => s.customization);
  // biome-ignore lint/correctness/useExhaustiveDependencies: customization triggers recompute
  return useMemo(() => getActiveRubric(), [customization]);
}

/** Slugify a human-readable title into a safe key. */
function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export default function RubricEditor({ onBack }: { onBack: () => void }) {
  const rubric = useActiveRubric();
  const setRubricOverride = useFrameworkCustomizationStore((s) => s.setRubricOverride);
  const addRubricQuestion = useFrameworkCustomizationStore((s) => s.addRubricQuestion);
  const removeRubricQuestion = useFrameworkCustomizationStore((s) => s.removeRubricQuestion);
  const reorderRubricQuestions = useFrameworkCustomizationStore((s) => s.reorderRubricQuestions);

  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const [confirmRemove, setConfirmRemove] = useState<{
    section: "quality_gate" | "scoring_rubric";
    parent: string;
    key: string;
    label: string;
  } | null>(null);

  const toggleCat = useCallback((key: string) => {
    setCollapsedCats((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleFieldChange = useCallback(
    (section: string, parent: string, qKey: string, field: string, value: unknown) => {
      setRubricOverride([section, parent, qKey, ...field.split(".")], value);
    },
    [setRubricOverride],
  );

  const handleToggleAiOnly = useCallback(
    (section: string, parent: string, qKey: string, current: boolean) => {
      setRubricOverride([section, parent, qKey, "ai_only"], !current);
    },
    [setRubricOverride],
  );

  const handleMove = useCallback(
    (section: string, parent: string, keys: string[], fromIdx: number, direction: -1 | 1) => {
      const toIdx = fromIdx + direction;
      if (toIdx < 0 || toIdx >= keys.length) return;
      const newKeys = [...keys];
      [newKeys[fromIdx], newKeys[toIdx]] = [newKeys[toIdx], newKeys[fromIdx]];
      reorderRubricQuestions(`${section}.${parent}`, newKeys);
    },
    [reorderRubricQuestions],
  );

  const handleAdd = useCallback(
    (section: "quality_gate" | "scoring_rubric", parent: string, title: string) => {
      const key = slugifyTitle(title);
      if (!key) return;
      if (section === "quality_gate") {
        addRubricQuestion(section, parent, {
          key,
          type: "pass_fail",
          title,
          requirement: "",
          background: "",
          examples: { pass: "", fail: "", na: "" },
          ai_only: false,
        });
      } else {
        addRubricQuestion(section, parent, {
          key,
          title,
          background: "",
          "0": "",
          "1": "",
          "2": "",
          "3": "",
          examples: { "0": "", "1": "", "2": "", "3": "" },
          ai_only: false,
        });
      }
    },
    [addRubricQuestion],
  );

  const requestRemove = useCallback(
    (section: "quality_gate" | "scoring_rubric", parent: string, key: string, label: string) => {
      setConfirmRemove({ section, parent, key, label });
    },
    [],
  );

  const confirmRemoveAction = useCallback(() => {
    if (!confirmRemove) return;
    removeRubricQuestion(confirmRemove.section, confirmRemove.parent, confirmRemove.key);
    setConfirmRemove(null);
  }, [confirmRemove, removeRubricQuestion]);

  return (
    <>
      <EditorShell
        title="Rubric questions"
        subtitle="Author the quality-gate checks and scoring questions reviewers score against. Edits apply to new reviews."
        onBack={onBack}
      >
        {/* ── Quality Gates ────────────────────── */}
        <Section title="Quality Gates" description="Pass/fail checks every review must clear.">
          <div className="space-y-ut-2">
            {Object.entries(rubric.quality_gate).map(([category, questions]) => (
              <CategorySection
                key={category}
                section="quality_gate"
                parent={category}
                label={category.replace(/_/g, " ")}
                questionKeys={Object.keys(questions)}
                collapsed={!!collapsedCats[`qg.${category}`]}
                onToggle={() => toggleCat(`qg.${category}`)}
                questions={questions}
                onFieldChange={handleFieldChange}
                onToggleAiOnly={handleToggleAiOnly}
                onMove={(keys, idx, dir) => handleMove("quality_gate", category, keys, idx, dir)}
                onRequestRemove={(key, label) =>
                  requestRemove("quality_gate", category, key, label)
                }
                onAdd={handleAdd}
                isQualityGate
              />
            ))}
          </div>
        </Section>

        {/* ── Scoring Rubric ────────────────────── */}
        <Section
          title="Scoring"
          description="Numeric (0–3) scale questions reviewers score against."
        >
          <div className="space-y-ut-2">
            {Object.entries(rubric.scoring_rubric).map(([principle, questions]) => (
              <CategorySection
                key={principle}
                section="scoring_rubric"
                parent={principle}
                label={principle}
                questionKeys={Object.keys(questions)}
                collapsed={!!collapsedCats[`sr.${principle}`]}
                onToggle={() => toggleCat(`sr.${principle}`)}
                questions={questions}
                onFieldChange={handleFieldChange}
                onToggleAiOnly={handleToggleAiOnly}
                onMove={(keys, idx, dir) => handleMove("scoring_rubric", principle, keys, idx, dir)}
                onRequestRemove={(key, label) =>
                  requestRemove("scoring_rubric", principle, key, label)
                }
                onAdd={handleAdd}
                isQualityGate={false}
              />
            ))}
          </div>
        </Section>
      </EditorShell>

      {confirmRemove && (
        <ConfirmDialog
          message={`Remove "${confirmRemove.label}"? This question will no longer appear in new reviews.`}
          actions={[
            { label: "Cancel", handler: () => setConfirmRemove(null), variant: "cancel" },
            { label: "Remove", handler: confirmRemoveAction, variant: "danger" },
          ]}
        />
      )}
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

interface CategorySectionProps {
  section: "quality_gate" | "scoring_rubric";
  parent: string;
  label: string;
  questionKeys: string[];
  collapsed: boolean;
  onToggle: () => void;
  questions: Record<string, Record<string, unknown>>;
  onFieldChange: (
    section: string,
    parent: string,
    qKey: string,
    field: string,
    value: unknown,
  ) => void;
  onToggleAiOnly: (section: string, parent: string, qKey: string, current: boolean) => void;
  onMove: (keys: string[], idx: number, dir: -1 | 1) => void;
  onRequestRemove: (key: string, label: string) => void;
  onAdd: (section: "quality_gate" | "scoring_rubric", parent: string, title: string) => void;
  isQualityGate: boolean;
}

function CategorySection({
  section,
  parent,
  label,
  questionKeys,
  collapsed,
  onToggle,
  questions,
  onFieldChange,
  onToggleAiOnly,
  onMove,
  onRequestRemove,
  onAdd,
  isQualityGate,
}: CategorySectionProps) {
  const [addTitle, setAddTitle] = useState("");
  const generatedSlug = slugifyTitle(addTitle);

  return (
    <div className="border border-ut-border rounded-ut-sm">
      <button
        type="button"
        className="w-full flex items-center gap-1.5 px-ut-2 py-ut-1.5 text-left text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy hover:bg-ut-offwhite transition-colors"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <svg
          aria-hidden="true"
          className={`w-3 h-3 shrink-0 transition-transform ${collapsed ? "" : "rotate-90"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {label}
        <span className="text-ut-muted font-normal lowercase">({questionKeys.length})</span>
      </button>

      {!collapsed && (
        <div className="px-ut-2 py-ut-2 space-y-ut-2 border-t border-ut-border bg-ut-offwhite/50">
          {questionKeys.map((qKey, idx) => (
            <QuestionRow
              key={qKey}
              section={section}
              parent={parent}
              qKey={qKey}
              idx={idx}
              total={questionKeys.length}
              data={(questions[qKey] ?? {}) as Record<string, unknown>}
              isQualityGate={isQualityGate}
              onFieldChange={onFieldChange}
              onToggleAiOnly={onToggleAiOnly}
              onMove={(dir) => onMove(questionKeys, idx, dir)}
              onRequestRemove={() => onRequestRemove(qKey, String(questions[qKey]?.title) || qKey)}
            />
          ))}

          {/* Add question by title */}
          <div className="flex items-end gap-ut-2 pt-ut-1 border-t border-ut-border">
            <LabeledField
              label="New question title"
              hint="A slug key will be generated from the title."
            >
              <input
                type="text"
                className={editorInputClass}
                placeholder="e.g. Source verification"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addTitle.trim()) {
                    onAdd(section, parent, addTitle);
                    setAddTitle("");
                  }
                }}
                aria-label={`Add question to ${label}`}
              />
            </LabeledField>
            {generatedSlug && (
              <span
                className="pb-ut-1 text-ut-2xs text-ut-muted font-mono shrink-0"
                aria-hidden="true"
              >
                key: {generatedSlug}
              </span>
            )}
            <button
              type="button"
              className={`bg-trust-magenta text-white hover:bg-trust-magenta-strong rounded-ut-sm px-ut-3 py-ut-1 font-heading uppercase tracking-ut-label text-ut-xs shrink-0 disabled:opacity-30 disabled:cursor-not-allowed`}
              disabled={!addTitle.trim()}
              onClick={() => {
                onAdd(section, parent, addTitle);
                setAddTitle("");
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface QuestionRowProps {
  section: string;
  parent: string;
  qKey: string;
  idx: number;
  total: number;
  data: Record<string, unknown>;
  isQualityGate: boolean;
  onFieldChange: (
    section: string,
    parent: string,
    qKey: string,
    field: string,
    value: unknown,
  ) => void;
  onToggleAiOnly: (section: string, parent: string, qKey: string, current: boolean) => void;
  onMove: (dir: -1 | 1) => void;
  onRequestRemove: () => void;
}

function QuestionRow({
  section,
  parent,
  qKey,
  idx,
  total,
  data,
  isQualityGate,
  onFieldChange,
  onToggleAiOnly,
  onMove,
  onRequestRemove,
}: QuestionRowProps) {
  const title = String(data.title ?? "");
  const aiOnly = Boolean(data.ai_only);
  const bg = String(data.background ?? "");

  const summaryLabel = title || qKey;

  return (
    <CollapsibleRow
      summary={
        <div className="flex items-center gap-ut-2 min-w-0 flex-1">
          <span className="text-ut-xs text-ut-navy font-medium truncate">{summaryLabel}</span>
          <span className="text-ut-2xs text-ut-muted font-mono shrink-0">{qKey}</span>

          {/* AI-only toggle */}
          <label
            className="flex items-center gap-1 text-ut-2xs text-ut-muted shrink-0 cursor-pointer"
            title="Scored by the AI assistant, not shown as a manual question."
          >
            <input
              type="checkbox"
              checked={aiOnly}
              onChange={(e) => {
                e.stopPropagation();
                onToggleAiOnly(section, parent, qKey, aiOnly);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`${qKey} ai_only`}
              className="w-3 h-3"
            />
            <span>AI-only</span>
          </label>

          {/* Reorder ↑/↓ */}
          <button
            type="button"
            className="text-ut-muted hover:text-ut-navy disabled:opacity-30 p-0.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMove(-1);
            }}
            disabled={idx === 0}
            aria-label={`Move ${qKey} up`}
          >
            <svg
              aria-hidden="true"
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            className="text-ut-muted hover:text-ut-navy disabled:opacity-30 p-0.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMove(1);
            }}
            disabled={idx === total - 1}
            aria-label={`Move ${qKey} down`}
          >
            <svg
              aria-hidden="true"
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Remove */}
          <button
            type="button"
            className="text-ut-red hover:text-ut-red/80 p-0.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onRequestRemove();
            }}
            aria-label={`Remove ${qKey}`}
          >
            <svg
              aria-hidden="true"
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    >
      {/* ── Title (editable, top-level field) ── */}
      <LabeledField label="Title" hint="The reviewer-facing question name.">
        <input
          type="text"
          className={editorInputClass}
          value={title}
          onChange={(e) => onFieldChange(section, parent, qKey, "title", e.target.value)}
          aria-label={`${qKey} title`}
        />
      </LabeledField>

      {/* Quality gate: requirement + background + examples pass/fail/na */}
      {isQualityGate && (
        <>
          <LabeledField label="Requirement" hint="What must be true to pass this check.">
            <textarea
              className={`${editorInputClass} resize-y min-h-[3rem]`}
              rows={2}
              value={String(data.requirement ?? "")}
              onChange={(e) => onFieldChange(section, parent, qKey, "requirement", e.target.value)}
              aria-label={`${qKey} requirement`}
            />
          </LabeledField>
          <LabeledField label="Background" hint="Reviewer guidance before answering this question.">
            <textarea
              className={`${editorInputClass} resize-y min-h-[3rem]`}
              rows={2}
              value={bg}
              onChange={(e) => onFieldChange(section, parent, qKey, "background", e.target.value)}
              aria-label={`${qKey} background`}
            />
          </LabeledField>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-ut-2">
            <LabeledField label="Example: Pass" hint="What a passing response looks like.">
              <textarea
                className={`${editorInputClass} resize-y min-h-[3rem]`}
                rows={2}
                value={String((data.examples as Record<string, unknown>)?.pass ?? "")}
                onChange={(e) =>
                  onFieldChange(section, parent, qKey, "examples.pass", e.target.value)
                }
                aria-label={`${qKey} example pass`}
              />
            </LabeledField>
            <LabeledField label="Example: Fail" hint="What a failing response looks like.">
              <textarea
                className={`${editorInputClass} resize-y min-h-[3rem]`}
                rows={2}
                value={String((data.examples as Record<string, unknown>)?.fail ?? "")}
                onChange={(e) =>
                  onFieldChange(section, parent, qKey, "examples.fail", e.target.value)
                }
                aria-label={`${qKey} example fail`}
              />
            </LabeledField>
            <LabeledField label="Example: N/A" hint="When this question doesn't apply.">
              <textarea
                className={`${editorInputClass} resize-y min-h-[3rem]`}
                rows={2}
                value={String((data.examples as Record<string, unknown>)?.na ?? "")}
                onChange={(e) =>
                  onFieldChange(section, parent, qKey, "examples.na", e.target.value)
                }
                aria-label={`${qKey} example na`}
              />
            </LabeledField>
          </div>
        </>
      )}

      {/* Scoring: anchors 0–3 + background + examples 0–3 */}
      {!isQualityGate && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-ut-2">
            {(["0", "1", "2", "3"] as const).map((level) => (
              <LabeledField
                key={level}
                label={`Anchor ${level}`}
                hint={`What a ${level} (${ANCHOR_LABELS[level]}) looks like.`}
              >
                <textarea
                  className={`${editorInputClass} resize-y min-h-[3rem]`}
                  rows={2}
                  value={String(data[level] ?? "")}
                  onChange={(e) => onFieldChange(section, parent, qKey, level, e.target.value)}
                  aria-label={`${qKey} anchor ${level}`}
                />
              </LabeledField>
            ))}
          </div>
          <LabeledField label="Background" hint="Reviewer guidance before scoring this question.">
            <textarea
              className={`${editorInputClass} resize-y min-h-[3rem]`}
              rows={2}
              value={bg}
              onChange={(e) => onFieldChange(section, parent, qKey, "background", e.target.value)}
              aria-label={`${qKey} background`}
            />
          </LabeledField>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-ut-2">
            {(["0", "1", "2", "3"] as const).map((level) => (
              <LabeledField
                key={`ex-${level}`}
                label={`Example ${level}`}
                hint={`Sample response for level ${level}.`}
              >
                <textarea
                  className={`${editorInputClass} resize-y min-h-[3rem]`}
                  rows={2}
                  value={String((data.examples as Record<string, unknown>)?.[level] ?? "")}
                  onChange={(e) =>
                    onFieldChange(section, parent, qKey, `examples.${level}`, e.target.value)
                  }
                  aria-label={`${qKey} example ${level}`}
                />
              </LabeledField>
            ))}
          </div>
        </>
      )}
    </CollapsibleRow>
  );
}

const ANCHOR_LABELS: Record<string, string> = {
  "0": "failure",
  "1": "weak",
  "2": "adequate",
  "3": "strong",
};
