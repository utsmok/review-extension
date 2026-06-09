import { type FormEvent, useEffect, useRef, useState } from "react";

import { useActiveSession } from "@/hooks/useActiveSession";
import { useAutoFocus, useFocusTrap } from "@/hooks/useFocus";
import { captureCurrentPageInfo } from "@/lib/capture";
import { toastError } from "@/stores/toast";

interface NewSessionModalProps {
  onClose: () => void;
}

export default function NewSessionModal({ onClose }: NewSessionModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState<string | undefined>(undefined);
  const [usesAi, setUsesAi] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { createSession } = useActiveSession();

  useFocusTrap(panelRef);
  useAutoFocus(panelRef, "input");

  // Prefill from current tab
  useEffect(() => {
    let cancelled = false;
    captureCurrentPageInfo()
      .then(({ url, title, faviconUrl: fav }) => {
        if (cancelled) return;
        if (url) setToolUrl(url);
        if (title) setToolName(title);
        if (fav) setFaviconUrl(fav);
      })
      .catch(() => {
        // Silent — user can fill in manually
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!toolName.trim() || !toolUrl.trim() || submitting) return;
    setSubmitting(true);

    const id = crypto.randomUUID();
    const metadata = {
      id,
      toolName: toolName.trim(),
      toolUrl: toolUrl.trim(),
      startTime: new Date().toISOString(),
      rubricId: "trust-full" as const,
      usesAi,
      status: "started" as const,
      ...(faviconUrl ? { faviconUrl } : {}),
    };

    try {
      await createSession(metadata);
      onClose();
    } catch (err) {
      console.error("Failed to create session:", err);
      toastError(
        err instanceof Error
          ? err.message
          : "Could not create the review. Check that both fields are filled and try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      className="modal-backdrop"
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Start a new review"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-ut-lg font-bold text-ut-navy mb-ut-3">New Review</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-ut-3">
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
            <p className="inline-hint">Auto-filled from your current browser tab.</p>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
              Tool URL *
            </span>
            <input
              type="url"
              className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              value={toolUrl}
              onChange={(e) => setToolUrl(e.target.value)}
              placeholder="e.g. https://www.semanticscholar.org"
              required
              aria-required="true"
            />
          </label>

          <label
            className="flex items-center gap-ut-2 label-tooltip"
            data-hint="Controls whether AI-specific rubric questions (e.g. training data, model transparency) appear in your review. Uncheck for non-AI tools."
          >
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
          <p className="text-ut-xs text-ut-muted">
            {usesAi
              ? "AI-specific rubric questions will be included in the review."
              : "AI-specific rubric questions will be marked as not applicable."}
          </p>

          <div className="flex gap-ut-2 mt-ut-2">
            <button
              type="button"
              className="border border-ut-border rounded-ut-sm bg-ut-white text-ut-muted px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-grey transition-colors flex-1"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors flex-1"
              disabled={!toolName.trim() || !toolUrl.trim() || submitting}
            >
              {submitting ? "Creating..." : "Start Review"}
            </button>
          </div>
        </form>
      </div>
    </button>
  );
}
