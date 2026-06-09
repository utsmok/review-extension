import { render } from "@testing-library/react";
import { useRef } from "react";
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

export function renderWithProviders(ui: React.ReactElement, options?: { usesAi?: boolean }) {
  const { usesAi } = options ?? {};
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders usesAi={usesAi}>{children}</AllProviders>
  );
  return render(ui, { wrapper: Wrapper });
}

export function renderWithoutAi(ui: React.ReactElement) {
  return renderWithProviders(ui, { usesAi: false });
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
