import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";
import type { Capture } from "@/lib/types";

function ThumbnailImg({ capture }: { capture: Capture }) {
  const screenshotUrl = useScreenshotUrl(capture.id);
  const src = screenshotUrl ?? capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;
  return <img src={src} alt={capture.pageTitle ? `Evidence: ${capture.pageTitle}` : "Evidence capture"} loading="lazy" />;
}

interface EvidenceThumbnailsProps {
  captures: Capture[];
  rubricId: string;
  onConfirmRemove: (capture: Capture, rubricId: string) => void;
  onViewEvidence: (capture: Capture) => void;
}

export default function EvidenceThumbnails({
  captures,
  rubricId,
  onConfirmRemove,
  onViewEvidence,
}: EvidenceThumbnailsProps) {
  if (captures.length === 0) return null;
  return (
    <div className="mb-ut-3">
      <p className="text-ut-xs font-heading font-bold text-ut-slate uppercase tracking-ut-kicker mb-ut-1">
        Evidence ({captures.length})
      </p>
      <div className="flex gap-ut-1 overflow-x-auto">
        {captures.map((c) => (
          <div key={c.id} className="evidence-thumb-wrap">
            <ThumbnailImg capture={c} />
            <div className="evidence-thumb-overlay">
              <button
                type="button"
                className="btn-remove"
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmRemove(c, rubricId);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <title>Remove</title>
                  <line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              <button
                type="button"
                className="btn-view"
                title="View & annotate"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewEvidence(c);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <title>View evidence</title>
                  <path
                    d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
