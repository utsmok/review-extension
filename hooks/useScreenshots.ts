import { useEffect, useRef, useState } from "react";
import { loadAllScreenshots, type ScreenshotBlob } from "@/lib/screenshot-store";

/**
 * Load multiple screenshots from IDB at once. Returns a Map keyed by capture ID.
 * Re-fetches when the list of IDs changes.
 */
export function useScreenshots(ids: string[]): Map<string, ScreenshotBlob> | null {
  const [map, setMap] = useState<Map<string, ScreenshotBlob> | null>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const key = ids.join(",");

  /* biome-ignore lint/correctness/useExhaustiveDependencies: key is a stable serialization of ids; ref gives access to the latest values */
  useEffect(() => {
    const currentIds = idsRef.current;
    if (currentIds.length === 0) {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    loadAllScreenshots(currentIds).then((result) => {
      if (!cancelled) setMap(result);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return map;
}
