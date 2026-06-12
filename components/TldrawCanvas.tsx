/**
 * Thin lazy wrapper around the tldraw annotation canvas.
 * `import type` is erased at compile time, so the tldraw library is still
 * loaded on demand via the dynamic import below — zero bundle cost.
 */
import type { Editor } from "./TldrawAnnotation";
import { lazy, Suspense } from "react";

const LazyAnnotation = lazy(() => import("./TldrawAnnotation"));

export default function TldrawCanvas({ onMount }: { onMount: (editor: Editor) => void }) {
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
