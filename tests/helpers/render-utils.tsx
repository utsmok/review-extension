import { useRef } from "react";
import { render } from "@testing-library/react";
import { RubricContext } from "@/lib/contexts";
import type { Capture, Evaluation, ReviewFinalization } from "@/lib/types";
import { RUBRIC, makeMetadata } from "@/tests/fixtures";
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";

export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <RubricContext.Provider value={{ rubric: RUBRIC, usesAi: false }}>
      {children}
    </RubricContext.Provider>
  );
}

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: AllProviders });
}

export function withRenderCount<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
) {
  let renderCount = 0;
  const Tracked = (props: P) => {
    renderCount++;
    return <Component {...props} />;
  };
  return {
    Tracked,
    getCount: () => renderCount,
    resetCount: () => {
      renderCount = 0;
    },
  };
}

export function useRenderCount() {
  const count = useRef(0);
  count.current++;
  return count.current;
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
