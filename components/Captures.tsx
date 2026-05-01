import { useState } from "react";
import { captureActiveTab } from "@/lib/capture";
import { getAccentKey, getCategoryLabel, getQuestionCode, TRUST_RUBRIC } from "@/lib/rubric";
import { useSessionStore } from "@/stores/session";

export default function Captures() {
  const captures = useSessionStore((s) => s.captures);
  const addCapture = useSessionStore((s) => s.addCapture);
  const updateCapture = useSessionStore((s) => s.updateCapture);
  const removeCapture = useSessionStore((s) => s.removeCapture);
  const linkCaptureToRubric = useSessionStore((s) => s.linkCaptureToRubric);
  const unlinkCaptureFromRubric = useSessionStore((s) => s.unlinkCaptureFromRubric);
  const [capturing, setCapturing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const capture = await captureActiveTab();
      addCapture(capture);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <button
        type="button"
        className="bg-ut-darkblue text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-ut-navy disabled:opacity-50 transition-colors"
        disabled={capturing}
        onClick={handleCapture}
      >
        {capturing ? "Capturing..." : "+ Quick Capture"}
      </button>

      {captures.length === 0 && (
        <p className="text-ut-sm text-ut-slate text-center py-ut-4">
          No captures yet. Click above to capture the active tab.
        </p>
      )}

      {[...captures].reverse().map((capture) => (
        <div key={capture.id} className="border border-ut-border overflow-hidden bg-ut-white">
          <img
            src={capture.annotatedScreenshotBase64 ?? capture.screenshotBase64}
            alt={`Screenshot of ${capture.pageTitle || capture.sourceUrl}`}
            loading="lazy"
            className="w-full border-b border-ut-border cursor-pointer"
            onClick={() => setExpanded(expanded === capture.id ? null : capture.id)}
          />

          <div className="p-ut-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-ut-xs text-ut-muted font-mono truncate flex-1 mr-ut-2">
                {capture.sourceUrl}
              </p>
              <button
                type="button"
                className="text-ut-xs text-ut-slate hover:text-ut-red shrink-0"
                onClick={() => removeCapture(capture.id)}
              >
                Delete
              </button>
            </div>
            {capture.pageTitle && (
              <p className="text-ut-xs font-bold text-ut-text truncate mb-0.5">
                {capture.pageTitle}
              </p>
            )}
            <p className="text-ut-xs text-ut-slate">
              {new Date(capture.timestamp).toLocaleString()} · {capture.linkedRubricIds.length} tag
              {capture.linkedRubricIds.length !== 1 && "s"}
            </p>

            <textarea
              className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 mt-ut-2 resize-y bg-ut-grey"
              rows={2}
              placeholder="Notes..."
              value={capture.notes}
              onChange={(e) => updateCapture(capture.id, { notes: e.target.value })}
            />

            {/* Rubric tagging */}
            <details
              open={expanded === capture.id}
              className="mt-ut-2"
              onToggle={(e) =>
                setExpanded((e.target as HTMLDetailsElement).open ? capture.id : null)
              }
            >
              <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-muted cursor-pointer hover:text-ut-navy">
                Tag to rubric items ({capture.linkedRubricIds.length})
              </summary>

              <div className="mt-1 space-y-1.5">
                {/* Quality Gates */}
                <div>
                  <p className="section-kicker mb-1">Quality Gates</p>
                  {Object.entries(TRUST_RUBRIC.quality_gate).map(([cat, questions]) => (
                    <div key={cat} className="ml-ut-1 mb-1" data-accent-key="control">
                      <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(questions).map(([qId, question], qIdx) => {
                          const rubricId = `${cat}.${qId}`;
                          const linked = capture.linkedRubricIds.includes(rubricId);
                          return (
                            <button
                              key={rubricId}
                              className={`rubric-chip ${linked ? "" : "hover:border-ut-slate"}`}
                              data-linked={linked ? "true" : "false"}
                              onClick={() =>
                                linked
                                  ? unlinkCaptureFromRubric(capture.id, rubricId)
                                  : linkCaptureToRubric(capture.id, rubricId)
                              }
                            >
                              {getQuestionCode(cat, qIdx)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Scoring Rubric */}
                <div>
                  <p className="section-kicker mb-1">Scoring Rubric</p>
                  {Object.entries(TRUST_RUBRIC.scoring_rubric).map(([cat, questions]) => (
                    <div key={cat} className="ml-ut-1 mb-1" data-accent-key={getAccentKey(cat)}>
                      <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(questions).map(([qId, question], qIdx) => {
                          const rubricId = `${cat}.${qId}`;
                          const linked = capture.linkedRubricIds.includes(rubricId);
                          return (
                            <button
                              key={rubricId}
                              className={`rubric-chip ${linked ? "" : "hover:border-ut-slate"}`}
                              data-linked={linked ? "true" : "false"}
                              onClick={() =>
                                linked
                                  ? unlinkCaptureFromRubric(capture.id, rubricId)
                                  : linkCaptureToRubric(capture.id, rubricId)
                              }
                            >
                              {getQuestionCode(cat, qIdx)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      ))}
    </div>
  );
}
