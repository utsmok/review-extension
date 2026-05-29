import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useCaptureAction } from "@/hooks/useCaptureAction";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { captureActiveTab, captureForMetadataField } from "@/lib/capture";
import { TabNavigationContext, useRubric } from "@/lib/contexts";
import { useRovingTabIndex } from "@/hooks/useFocus";
import { computeCompletion } from "@/lib/rubric";
import { toastSuccess } from "@/stores/toast";
import Captures from "./Captures";
import Evaluation from "./Evaluation";
import FinalizationScreen from "./FinalizationScreen";
import Metadata from "./Metadata";

const tabs = ["Evaluation", "Metadata", "Finalize", "Captures"] as const;

const tabDescs: Record<(typeof tabs)[number], string> = {
  Evaluation: "Score rubric questions (1–4) and attach evidence",
  Metadata: "Tool details, URLs, logo, and data sources",
  Finalize: "Grade, conclusion, strengths, and export",
  Captures: "Screenshot evidence and annotations",
};

const tabIds: Record<(typeof tabs)[number], string> = {
  Captures: "panel-captures",
  Evaluation: "panel-evaluation",
  Metadata: "panel-metadata",
  Finalize: "panel-finalize",
};

/** Checkmark SVG for completed tabs */
function TabCheck() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block ml-1 text-ut-green align-middle"
      aria-label="Complete"
    >
      <path d="M3 7l3 3 5.5-5.5" className="tab-check-path" />
    </svg>
  );
}

