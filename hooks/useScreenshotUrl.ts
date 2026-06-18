import { useEffect, useState } from "react";
import { loadScreenshot } from "@/lib/screenshot-store";
import { useSessionStore } from "@/stores/session";

/**
 * Load a capture's screenshot base64 from the separate IDB screenshot store.
 * Returns null while loading. Falls back to null if the screenshot is not found.
 */
export function useScreenshotUrl(captureId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  // Re-fetch from the screenshot store whenever this capture's annotation is
  // saved (annotatedScreenshotBase64 changes), so grid/modal previews update
  // live instead of only after a remount/tab-switch.
  const annotationRevision = useSessionStore(
    (s) => s.captures.find((c) => c.id === captureId)?.annotatedScreenshotBase64 ?? null,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: annotationRevision is an intentional reactive trigger — its value is not read in the body, but it must re-run the fetch when the capture's annotation is saved.
  useEffect(() => {
    if (!captureId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    loadScreenshot(captureId).then((blob) => {
      if (cancelled) return;
      if (blob) {
        setUrl(blob.annotatedScreenshotBase64 ?? blob.screenshotBase64);
      } else {
        setUrl(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [captureId, annotationRevision]);

  return url;
}
