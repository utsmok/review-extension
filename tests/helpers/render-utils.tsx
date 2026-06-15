import { RubricContext } from "@/components/contexts";
import type { Capture, Evaluation, ReviewFinalization } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeMetadata, RUBRIC } from "@/tests/fixtures";

export function AllProviders({
  children,
  usesAi = true,
}: {
  children: React.ReactNode;
  usesAi?: boolean;
}) {
  return (
    <RubricContext.Provider value={{ rubric: RUBRIC, usesAi }}>{children}</RubricContext.Provider>
  );
}

export function seedActiveSession(overrides?: {
  evaluations?: Evaluation[];
  captures?: Capture[];
  finalization?: ReviewFinalization | null;
}) {
  const metadata = makeMetadata();
  const sessionData = {
    metadata,
    captures: overrides?.captures ?? [],
    evaluations: overrides?.evaluations ?? [],
    finalization: overrides?.finalization ?? null,
    schemaVersion: 2,
  };
  useSessionStore.getState().loadSession(sessionData);
  useRegistryStore.getState().setActiveSessionId(metadata.id);
}
