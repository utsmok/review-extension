import { useSessionStore } from '@/stores/session';
import SessionInit from './SessionInit';
import ActiveSession from './ActiveSession';

export default function App() {
  const session = useSessionStore((s) => s.session);

  if (!session) return <SessionInit />;
  return <ActiveSession />;
}
