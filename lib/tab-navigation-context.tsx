import { createContext, useContext } from "react";

export type TabId = "Captures" | "Evaluation" | "Metadata" | "Finalize";

export const TabNavigationContext = createContext<(tab: TabId) => void>(() => {});

export function useTabNavigation(): (tab: TabId) => void {
  return useContext(TabNavigationContext);
}
