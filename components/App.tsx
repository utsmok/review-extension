import { useState } from "react";
import { RUBRIC_DATA } from "@/data/rubrics";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useSidepanelZoom } from "@/hooks/useSidepanelZoom";
import { RubricContext } from "@/lib/contexts";
import ActiveSession from "./ActiveSession";
import AppShell from "./AppShell";
import SessionManager from "./SessionManager";
import SettingsScreen from "./SettingsScreen";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  useSidepanelZoom();

  const { status, session } = useActiveSession();

  if (status === "loading") {
    return (
      <AppShell>
        <div className="flex items-center justify-center flex-1 h-full">
          <p className="text-ut-md text-ut-muted">Loading review...</p>
        </div>
      </AppShell>
    );
  }

  if (showSettings) {
    return (
      <AppShell>
        <SettingsScreen onBack={() => setShowSettings(false)} />
      </AppShell>
    );
  }

  if (status === "active" && session) {
    return (
      <AppShell showSettingsButton onSettingsClick={() => setShowSettings(true)}>
        <RubricContext.Provider value={{ rubric: RUBRIC_DATA, usesAi: session.usesAi ?? true }}>
          <ActiveSession />
        </RubricContext.Provider>
      </AppShell>
    );
  }

  return (
    <AppShell showSettingsButton onSettingsClick={() => setShowSettings(true)}>
      <SessionManager />
    </AppShell>
  );
}
