import { useState } from "react";
import { useSessionStore } from "@/stores/session";
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
  const session = useSessionStore((s) => s.session);

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
    <div className="flex flex-col h-screen">
      <div className="top-accent" />

      <header className="bg-ut-white border-b-2 border-ut-border px-ut-4 py-ut-2 flex items-center justify-between">
        <div>
          <h1 className="text-ut-md font-heading font-bold text-trust-magenta">{session?.toolName}</h1>
          <p className="text-ut-xs text-ut-muted font-mono truncate max-w-60">{session?.toolUrl}</p>
        </div>
      </header>

      <nav className="sidebar-tab-bar" role="tablist" aria-label="Review sections" onKeyDown={handleKeyDown}>
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

      <main
        role="tabpanel"
        id={tabIds[activeTab]}
        aria-labelledby={`tab-${activeTab.toLowerCase()}`}
        className="flex-1 overflow-y-auto bg-ut-offwhite"
      >
        {activeTab === "Captures" && <Captures />}
        {activeTab === "Evaluation" && <Evaluation />}
        {activeTab === "Metadata" && <Metadata />}
      </main>
    </div>
  );
}
