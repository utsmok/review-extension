import { useCallback } from "react";
import { EditorShell, editorInputClass, LabeledField, PreviewBox } from "@/components/editor";
import { applyPrincipleTokens, getActivePrinciples } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

export default function PrincipleEditor({ onBack }: { onBack: () => void }) {
  const active = getActivePrinciples();
  const setPrincipleOverride = useFrameworkCustomizationStore((s) => s.setPrincipleOverride);

  const handleFieldChange = useCallback(
    (id: string, field: string, value: string) => {
      setPrincipleOverride(id, { [field]: value });
      applyPrincipleTokens();
    },
    [setPrincipleOverride],
  );

  return (
    <EditorShell
      title="Principles"
      subtitle="Rename and recolor the five TRUST principles. Colors flow live into the rubric sections and the exported report."
      onBack={onBack}
    >
      {/* Live preview strip */}
      <PreviewBox label="Live preview" testId="principle-preview">
        <div className="flex gap-ut-3 flex-wrap" data-testid="principle-preview-swatches">
          {active.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-ut-1">
              <div className="flex gap-0.5">
                {/* UI tint swatch — uses the principle's color at low opacity */}
                <div
                  className="w-6 h-6 rounded-ut-sm border border-ut-border"
                  style={{ backgroundColor: `${p.color}33` }}
                  title={`${p.code} UI tint`}
                  data-testid={`preview-tint-${p.id}`}
                />
                {/* Report color swatch — exact hex for the export */}
                <div
                  className="w-6 h-6 rounded-ut-sm border border-ut-border"
                  style={{ backgroundColor: p.reportColor }}
                  title={`${p.code} report color`}
                  data-testid={`preview-report-${p.id}`}
                />
              </div>
              <span className="text-ut-2xs font-mono font-bold text-ut-muted">{p.code}</span>
            </div>
          ))}
        </div>
      </PreviewBox>

      {/* Principle cards */}
      <div className="mt-ut-3 space-y-ut-3">
        {active.map((p) => (
          <PrincipleCard key={p.id} principle={p} onFieldChange={handleFieldChange} />
        ))}
      </div>
    </EditorShell>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

interface PrincipleCardProps {
  principle: { id: string; code: string; fullName: string; color: string; reportColor: string };
  onFieldChange: (id: string, field: string, value: string) => void;
}

function PrincipleCard({ principle, onFieldChange }: PrincipleCardProps) {
  const { id, code, fullName, color, reportColor } = principle;

  return (
    <div className="border border-ut-border rounded-ut-sm p-ut-3 space-y-ut-3">
      {/* Card header with code + inline swatches */}
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border border-ut-border shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
          data-testid={`swatch-color-${id}`}
        />
        <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          {code}
        </span>
        <div
          className="w-4 h-4 rounded-full border border-ut-border shrink-0"
          style={{ backgroundColor: reportColor }}
          aria-hidden="true"
          data-testid={`swatch-report-${id}`}
        />
      </div>

      {/* Full Name */}
      <LabeledField label="Full Name" hint="The principle's full name, e.g. 'Transparent'.">
        <input
          type="text"
          className={editorInputClass}
          value={fullName}
          onChange={(e) => onFieldChange(id, "fullName", e.target.value)}
          aria-label={`${code} full name`}
        />
      </LabeledField>

      {/* Code */}
      <LabeledField label="Code" hint="Short code shown on rubric badges, e.g. 'T'.">
        <input
          type="text"
          className={editorInputClass}
          value={code}
          onChange={(e) => onFieldChange(id, "code", e.target.value)}
          aria-label={`${code} code`}
        />
      </LabeledField>

      {/* Color + Report color with live swatches */}
      <div className="grid grid-cols-2 gap-ut-2">
        <LabeledField label="Color" hint="Tints this principle's rubric sections in the review UI.">
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded border border-ut-border shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <input
              type="color"
              className="w-7 h-6 cursor-pointer"
              value={color}
              onChange={(e) => onFieldChange(id, "color", e.target.value)}
              aria-label={`${code} color`}
            />
            <span className="text-ut-2xs font-mono text-ut-muted">{color}</span>
          </div>
        </LabeledField>

        <LabeledField
          label="Report"
          hint="Hex used for this principle in the exported report. UI uses a theme class; the report needs an explicit hex."
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded border border-ut-border shrink-0"
              style={{ backgroundColor: reportColor }}
              aria-hidden="true"
            />
            <input
              type="color"
              className="w-7 h-6 cursor-pointer"
              value={reportColor}
              onChange={(e) => onFieldChange(id, "reportColor", e.target.value)}
              aria-label={`${code} report color`}
            />
            <span className="text-ut-2xs font-mono text-ut-muted">{reportColor}</span>
          </div>
        </LabeledField>
      </div>
    </div>
  );
}
