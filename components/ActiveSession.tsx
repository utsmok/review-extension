import { useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import Captures from "./Captures";
import Evaluation from "./Evaluation";
import Metadata from "./Metadata";

const tabs = ["Captures", "Evaluation", "Metadata"] as const;
type Tab = (typeof tabs)[number];

const tabIds: Record<Tab, string> = {
  Captures: "panel-captures",
  Evaluation: "panel-evaluation",
  Metadata: "panel-metadata",
};

export default function ActiveSession() {
  const [activeTab, setActiveTab] = useState<Tab>("Captures");
  const { session, closeSession } = useActiveSession();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = tabs.indexOf(activeTab);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setActiveTab(tabs[(idx + 1) % tabs.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(tabs[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab(tabs[tabs.length - 1]);
    }
  };

  return (
    <>
      <header className="bg-ut-white border-b-2 border-ut-border px-ut-4 py-ut-2 flex items-center justify-between">
        <div className="flex items-center gap-ut-2 min-w-0">
          <button
            type="button"
            className="shrink-0 p-1 rounded-ut-sm text-ut-slate hover:text-trust-magenta hover:bg-trust-magenta-tint transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
            onClick={closeSession}
            title="Close session and return to start"
            aria-label="Close session"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12,14 7,9 12,4" />
            </svg>
          </button>

          {session?.faviconUrl ? (
            <img
              src={session.faviconUrl}
              alt=""
              className="w-4 h-4 shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const next = target.nextElementSibling;
                if (next) (next as HTMLElement).style.display = "flex";
              }}
            />
          ) : null}
          <span
            className="w-4 h-4 shrink-0 rounded-full bg-trust-magenta text-white text-ut-xs font-bold items-center justify-center leading-none"
            style={{ display: session?.faviconUrl ? "none" : "flex" }}
            aria-hidden="true"
          >
            {session?.toolName?.charAt(0)?.toUpperCase() ?? "?"}
          </span>

          <div className="min-w-0">
            <h1 className="text-ut-md font-heading font-bold text-trust-magenta truncate">
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

      <nav
        className="sidebar-tab-bar"
        role="tablist"
        aria-label="Review sections"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
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
      </nav>

      <div
        role="tabpanel"
        id={tabIds[activeTab]}
        aria-labelledby={`tab-${activeTab.toLowerCase()}`}
        className="flex-1 overflow-y-auto bg-ut-offwhite"
      >
        {activeTab === "Captures" && <Captures />}
        {activeTab === "Evaluation" && <Evaluation />}
        {activeTab === "Metadata" && <Metadata />}
      </div>
    </>
  );
}
