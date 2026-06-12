import { useState } from "react";

import { RubricContext } from "@/components/contexts";
import { RUBRIC_DATA } from "@/data/rubrics";
import { useActiveSession } from "@/hooks/useActiveSession";
import { ActiveSession } from "@/components/ActiveSession";
import SessionManager from "@/components/SessionManager";
import SettingsScreen from "@/components/SettingsScreen";
import WebAppShell from "./components/WebAppShell";

export default function WebApp() {
  const [showSettings, setShowSettings] = useState(false);
  const { status, session } = useActiveSession();

  if (status === "loading") {
    return (
      <WebAppShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-ut-md text-ut-muted">Loading review...</p>
        </div>
      </WebAppShell>
    );
  }

  if (showSettings) {
    return (
      <WebAppShell>
        <SettingsScreen onBack={() => setShowSettings(false)} />
      </WebAppShell>
    );
  }

  if (status === "active" && session) {
    return (
      <WebAppShell showSettingsButton onSettingsClick={() => setShowSettings(true)}>
        <RubricContext.Provider value={{ rubric: RUBRIC_DATA, usesAi: session.usesAi ?? true }}>
          <ActiveSession />
        </RubricContext.Provider>
      </WebAppShell>
    );
  }

  return (
    <WebAppShell showSettingsButton onSettingsClick={() => setShowSettings(true)}>
      <SessionManager />
    </WebAppShell>
  );
}
