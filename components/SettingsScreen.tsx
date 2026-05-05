import { useRegistryStore } from "@/stores/registry";
import { RUBRIC_VARIANTS } from "@/data/rubrics";

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useRegistryStore((s) => s.settings);
  const updateSettings = useRegistryStore((s) => s.updateSettings);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-ut-border px-ut-4 py-ut-2 flex items-center gap-2">
        <button
          type="button"
          className="text-ut-muted hover:text-ut-navy transition-colors p-0.5"
          onClick={onBack}
          aria-label="Back"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <title>Back</title>
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <h1 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
          Settings
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-4">
        <div>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-2">
            Reviewer
          </h2>
          <div className="space-y-ut-2">
            <label className="flex flex-col gap-0.5">
              <span className="text-ut-xs text-ut-muted">Name</span>
              <input
                className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
                value={settings.reviewerName}
                onChange={(e) => updateSettings({ reviewerName: e.target.value })}
                placeholder="Reviewer name"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-ut-xs text-ut-muted">Email</span>
              <input
                type="email"
                className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
                value={settings.reviewerEmail}
                onChange={(e) => updateSettings({ reviewerEmail: e.target.value })}
                placeholder="email@example.com"
              />
            </label>
          </div>
        </div>

        <div>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-2">
            Defaults
          </h2>
          <label className="flex flex-col gap-0.5">
            <span className="text-ut-xs text-ut-muted">Default rubric variant</span>
            <select
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={settings.preferredRubric}
              onChange={(e) => updateSettings({ preferredRubric: e.target.value })}
            >
              {RUBRIC_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
