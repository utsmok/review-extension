import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";
import type { Capture } from "@/lib/types";

export default function CaptureImg({
  capture,
  className,
}: {
  capture: Capture;
  className?: string;
}) {
  const screenshotUrl = useScreenshotUrl(capture.id);
  const src = screenshotUrl ?? capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;
  return (
    <img
      src={src}
      alt={`Screenshot of ${capture.pageTitle || capture.sourceUrl}`}
      className={className}
      loading="lazy"
    />
  );
}
