import { useRef, useState } from "react";
import { downloadBlob } from "@/lib/export";
import { applyPack, buildActivePack } from "@/lib/pack";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";

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
      downloadBlob(blob, `trust-review-pack-${pack.packId}-${pack.version}.json`);
      setSuccess("Pack exported successfully.");
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
      const data = JSON.parse(text) as unknown;
      applyPack(data);
      setSuccess("Pack imported successfully. Customizations applied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      // Reset so re-selecting the same file works
      e.target.value = "";
    }
  };

  const handleReset = () => {
    setError(null);
    setSuccess(null);
    resetAll();
    setSuccess("All customizations reset to shipped defaults.");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-ut-border">
        <button
          type="button"
          className="text-ut-muted hover:text-ut-navy transition-colors p-0.5"
          onClick={onBack}
          aria-label="Back"
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-ut-navy">Framework Pack Manager</h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-ut-navy">Export</h3>
          <p className="text-sm text-ut-muted">
            Download the current active framework (including all customizations) as a portable JSON
            pack file.
          </p>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 text-sm rounded-md bg-ut-navy text-white hover:bg-ut-navy/90 transition-colors"
          >
            Export Pack
          </button>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-ut-navy">Import</h3>
          <p className="text-sm text-ut-muted">
            Upload a framework pack JSON file. This will replace all current customizations with the
            differences between the pack and shipped defaults.
          </p>
          <button
            type="button"
            onClick={handleImport}
            className="px-3 py-1.5 text-sm rounded-md border border-ut-border text-ut-navy hover:bg-ut-navy/5 transition-colors"
          >
            Import Pack
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            data-testid="pack-import-file"
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-ut-navy">Reset</h3>
          <p className="text-sm text-ut-muted">
            {hasOverrides()
              ? "Clear all customizations and return to shipped defaults."
              : "No customizations are active."}
          </p>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasOverrides()}
            className="px-3 py-1.5 text-sm rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reset to Defaults
          </button>
        </section>
      </div>
    </div>
  );
}
