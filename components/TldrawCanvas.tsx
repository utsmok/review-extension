/**
 * Thin lazy wrapper around the tldraw annotation canvas.
 * This file has ZERO static imports from "tldraw" or "./TldrawAnnotation" —
 * the entire tldraw library is loaded on demand when the user opens the
 * annotation editor. EvidenceModal must lazy-import from "./TldrawAnnotation"
 * directly for the symbols it needs.
 */
import { lazy, Suspense } from "react";

const LazyAnnotation = lazy(() => import("./TldrawAnnotation"));

export default function TldrawCanvas({
  onMount,
}: {
  onMount: (editor: import("./TldrawAnnotation").Editor) => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="tldraw-loading">
          <span className="tldraw-spinner" aria-hidden="true" /> Loading annotation editor…
        </div>
      }
    >
      <LazyAnnotation onMount={onMount} />
    </Suspense>
  );
}
