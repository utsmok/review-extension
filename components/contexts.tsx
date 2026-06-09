import { createContext, useContext } from "react";
import type { RubricData } from "@/lib/types";

/** Provides the active rubric data and whether the tool uses AI. */
export const RubricContext = createContext<{
  rubric: RubricData;
  usesAi: boolean;
}>({
  rubric: null as unknown as RubricData,
  usesAi: true,
});

/** Access the current rubric and AI flag from context. */
export function useRubric() {
  return useContext(RubricContext);
}

export type TabId = "Captures" | "Evaluation" | "Metadata" | "Finalize";

/** Callback to programmatically switch the active sidepanel tab. */
export const TabNavigationContext = createContext<(tab: TabId) => void>(() => {});

/** Access the tab navigation callback from context. */
export function useTabNavigation(): (tab: TabId) => void {
  return useContext(TabNavigationContext);
}
