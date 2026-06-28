import { useCallback, useState } from "react";
import { downloadBlob } from "@/lib/export";
import { getActiveGrades } from "@/lib/framework-config";
import type { FrameworkGrade } from "@/lib/types";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export default function GradeIdEditor({ onBack }: { onBack: () => void }) {
  const activeGrades = getActiveGrades();
  const addGrade = useFrameworkCustomizationStore((s) => s.addGrade);
  const removeGrade = useFrameworkCustomizationStore((s) => s.removeGrade);
  const customization = useFrameworkCustomizationStore((s) => s.customization);

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

  const gradeRemovals = customization.gradeRemovals;

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
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="font-heading text-ut-sub font-bold uppercase tracking-ut-heading text-trust-magenta">
          Grade IDs
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-5">
        {/* Warning */}
        <div className="border border-amber-400 bg-amber-50 rounded p-ut-2 text-ut-xs text-amber-800">
          <strong>Warning:</strong> Adding or removing grade IDs changes the grade contract.
          Existing finalized reviews with a removed grade will show "grade no longer available."
        </div>

        {/* Active grades list */}
        <section>
          <h3 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
            Active Grades ({activeGrades.length})
          </h3>
          <div className="space-y-ut-1">
            {activeGrades.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between border border-ut-border rounded px-ut-2 py-1 text-ut-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${g.color}`} />
                  <span className="font-bold">{g.id}</span>
                  <span className="text-ut-muted">{g.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeGrade(g.id)}
                  className="text-ut-red hover:text-ut-red/80 text-ut-xs font-bold"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Removed grades */}
        {gradeRemovals.length > 0 && (
          <section>
            <h3 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-red mb-ut-1">
              Removed Grades ({gradeRemovals.length})
            </h3>
            <p className="text-ut-xs text-ut-muted mb-ut-1">
              These grades are no longer available for new reviews. Existing reviews using these
              grades will display "grade no longer available."
            </p>
            <div className="space-y-ut-1">
              {gradeRemovals.map((gid) => (
                <div
                  key={gid}
                  className="flex items-center justify-between border border-ut-border border-dashed rounded px-ut-2 py-1 text-ut-xs opacity-60"
                >
                  <span className="font-bold">{gid}</span>
                  <span className="text-ut-muted">(removed)</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add grade form */}
        <AddGradeForm
          id={id}
          label={label}
          description={description}
          color={color}
          tint={tint}
          reportColor={reportColor}
          reportLabel={reportLabel}
          onIdChange={setId}
          onLabelChange={setLabel}
          onDescriptionChange={setDescription}
          onColorChange={setColor}
          onTintChange={setTint}
          onReportColorChange={setReportColor}
          onReportLabelChange={setReportLabel}
          onSubmit={handleAdd}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-ut-border px-ut-4 py-ut-2">
        <p className="text-ut-xs text-ut-muted">
          {activeGrades.length} grade{activeGrades.length !== 1 ? "s" : ""} active
          {gradeRemovals.length > 0 ? ` · ${gradeRemovals.length} removed` : ""}
        </p>
      </div>
    </div>
  );
}

/** Standalone form for adding a new grade. */
export function AddGradeForm({
  id,
  label,
  description,
  color,
  tint,
  reportColor,
  reportLabel,
  onIdChange,
  onLabelChange,
  onDescriptionChange,
  onColorChange,
  onTintChange,
  onReportColorChange,
  onReportLabelChange,
  onSubmit,
}: {
  id: string;
  label: string;
  description: string;
  color: string;
  tint: string;
  reportColor: string;
  reportLabel: string;
  onIdChange: (v: string) => void;
  onLabelChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onTintChange: (v: string) => void;
  onReportColorChange: (v: string) => void;
  onReportLabelChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="border border-dashed border-ut-border rounded p-ut-2 space-y-ut-1 text-ut-xs">
      <h4 className="font-bold text-ut-navy">Add grade</h4>
      <div className="grid grid-cols-2 gap-x-ut-2 gap-y-ut-1">
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-24 shrink-0">ID</span>
          <input
            type="text"
            value={id}
            onChange={(e) => onIdChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-24 shrink-0">Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
        <label className="flex items-center gap-1 col-span-2">
          <span className="text-ut-muted w-24 shrink-0">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-24 shrink-0">Color (TW)</span>
          <input
            type="text"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
            placeholder="bg-gray-500"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-24 shrink-0">Tint (TW)</span>
          <input
            type="text"
            value={tint}
            onChange={(e) => onTintChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
            placeholder="bg-gray-100"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-24 shrink-0">Report color</span>
          <input
            type="text"
            value={reportColor}
            onChange={(e) => onReportColorChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
            placeholder="#4c5e74"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="text-ut-muted w-24 shrink-0">Report label</span>
          <input
            type="text"
            value={reportLabel}
            onChange={(e) => onReportLabelChange(e.target.value)}
            className="text-ut-xs border border-ut-border rounded px-1 py-0.5 bg-white flex-1 min-w-0"
            placeholder="GRADE"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!id.trim() || !label.trim()}
        className="text-ut-xs text-trust-magenta hover:text-trust-magenta/80 font-bold disabled:opacity-30"
      >
        Add grade
      </button>
    </div>
  );
}

// Re-export downloadJSON for tests
export { downloadJSON };
