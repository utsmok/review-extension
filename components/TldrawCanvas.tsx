/**
 * Thin lazy wrapper around the tldraw annotation canvas.
 * `import type` is erased at compile time, so the tldraw library is still
 * loaded on demand via the dynamic import below — zero bundle cost.
 */

import { Component, type ErrorInfo, lazy, type ReactNode, Suspense } from "react";
import type { Editor } from "./TldrawAnnotation";

const LazyAnnotation = lazy(() => import("./TldrawAnnotation"));

interface Props {
  onMount: (editor: Editor) => void;
}

interface ErrorState {
  hasError: boolean;
}

/**
 * Catches tldraw load failures (network, CSP, missing chunk) and shows
 * a fallback message instead of crashing the entire evidence modal.
 */
class TldrawErrorBoundary extends Component<{ children: ReactNode }, ErrorState> {
  state: ErrorState = { hasError: false };

  static getDerivedStateFromError(): ErrorState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      "TRUST Review — failed to load tldraw annotation editor:",
      error,
      info.componentStack,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="tldraw-loading">
          <p className="text-ut-sm text-ut-muted">
            Annotation editor could not be loaded. You can still view the screenshot.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function TldrawCanvas({ onMount }: Props) {
  return (
    <TldrawErrorBoundary>
      <Suspense
        fallback={
          <div className="tldraw-loading">
            <span className="tldraw-spinner" aria-hidden="true" /> Loading annotation editor…
          </div>
        }
      >
        <LazyAnnotation onMount={onMount} />
      </Suspense>
    </TldrawErrorBoundary>
  );
}
