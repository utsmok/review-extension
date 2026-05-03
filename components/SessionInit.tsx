import { type FormEvent, useState } from "react";
import { RUBRIC_VARIANTS } from "@/data/rubrics";
import { useSessionStore } from "@/stores/session";

export default function SessionInit() {
  const startSession = useSessionStore((s) => s.startSession);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [rubricId, setRubricId] = useState(RUBRIC_VARIANTS[0].id);
  const [usesAi, setUsesAi] = useState(true);

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (!toolName.trim() || !toolUrl.trim()) return;
    startSession({
      toolName: toolName.trim(),
      toolUrl: toolUrl.trim(),
      startTime: new Date().toISOString(),
      rubricId,
      usesAi,
    });
  };

  return (
    <div className="flex flex-col gap-ut-4 p-ut-4 bg-ut-white min-h-screen">
      <h1 className="font-heading text-ut-heading font-bold uppercase tracking-ut-panel-title text-ut-navy border-b-2 border-ut-border pb-ut-3">
        TRUST Review
      </h1>
      <p className="text-ut-sm text-ut-muted">
        Evaluate academic search tools against the TRUST framework.
      </p>

      <form onSubmit={handleStart} className="contents">
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
            className="w-4 h-4 rounded border-ut-border text-ut-blue focus:ring-ut-blue"
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
          className="bg-ut-darkblue text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-navy disabled:opacity-50 transition-colors"
          disabled={!toolName.trim() || !toolUrl.trim()}
        >
          Start Review Session
        </button>
      </form>
    </div>
  );
}
