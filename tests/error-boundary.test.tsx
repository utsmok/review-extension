/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";

/** Child that always throws during render. */
function ThrowOnRender({ error }: { error: Error }): React.ReactElement {
  throw error;
}

/** Child that renders normally. */
function GoodChild() {
  return <div data-testid="good-child">I am fine</div>;
}

// Silence console.error from React's error boundary logging in tests
const originalConsoleError = console.error;

afterEach(() => {
  cleanup();
  console.error = originalConsoleError;
});

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    console.error = vi.fn();
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("good-child")).toBeDefined();
    expect(screen.getByText("I am fine")).toBeDefined();
  });

  it("catches a render error and shows the fallback UI", () => {
    console.error = vi.fn();
    const testError = new Error("test explosion");
    render(
      <ErrorBoundary>
        <ThrowOnRender error={testError} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeDefined();
    // Generic message is shown in the DOM
    expect(screen.getByText("Something went wrong. Please try refreshing the page.")).toBeDefined();
    // The raw error message should NOT be in the DOM (only logged to console)
    expect(screen.queryByText("test explosion")).toBeNull();
    // No GoodChild was rendered in this tree
    expect(screen.queryByTestId("good-child")).toBeNull();
  });

  it("shows a Reload button in the fallback UI", () => {
    console.error = vi.fn();
    render(
      <ErrorBoundary>
        <ThrowOnRender error={new Error("boom")} />
      </ErrorBoundary>,
    );

    const reloadBtn = screen.getByText("Reload Extension");
    expect(reloadBtn).toBeDefined();
    expect(reloadBtn.tagName).toBe("BUTTON");
  });

  it("stays functional after catching multiple errors", () => {
    console.error = vi.fn();

    // First render: throw with one message
    const { unmount: unmount1 } = render(
      <ErrorBoundary>
        <ThrowOnRender error={new Error("first error")} />
      </ErrorBoundary>,
    );
    // Generic message shown, raw error NOT in DOM
    expect(screen.getByText("Something went wrong. Please try refreshing the page.")).toBeDefined();
    expect(screen.queryByText("first error")).toBeNull();
    unmount1();

    // Second render: throw with a different message
    const { unmount: _unmount2 } = render(
      <ErrorBoundary>
        <ThrowOnRender error={new Error("second error")} />
      </ErrorBoundary>,
    );
    // Generic message shown for second error too
    expect(screen.getByText("Something went wrong. Please try refreshing the page.")).toBeDefined();
    expect(screen.queryByText("second error")).toBeNull();
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });
});
