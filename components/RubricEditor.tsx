import { useCallback, useMemo, useState } from "react";
import { getActiveRubric } from "@/lib/rubric-schema";
import type { RubricData } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Hook that re-renders when the customization store changes. */
function useActiveRubric(): RubricData {
  const customization = useFrameworkCustomizationStore((s) => s.customization);
  // biome-ignore lint/correctness/useExhaustiveDependencies: customization triggers recompute
  return useMemo(() => getActiveRubric(), [customization]);
}

export default function RubricEditor({ onBack }: { onBack: () => void }) {
  const rubric = useActiveRubric();
  const setRubricOverride = useFrameworkCustomizationStore((s) => s.setRubricOverride);
  const addRubricQuestion = useFrameworkCustomizationStore((s) => s.addRubricQuestion);
  const removeRubricQuestion = useFrameworkCustomizationStore((s) => s.removeRubricQuestion);
  const reorderRubricQuestions = useFrameworkCustomizationStore((s) => s.reorderRubricQuestions);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
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
    (section: "quality_gate" | "scoring_rubric", parent: string, slug: string) => {
      const key = slug.trim().replace(/\s+/g, "_");
      if (!key) return;
      if (section === "quality_gate") {
        addRubricQuestion(section, parent, {
          key,
          type: "pass_fail",
          title: "",
          requirement: "",
          background: "",
          examples: { pass: "", fail: "", na: "" },
          ai_only: false,
        });
      } else {
        addRubricQuestion(section, parent, {
          key,
          title: "",
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

  const handleRemove = useCallback(
    (section: "quality_gate" | "scoring_rubric", parent: string, key: string) => {
      removeRubricQuestion(section, parent, key);
    },
    [removeRubricQuestion],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-ut-border px-ut-4 py-ut-2 flex items-center gap-2">
        <button
          type="button"
          className="text-ut-muted hover:text-ut-navy transition-colors p-0.5"
          onClick={onBack}
          aria-label="Back"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-heading text-ut-sub font-bold uppercase tracking-ut-heading text-trust-magenta">
          Customize Rubric
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-5">
        {/* ── Quality Gates ────────────────────── */}
        <section>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
            Quality Gates
          </h2>
          {Object.entries(rubric.quality_gate).map(([category, questions]) => (
            <CategorySection
              key={category}
              section="quality_gate"
              parent={category}
              label={category.replace(/_/g, " ")}
              questionKeys={Object.keys(questions)}
              collapsed={!!collapsed[`qg.${category}`]}
              onToggle={() => toggle(`qg.${category}`)}
              questions={questions}
              onFieldChange={handleFieldChange}
              onToggleAiOnly={handleToggleAiOnly}
              onMove={(keys, idx, dir) => handleMove("quality_gate", category, keys, idx, dir)}
              onRemove={(key) => handleRemove("quality_gate", category, key)}
              onAdd={(slug) => handleAdd("quality_gate", category, slug)}
              isQualityGate
            />
          ))}
        </section>

        {/* ── Scoring Rubric ────────────────────── */}
        <section>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
            Scoring
          </h2>
          {Object.entries(rubric.scoring_rubric).map(([principle, questions]) => (
            <CategorySection
              key={principle}
              section="scoring_rubric"
              parent={principle}
              label={principle}
              questionKeys={Object.keys(questions)}
              collapsed={!!collapsed[`sr.${principle}`]}
              onToggle={() => toggle(`sr.${principle}`)}
              questions={questions}
              onFieldChange={handleFieldChange}
              onToggleAiOnly={handleToggleAiOnly}
              onMove={(keys, idx, dir) => handleMove("scoring_rubric", principle, keys, idx, dir)}
              onRemove={(key) => handleRemove("scoring_rubric", principle, key)}
              onAdd={(slug) => handleAdd("scoring_rubric", principle, slug)}
              isQualityGate={false}
            />
          ))}
        </section>
      </div>
    </div>
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
  onRemove: (key: string) => void;
  onAdd: (slug: string) => void;
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
  onRemove,
  onAdd,
  isQualityGate,
}: CategorySectionProps) {
  const [addSlug, setAddSlug] = useState("");
  const chevron = collapsed ? (
    <svg
      aria-hidden="true"
      className="w-3 h-3"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ) : (
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
  );

  return (
    <div className="border border-ut-border rounded-md mb-ut-2">
      <button
        type="button"
        className="w-full flex items-center gap-1.5 px-ut-2 py-ut-1 text-left text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy hover:bg-ut-surface transition-colors rounded-t-md"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        {chevron}
        {label}
        <span className="text-ut-muted font-normal lowercase">({questionKeys.length})</span>
      </button>

      {!collapsed && (
        <div className="px-ut-2 py-ut-1 space-y-ut-2 border-t border-ut-border">
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
              onRemove={() => onRemove(qKey)}
            />
          ))}

          {/* Add question row */}
          <div className="flex items-center gap-1.5 pt-ut-1 border-t border-ut-border">
            <input
              type="text"
              className="flex-1 min-w-0 text-ut-xs rounded border border-ut-border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-trust-magenta"
              placeholder="question-slug"
              value={addSlug}
              onChange={(e) => setAddSlug(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onAdd(addSlug);
                  setAddSlug("");
                }
              }}
              aria-label={`Add question to ${label}`}
            />
            <button
              type="button"
              className="text-ut-xs text-trust-magenta hover:underline font-medium whitespace-nowrap"
              onClick={() => {
                onAdd(addSlug);
                setAddSlug("");
              }}
            >
              Add question
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
  onRemove: () => void;
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
  onRemove,
}: QuestionRowProps) {
  const title = String(data.title ?? "");
  const aiOnly = Boolean(data.ai_only);
  const bg = String(data.background ?? "");

  return (
    <div className="border border-ut-border rounded p-ut-2 space-y-ut-1.5">
      {/* Header row: reorder, title, ai_only, remove */}
      <div className="flex items-center gap-1.5">
        <span className="text-ut-muted text-ut-xs w-4 text-center shrink-0">{idx + 1}</span>
        <button
          type="button"
          className="text-ut-muted hover:text-ut-navy disabled:opacity-30 p-0.5"
          onClick={() => onMove(-1)}
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
          className="text-ut-muted hover:text-ut-navy disabled:opacity-30 p-0.5"
          onClick={() => onMove(1)}
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
        <span className="text-ut-muted text-ut-xs font-mono shrink-0">{qKey}</span>
        <input
          type="text"
          className="flex-1 min-w-0 text-ut-xs rounded border border-ut-border px-2 py-1 focus:outline-none focus:ring-1 focus:ring-trust-magenta"
          value={title}
          onChange={(e) => onFieldChange(section, parent, qKey, "title", e.target.value)}
          aria-label={`${qKey} title`}
        />
        <label className="flex items-center gap-1 text-ut-xs text-ut-muted shrink-0">
          <input
            type="checkbox"
            checked={aiOnly}
            onChange={() => onToggleAiOnly(section, parent, qKey, aiOnly)}
            aria-label={`${qKey} ai_only`}
          />
          AI
        </label>
        <button
          type="button"
          className="text-red-500 hover:text-red-700 p-0.5"
          onClick={onRemove}
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

      {/* Quality gate: requirement + examples.pass/fail/na */}
      {isQualityGate && (
        <>
          <FieldArea
            label="Requirement"
            value={String(data.requirement ?? "")}
            onChange={(v) => onFieldChange(section, parent, qKey, "requirement", v)}
            textarea
          />
          <FieldArea
            label="Background"
            value={bg}
            onChange={(v) => onFieldChange(section, parent, qKey, "background", v)}
            textarea
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-ut-1.5">
            <FieldArea
              label="Example: Pass"
              value={String((data.examples as Record<string, unknown>)?.pass ?? "")}
              onChange={(v) => onFieldChange(section, parent, qKey, "examples.pass", v)}
              textarea
            />
            <FieldArea
              label="Example: Fail"
              value={String((data.examples as Record<string, unknown>)?.fail ?? "")}
              onChange={(v) => onFieldChange(section, parent, qKey, "examples.fail", v)}
              textarea
            />
            <FieldArea
              label="Example: N/A"
              value={String((data.examples as Record<string, unknown>)?.na ?? "")}
              onChange={(v) => onFieldChange(section, parent, qKey, "examples.na", v)}
              textarea
            />
          </div>
        </>
      )}

      {/* Scoring: 0-3 anchors + examples.0-3 */}
      {!isQualityGate && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-ut-1.5">
            {(["0", "1", "2", "3"] as const).map((level) => (
              <FieldArea
                key={level}
                label={`Anchor ${level}`}
                value={String(data[level] ?? "")}
                onChange={(v) => onFieldChange(section, parent, qKey, level, v)}
                textarea
              />
            ))}
          </div>
          <FieldArea
            label="Background"
            value={bg}
            onChange={(v) => onFieldChange(section, parent, qKey, "background", v)}
            textarea
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-ut-1.5">
            {(["0", "1", "2", "3"] as const).map((level) => (
              <FieldArea
                key={`ex-${level}`}
                label={`Example ${level}`}
                value={String((data.examples as Record<string, unknown>)?.[level] ?? "")}
                onChange={(v) => onFieldChange(section, parent, qKey, `examples.${level}`, v)}
                textarea
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  if (textarea) {
    return (
      <label className="block">
        <span className="text-ut-xs text-ut-muted font-medium">{label}</span>
        <textarea
          className="w-full text-ut-xs rounded border border-ut-border px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-trust-magenta resize-y min-h-[3rem]"
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        />
      </label>
    );
  }
  return (
    <label className="block">
      <span className="text-ut-xs text-ut-muted font-medium">{label}</span>
      <input
        type="text"
        className="w-full text-ut-xs rounded border border-ut-border px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-trust-magenta"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </label>
  );
}
