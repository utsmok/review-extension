import { useCallback, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CollapsibleRow,
  type CollapsibleRowProps,
  EditableText,
  EditorShell,
  editorInputClass,
  LabeledField,
  Section,
} from "@/components/editor";
import { applyPrincipleTokens, getActivePrinciples } from "@/lib/framework-config";
import { useActiveRubric } from "@/lib/rubric-schema";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Slugify a human-readable title into a safe key. */
function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

/** Canonical 0–3 score-level names (match the design-system score semantics). */
const SCORE_LEVELS = [
  { level: "0", name: "Fail" },
  { level: "1", name: "Poor" },
  { level: "2", name: "Fair" },
  { level: "3", name: "Good" },
] as const;

/** Human-readable labels for the quality-gate topic categories. */
const QG_LABELS: Record<string, string> = {
  privacy_and_security: "Privacy & security",
  intellectual_property: "Intellectual property",
  accessibility: "Accessibility",
};

function humanizeCategory(key: string): string {
  return QG_LABELS[key] ?? key.replace(/_/g, " ");
}

export default function RubricEditor({ onBack }: { onBack: () => void }) {
  const rubric = useActiveRubric();
  // Re-render when principle identity overrides change so headers/inputs stay live.
  useFrameworkCustomizationStore((s) => s.customization.principleOverrides);
  const setRubricOverride = useFrameworkCustomizationStore((s) => s.setRubricOverride);
  const addRubricQuestion = useFrameworkCustomizationStore((s) => s.addRubricQuestion);
  const removeRubricQuestion = useFrameworkCustomizationStore((s) => s.removeRubricQuestion);
  const reorderRubricQuestions = useFrameworkCustomizationStore((s) => s.reorderRubricQuestions);

  const [confirmRemove, setConfirmRemove] = useState<{
    section: "quality_gate" | "scoring_rubric";
    parent: string;
    key: string;
    label: string;
  } | null>(null);

  const handleFieldChange = useCallback(
    (section: string, parent: string, qKey: string, field: string, value: unknown) => {
      setRubricOverride([section, parent, qKey, ...field.split(".")], value);
    },
    [setRubricOverride],
  );

  const handleToggleAiAssisted = useCallback(
    (section: string, parent: string, qKey: string, current: boolean) => {
      setRubricOverride([section, parent, qKey, "ai_only"], !current);
    },
    [setRubricOverride],
  );

  const handleMove = useCallback(
    (
      section: "quality_gate" | "scoring_rubric",
      parent: string,
      keys: string[],
      fromIdx: number,
      direction: -1 | 1,
    ) => {
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

  const principles = getActivePrinciples();

  return (
    <>
      <EditorShell
        title="Rubric"
        subtitle="The five principles, their scored questions, and the required pass/fail checks. Renames and recolors apply live; edits affect new reviews."
        onBack={onBack}
      >
        <div className="space-y-ut-6">
          {/* ── Required checks (quality gates) ────────────────────── */}
          <Section
            title="Required checks"
            description="Pass/fail requirements every review must clear, grouped by topic."
          >
            <div className="space-y-ut-2">
              {Object.entries(rubric.quality_gate).map(([category, questions]) => (
                <QuestionGroup
                  key={category}
                  section="quality_gate"
                  parent={category}
                  label={humanizeCategory(category)}
                  questions={questions}
                  isQualityGate
                  onFieldChange={(qKey, field, value) =>
                    handleFieldChange("quality_gate", category, qKey, field, value)
                  }
                  onToggleAiAssisted={(qKey, current) =>
                    handleToggleAiAssisted("quality_gate", category, qKey, current)
                  }
                  onMove={(keys, idx, dir) => handleMove("quality_gate", category, keys, idx, dir)}
                  onRequestRemove={(key, label) =>
                    requestRemove("quality_gate", category, key, label)
                  }
                  onAdd={(title) => handleAdd("quality_gate", category, title)}
                />
              ))}
            </div>
          </Section>

          {/* ── Principles (identity + scored questions) ───────────── */}
          <Section
            title="Principles"
            description="Each principle with its identity and the questions reviewers score 0–3."
          >
            <div className="space-y-ut-2">
              {principles.map((p) => {
                const questions = rubric.scoring_rubric[p.id] ?? {};
                return (
                  <PrincipleBlock
                    key={p.id}
                    principle={p}
                    questions={questions}
                    onFieldChange={(qKey, field, value) =>
                      handleFieldChange("scoring_rubric", p.id, qKey, field, value)
                    }
                    onToggleAiAssisted={(qKey, current) =>
                      handleToggleAiAssisted("scoring_rubric", p.id, qKey, current)
                    }
                    onMove={(keys, idx, dir) => handleMove("scoring_rubric", p.id, keys, idx, dir)}
                    onRequestRemove={(key, label) =>
                      requestRemove("scoring_rubric", p.id, key, label)
                    }
                    onAdd={(title) => handleAdd("scoring_rubric", p.id, title)}
                  />
                );
              })}
            </div>
          </Section>
        </div>
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

/* ─── Shared types ──────────────────────────────────────────────────── */

type FieldChangeFn = (qKey: string, field: string, value: unknown) => void;
type ToggleAiFn = (qKey: string, current: boolean) => void;
type MoveFn = (keys: string[], idx: number, dir: -1 | 1) => void;
type RemoveFn = (key: string, label: string) => void;
type AddFn = (title: string) => void;

/* ─── Principle block (identity + its scored questions) ─────────────── */

function PrincipleBlock({
  principle,
  questions,
  onFieldChange,
  onToggleAiAssisted,
  onMove,
  onRequestRemove,
  onAdd,
}: {
  principle: { id: string; code: string; fullName: string; color: string; reportColor: string };
  questions: Record<string, Record<string, unknown>>;
  onFieldChange: FieldChangeFn;
  onToggleAiAssisted: ToggleAiFn;
  onMove: MoveFn;
  onRequestRemove: RemoveFn;
  onAdd: AddFn;
}) {
  const setPrincipleOverride = useFrameworkCustomizationStore((s) => s.setPrincipleOverride);
  const principleOverrides = useFrameworkCustomizationStore(
    (s) => s.customization.principleOverrides,
  );
  const questionKeys = Object.keys(questions);
  const edited = principle.id in principleOverrides;

  const handleIdentity = useCallback(
    (field: "fullName" | "code" | "color" | "reportColor", value: string) => {
      setPrincipleOverride(principle.id, { [field]: value });
      applyPrincipleTokens();
    },
    [principle.id, setPrincipleOverride],
  );

  const summary: CollapsibleRowProps["summary"] = (
    <div className="flex items-center gap-ut-2 min-w-0 flex-1">
      <span
        aria-hidden="true"
        className="w-3 h-3 rounded-ut-sm shrink-0 border border-ut-border"
        style={{ backgroundColor: principle.color }}
      />
      <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {principle.code}
      </span>
      <span className="text-ut-xs text-ut-text truncate">{principle.fullName}</span>
      <span className="text-ut-2xs text-ut-muted shrink-0">
        {questionKeys.length} question{questionKeys.length === 1 ? "" : "s"}
      </span>
    </div>
  );

  return (
    <CollapsibleRow summary={summary} edited={edited} testId={`principle-${principle.id}`}>
      <div className="space-y-ut-4">
        {/* Identity & color (collapsed within the principle) */}
        <CollapsibleRow summary="Identity & color" testId={`principle-identity-${principle.id}`}>
          <div className="grid grid-cols-2 gap-ut-2">
            <LabeledField label="Full name" hint="The principle's full name, e.g. 'Transparency'.">
              <input
                type="text"
                className={editorInputClass}
                value={principle.fullName}
                onChange={(e) => handleIdentity("fullName", e.target.value)}
                aria-label={`${principle.code} full name`}
              />
            </LabeledField>
            <LabeledField label="Code" hint="Short code shown on rubric badges, e.g. 'TR'.">
              <input
                type="text"
                className={editorInputClass}
                value={principle.code}
                onChange={(e) => handleIdentity("code", e.target.value)}
                aria-label={`${principle.code} code`}
              />
            </LabeledField>
            <LabeledField
              label="UI color"
              hint="Tints this principle's rubric sections in the review UI."
            >
              <div className="flex items-center gap-ut-2">
                <input
                  type="color"
                  className="w-8 h-7 cursor-pointer rounded-ut-sm border border-ut-border p-0 bg-ut-white"
                  value={principle.color}
                  onChange={(e) => handleIdentity("color", e.target.value)}
                  aria-label={`${principle.code} color`}
                />
                <span className="text-ut-2xs text-ut-muted font-mono">{principle.color}</span>
              </div>
            </LabeledField>
            <LabeledField
              label="Report color"
              hint="Hex used for this principle in the exported report."
            >
              <div className="flex items-center gap-ut-2">
                <input
                  type="color"
                  className="w-8 h-7 cursor-pointer rounded-ut-sm border border-ut-border p-0 bg-ut-white"
                  value={principle.reportColor}
                  onChange={(e) => handleIdentity("reportColor", e.target.value)}
                  aria-label={`${principle.code} report color`}
                />
                <span className="text-ut-2xs text-ut-muted font-mono">{principle.reportColor}</span>
              </div>
            </LabeledField>
          </div>
        </CollapsibleRow>

        {/* Scored questions */}
        <div className="space-y-ut-2">
          {questionKeys.map((qKey, idx) => (
            <QuestionRow
              key={qKey}
              qKey={qKey}
              idx={idx}
              total={questionKeys.length}
              data={(questions[qKey] ?? {}) as Record<string, unknown>}
              isQualityGate={false}
              onFieldChange={onFieldChange}
              onToggleAiAssisted={onToggleAiAssisted}
              onMove={(dir) => onMove(questionKeys, idx, dir)}
              onRequestRemove={() => onRequestRemove(qKey, String(questions[qKey]?.title) || qKey)}
            />
          ))}
          <AddQuestionControl label={principle.fullName} onAdd={onAdd} />
        </div>
      </div>
    </CollapsibleRow>
  );
}

/* ─── Quality-gate topic group ──────────────────────────────────────── */

function QuestionGroup({
  section,
  parent,
  label,
  questions,
  isQualityGate,
  onFieldChange,
  onToggleAiAssisted,
  onMove,
  onRequestRemove,
  onAdd,
}: {
  section: "quality_gate" | "scoring_rubric";
  parent: string;
  label: string;
  questions: Record<string, Record<string, unknown>>;
  isQualityGate: boolean;
  onFieldChange: FieldChangeFn;
  onToggleAiAssisted: ToggleAiFn;
  onMove: MoveFn;
  onRequestRemove: RemoveFn;
  onAdd: AddFn;
}) {
  const questionKeys = Object.keys(questions);
  const summary: CollapsibleRowProps["summary"] = (
    <div className="flex items-center gap-ut-2 min-w-0 flex-1">
      <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {label}
      </span>
      <span className="text-ut-2xs text-ut-muted shrink-0">
        {questionKeys.length} check{questionKeys.length === 1 ? "" : "s"}
      </span>
    </div>
  );

  return (
    <CollapsibleRow summary={summary} testId={`group-${section}-${parent}`}>
      <div className="space-y-ut-2">
        {questionKeys.map((qKey, idx) => (
          <QuestionRow
            key={qKey}
            qKey={qKey}
            idx={idx}
            total={questionKeys.length}
            data={(questions[qKey] ?? {}) as Record<string, unknown>}
            isQualityGate={isQualityGate}
            onFieldChange={onFieldChange}
            onToggleAiAssisted={onToggleAiAssisted}
            onMove={(dir) => onMove(questionKeys, idx, dir)}
            onRequestRemove={() => onRequestRemove(qKey, String(questions[qKey]?.title) || qKey)}
          />
        ))}
        <AddQuestionControl label={label} onAdd={onAdd} />
      </div>
    </CollapsibleRow>
  );
}

/* ─── Add-question (button reveals title input) ─────────────────────── */

function AddQuestionControl({ label, onAdd }: { label: string; onAdd: AddFn }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const slug = slugifyTitle(title);

  if (!open) {
    return (
      <button
        type="button"
        className="text-ut-xs text-trust-magenta hover:text-trust-magenta-strong font-bold"
        onClick={() => setOpen(true)}
      >
        + Add {label.includes(" ") ? "check" : "question"}
      </button>
    );
  }

  const kind = label.includes(" ") ? "check" : "question";
  return (
    <div className="space-y-ut-1 border-t border-ut-border pt-ut-2">
      <LabeledField label={`New ${kind} title`} hint="A slug key is generated from the title.">
        <input
          type="text"
          className={editorInputClass}
          placeholder={`e.g. ${kind === "check" ? "Data retention policy" : "Source verification"}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) {
              onAdd(title);
              setTitle("");
              setOpen(false);
            }
          }}
          aria-label={`New ${kind} title for ${label}`}
        />
      </LabeledField>
      <div className="flex items-center justify-between gap-ut-2">
        <span className="text-ut-2xs text-ut-muted font-mono">
          {slug ? `key: ${slug}` : "\u00a0"}
        </span>
        <div className="flex items-center gap-ut-2">
          <button
            type="button"
            className="text-ut-xs text-ut-muted hover:text-ut-navy"
            onClick={() => {
              setTitle("");
              setOpen(false);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-trust-magenta text-white hover:bg-trust-magenta-strong rounded-ut-sm px-ut-3 py-ut-1 font-heading uppercase tracking-ut-label text-ut-xs disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={!title.trim()}
            onClick={() => {
              onAdd(title);
              setTitle("");
              setOpen(false);
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Question row (reworded: score levels named + colored) ─────────── */

function QuestionRow({
  qKey,
  idx,
  total,
  data,
  isQualityGate,
  onFieldChange,
  onToggleAiAssisted,
  onMove,
  onRequestRemove,
}: {
  qKey: string;
  idx: number;
  total: number;
  data: Record<string, unknown>;
  isQualityGate: boolean;
  onFieldChange: FieldChangeFn;
  onToggleAiAssisted: ToggleAiFn;
  onMove: (dir: -1 | 1) => void;
  onRequestRemove: () => void;
}) {
  const title = String(data.title ?? "");
  const aiAssisted = Boolean(data.ai_only);
  const guidance = String(data.background ?? "");
  const examples = (data.examples ?? {}) as Record<string, unknown>;
  const summaryLabel = title || qKey;

  return (
    <CollapsibleRow
      summary={
        <div className="flex items-center gap-ut-2 min-w-0 flex-1">
          <span className="text-ut-xs text-ut-navy font-medium truncate">{summaryLabel}</span>
          {aiAssisted && (
            <span className="text-ut-2xs text-ut-muted shrink-0 border border-ut-border rounded-ut-sm px-1 py-0.5">
              AI
            </span>
          )}
        </div>
      }
      testId={`question-${qKey}`}
    >
      {/* Toolbar: reorder + AI-assisted + remove */}
      <div className="flex items-center gap-ut-3 pb-ut-1">
        <div className="flex items-center gap-0.5">
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
              viewBox="0 0 24 24"
              fill="none"
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
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <label
          className="flex items-center gap-1 text-ut-2xs text-ut-muted cursor-pointer"
          title="Scored automatically by the AI assistant; not shown to reviewers as a manual question."
        >
          <input
            type="checkbox"
            checked={aiAssisted}
            onChange={() => onToggleAiAssisted(qKey, aiAssisted)}
            aria-label={`${qKey} AI-assisted`}
            className="w-3 h-3 accent-trust-magenta"
          />
          AI-assisted
        </label>
        <button
          type="button"
          className="text-ut-red hover:text-ut-red/80 p-0.5 ml-auto"
          onClick={onRequestRemove}
          aria-label={`Remove ${qKey}`}
        >
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <EditableText
        multiline={false}
        value={title}
        onChange={(v) => onFieldChange(qKey, "title", v)}
        label={`${qKey} title`}
        className="font-heading text-ut-navy text-ut-sm font-bold"
      />

      {isQualityGate ? (
        <>
          <EditableText
            value={String(data.requirement ?? "")}
            onChange={(v) => onFieldChange(qKey, "requirement", v)}
            label={`${qKey} pass criteria`}
            className="text-ut-sm text-ut-muted leading-relaxed"
            placeholder="What must be true for this check to pass"
          />
          <details className="question-foldout" open>
            <summary className="question-foldout-summary">Guidance</summary>
            <div className="question-foldout-content">
              <EditableText
                value={guidance}
                onChange={(v) => onFieldChange(qKey, "background", v)}
                label={`${qKey} guidance`}
                placeholder="Notes to help reviewers judge this consistently"
              />
            </div>
          </details>
          <details className="question-foldout">
            <summary className="question-foldout-summary">Examples</summary>
            <div className="question-foldout-content">
              {(["pass", "fail", "na"] as const).map((score) => (
                <div className="example-row" key={score}>
                  <span className="example-label" data-score={score}>
                    {score === "na" ? "N/A" : score.charAt(0).toUpperCase() + score.slice(1)}
                  </span>
                  <EditableText
                    className="example-desc"
                    value={String(examples[score] ?? "")}
                    onChange={(v) => onFieldChange(qKey, `examples.${score}`, v)}
                    label={`${qKey} example ${score}`}
                    placeholder={`Example ${score === "na" ? "N/A" : score} response`}
                  />
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        <>
          {SCORE_LEVELS.map(({ level, name }) => (
            <div className="example-row" key={level}>
              <span className="example-badge" data-score={level}>
                {`${level} · ${name}`}
              </span>
              <EditableText
                className="example-desc"
                value={String(data[level] ?? "")}
                onChange={(v) => onFieldChange(qKey, level, v)}
                label={`${qKey} score ${level} ${name}`}
                placeholder={`Describe a ${name.toLowerCase()} (${level}) response`}
              />
            </div>
          ))}
          <details className="question-foldout" open>
            <summary className="question-foldout-summary">Guidance</summary>
            <div className="question-foldout-content">
              <EditableText
                value={guidance}
                onChange={(v) => onFieldChange(qKey, "background", v)}
                label={`${qKey} guidance`}
                placeholder="Notes to help reviewers score this consistently"
              />
            </div>
          </details>
          <details className="question-foldout">
            <summary className="question-foldout-summary">Examples</summary>
            <div className="question-foldout-content">
              {SCORE_LEVELS.map(({ level, name }) => (
                <div className="example-row" key={`ex-${level}`}>
                  <span className="example-badge" data-score={level}>
                    {`${level} · ${name}`}
                  </span>
                  <EditableText
                    className="example-desc"
                    value={String(examples[level] ?? "")}
                    onChange={(v) => onFieldChange(qKey, `examples.${level}`, v)}
                    label={`${qKey} example ${level} ${name}`}
                    placeholder={`Example ${name.toLowerCase()} (${level}) response`}
                  />
                </div>
              ))}
            </div>
          </details>
        </>
      )}
    </CollapsibleRow>
  );
}
