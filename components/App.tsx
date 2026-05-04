import { useEffect, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { RUBRIC_VARIANTS, getRubricById } from "@/data/rubrics";
import { RubricContext } from "@/lib/rubric-context";
import { migrateLegacySession } from "@/lib/migration";
import AppShell from "./AppShell";
import ActiveSession from "./ActiveSession";
import SessionManager from "./SessionManager";
import SettingsScreen from "./SettingsScreen";

export default function App() {
  const [migrationReady, setMigrationReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    migrateLegacySession()
      .catch((err) => console.error("Legacy migration failed:", err))
      .finally(() => setMigrationReady(true));
  }, []);

  const { status, session } = useActiveSession(migrationReady);

  if (!migrationReady || status === "loading") {
    return (
      <AppShell>
        <div className="flex items-center justify-center flex-1 h-full">
          <p className="text-ut-md text-ut-muted">Loading session...</p>
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
    const variant = getRubricById(session.rubricId ?? RUBRIC_VARIANTS[0].id);
    if (!variant?.data) {
      return (
        <AppShell showSettingsButton onSettingsClick={() => setShowSettings(true)}>
          <SessionManager />
        </AppShell>
      );
    }
    return (
      <AppShell showSettingsButton onSettingsClick={() => setShowSettings(true)}>
        <RubricContext.Provider value={{ rubric: variant.data, usesAi: session.usesAi ?? true }}>
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