export default function ActiveSession() {
  const { activeTab, setActiveTab, handleKeyDown } = useRovingTabIndex(tabs, "Evaluation");
  const { session, closeSession, evaluations, finalization, addCapture, updateMetadata } =
    useActiveSession();
  const { rubric } = useRubric();

  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const { capturing, run } = useCaptureAction();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  useKeyboardShortcuts({
    "1": () => setActiveTab("Evaluation"),
    "2": () => setActiveTab("Metadata"),
    "3": () => setActiveTab("Finalize"),
    "4": () => setActiveTab("Captures"),
    "Ctrl+Shift+S": () => {
      if (!capturing) {
        run(async () => {
          const result = await captureActiveTab();
          addCapture(result);
        });
      }
    },
    Escape: () => {
      if (quickNoteOpen) setQuickNoteOpen(false);
    },
  });

  useEffect(() => {
    if (quickNoteOpen) noteRef.current?.focus();
  }, [quickNoteOpen]);

  // Compute tab completion states
  const metadataComplete = useMemo(
    () => !!(session?.toolName?.trim() && session?.toolUrl?.trim()),
    [session?.toolName, session?.toolUrl],
  );

  const evaluationComplete = useMemo(() => {
    if (!rubric) return false;
    return computeCompletion(evaluations, rubric, session?.usesAi ?? true) === 100;
  }, [evaluations, rubric, session?.usesAi]);

  const finalizeComplete = useMemo(() => !!finalization, [finalization]);

  const handleSaveQuickNote = () => {
    const text = quickNoteText.trim();
    if (text) {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const existing = session?.notes ?? "";
      const updated = existing ? `${existing}\n[${timestamp}] ${text}` : `[${timestamp}] ${text}`;
      updateMetadata({ notes: updated });
    }
    setQuickNoteText("");
    setQuickNoteOpen(false);
  };

  return (
    <TabNavigationContext.Provider value={setActiveTab}>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="bg-trust-magenta-tint border-b-2 border-trust-magenta-border px-ut-4 py-ut-2 flex items-center gap-ut-2 min-w-0">
          <button
            type="button"
            className="shrink-0 p-1 rounded-ut-sm text-ut-slate hover:text-trust-magenta hover:bg-white/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
            onClick={closeSession}
            title="Close review and return to start"
            aria-label="Close review"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <title>Close</title>
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
          </button>

          <div className="quick-action-group">
            {/* Quick Note */}
            <button
              type="button"
              className="quick-action-btn"
              data-tip="Quick Note — Add a review note"
              title="Quick Note — Add a review note"
              aria-label="Quick note"
              onClick={() => setQuickNoteOpen(true)}
              disabled={quickNoteOpen}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
            {/* Quick Capture */}
            <button
              type="button"
              className="quick-action-btn"
              data-tip="Quick Capture — Screenshot current page"
              title="Quick Capture — Screenshot current page"
              aria-label="Quick capture"
              disabled={capturing}
              onClick={() => {
                run(async () => {
                  const result = await captureActiveTab();
                  addCapture(result);
                });
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            {/* Terms & Conditions */}
            <button
              type="button"
              className="quick-action-btn"
              data-tip="Capture T&C — Save current page as Terms & Conditions evidence"
              title="Capture T&C — Save current page as Terms & Conditions evidence"
              aria-label="Capture Terms and Conditions"
              disabled={capturing}
              onClick={() => {
                run(async () => {
                  const result = await captureForMetadataField("termsConditionsUrl");
                  addCapture(result.capture);
                  updateMetadata({ termsConditionsUrl: result.capture.sourceUrl });
                });
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </button>
            {/* Tool Logo */}
            <button
              type="button"
              className="quick-action-btn"
              data-tip="Capture Logo — Save current page and extract tool logo"
              title="Capture Logo — Save current page and extract tool logo"
              aria-label="Capture tool logo"
              disabled={capturing}
              onClick={() => {
                run(async () => {
                  const result = await captureForMetadataField("toolLogoUrl");
                  addCapture(result.capture);
                  // Store the direct image link (SVG/PNG) as evidence
                  updateMetadata({
                    toolLogoUrl: result.logoUrl ?? "",
                  });
                });
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            className="quick-action-btn"
            title="Shortcuts: 1-4 = tabs, Ctrl+Shift+S = capture, Esc = close note"
            aria-label="Keyboard shortcuts"
            onClick={() =>
              toastSuccess(
                "Shortcuts: 1–4 = switch tabs · Ctrl+Shift+S = quick capture · Esc = close quick note",
              )
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-ut-2 min-w-0">
            <span className="text-ut-sm text-ut-slate shrink-0">Reviewing:</span>

            {session?.faviconUrl ? (
              <img
                src={session.faviconUrl}
                alt=""
                className="w-4 h-4 shrink-0"
                onError={(e) => {
                  e.currentTarget.classList.add("hidden");
                }}
              />
            ) : null}

            <span
              className="text-ut-sm font-heading font-semibold text-trust-magenta truncate"
              title={session?.toolUrl}
            >
              {session?.toolName}
            </span>
          </div>
        </header>

        <div
          className="sidebar-tab-bar"
          role="tablist"
          aria-label="Review sections"
          onKeyDown={handleKeyDown}
        >
          {tabs.map((tab) => {
            const isComplete =
              tab === "Metadata"
                ? metadataComplete
                : tab === "Evaluation"
                  ? evaluationComplete
                  : tab === "Finalize"
                    ? finalizeComplete
                    : false;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`tab-${tab.toLowerCase()}`}
                aria-selected={activeTab === tab}
                aria-controls={tabIds[tab]}
                tabIndex={activeTab === tab ? 0 : -1}
                className={`sidebar-tab ${activeTab === tab ? "is-active" : ""}`}
                data-tab-desc={tabDescs[tab]}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {isComplete && <TabCheck />}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={tabIds[activeTab]}
          aria-labelledby={`tab-${activeTab.toLowerCase()}`}
          className="flex-1 min-h-0 overflow-y-auto bg-ut-offwhite tab-panel-content"
          aria-live="polite"
        >
          {quickNoteOpen && (
            <div className="quick-note-overlay">
              <textarea
                ref={noteRef}
                rows={2}
                placeholder="Add a note..."
                aria-label="Quick note"
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuickNoteOpen(false);
                    return;
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveQuickNote();
                  }
                }}
              />
              <button
                type="button"
                className="note-action-btn note-save"
                onClick={handleSaveQuickNote}
                aria-label="Save note"
              >
                Save
              </button>
              <button
                type="button"
                className="note-action-btn note-cancel"
                onClick={() => {
                  setQuickNoteOpen(false);
                  setQuickNoteText("");
                }}
                aria-label="Cancel note"
              >
                ✕
              </button>
            </div>
          )}
          <div key={activeTab} className="tab-panel-enter">
            {activeTab !== "Metadata" &&
              session &&
              !session.description?.trim() &&
              (!session.dataSources || session.dataSources.length === 0) &&
              !finalization?.finalizedAt && (
                <div className="bg-score-1/10 border-b border-score-1/30 px-ut-4 py-ut-2 flex items-center justify-between">
                  <span className="text-ut-xs text-score-1 font-heading">
                    Complete Tool Details on the Metadata tab before finalizing.
                  </span>
                  <button
                    type="button"
                    className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta hover:text-trust-magenta-strong"
                    onClick={() => setActiveTab("Metadata")}
                  >
                    Go to Metadata →
                  </button>
                </div>
              )}
            {activeTab === "Captures" && <Captures />}
            {activeTab === "Evaluation" && <Evaluation />}
            {activeTab === "Metadata" && <Metadata />}
            {activeTab === "Finalize" && <FinalizationScreen />}
          </div>
        </div>
      </div>
    </TabNavigationContext.Provider>
  );
}
