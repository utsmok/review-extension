import { type ChangeEvent, useCallback, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  CollapsibleRow,
  EditorShell,
  editorInputClass,
  LabeledField,
  PreviewBox,
} from "@/components/editor";
import { applyBrandingTokens, getActiveBranding } from "@/lib/framework-config";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

export default function BrandingEditor({ onBack }: { onBack: () => void }) {
  const branding = getActiveBranding();
  const brandingOverrides = useFrameworkCustomizationStore(
    (s) => s.customization.brandingOverrides,
  );
  const setBrandingOverrides = useFrameworkCustomizationStore((s) => s.setBrandingOverrides);
  const resetBranding = useFrameworkCustomizationStore((s) => s.resetBranding);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── helpers to determine if a bucket has overrides ──
  const hasIdentityOverride =
    !!brandingOverrides.frameworkName ||
    !!brandingOverrides.frameworkFullName ||
    !!brandingOverrides.wordmark ||
    !!brandingOverrides.magenta;

  const hasReportOverride = !!brandingOverrides.report;
  const hasExportOverride = !!brandingOverrides.export;
  const hasLogoOverride = !!brandingOverrides.logos;

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
    <EditorShell
      title="Branding"
      subtitle="Framework name, colors, logos, and the text printed on exported reports."
      onBack={onBack}
      footer={
        <button
          type="button"
          className="text-ut-red hover:text-ut-red/80 text-ut-xs"
          onClick={() => setConfirmReset(true)}
        >
          Reset Branding
        </button>
      }
    >
      <div className="space-y-ut-3">
        {/* ── Live preview ──────────────────────────────────────────────── */}
        <PreviewBox label="Report header preview" testId="report-header-preview">
          <div>
            <div className="h-3 rounded-ut-sm" style={{ backgroundColor: branding.magenta }} />
            <div className="mt-ut-2 space-y-ut-1">
              <p className="font-heading text-ut-sub font-bold uppercase tracking-ut-heading text-ut-navy">
                {branding.frameworkName}
              </p>
              <p className="text-ut-xs text-ut-muted">{branding.frameworkFullName}</p>
              {branding.logos.framework && (
                <img
                  src={branding.logos.framework}
                  alt="Framework logo"
                  className="h-8 max-w-full object-contain"
                  data-testid="preview-logo"
                />
              )}
            </div>
          </div>
        </PreviewBox>

        {/* ── 1. Identity ────────────────────────────────────────────────── */}
        <CollapsibleRow
          summary="Identity"
          defaultOpen
          edited={hasIdentityOverride}
          testId="section-identity"
        >
          <LabeledField
            label="Framework Name"
            hint="The short name, e.g. 'TRUST'. Used in headers and filenames."
          >
            <input
              type="text"
              value={branding.frameworkName}
              onChange={(e) => handleIdentityChange("frameworkName", e.target.value)}
              className={editorInputClass}
              data-testid="identity-frameworkName"
            />
          </LabeledField>

          <LabeledField
            label="Framework Full Name"
            hint="Spelled-out name shown on the report cover."
          >
            <input
              type="text"
              value={branding.frameworkFullName}
              onChange={(e) => handleIdentityChange("frameworkFullName", e.target.value)}
              className={editorInputClass}
              data-testid="identity-frameworkFullName"
            />
          </LabeledField>

          <LabeledField label="Wordmark" hint="Text wordmark rendered where the logo can't load.">
            <input
              type="text"
              value={branding.wordmark}
              onChange={(e) => handleIdentityChange("wordmark", e.target.value)}
              className={editorInputClass}
              data-testid="identity-wordmark"
            />
          </LabeledField>

          <LabeledField
            label="Magenta"
            hint="Signature accent color for headers and primary buttons."
          >
            <div className="flex items-center gap-ut-2">
              <input
                type="color"
                value={branding.magenta}
                onChange={(e) => handleIdentityChange("magenta", e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-ut-sm border border-ut-border p-0"
                data-testid="magenta-input"
              />
              <span
                className="inline-block h-6 w-6 rounded-ut-sm border border-ut-border"
                style={{ backgroundColor: branding.magenta }}
                data-testid="magenta-swatch"
              />
              <span className="font-mono text-ut-xs text-ut-muted">{branding.magenta}</span>
            </div>
          </LabeledField>
        </CollapsibleRow>

        {/* ── 2. Report Literals ────────────────────────────────────────── */}
        <CollapsibleRow
          summary="Report Literals"
          edited={hasReportOverride}
          testId="section-report"
        >
          <LabeledField label="Report Title" hint="Main heading on the exported report.">
            <input
              type="text"
              value={branding.report.title}
              onChange={(e) => handleReportChange("title", e.target.value)}
              className={editorInputClass}
              data-testid="report-title"
            />
          </LabeledField>

          <LabeledField label="Nutrition Title" hint="Heading on the nutrition-label summary card.">
            <input
              type="text"
              value={branding.report.nutritionTitle}
              onChange={(e) => handleReportChange("nutritionTitle", e.target.value)}
              className={editorInputClass}
              data-testid="report-nutritionTitle"
            />
          </LabeledField>

          <LabeledField label="Card Title" hint="Heading on the business-card summary.">
            <input
              type="text"
              value={branding.report.cardTitle}
              onChange={(e) => handleReportChange("cardTitle", e.target.value)}
              className={editorInputClass}
              data-testid="report-cardTitle"
            />
          </LabeledField>

          <LabeledField
            label="Footer Framework"
            hint="Framework attribution printed in the report footer."
          >
            <input
              type="text"
              value={branding.report.footerFramework}
              onChange={(e) => handleReportChange("footerFramework", e.target.value)}
              className={editorInputClass}
              data-testid="report-footerFramework"
            />
          </LabeledField>

          <LabeledField label="Reviewed By" hint="Label naming the reviewer line on the report.">
            <input
              type="text"
              value={branding.report.reviewedBy}
              onChange={(e) => handleReportChange("reviewedBy", e.target.value)}
              className={editorInputClass}
              data-testid="report-reviewedBy"
            />
          </LabeledField>

          <LabeledField
            label="Archive Notice"
            hint="Notice text appended to archived report bundles."
          >
            <input
              type="text"
              value={branding.report.archiveNotice}
              onChange={(e) => handleReportChange("archiveNotice", e.target.value)}
              className={editorInputClass}
              data-testid="report-archiveNotice"
            />
          </LabeledField>

          <LabeledField
            label="QR URL"
            hint="URL the report QR code points to (leave blank for none)."
          >
            <input
              type="text"
              value={branding.report.qrUrl ?? ""}
              onChange={(e) => handleReportChange("qrUrl", e.target.value)}
              className={editorInputClass}
              data-testid="report-qrUrl"
            />
          </LabeledField>
        </CollapsibleRow>

        {/* ── 3. Export ────────────────────────────────────────────────── */}
        <CollapsibleRow summary="Export" edited={hasExportOverride} testId="section-export">
          <LabeledField
            label="Label Filename Prefix"
            hint="Prefix for the exported label filename."
          >
            <input
              type="text"
              value={branding.export.labelFilenamePrefix}
              onChange={(e) => handleExportChange("labelFilenamePrefix", e.target.value)}
              className={editorInputClass}
              data-testid="export-labelFilenamePrefix"
            />
          </LabeledField>

          <LabeledField
            label="Framework Logo Filename"
            hint="Filename used for the framework logo inside the export."
          >
            <input
              type="text"
              value={branding.export.frameworkLogoFilename}
              onChange={(e) => handleExportChange("frameworkLogoFilename", e.target.value)}
              className={editorInputClass}
              data-testid="export-frameworkLogoFilename"
            />
          </LabeledField>
        </CollapsibleRow>

        {/* ── 4. Logos ──────────────────────────────────────────────────── */}
        <CollapsibleRow summary="Logos" edited={hasLogoOverride} testId="section-logos">
          <LabeledField label="Framework Logo (upload)">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block text-ut-xs text-ut-muted"
              data-testid="logo-upload"
            />
          </LabeledField>

          {branding.logos.framework && (
            <div>
              <span className="text-ut-xs text-ut-muted">Current Framework Logo</span>
              <img
                src={branding.logos.framework}
                alt="Framework logo"
                className="mt-0.5 h-16 max-w-full object-contain border border-ut-border rounded-ut-sm"
                data-testid="logo-preview"
              />
            </div>
          )}

          {branding.logos.secondary && (
            <div>
              <span className="text-ut-xs text-ut-muted">Secondary Logo (read-only)</span>
              <img
                src={branding.logos.secondary}
                alt="Secondary logo"
                className="mt-0.5 h-12 max-w-full object-contain border border-ut-border rounded-ut-sm"
              />
            </div>
          )}
          {branding.logos.institution && (
            <div>
              <span className="text-ut-xs text-ut-muted">Institution Logo (read-only)</span>
              <img
                src={branding.logos.institution}
                alt="Institution logo"
                className="mt-0.5 h-12 max-w-full object-contain border border-ut-border rounded-ut-sm"
              />
            </div>
          )}
        </CollapsibleRow>
      </div>

      {confirmReset && (
        <ConfirmDialog
          message="Reset all branding to the framework defaults? This clears any name, color, logo, and text customizations you've made."
          actions={[
            { label: "Cancel", handler: () => setConfirmReset(false), variant: "cancel" },
            {
              label: "Reset",
              handler: () => {
                handleReset();
                setConfirmReset(false);
              },
              variant: "danger",
            },
          ]}
        />
      )}
    </EditorShell>
  );
}
