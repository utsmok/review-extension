import { useSessionStore } from "@/stores/session";
import { getRubricById } from "@/data/rubrics";
import { RubricContext } from "@/lib/rubric-context";
import ActiveSession from "./ActiveSession";
import SessionInit from "./SessionInit";

export default function App() {
  const session = useSessionStore((s) => s.session);

  if (!session) return <SessionInit />;

  const variant = getRubricById(session.rubricId);
  return (
    <RubricContext.Provider value={{ rubric: variant.data, usesAi: session.usesAi ?? true }}>
      <ActiveSession />
    </RubricContext.Provider>
  );
}
