import { useRef, useState } from "react";
import { EditorShell, Section } from "@/components/editor";
import { downloadBlob } from "@/lib/export";
import { applyPack, buildActivePack } from "@/lib/pack";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

/**
 * Single home for framework customization IO: export the active framework
 * (shipped defaults + every customization) as a portable pack, import one
 * from a colleague, or reset everything to shipped defaults.
 */
export default function PackManager({ onBack }: { onBack: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const hasOverrides = useFrameworkCustomizationStore((s) => s.hasOverrides);
  const resetAll = useFrameworkCustomizationStore((s) => s.resetAll);

  const handleExport = () => {
    setError(null);
    setSuccess(null);
    try {
      const pack = buildActivePack();
      const blob = new Blob([JSON.stringify(pack, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, "trust-framework-pack.json");
      setSuccess("Framework pack exported.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleImport = () => {
    setError(null);
    setSuccess(null);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyPack(parsed);
      setSuccess("Framework pack imported. Customizations updated.");
    } catch (err) {
      setError(
        err instanceof Error ? `Could not read pack: ${err.message}` : "Could not read pack file.",
      );
    } finally {
      e.target.value = "";
    }
  };

  const handleReset = () => {
    setError(null);
    setSuccess(null);
    resetAll();
    setSuccess("All customizations reset to shipped defaults.");
  };

  const overridesActive = hasOverrides();

  return (
    <EditorShell
      title="Framework pack"
      subtitle="Export your customized framework to a shareable file, import one from a colleague, or reset everything to shipped defaults. A pack captures fields, grades, the rubric, principles, and branding."
      onBack={onBack}
    >
      <div className="space-y-ut-5">
        {error && (
          <div
            role="alert"
            className="rounded-ut-sm border border-state-error-border bg-state-error-tint px-ut-3 py-ut-2 text-ut-xs text-ut-text"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            role="status"
            className="rounded-ut-sm border border-state-success-border bg-state-success-tint px-ut-3 py-ut-2 text-ut-xs text-ut-text"
          >
            {success}
          </div>
        )}

        <Section
          title="Export"
          description="Download the current active framework — shipped defaults plus every customization you have made — as a portable JSON pack file."
        >
          <button
            type="button"
            onClick={handleExport}
            className="bg-trust-magenta text-white hover:bg-trust-magenta-strong rounded-ut-sm px-ut-3 py-ut-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
          >
            Export pack
          </button>
        </Section>

        <Section
          title="Import"
          description="Upload a framework pack JSON file. This replaces all of your current customizations with the differences encoded in the pack."
        >
          <button
            type="button"
            onClick={handleImport}
            className="border border-ut-border text-ut-navy hover:bg-ut-grey rounded-ut-sm px-ut-3 py-ut-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
          >
            Import pack
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            data-testid="pack-import-file"
          />
        </Section>

        <Section
          title="Reset"
          description={
            overridesActive
              ? "Clear every customization — fields, grades, rubric, principles, and branding — and return to shipped defaults."
              : "No customizations are active. The framework is at shipped defaults."
          }
        >
          <button
            type="button"
            onClick={handleReset}
            disabled={!overridesActive}
            className="border border-state-error-border text-ut-red hover:bg-state-error-tint rounded-ut-sm px-ut-3 py-ut-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
            data-testid="pack-reset"
          >
            Reset to defaults
          </button>
        </Section>

        {overridesActive && (
          <p className="text-ut-xs text-trust-magenta">
            ● Customizations active — export a pack to share or back them up.
          </p>
        )}
      </div>
    </EditorShell>
  );
}
