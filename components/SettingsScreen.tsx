import { useState } from "react";
import { useFrameworkCustomizationStore } from "@/stores/framework-customization";
import { useRegistryStore } from "@/stores/registry";
import BrandingEditor from "./BrandingEditor";
import FieldEditor from "./FieldEditor";
import GradeIdEditor from "./GradeIdEditor";
import PackManager from "./PackManager";
import PrincipleEditor from "./PrincipleEditor";
import RubricEditor from "./RubricEditor";

type View = "main" | "fields" | "grades" | "rubric" | "principles" | "branding" | "pack";

const EDITORS: {
  view: Exclude<View, "main">;
  label: string;
  hint: string;
  Component: (p: { onBack: () => void }) => React.JSX.Element;
}[] = [
  {
    view: "fields",
    label: "Fields & options",
    hint: "Toggle, relabel, reorder, or add entry fields",
    Component: FieldEditor,
  },
  {
    view: "grades",
    label: "Grades",
    hint: "Add, remove, recolor, and relabel final-grade options",
    Component: GradeIdEditor,
  },
  {
    view: "rubric",
    label: "Rubric questions",
    hint: "Author quality-gate and scoring questions",
    Component: RubricEditor,
  },
  {
    view: "principles",
    label: "Principles",
    hint: "Rename principles and recolor them",
    Component: PrincipleEditor,
  },
  {
    view: "branding",
    label: "Branding",
    hint: "Framework name, colors, logos, report text",
    Component: BrandingEditor,
  },
  {
    view: "pack",
    label: "Framework pack",
    hint: "Export or import the whole customized framework",
    Component: PackManager,
  },
];

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useRegistryStore((s) => s.settings);
  const updateSettings = useRegistryStore((s) => s.updateSettings);
  const [view, setView] = useState<View>("main");
  const hasOverrides = useFrameworkCustomizationStore((s) => s.hasOverrides);

  if (view !== "main") {
    const editor = EDITORS.find((e) => e.view === view);
    if (editor) return <editor.Component onBack={() => setView("main")} />;
  }

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
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-heading text-ut-sub font-bold uppercase tracking-ut-heading text-trust-magenta">
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
              <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
                Name
              </span>
              <input
                className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
                value={settings.reviewerName}
                onChange={(e) => updateSettings({ reviewerName: e.target.value })}
                placeholder="Reviewer name"
              />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
                Email
              </span>
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
                <span className="text-ut-xs font-heading font-bold text-ut-navy block">
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
        {/* ── Section: Framework customization ─────────────── */}
        <section>
          <h2 className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
            Framework customization
          </h2>
          <p className="text-ut-xs text-ut-muted mb-ut-2">
            Adapt the TRUST framework to your institution: fields, grades, rubric, principles, and
            branding. Changes persist locally and can be exported as a shareable pack.
          </p>
          <div className="space-y-ut-2">
            {EDITORS.map((e) => (
              <button
                key={e.view}
                type="button"
                className="w-full flex items-center justify-between gap-ut-2 border border-ut-border rounded-ut-sm px-ut-3 py-ut-2 text-left hover:border-trust-magenta hover:bg-trust-magenta/5 transition-colors"
                onClick={() => setView(e.view)}
              >
                <span className="flex flex-col">
                  <span className="text-ut-xs font-heading font-bold text-ut-navy">{e.label}</span>
                  <span className="text-ut-xs text-ut-muted leading-relaxed">{e.hint}</span>
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-ut-muted shrink-0"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            ))}
          </div>
          {hasOverrides() ? (
            <p className="text-ut-xs text-trust-magenta mt-ut-2">
              ● Customizations active — export a pack to share them.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
