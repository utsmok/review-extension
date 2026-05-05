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
    expect(screen.getByText("test explosion")).toBeDefined();
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
    expect(screen.getByText("first error")).toBeDefined();
    unmount1();

    // Second render: throw with a different message
    const { unmount: unmount2 } = render(
      <ErrorBoundary>
        <ThrowOnRender error={new Error("second error")} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("second error")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });
});
