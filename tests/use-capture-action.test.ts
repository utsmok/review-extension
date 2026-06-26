// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCaptureAction } from "@/hooks/useCaptureAction";
import { useToastStore } from "@/stores/toast";

describe("useCaptureAction", () => {
  beforeEach(() => {
    for (const t of [...useToastStore.getState().toasts]) {
      useToastStore.getState().removeToast(t.id);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns capturing=false initially", () => {
    const { result } = renderHook(() => useCaptureAction());
    expect(result.current.capturing).toBe(false);
  });

  it("sets capturing=true while action runs, then false", async () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    const { result } = renderHook(() => useCaptureAction());

    // Fire run and immediately capture the promise without wrapping in act
    const runResult = result.current.run(() => promise);

    // Wait for React to flush the setCapturing(true) state update
    await waitFor(() => expect(result.current.capturing).toBe(true));

    resolve();
    await act(async () => await runResult);

    expect(result.current.capturing).toBe(false);
  });

  it("returns the action result on success", async () => {
    const { result } = renderHook(() => useCaptureAction());
    const runFn = result.current.run;

    let resolved: string | null = null;
    await act(async () => {
      resolved = await runFn(async () => "ok");
    });

    expect(resolved).toBe("ok");
  });

  it("returns null and shows toast on error", async () => {
    const { result } = renderHook(() => useCaptureAction());
    const runFn = result.current.run;

    let resolved: string | null = null;
    await act(async () => {
      resolved = await runFn(async () => {
        throw new Error("boom");
      });
    });

    expect(resolved).toBeNull();
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.type).toBe("error");
    expect(toasts[0]!.message).toBe("boom");
  });

  it("shows generic toast for non-Error throws", async () => {
    const { result } = renderHook(() => useCaptureAction());
    const runFn = result.current.run;

    await act(async () => {
      await runFn(async () => {
        throw "string error";
      });
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.message).toBe("Capture failed");
  });

  it("resets capturing in finally even on error", async () => {
    const { result } = renderHook(() => useCaptureAction());
    const runFn = result.current.run;

    await act(async () => {
      await runFn(async () => {
        throw new Error("fail");
      });
    });

    expect(result.current.capturing).toBe(false);
  });
});
