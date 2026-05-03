import { type FormEvent, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { RUBRIC_VARIANTS } from "@/data/rubrics";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useRegistryStore } from "@/stores/registry";
import { saveToIDB } from "@/lib/session-storage";
import { captureCurrentPageInfo } from "@/lib/capture";
import { useAutoFocus, useFocusTrap } from "@/lib/hooks";

interface NewSessionModalProps {
  onClose: () => void;
}

export default function NewSessionModal({ onClose }: NewSessionModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [toolName, setToolName] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState<string | undefined>(undefined);
  const [rubricId, setRubricId] = useState(RUBRIC_VARIANTS[0].id);
  const [usesAi, setUsesAi] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { addSession } = useActiveSession();
  const registryAddSession = useRegistryStore((s) => s.addSession);

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
    return () => { cancelled = true; };
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

    const id = uuidv4();
    const metadata = {
      id,
      toolName: toolName.trim(),
      toolUrl: toolUrl.trim(),
      startTime: new Date().toISOString(),
      rubricId,
      usesAi,
      status: "started" as const,
      ...(faviconUrl ? { faviconUrl } : {}),
    };

    try {
      // 1. Save to IDB first so the hook won't race
      await saveToIDB(id, {
        metadata,
        captures: [],
        evaluations: [],
        questionModes: {},
      });
      // 2. Then register (which sets activeSessionId)
      registryAddSession(metadata);
      // 3. Hook detects change, loads from IDB, populates session store
      onClose();
    } catch (err) {
      console.error("Failed to create session:", err);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Start a new review session"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-ut-lg font-bold text-ut-navy mb-ut-3">
          New Review
        </h2>

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
              title="Choose the evaluation rubric. TRUST Framework is the full expert version; TRUST Lite uses simplified plain-language criteria."
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
            <span
              className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy"
              title="Mark whether the tool uses AI or LLMs. If unchecked, AI-specific questions will be marked as not applicable."
            >
              Tool uses AI / LLM
            </span>
          </label>
          {!usesAi && (
            <p className="text-ut-xs text-ut-muted">
              AI-specific questions will be marked as not applicable.
            </p>
          )}

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
    </div>
  );
}
