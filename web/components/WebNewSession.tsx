import { type FormEvent, useEffect, useRef, useState } from "react";

import { useActiveSession } from "@/hooks/useActiveSession";
import { useAutoFocus, useFocusTrap } from "@/hooks/useFocus";
import { toastError } from "@/stores/toast";

interface WebNewSessionProps {
  onClose: () => void;
}

export default function WebNewSession({ onClose }: WebNewSessionProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [description, setDescription] = useState("");
  const [usesAi, setUsesAi] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { createSession } = useActiveSession();

  useFocusTrap(panelRef);
  useAutoFocus(panelRef, "input");

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) {
      toastError("Tool name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await createSession({
        id: crypto.randomUUID(),
        toolName: toolName.trim(),
        toolUrl: toolUrl.trim(),
        description: description.trim() || undefined,
        startTime: new Date().toISOString(),
        rubricId: "trust-full",
        usesAi,
        status: "started",
      });
      onClose();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        ref={panelRef}
        className="bg-ut-white rounded-lg shadow-xl w-full max-w-md mx-ut-4 p-ut-5"
        role="dialog"
        aria-modal="true"
        aria-label="New review session"
      >
        <h2 className="font-heading text-ut-sub font-bold text-ut-navy mb-ut-4">
          Start New Review
        </h2>

        <form onSubmit={handleSubmit} className="space-y-ut-3">
          <div>
            <label htmlFor="web-tool-name" className="block text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
              Tool Name *
            </label>
            <input
              id="web-tool-name"
              type="text"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              placeholder="e.g. Semantic Scholar"
              className="w-full border border-ut-border rounded px-ut-2 py-ut-1 text-ut-md focus:outline-none focus:ring-2 focus:ring-ut-blue"
            />
          </div>

          <div>
            <label htmlFor="web-tool-url" className="block text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
              Tool URL
            </label>
            <input
              id="web-tool-url"
              type="url"
              value={toolUrl}
              onChange={(e) => setToolUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-ut-border rounded px-ut-2 py-ut-1 text-ut-md focus:outline-none focus:ring-2 focus:ring-ut-blue"
            />
          </div>

          <div>
            <label htmlFor="web-description" className="block text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-ut-1">
              Description
            </label>
            <textarea
              id="web-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the tool..."
              rows={3}
              className="w-full border border-ut-border rounded px-ut-2 py-ut-1 text-ut-md focus:outline-none focus:ring-2 focus:ring-ut-blue resize-none"
            />
          </div>

          <div className="flex items-center gap-ut-2">
            <input
              id="web-uses-ai"
              type="checkbox"
              checked={usesAi}
              onChange={(e) => setUsesAi(e.target.checked)}
              className="rounded border-ut-border"
            />
            <label htmlFor="web-uses-ai" className="text-ut-sm text-ut-body">
              Tool uses AI / LLM features
            </label>
          </div>

          <div className="flex justify-end gap-ut-2 pt-ut-2">
            <button
              type="button"
              onClick={onClose}
              className="px-ut-3 py-ut-1 text-ut-sm text-ut-muted hover:text-ut-navy transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !toolName.trim()}
              className="px-ut-3 py-ut-1 text-ut-sm bg-trust-magenta text-white rounded hover:bg-trust-magenta-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Start Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
