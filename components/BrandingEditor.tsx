import type { ChangeEvent } from "react";
import { useCallback, useRef } from "react";
import { applyBrandingTokens, getActiveBranding } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

export default function BrandingEditor({ onBack }: { onBack: () => void }) {
  const branding = getActiveBranding();
  const setBrandingOverrides = useFrameworkCustomizationStore((s) => s.setBrandingOverrides);
  const resetBranding = useFrameworkCustomizationStore((s) => s.resetBranding);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleIdentityChange = useCallback(
    (field: string, value: string) => {
      setBrandingOverrides({ [field]: value });
      applyBrandingTokens();
    },
    [setBrandingOverrides],
  );

  const handleReportChange = useCallback(
    (field: string, value: string) => {
      setBrandingOverrides({ report: { [field]: value } });
      applyBrandingTokens();
    },
    [setBrandingOverrides],
  );

  const handleExportChange = useCallback(
    (field: string, value: string) => {
      setBrandingOverrides({ export: { [field]: value } });
      applyBrandingTokens();
    },
    [setBrandingOverrides],
  );

  const handleLogoUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setBrandingOverrides({ logos: { framework: reader.result } });
          applyBrandingTokens();
        }
      };
      reader.readAsDataURL(file);
    },
    [setBrandingOverrides],
  );

  const handleReset = useCallback(() => {
    resetBranding();
    applyBrandingTokens();
    if (fileRef.current) fileRef.current.value = "";
  }, [resetBranding]);

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
          Customize Branding
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-3">
        {/* ─── 1. Identity ─────────────────────────────────────────────── */}
        <section className="border border-ut-border rounded-md p-ut-3 space-y-ut-2">
          <h2 className="text-ut-sm font-bold text-ut-navy">Identity</h2>

          <LabelInput
            label="Framework Name"
            value={branding.frameworkName}
            onChange={(v) => handleIdentityChange("frameworkName", v)}
          />
          <LabelInput
            label="Framework Full Name"
            value={branding.frameworkFullName}
            onChange={(v) => handleIdentityChange("frameworkFullName", v)}
          />
          <LabelInput
            label="Wordmark"
            value={branding.wordmark}
            onChange={(v) => handleIdentityChange("wordmark", v)}
          />

          {/* Magenta color */}
          <label className="block">
            <span className="text-ut-xs text-ut-muted">Magenta</span>
            <div className="flex items-center gap-ut-2 mt-1">
              <input
                type="color"
                value={branding.magenta}
                onChange={(e) => handleIdentityChange("magenta", e.target.value)}
                className="h-8 w-8 cursor-pointer rounded border border-ut-border p-0"
                data-testid="magenta-input"
              />
              <span
                className="inline-block h-6 w-6 rounded border border-ut-border"
                style={{ backgroundColor: branding.magenta }}
                data-testid="magenta-swatch"
              />
              <span className="text-ut-xs text-ut-muted font-mono">{branding.magenta}</span>
            </div>
          </label>
        </section>

        {/* ─── 2. Report Literals ──────────────────────────────────────── */}
        <section className="border border-ut-border rounded-md p-ut-3 space-y-ut-2">
          <h2 className="text-ut-sm font-bold text-ut-navy">Report Literals</h2>

          <LabelInput
            label="Report Title"
            value={branding.report.title}
            onChange={(v) => handleReportChange("title", v)}
          />
          <LabelInput
            label="Nutrition Title"
            value={branding.report.nutritionTitle}
            onChange={(v) => handleReportChange("nutritionTitle", v)}
          />
          <LabelInput
            label="Card Title"
            value={branding.report.cardTitle}
            onChange={(v) => handleReportChange("cardTitle", v)}
          />
          <LabelInput
            label="Footer Framework"
            value={branding.report.footerFramework}
            onChange={(v) => handleReportChange("footerFramework", v)}
          />
          <LabelInput
            label="Reviewed By"
            value={branding.report.reviewedBy}
            onChange={(v) => handleReportChange("reviewedBy", v)}
          />
          <LabelInput
            label="Archive Notice"
            value={branding.report.archiveNotice}
            onChange={(v) => handleReportChange("archiveNotice", v)}
          />
          <LabelInput
            label="QR URL"
            value={branding.report.qrUrl ?? ""}
            onChange={(v) => handleReportChange("qrUrl", v)}
          />
        </section>

        {/* ─── 3. Export ────────────────────────────────────────────────── */}
        <section className="border border-ut-border rounded-md p-ut-3 space-y-ut-2">
          <h2 className="text-ut-sm font-bold text-ut-navy">Export</h2>

          <LabelInput
            label="Label Filename Prefix"
            value={branding.export.labelFilenamePrefix}
            onChange={(v) => handleExportChange("labelFilenamePrefix", v)}
          />
          <LabelInput
            label="Framework Logo Filename"
            value={branding.export.frameworkLogoFilename}
            onChange={(v) => handleExportChange("frameworkLogoFilename", v)}
          />
        </section>

        {/* ─── 4. Logos ─────────────────────────────────────────────────── */}
        <section className="border border-ut-border rounded-md p-ut-3 space-y-ut-2">
          <h2 className="text-ut-sm font-bold text-ut-navy">Logos</h2>

          <label className="block">
            <span className="text-ut-xs text-ut-muted">Framework Logo (upload)</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block mt-1 text-ut-sm"
              data-testid="logo-upload"
            />
          </label>

          {branding.logos.framework && (
            <div>
              <span className="text-ut-xs text-ut-muted">Current Framework Logo</span>
              <img
                src={branding.logos.framework}
                alt="Framework logo"
                className="mt-1 h-16 max-w-full object-contain border border-ut-border rounded"
                data-testid="logo-preview"
              />
            </div>
          )}

          {/* Read-only display for secondary / institution */}
          {branding.logos.secondary && (
            <div>
              <span className="text-ut-xs text-ut-muted">Secondary Logo (read-only)</span>
              <img
                src={branding.logos.secondary}
                alt="Secondary logo"
                className="mt-1 h-12 max-w-full object-contain border border-ut-border rounded"
              />
            </div>
          )}
          {branding.logos.institution && (
            <div>
              <span className="text-ut-xs text-ut-muted">Institution Logo (read-only)</span>
              <img
                src={branding.logos.institution}
                alt="Institution logo"
                className="mt-1 h-12 max-w-full object-contain border border-ut-border rounded"
              />
            </div>
          )}
        </section>

        {/* ─── Reset ────────────────────────────────────────────────────── */}
        <button
          type="button"
          className="text-ut-sm text-ut-muted hover:text-red-600 transition-colors underline"
          onClick={handleReset}
        >
          Reset Branding
        </button>
      </div>
    </div>
  );
}

/* ─── Reusable label + text input ──────────────────────────────────────── */

function LabelInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-ut-xs text-ut-muted">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded border border-ut-border bg-white px-2 py-1 text-ut-sm"
      />
    </label>
  );
}
