import { type ReactNode, useCallback, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CollapsibleRow,
  EditorShell,
  editorInputClass,
  LabeledField,
  PreviewBox,
  Section,
} from "@/components/editor";
import { getActiveGrades } from "@/lib/framework-config";
import type { FrameworkGrade } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/** Tailwind color classes shipped by the framework grades — safe to emit. */
const COLOR_PALETTE = [
  "bg-ut-green",
  "bg-score-1-strong",
  "bg-ut-red",
  "bg-ut-muted",
  "bg-amber-600",
  "bg-gray-500",
] as const;

/** Tailwind tint classes shipped by the framework grades — safe to emit. */
const TINT_PALETTE = [
  "bg-grade-pass-tint",
  "bg-grade-conditional-tint",
  "bg-grade-fail-tint",
  "bg-gray-100",
  "bg-amber-50",
] as const;

export default function GradeIdEditor({ onBack }: { onBack: () => void }) {
  const activeGrades = getActiveGrades();
  const addGrade = useFrameworkCustomizationStore((s) => s.addGrade);
  const removeGrade = useFrameworkCustomizationStore((s) => s.removeGrade);
  const setGradeOverride = useFrameworkCustomizationStore((s) => s.setGradeOverride);
  const customization = useFrameworkCustomizationStore((s) => s.customization);
  const gradeRemovals = customization.gradeRemovals;

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("bg-gray-500");
  const [tint, setTint] = useState("bg-gray-100");
  const [reportColor, setReportColor] = useState("#4c5e74");
  const [reportLabel, setReportLabel] = useState("");

  const handleAdd = useCallback(() => {
    const trimmedId = id.trim();
    if (!trimmedId || !label.trim()) return;
    const grade: FrameworkGrade = {
      id: trimmedId,
      label: label.trim(),
      description: description.trim(),
      color: color.trim(),
      tint: tint.trim(),
      reportColor: reportColor.trim(),
      reportLabel: reportLabel.trim() || trimmedId.toUpperCase(),
    };
    addGrade(grade);
    setId("");
    setLabel("");
    setDescription("");
    setColor("bg-gray-500");
    setTint("bg-gray-100");
    setReportColor("#4c5e74");
    setReportLabel("");
  }, [id, label, description, color, tint, reportColor, reportLabel, addGrade]);

  return (
    <EditorShell
      title="Grades"
      subtitle="Add, remove, recolor, and relabel the final grade options reviewers assign."
      onBack={onBack}
      footer={
        <p className="text-ut-xs text-ut-muted">
          {activeGrades.length} grade{activeGrades.length !== 1 ? "s" : ""} active
          {gradeRemovals.length > 0 ? ` · ${gradeRemovals.length} removed` : ""}
        </p>
      }
    >
      <div className="space-y-ut-4">
        <VerdictPreview grades={activeGrades} />

        <div
          className="border border-state-warning-border bg-state-warning-tint rounded-ut-sm px-ut-3 py-ut-2 text-ut-xs text-ut-text"
          data-testid="grade-contract-warning"
        >
          <strong className="text-ut-navy">Warning:</strong> Adding or removing grade IDs changes
          the grade contract. Existing finalized reviews with a removed grade will show &ldquo;grade
          no longer available.&rdquo;
        </div>

        <Section title={`Active Grades (${activeGrades.length})`}>
          <div className="space-y-ut-2">
            {activeGrades.map((g) => (
              <GradeRow
                key={g.id}
                grade={g}
                isEdited={
                  g.id in customization.gradeOverrides ||
                  customization.gradeAdditions.some((a) => a.id === g.id)
                }
                onOverride={(patch) => setGradeOverride(g.id, patch)}
                onRemove={() => setConfirmRemoveId(g.id)}
              />
            ))}
          </div>
        </Section>

        {gradeRemovals.length > 0 && (
          <Section
            title={`Removed Grades (${gradeRemovals.length})`}
            description="These grades are no longer available for new reviews. Existing reviews using these grades will display 'grade no longer available.'"
          >
            <div className="space-y-ut-1">
              {gradeRemovals.map((gid) => (
                <div
                  key={gid}
                  className="flex items-center gap-ut-2 border border-ut-border border-dashed rounded-ut-sm px-ut-3 py-ut-1 text-ut-xs text-ut-muted opacity-60"
                >
                  <span className="font-mono">{gid}</span>
                  <span>(removed)</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Add grade">
          <div className="space-y-ut-2 text-ut-xs">
            <div className="grid grid-cols-2 gap-ut-2">
              <LabeledField label="ID" hint="Short code, e.g. 'exemplary'. Used internally.">
                <input
                  type="text"
                  className={editorInputClass}
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  data-testid="add-grade-id"
                />
              </LabeledField>
              <LabeledField label="Label" hint="Friendly name shown to reviewers.">
                <input
                  type="text"
                  className={editorInputClass}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  data-testid="add-grade-label"
                />
              </LabeledField>
              <LabeledField label="Description" hint="Short explanation for this grade.">
                <input
                  type="text"
                  className={editorInputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="add-grade-description"
                />
              </LabeledField>
            </div>

            <LabeledField
              label="UI Color"
              hint="Background color of the grade chip in the review form."
            >
              <div className="space-y-ut-1">
                <div className="flex gap-ut-1 flex-wrap" data-testid="add-color-palette">
                  {COLOR_PALETTE.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setColor(cls)}
                      className={`w-6 h-6 rounded-ut-sm border ${cls} ${
                        color === cls
                          ? "border-trust-magenta ring-2 ring-trust-magenta/30"
                          : "border-ut-border"
                      }`}
                      title={cls}
                      aria-label={`Color ${cls}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-ut-2xs text-ut-muted">{color}</span>
              </div>
            </LabeledField>

            <LabeledField
              label="UI Tint"
              hint="Light background for sections tinted with this grade."
            >
              <div className="space-y-ut-1">
                <div className="flex gap-ut-1 flex-wrap" data-testid="add-tint-palette">
                  {TINT_PALETTE.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setTint(cls)}
                      className={`w-6 h-6 rounded-ut-sm border ${cls} ${
                        tint === cls
                          ? "border-trust-magenta ring-2 ring-trust-magenta/30"
                          : "border-ut-border"
                      }`}
                      title={cls}
                      aria-label={`Tint ${cls}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-ut-2xs text-ut-muted">{tint}</span>
              </div>
            </LabeledField>

            <div className="grid grid-cols-2 gap-ut-2">
              <LabeledField label="Report Color" hint="Hex color used in the exported report.">
                <div className="flex items-center gap-ut-1">
                  <input
                    type="color"
                    className="h-7 w-7 cursor-pointer rounded-ut-sm border border-ut-border p-0"
                    value={reportColor}
                    onChange={(e) => setReportColor(e.target.value)}
                    data-testid="add-report-color"
                  />
                  <span className="font-mono text-ut-2xs text-ut-muted">{reportColor}</span>
                </div>
              </LabeledField>
              <LabeledField
                label="Report Label"
                hint="Uppercased label printed on the report (e.g. STRONG)."
              >
                <input
                  type="text"
                  className={editorInputClass}
                  value={reportLabel}
                  onChange={(e) => setReportLabel(e.target.value)}
                  data-testid="add-report-label"
                />
              </LabeledField>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!id.trim() || !label.trim()}
              className="bg-trust-magenta text-white hover:bg-trust-magenta-strong rounded-ut-sm px-ut-3 py-ut-1 font-heading uppercase tracking-ut-label disabled:opacity-30"
              data-testid="add-grade-submit"
            >
              Add grade
            </button>
          </div>
        </Section>
      </div>

      {confirmRemoveId && (
        <ConfirmDialog
          message={`Remove the grade "${confirmRemoveId}"? Existing reviews using this grade will show "grade no longer available."`}
          actions={[
            {
              label: "Cancel",
              variant: "cancel",
              handler: () => setConfirmRemoveId(null),
            },
            {
              label: "Remove",
              variant: "danger",
              handler: () => {
                removeGrade(confirmRemoveId);
                setConfirmRemoveId(null);
              },
            },
          ]}
        />
      )}
    </EditorShell>
  );
}

/* ------------------------------------------------------------------ */
/*  GradeRow — CollapsibleRow per grade with swatch-palette editing  */
/* ------------------------------------------------------------------ */

interface GradeRowProps {
  grade: FrameworkGrade;
  isEdited: boolean;
  onOverride: (patch: {
    label?: string;
    description?: string;
    color?: string;
    tint?: string;
    reportColor?: string;
    reportLabel?: string;
  }) => void;
  onRemove: () => void;
}

function GradeRow({ grade, isEdited, onOverride, onRemove }: GradeRowProps): ReactNode {
  return (
    <CollapsibleRow
      summary={
        <div className="flex items-center gap-ut-2">
          <span
            className={`inline-flex items-center px-ut-2 py-0.5 rounded-ut-sm text-ut-xs font-bold text-white ${grade.color}`}
            aria-hidden="true"
          >
            {grade.label}
          </span>
          <span className="font-mono text-ut-2xs text-ut-muted">{grade.id}</span>
        </div>
      }
      edited={isEdited}
      testId={`grade-row-${grade.id}`}
    >
      <div className="space-y-ut-2">
        <div className="grid grid-cols-2 gap-ut-2">
          <LabeledField label="Label" hint="Shown next to the grade in the review UI.">
            <input
              type="text"
              className={editorInputClass}
              value={grade.label}
              onChange={(e) => onOverride({ label: e.target.value })}
              data-testid={`grade-label-${grade.id}`}
            />
          </LabeledField>
          <LabeledField
            label="Description"
            hint="Short explanation shown to reviewers choosing this grade."
          >
            <input
              type="text"
              className={editorInputClass}
              value={grade.description}
              onChange={(e) => onOverride({ description: e.target.value })}
              data-testid={`grade-desc-${grade.id}`}
            />
          </LabeledField>
        </div>

        <LabeledField
          label="UI Color"
          hint="Background color of the grade chip in the review form."
        >
          <div className="space-y-ut-1">
            <div className="flex gap-ut-1 flex-wrap" data-testid={`color-palette-${grade.id}`}>
              {COLOR_PALETTE.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => onOverride({ color: cls })}
                  className={`w-6 h-6 rounded-ut-sm border ${cls} ${
                    grade.color === cls
                      ? "border-trust-magenta ring-2 ring-trust-magenta/30"
                      : "border-ut-border"
                  }`}
                  title={cls}
                  aria-label={`Color ${cls}`}
                />
              ))}
            </div>
            <span className="font-mono text-ut-2xs text-ut-muted">{grade.color}</span>
          </div>
        </LabeledField>

        <LabeledField label="UI Tint" hint="Light background for sections tinted with this grade.">
          <div className="space-y-ut-1">
            <div className="flex gap-ut-1 flex-wrap" data-testid={`tint-palette-${grade.id}`}>
              {TINT_PALETTE.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => onOverride({ tint: cls })}
                  className={`w-6 h-6 rounded-ut-sm border ${cls} ${
                    grade.tint === cls
                      ? "border-trust-magenta ring-2 ring-trust-magenta/30"
                      : "border-ut-border"
                  }`}
                  title={cls}
                  aria-label={`Tint ${cls}`}
                />
              ))}
            </div>
            <span className="font-mono text-ut-2xs text-ut-muted">{grade.tint}</span>
          </div>
        </LabeledField>

        <div className="grid grid-cols-2 gap-ut-2">
          <LabeledField label="Report Color" hint="Hex color used in the exported report.">
            <div className="flex items-center gap-ut-1">
              <input
                type="color"
                className="h-7 w-7 cursor-pointer rounded-ut-sm border border-ut-border p-0"
                value={grade.reportColor}
                onChange={(e) => onOverride({ reportColor: e.target.value })}
                data-testid={`report-color-${grade.id}`}
              />
              <span className="font-mono text-ut-2xs text-ut-muted">{grade.reportColor}</span>
            </div>
          </LabeledField>
          <LabeledField
            label="Report Label"
            hint="Uppercased label printed on the report (e.g. STRONG)."
          >
            <input
              type="text"
              className={editorInputClass}
              value={grade.reportLabel}
              onChange={(e) => onOverride({ reportLabel: e.target.value })}
              data-testid={`report-label-${grade.id}`}
            />
          </LabeledField>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-ut-red hover:text-ut-red/80 text-ut-xs font-bold"
          data-testid={`remove-grade-${grade.id}`}
        >
          Remove this grade
        </button>
      </div>
    </CollapsibleRow>
  );
}

/* ------------------------------------------------------------------ */
/*  VerdictPreview — live GradeSelector-like preview of active grades */
/* ------------------------------------------------------------------ */

function VerdictPreview({ grades }: { grades: FrameworkGrade[] }) {
  const sliced = grades.slice(0, 6);
  const [selectedId, setSelectedId] = useState(sliced[0]?.id ?? "");

  // If selected grade falls outside the slice, fall back to first
  const effectiveSelected = sliced.some((g) => g.id === selectedId)
    ? selectedId
    : (sliced[0]?.id ?? "");

  return (
    <PreviewBox label="How the final verdict appears" testId="grade-preview">
      <div data-testid="verdict-preview">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-1 block">
          Overall Grade
        </span>
        <div role="radiogroup" className="grid grid-cols-3 gap-ut-2">
          {sliced.map((g) => {
            const selected = g.id === effectiveSelected;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedId(g.id)}
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
        <p className="text-ut-xs text-ut-muted mt-ut-1">
          Click a grade to preview its selected colour. This is how reviewers choose the overall
          grade on the Finalize screen.
        </p>
      </div>
    </PreviewBox>
  );
}
