import { createContext, useContext } from "react";
import type { RubricData } from "./types";

export const RubricContext = createContext<{
  rubric: RubricData;
  usesAi: boolean;
}>({
  rubric: null as unknown as RubricData,
  usesAi: true,
});

export function useRubric() {
  return useContext(RubricContext);
}
