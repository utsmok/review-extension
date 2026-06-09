import { useEffect, useMemo, useRef, useState } from "react";
import { TabNavigationContext, useRubric } from "@/components/contexts";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useCaptureAction } from "@/hooks/useCaptureAction";
import { useRovingTabIndex } from "@/hooks/useFocus";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { captureActiveTab, captureForMetadataField } from "@/lib/capture";
import { computeCompletion } from "@/lib/rubric";
import Captures from "./Captures";
import Evaluation from "./Evaluation";
import ExportCompleteScreen from "./ExportCompleteScreen";
import FinalizationScreen from "./FinalizationScreen";
import Metadata from "./Metadata";
import {
  IconCamera,
  IconCheck,
  IconClose,
  IconDocument,
  IconDownload,
  IconHelp,
  IconImage,
  IconNote,
  TabCheck,
} from "./svgs/ToolbarIcons";

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

export function ActiveSession() {
  const { activeTab, setActiveTab, handleKeyDown } = useRovingTabIndex(tabs, "Evaluation");
  const {
    session,
    closeSession,
    captures,
    evaluations,
    finalization,
    addCapture,
    updateMetadata,
    addQuickNote,
    exportAndClose,
  } = useActiveSession();
  const { rubric } = useRubric();

  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFilename, setExportFilename] = useState("");
  const [exportFileSize, setExportFileSize] = useState<number | null>(null);
  const { capturing, run } = useCaptureAction();
  const helpRef = useRef<HTMLDivElement>(null);
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
      else if (helpOpen) setHelpOpen(false);
    },
    "?": () => setHelpOpen((v) => !v),
    "Shift+/": () => setHelpOpen((v) => !v),
  });

  useEffect(() => {
    if (quickNoteOpen) noteRef.current?.focus();
  }, [quickNoteOpen]);
  useEffect(() => {
    if (!helpOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setHelpOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [helpOpen]);

  // Compute tab completion states
  const metadataComplete = useMemo(
    () => !!(session?.toolName?.trim() && session?.toolUrl?.trim()),
    [session?.toolName, session?.toolUrl],
  );

  const evaluationComplete = useMemo(() => {
    if (!rubric) return false;
    return computeCompletion(evaluations, rubric, session?.usesAi ?? true) === 100;
  }, [evaluations, rubric, session?.usesAi]);

  const finalizeComplete = useMemo(
    () => !!(finalization?.finalizedAt && finalization?.grade && finalization?.conclusion?.trim()),
    [finalization],
  );
  const readyToFinalize = evaluationComplete && !finalization?.finalizedAt;

  const handleTopExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportAndClose(rubric);
      if (result) {
        setExportFilename(`TRUST_Review_${session?.toolName ?? "review"}.zip`);
        setExportFileSize(result.blobSize);
        setExportComplete(true);
      } else {
        setExportError("Export failed. Please try again.");
      }
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleRetryExport = async () => {
    setExporting(true);
    try {
      const result = await exportAndClose(rubric);
      if (result) {
        setExportFilename(`TRUST_Review_${session?.toolName ?? "review"}.zip`);
        setExportFileSize(result.blobSize);
        setExportError(null);
      }
    } catch {
      setExportError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExportDone = () => {
    setExportComplete(false);
  };
  const handleSaveQuickNote = () => {
    const text = quickNoteText.trim();
    if (text) {
      addQuickNote({
        id: crypto.randomUUID(),
        text,
        timestamp: new Date().toISOString(),
      });
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
            onClick={() => {
              if (quickNoteOpen && quickNoteText.trim()) {
                addQuickNote({
                  id: crypto.randomUUID(),
                  text: quickNoteText.trim(),
                  timestamp: new Date().toISOString(),
                });
              }
              closeSession();
            }}
            title="Close review and return to start"
            aria-label="Close review"
          >
            <IconClose />
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
              <IconNote />
            </button>
            {/* Quick Capture */}
            <button
              type="button"
              className={`quick-action-btn${capturing ? " is-capturing" : ""}`}
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
              <IconCamera />
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
              <IconDocument />
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
                  updateMetadata({
                    toolLogoUrl: result.logoDataUrl || result.logoUrl || "",
                  });
                });
              }}
            >
              <IconImage />
            </button>
          </div>
          {/* Action buttons — Finalize & Export */}
          <div className="flex items-center gap-ut-1 ml-ut-1 pl-ut-2 border-l border-trust-magenta-border">
            <button
              type="button"
              className={`top-action-btn top-action-btn--finalize ${readyToFinalize ? "ready" : ""} ${finalizeComplete ? "done" : ""}`}
              title="Finalize — Write conclusion and grade this review"
              aria-label={finalizeComplete ? "Review finalized" : "Finalize review"}
              onClick={() => setActiveTab("Finalize")}
            >
              <IconCheck />
              <span className="text-ut-2xs font-heading font-bold uppercase tracking-ut-label ml-0.5">
                Finalize
              </span>
            </button>
            <button
              type="button"
              className="top-action-btn top-action-btn--export"
              title="Export — Download review as .zip"
              aria-label="Export review"
              disabled={exporting}
              onClick={handleTopExport}
            >
              <IconDownload />
              <span className="text-ut-2xs font-heading font-bold uppercase tracking-ut-label ml-0.5">
                {exporting ? "..." : "Export"}
              </span>
            </button>
          </div>
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              className="quick-action-btn"
              data-tip="Shortcuts — View keyboard shortcuts"
              title="Shortcuts — View keyboard shortcuts"
              aria-label="Keyboard shortcuts"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((v) => !v)}
            >
              <IconHelp />
            </button>
            {helpOpen && (
              <div className="help-popover">
                <p className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-muted mb-ut-1">
                  Keyboard shortcuts
                </p>
                <ul className="text-ut-xs text-ut-text space-y-ut-1">
                  <li>
                    <kbd className="help-kbd">1</kbd>–<kbd className="help-kbd">4</kbd> Switch tabs
                  </li>
                  <li>
                    <kbd className="help-kbd">Ctrl+Shift+S</kbd> Quick capture
                  </li>
                  <li>
                    <kbd className="help-kbd">Esc</kbd> Close quick note
                  </li>
                  <li>
                    <kbd className="help-kbd">Shift + /</kbd>{" "}
                    <span className="text-ut-muted">(?)</span> Toggle this panel
                  </li>
                </ul>
              </div>
            )}
          </div>

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
          role="status"
          className="px-ut-4 py-ut-1 border-b border-ut-border bg-ut-offwhite flex items-center gap-ut-2 text-ut-2xs text-ut-muted"
          aria-label="Review progress"
        >
          <span className={metadataComplete ? "text-ut-green font-bold" : ""}>
            Metadata {metadataComplete ? "✓" : "○"}
          </span>
          <span className="text-ut-border">·</span>
          <span className={evaluationComplete ? "text-ut-green font-bold" : ""}>
            Evaluation{" "}
            {evaluationComplete
              ? "✓"
              : rubric
                ? `${computeCompletion(evaluations, rubric, session?.usesAi ?? true)}%`
                : "○"}
          </span>
          <span className="text-ut-border">·</span>
          <span className={finalizeComplete ? "text-ut-green font-bold" : ""}>
            Finalize {finalizeComplete ? "✓" : "○"}
          </span>
          <span className="text-ut-border">·</span>
          <span>Captures {captures.length}</span>
        </div>

        <div
          role="tabpanel"
          id={tabIds[activeTab]}
          aria-labelledby={`tab-${activeTab.toLowerCase()}`}
          className="flex-1 min-h-0 overflow-y-auto bg-ut-offwhite tab-panel-content"
          aria-live="polite"
        >
          {exportComplete ? (
            <ExportCompleteScreen
              captures={captures.length}
              scoredCount={
                evaluations.filter((e) => e.score !== "" && e.score !== undefined).length
              }
              finalization={finalization}
              filename={exportFilename}
              error={exportError}
              fileSize={exportFileSize ?? undefined}
              loading={exporting}
              onRetry={handleRetryExport}
              onDone={handleExportDone}
            />
          ) : (
            <>
              {quickNoteOpen && (
                <div className="quick-note-overlay">
                  <textarea
                    ref={noteRef}
                    rows={2}
                    placeholder="Add a note..."
                    maxLength={2000}
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
            </>
          )}
        </div>
      </div>
    </TabNavigationContext.Provider>
  );
}
