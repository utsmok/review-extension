import { useCallback } from "react";
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
          Principle Colors &amp; Identity
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-3">
        {active.map((p) => (
          <PrincipleCard key={p.id} principle={p} onFieldChange={handleFieldChange} />
        ))}
      </div>
    </div>
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
    <div className="border border-ut-border rounded-md p-ut-3 space-y-ut-2">
      {/* Header with swatches */}
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border border-ut-border shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          {code}
        </span>
        <div
          className="w-4 h-4 rounded-full border border-ut-border shrink-0"
          style={{ backgroundColor: reportColor }}
          aria-hidden="true"
        />
        <span className="text-ut-xs text-ut-muted">(report)</span>
      </div>

      {/* fullName */}
      <label className="block">
        <span className="text-ut-xs text-ut-muted font-medium">Full Name</span>
        <input
          type="text"
          className="w-full text-ut-xs rounded border border-ut-border px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-trust-magenta"
          value={fullName}
          onChange={(e) => onFieldChange(id, "fullName", e.target.value)}
          aria-label={`${code} full name`}
        />
      </label>

      {/* code */}
      <label className="block">
        <span className="text-ut-xs text-ut-muted font-medium">Code</span>
        <input
          type="text"
          className="w-full text-ut-xs rounded border border-ut-border px-2 py-1 mt-0.5 focus:outline-none focus:ring-1 focus:ring-trust-magenta"
          value={code}
          onChange={(e) => onFieldChange(id, "code", e.target.value)}
          aria-label={`${code} code`}
        />
      </label>

      {/* Color picker row */}
      <div className="grid grid-cols-2 gap-ut-2">
        <label className="flex items-center gap-2">
          <span className="text-ut-xs text-ut-muted font-medium shrink-0">Color</span>
          <div
            className="w-5 h-5 rounded border border-ut-border shrink-0"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <input
            type="color"
            className="w-8 h-6 cursor-pointer"
            value={color}
            onChange={(e) => onFieldChange(id, "color", e.target.value)}
            aria-label={`${code} color`}
          />
          <span className="text-ut-xs text-ut-muted font-mono">{color}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-ut-xs text-ut-muted font-medium shrink-0">Report</span>
          <div
            className="w-5 h-5 rounded border border-ut-border shrink-0"
            style={{ backgroundColor: reportColor }}
            aria-hidden="true"
          />
          <input
            type="color"
            className="w-8 h-6 cursor-pointer"
            value={reportColor}
            onChange={(e) => onFieldChange(id, "reportColor", e.target.value)}
            aria-label={`${code} report color`}
          />
          <span className="text-ut-xs text-ut-muted font-mono">{reportColor}</span>
        </label>
      </div>
    </div>
  );
}
