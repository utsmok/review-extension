import { useEffect, useState } from "react";
import { RubricContext } from "@/components/contexts";
import { RUBRIC_DATA } from "@/data/rubrics";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import type { Evaluation, SessionData } from "@/lib/types";

/** Demo session fixture. */
const DEMO_SESSION: SessionData = {
  metadata: {
    id: "demo-session",
    toolName: "Consensus",
    toolUrl: "https://consensus.app",
    startTime: new Date().toISOString(),
    rubricId: "trust-full",
    usesAi: true,
    status: "active",
  },
  captures: [],
  evaluations: [],
  finalization: null,
  quickNotes: [],
};

/**
 * Hydrates Zustand stores with demo data. Evaluation and finalization
 * state are driven via direct setState from the parent composition.
 */
export function StoreProvider({
  children,
  evaluations,
  finalization,
}: {
  children: React.ReactNode;
  evaluations: Evaluation[];
  finalization: SessionData["finalization"];
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useRegistryStore.setState({
      activeSessionId: DEMO_SESSION.metadata.id,
      settings: {
        reviewerName: "Librarian Demo",
        reviewerEmail: "demo@utwente.nl",
        preferredRubric: "trust-full",
      },
      sessionIndex: {
        [DEMO_SESSION.metadata.id]: DEMO_SESSION.metadata,
      },
    });
    useSessionStore.getState().loadSession(DEMO_SESSION);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    useSessionStore.setState({ evaluations });
  }, [ready, evaluations]);

  useEffect(() => {
    if (!ready) return;
    useSessionStore.setState({ finalization });
  }, [ready, finalization]);

  if (!ready) return null;

  return (
    <RubricContext.Provider value={{ rubric: RUBRIC_DATA, usesAi: true }}>
      {children}
    </RubricContext.Provider>
  );
}
