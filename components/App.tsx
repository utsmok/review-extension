import { useEffect, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { getRubricById } from "@/data/rubrics";
import { RubricContext } from "@/lib/rubric-context";
import { migrateLegacySession } from "@/lib/session-storage";
import ActiveSession from "./ActiveSession";
import SessionInit from "./SessionInit";

export default function App() {
  const [migrationReady, setMigrationReady] = useState(false);

  useEffect(() => {
    migrateLegacySession()
      .catch((err) => console.error("Legacy migration failed:", err))
      .finally(() => setMigrationReady(true));
  }, []);

  const { session } = useActiveSession(migrationReady);

  if (!session) return <SessionInit />;

  const variant = getRubricById(session.rubricId);
  return (
    <RubricContext.Provider value={{ rubric: variant.data, usesAi: session.usesAi ?? true }}>
      <ActiveSession />
    </RubricContext.Provider>
  );
}
