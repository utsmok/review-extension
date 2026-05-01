import { useState } from "react";
import { useSessionStore } from "@/stores/session";

export default function SessionInit() {
  const startSession = useSessionStore((s) => s.startSession);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");

  const handleStart = () => {
    if (!toolName.trim() || !toolUrl.trim()) return;
    startSession({
      toolName: toolName.trim(),
      toolUrl: toolUrl.trim(),
      startTime: new Date().toISOString(),
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

      <button
        className="bg-ut-darkblue text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-navy disabled:opacity-50 transition-colors"
        disabled={!toolName.trim() || !toolUrl.trim()}
        onClick={handleStart}
      >
        Start Review Session
      </button>
    </div>
  );
}
