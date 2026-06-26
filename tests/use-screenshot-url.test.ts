// @vitest-environment jsdom

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";
import * as screenshotStore from "@/lib/screenshot-store";
import { useSessionStore } from "@/stores/session";
import { makeCapture, makeMetadata } from "@/tests/fixtures";

vi.mock("@/lib/screenshot-store", () => ({
  loadScreenshot: vi.fn(),
}));

describe("useScreenshotUrl", () => {
  beforeEach(() => {
    vi.mocked(screenshotStore.loadScreenshot).mockResolvedValue(null);
    useSessionStore.getState().loadSession({
      metadata: makeMetadata(),
      captures: [],
      evaluations: [],
      finalization: null,
      schemaVersion: 2,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for null captureId", async () => {
    const { result } = renderHook(() => useScreenshotUrl(null));
    expect(result.current).toBeNull();
  });

  it("resolves screenshotBase64 when no annotation exists", async () => {
    const captureId = "cap-1";
    vi.mocked(screenshotStore.loadScreenshot).mockResolvedValue({
      id: captureId,
      screenshotBase64: "data:image/png;base64,abc",
    });

    const { result } = renderHook(() => useScreenshotUrl(captureId));
    await waitFor(() => expect(result.current).toBe("data:image/png;base64,abc"));
  });

  it("prefers annotatedScreenshotBase64 over screenshotBase64", async () => {
    vi.mocked(screenshotStore.loadScreenshot).mockResolvedValue({
      id: "cap-2",
      screenshotBase64: "data:image/png;base64,original",
      annotatedScreenshotBase64: "data:image/png;base64,annotated",
    });

    const { result } = renderHook(() => useScreenshotUrl("cap-2"));
    await waitFor(() => expect(result.current).toBe("data:image/png;base64,annotated"));
  });

  it("returns null when screenshot not found in IDB", async () => {
    vi.mocked(screenshotStore.loadScreenshot).mockResolvedValue(null);

    const { result } = renderHook(() => useScreenshotUrl("missing"));
    await waitFor(() => expect(result.current).toBeNull());
  });
  it("re-fetches when annotatedScreenshotBase64 changes in store", async () => {
    const capture = makeCapture({ id: "cap-rev" });
    useSessionStore.getState().loadSession({
      metadata: makeMetadata(),
      captures: [capture],
      evaluations: [],
      finalization: null,
      schemaVersion: 2,
    });

    const callCount = vi.mocked(screenshotStore.loadScreenshot).mock.calls.length;
    renderHook(() => useScreenshotUrl("cap-rev"));

    // First call happened for initial load
    await waitFor(() =>
      expect(vi.mocked(screenshotStore.loadScreenshot).mock.calls.length).toBeGreaterThan(
        callCount,
      ),
    );

    // Mutate the capture's annotation in the store
    const updated = makeCapture({
      id: "cap-rev",
      annotatedScreenshotBase64: "data:image/png;base64,updated",
    });
    useSessionStore.setState((s) => ({
      captures: s.captures.map((c) => (c.id === "cap-rev" ? { ...c, ...updated } : c)),
    }));

    await waitFor(() =>
      expect(vi.mocked(screenshotStore.loadScreenshot).mock.calls.length).toBeGreaterThan(
        callCount + 1,
      ),
    );
  });
});
