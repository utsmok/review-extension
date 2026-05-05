import { useActiveSession } from "@/hooks/useActiveSession";
import { useRovingTabIndex } from "@/lib/hooks";
import { TabNavigationContext } from "@/lib/tab-navigation-context";
import Captures from "./Captures";
import Evaluation from "./Evaluation";
import Metadata from "./Metadata";
import FinalizationScreen from "./FinalizationScreen";

const tabs = ["Captures", "Evaluation", "Metadata", "Finalize"] as const;

const tabIds: Record<(typeof tabs)[number], string> = {
  Captures: "panel-captures",
  Evaluation: "panel-evaluation",
  Metadata: "panel-metadata",
  Finalize: "panel-finalize",
};

export default function ActiveSession() {
  const { activeTab, setActiveTab, handleKeyDown } = useRovingTabIndex(tabs, "Captures");
  const { session, closeSession } = useActiveSession();

  return (
    <TabNavigationContext.Provider value={setActiveTab}>
      <header className="bg-trust-magenta-tint border-b-2 border-trust-magenta-border px-ut-4 py-ut-3 flex items-center justify-between">
        <div className="flex items-center gap-ut-2 min-w-0">
          <button
            type="button"
            className="shrink-0 p-1 rounded-ut-sm text-ut-slate hover:text-trust-magenta hover:bg-white/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
            onClick={closeSession}
            title="Close session and return to start"
            aria-label="Close session"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            style={{ display: session?.faviconUrl ? "none" : "flex" }}
            aria-hidden="true"
          >
            {session?.toolName?.charAt(0)?.toUpperCase() ?? "?"}
          </span>

          <div className="min-w-0">
            <h1 className="text-ut-body font-heading font-bold text-trust-magenta truncate">
              {session?.toolName}
            </h1>
            {session?.toolUrl && (
              <a
                href={session.toolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ut-xs text-ut-muted font-mono truncate block max-w-60 hover:text-ut-darkblue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue transition-colors"
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
        {tabs.map((tab) => (
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
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={tabIds[activeTab]}
        aria-labelledby={`tab-${activeTab.toLowerCase()}`}
        className="flex-1 overflow-y-auto bg-ut-offwhite"
      >
        {activeTab === "Captures" && <Captures />}
        {activeTab === "Evaluation" && <Evaluation />}
        {activeTab === "Metadata" && <Metadata />}
        {activeTab === "Finalize" && <FinalizationScreen />}
      </div>
    </TabNavigationContext.Provider>
  );
}
