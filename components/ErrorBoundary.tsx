import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary for the sidepanel. Catches render errors and shows
 * a reload button instead of a blank white panel.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidMount(): void {
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      // Log but don't preventDefault — preserve console error for debugging.
      // Only surface non-network async errors in the error boundary UI.
      const reason = event.reason;
      const isNetworkLike =
        reason?.name === "NetworkError" ||
        reason?.message?.includes("IDB") ||
        reason?.message?.includes("IndexedDB");
      if (!isNetworkLike) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.setState({ hasError: true, error });
      }
      console.error("TRUST Review Extension — unhandled promise rejection:", reason);
    };
    window.addEventListener("unhandledrejection", this.unhandledRejectionHandler);
  }

  componentWillUnmount(): void {
    if (this.unhandledRejectionHandler) {
      window.removeEventListener("unhandledrejection", this.unhandledRejectionHandler);
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("TRUST Review Extension — unhandled render error:", error, info.componentStack);
  }

  private handleReload = () => {
    // Use browser.runtime.reload() for extension context (works in side panel)
    try {
      browser.runtime.reload();
    } catch {
      window.location.reload();
    }
  };

  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-ut-4 text-center">
          <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta mb-ut-2">
            Unexpected Error
          </h2>
          <p className="text-ut-sm text-ut-muted mb-ut-4">
            An error occurred while loading the review. Reload to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-2 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong transition-colors"
          >
            Reload Extension
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
