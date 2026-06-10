import { RubricContext } from "@/components/contexts";
import { RUBRIC_DATA } from "@/data/rubrics";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import type { Evaluation, SessionData } from "@/lib/types";

/** Demo session fixture with pre-filled metadata. */
const DEMO_SESSION: SessionData = {
  metadata: {
    id: "demo-session",
    toolName: "Consensus",
    toolUrl: "https://consensus.app",
    startTime: new Date().toISOString(),
    rubricId: "trust-full",
    usesAi: true,
    status: "active",
    description: "AI-powered research assistant",
    company: "Consensus Inc.",
    dataSources: ["Academic papers (Semantic Scholar)"],
  },
  captures: [],
  evaluations: [],
  finalization: null,
  quickNotes: [],
};

/**
 * Initialize Zustand stores synchronously at module load time.
 * This runs once when the Webpack bundle is loaded by Remotion.
 */
function initStores() {
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
}

// Run once at module load
initStores();

/**
 * Provides RubricContext and syncs evaluations/finalization to the store
 * SYNCHRONOUSLY during render (before children render).
 *
 * Store initialization happens at module level (above), so no useEffect needed.
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
  // Sync frame-driven state to the store before children render.
  // setState is synchronous, so children will see the updated state.
  useSessionStore.setState({ evaluations, finalization });

  return (
    <RubricContext.Provider value={{ rubric: RUBRIC_DATA, usesAi: true }}>
      {children}
    </RubricContext.Provider>
  );
}
