import { useEffect, useState } from "react";
import { ActiveSession } from "@/components/ActiveSession";
import { RubricContext } from "@/components/contexts";
import SessionManager from "@/components/SessionManager";
import SettingsScreen from "@/components/SettingsScreen";
import { RUBRIC_DATA } from "@/data/rubrics";
import { useActiveSession } from "@/hooks/useActiveSession";
import WebAppShell from "./components/WebAppShell";
import { seedExampleSession, shouldSeedExample } from "./seed-example";

export default function WebApp() {
  const [showSettings, setShowSettings] = useState(false);
  const { status, session } = useActiveSession();
  const [seeding, setSeeding] = useState(() => shouldSeedExample());

  // First visit: preload the Ai2 Asta example review so the demo isn't empty.
  useEffect(() => {
    if (!seeding) return;
    let cancelled = false;
    seedExampleSession().finally(() => {
      if (!cancelled) setSeeding(false);
    });
    return () => {
      cancelled = true;
    };
  }, [seeding]);

  if (seeding || status === "loading") {
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
