import { useEffect, useState } from "react";
import { loadScreenshot } from "@/lib/screenshot-store";

/**
 * Load a capture's screenshot base64 from the separate IDB screenshot store.
 * Returns null while loading. Falls back to null if the screenshot is not found.
 */
export function useScreenshotUrl(captureId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

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
  }, [captureId]);

  return url;
}
