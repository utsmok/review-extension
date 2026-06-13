import { useRegistryStore } from "@/stores/registry";

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useRegistryStore((s) => s.settings);
  const updateSettings = useRegistryStore((s) => s.updateSettings);

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
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Back</title>
            <path d="M10 3L5 8l5 5" />
          </svg>
        </button>
        <h1 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
          Settings
        </h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4 space-y-ut-5">
        {/* ── Section: Reviewer Profile ────────────────────── */}
        <section>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
            Reviewer Profile
          </h2>
          <p className="text-ut-xs text-ut-muted mb-ut-2">
            Included in exported reports to identify the reviewer.
          </p>
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
        </section>
        {/* ── Section: Labs ────────────────────────────── */}
        <section>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
            Labs
          </h2>
          <p className="text-ut-xs text-ut-muted mb-ut-2">
            Experimental features under development. Enable them to try new capabilities before they
            become default.
          </p>
          <div className="space-y-ut-3">
            <label className="flex items-start gap-ut-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 accent-trust-magenta"
                checked={settings.labs?.enhancedRecommendation ?? false}
                onChange={(e) =>
                  updateSettings({
                    labs: { ...settings.labs, enhancedRecommendation: e.target.checked },
                  })
                }
              />
              <div>
                <span className="text-ut-xs font-semibold text-ut-navy block">
                  Enhanced Recommendation
                </span>
                <span className="text-ut-xs text-ut-muted block leading-relaxed">
                  Use a 6-level recommendation scale instead of the standard Pass/Conditional/Fail
                  grades.
                </span>
              </div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
