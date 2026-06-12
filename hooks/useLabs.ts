import type { LabsSettings } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";

/** Read the current Labs settings from the registry store. */
export function useLabs(): LabsSettings {
  return useRegistryStore((s) => s.settings.labs ?? {});
}
