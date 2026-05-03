import { type FormEvent, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { RUBRIC_VARIANTS } from "@/data/rubrics";
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";

export default function SessionInit() {
  const loadSession = useSessionStore((s) => s.loadSession);
  const addSession = useRegistryStore((s) => s.addSession);
  const setActiveSessionId = useRegistryStore((s) => s.setActiveSessionId);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [rubricId, setRubricId] = useState(RUBRIC_VARIANTS[0].id);
  const [usesAi, setUsesAi] = useState(true);

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (!toolName.trim() || !toolUrl.trim()) return;
    const id = uuidv4();
    const metadata = {
      id,
      toolName: toolName.trim(),
      toolUrl: toolUrl.trim(),
      startTime: new Date().toISOString(),
      rubricId,
      usesAi,
      status: "started" as const,
    };
    addSession(metadata);
    setActiveSessionId(id);
    loadSession({
      metadata,
      captures: [],
      evaluations: [],
      questionModes: {},
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-ut-white">
      <div className="top-accent" />

      <div className="flex-1 flex flex-col items-center px-ut-4 pt-ut-8 pb-ut-4">
        <img
          src="/trust.svg"
          alt="TRUST"
          className="w-[180px] mb-2"
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode("TRUST")); }}
        />
        <p className="font-display text-ut-sm font-bold uppercase tracking-ut-kicker text-ut-muted mb-ut-6">
          Review Extension
        </p>

        <form onSubmit={handleStart} className="w-full max-w-[280px] flex flex-col gap-ut-3">
          <label className="flex flex-col gap-1">
            <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
              Tool Name *
            </span>
            <input
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g. Semantic Scholar"
              required
              aria-required="true"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
              Tool URL *
            </span>
            <input
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={toolUrl}
              onChange={(e) => setToolUrl(e.target.value)}
              placeholder="https://..."
              required
              aria-required="true"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
              Rubric Variant
            </span>
            <select
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={rubricId}
              onChange={(e) => setRubricId(e.target.value)}
            >
              {RUBRIC_VARIANTS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="text-ut-xs text-ut-muted">
              {RUBRIC_VARIANTS.find((v) => v.id === rubricId)?.description}
            </span>
          </label>

          <label className="flex items-center gap-ut-2">
            <input
              type="checkbox"
              checked={usesAi}
              onChange={(e) => setUsesAi(e.target.checked)}
              className="w-4 h-4 rounded-ut-sm border-ut-border text-ut-blue focus:ring-ut-blue"
            />
            <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
              Tool uses AI / LLM
            </span>
          </label>
          {!usesAi && (
            <p className="text-ut-xs text-ut-muted">
              AI-specific questions will be marked as not applicable.
            </p>
          )}

          <button
            type="submit"
            className="bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors"
            disabled={!toolName.trim() || !toolUrl.trim()}
          >
            Start Review Session
          </button>
        </form>
      </div>

      <div className="border-t border-ut-border px-ut-4 py-ut-2 flex items-center gap-2">
        <img
          src="/lisa-eis.svg"
          alt="LISA-EIS"
          className="h-5"
          onError={(e) => { e.currentTarget.replaceWith(document.createTextNode("LISA-EIS")); }}
        />
        <span className="text-ut-xs text-ut-slate">LISA-EIS / University of Twente</span>
      </div>
    </div>
  );
}
