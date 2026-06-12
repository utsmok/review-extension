/**
 * Web trial replacement for TldrawCanvas.
 * tldraw v5 requires a production license key — the trial doesn't have one.
 * Shows a clear disabled message. Does NOT call onMount, so the EvidenceModal's
 * editor state stays null and the ActionBar / annotation logic is skipped.
 */
export default function TldrawCanvas() {
  return (
    <div className="flex items-center justify-center h-full bg-ut-grey p-ut-4">
      <div className="text-center max-w-sm">
        <div className="text-3xl mb-3">✏️</div>
        <h3 className="text-ut-sm font-bold text-ut-navy mb-2">Annotation unavailable</h3>
        <p className="text-ut-xs text-ut-muted leading-relaxed">
          The annotation editor requires the browser extension. Install the{" "}
          <a
            href="https://chromewebstore.google.com/detail/trust-review/leclhemhkfmogioabkfcboddalmlncjg"
            className="underline text-trust-magenta font-semibold"
          >
            TRUST Review extension
          </a>{" "}
          to annotate screenshots and draw evidence highlights.
        </p>
      </div>
    </div>
  );
}
