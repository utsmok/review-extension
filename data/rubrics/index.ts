import type { RubricData } from "@/lib/types";
import trustFull from "./trust-full.json";
import trustLite from "./trust-lite.json";

export interface RubricVariant {
  id: string;
  label: string;
  description: string;
  data: RubricData;
}

export const RUBRIC_VARIANTS: RubricVariant[] = [
  {
    id: "trust-full",
    label: "TRUST Framework",
    description: "Full evaluation with expert-level criteria for experienced reviewers.",
    data: trustFull as unknown as RubricData,
  },
  {
    id: "trust-lite",
    label: "TRUST Lite",
    description: "Simplified criteria with plain language — for quick or first-time reviews.",
    data: trustLite as unknown as RubricData,
  },
];

export function getRubricById(id?: string): RubricVariant {
  const variant = RUBRIC_VARIANTS.find((v) => v.id === id);
  return variant ?? RUBRIC_VARIANTS[0];
}
