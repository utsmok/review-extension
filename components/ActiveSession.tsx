import { useMemo } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useRovingTabIndex } from "@/lib/hooks";
import { computeCompletion } from "@/lib/rubric";
import { useRubric } from "@/lib/contexts";
import { TabNavigationContext } from "@/lib/contexts";
import Captures from "./Captures";
import Evaluation from "./Evaluation";
import FinalizationScreen from "./FinalizationScreen";
import Metadata from "./Metadata";

const tabs = ["Captures", "Evaluation", "Metadata", "Finalize"] as const;

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
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block ml-1 text-ut-green align-middle"
      aria-hidden="true"
    >
      <path d="M2.5 6.5l2.5 2.5 5-5" />
    </svg>
  );
}

export default function ActiveSession() {
  const { activeTab, setActiveTab, handleKeyDown } = useRovingTabIndex(tabs, "Captures");
  const { session, closeSession, evaluations, finalization } = useActiveSession();
  const { rubric } = useRubric();

  // Compute tab completion states
  const metadataComplete = useMemo(
    () => !!(session?.toolName?.trim() && session?.toolUrl?.trim()),
    [session?.toolName, session?.toolUrl],
  );

  const evaluationComplete = useMemo(() => {
    if (!rubric) return false;
    return computeCompletion(evaluations, rubric) === 100;
  }, [evaluations, rubric]);

  const finalizeComplete = useMemo(() => !!finalization, [finalization]);

  const faviconDisplayStyle = useMemo(
    () => ({ display: session?.faviconUrl ? "none" : "flex" }),
    [session?.faviconUrl],
  );

  return (
    <TabNavigationContext.Provider value={setActiveTab}>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="bg-trust-magenta-tint border-b-2 border-trust-magenta-border border-l-[3px] border-l-trust-magenta px-ut-4 py-ut-3 flex items-center justify-between">
          <div className="flex items-center gap-ut-2 min-w-0">
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
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <title>Close</title>
                <polyline points="12,14 7,9 12,4" />
              </svg>
            </button>

            {session?.faviconUrl ? (
              <img
                src={session.faviconUrl}
                alt=""
                className="w-5 h-5 shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const next = target.nextElementSibling;
                  if (next) (next as HTMLElement).style.display = "flex";
                }}
              />
            ) : null}
            <span
              className="w-5 h-5 shrink-0 rounded-full bg-trust-magenta text-white text-ut-xs font-bold items-center justify-center leading-none"
              style={faviconDisplayStyle}
              aria-hidden="true"
            >
              {session?.toolName?.charAt(0)?.toUpperCase() ?? "?"}
            </span>

            <div className="min-w-0">
              <h1 className="text-ut-body font-heading font-semibold text-trust-magenta truncate">
                {session?.toolName}
              </h1>
              {session?.toolUrl && (
                <a
                  href={session.toolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ut-xs text-ut-muted font-mono overflow-hidden text-ellipsis whitespace-nowrap block hover:text-ut-darkblue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue transition-colors"
                >
                  {session.toolUrl}
                </a>
              )}
            </div>
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
          className="flex-1 min-h-0 overflow-y-auto bg-ut-offwhite"
        >
          {activeTab === "Captures" && <Captures />}
          {activeTab === "Evaluation" && <Evaluation />}
          {activeTab === "Metadata" && <Metadata />}
          {activeTab === "Finalize" && <FinalizationScreen />}
        </div>
      </div>
    </TabNavigationContext.Provider>
  );
}
