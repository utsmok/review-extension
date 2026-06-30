import { useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useSidepanelZoom } from "@/hooks/useSidepanelZoom";
import { useActiveRubric } from "@/lib/rubric-schema";
import { ActiveSession } from "./ActiveSession";
import AppShell from "./AppShell";
import { EditModeProvider } from "./edit-mode/EditModeContext";
import SessionManager from "./SessionManager";
import SettingsScreen from "./SettingsScreen";

export default function App() {
  return (
    <EditModeProvider>
      <AppInner />
    </EditModeProvider>
  );
}

function AppInner() {
  const [showSettings, setShowSettings] = useState(false);
  useSidepanelZoom();
  const rubric = useActiveRubric();

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
      <AppShell showSettingsButton showEditModeToggle onSettingsClick={() => setShowSettings(true)}>
        <RubricContext.Provider value={{ rubric, usesAi: session.usesAi ?? true }}>
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
