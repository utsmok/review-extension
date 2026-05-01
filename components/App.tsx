import { useSessionStore } from "@/stores/session";
import ActiveSession from "./ActiveSession";
import SessionInit from "./SessionInit";

export default function App() {
  const session = useSessionStore((s) => s.session);

  if (!session) return <SessionInit />;
  return <ActiveSession />;
}
