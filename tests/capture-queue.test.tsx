/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAX_QUEUE, useCaptureQueue } from "@/hooks/useCaptureQueue";

/** Creates a controllable async fn that resolves when `resolve` is called. */
function createControllableFn() {
  let resolver: () => void = () => {};
  const promise = () =>
    new Promise<void>((resolve) => {
      resolver = resolve;
    });
  return { fn: promise, resolve: () => resolver() };
}

describe("useCaptureQueue", () => {
  it("executes a single enqueued capture and completes", async () => {
    const calls: string[] = [];
    const { result } = renderHook(() => useCaptureQueue());

    const fn = vi.fn(async () => {
      calls.push("capture");
    });

    await act(async () => {
      result.current.enqueue(fn);
      // drain runs asynchronously — give it a tick
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["capture"]);
  });

  it("executes captures serially, not concurrently", async () => {
    const order: string[] = [];
    const fns: { fn: () => Promise<void>; resolve: () => void }[] = [];

    for (let i = 0; i < 3; i++) {
      const { fn, resolve } = createControllableFn();
      fns.push({ fn, resolve });
    }

    const { result } = renderHook(() => useCaptureQueue());

    // Enqueue all three
    await act(async () => {
      result.current.enqueue(async () => {
        order.push("start-1");
        await fns[0].fn();
        order.push("end-1");
      });
      result.current.enqueue(async () => {
        order.push("start-2");
        await fns[1].fn();
        order.push("end-2");
      });
      result.current.enqueue(async () => {
        order.push("start-3");
        await fns[2].fn();
        order.push("end-3");
      });
    });

    // First capture should be running
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(order).toEqual(["start-1"]);

    // Resolve first — second should start
    await act(async () => {
      fns[0].resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(order).toEqual(["start-1", "end-1", "start-2"]);

    // Resolve second — third should start
    await act(async () => {
      fns[1].resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(order).toEqual(["start-1", "end-1", "start-2", "end-2", "start-3"]);

    // Resolve third
    await act(async () => {
      fns[2].resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(order).toEqual(["start-1", "end-1", "start-2", "end-2", "start-3", "end-3"]);
  });

  it("rejects enqueues beyond MAX_QUEUE (4)", async () => {
    const executed: number[] = [];
    const resolvers: (() => void)[] = [];

    // Create MAX_QUEUE + 1 controllable async functions (1 running + 4 queued = full)
    const tasks: (() => Promise<void>)[] = [];
    for (let i = 0; i < MAX_QUEUE + 1; i++) {
      const idx = i;
      tasks.push(
        () =>
          new Promise<void>((resolve) => {
            resolvers.push(() => {
              executed.push(idx);
              resolve();
            });
          }),
      );
    }

    const { result } = renderHook(() => useCaptureQueue());

    // Enqueue 5 items: first starts running, remaining 4 fill the queue to MAX_QUEUE
    for (let i = 0; i < MAX_QUEUE + 1; i++) {
      await act(async () => {
        result.current.enqueue(tasks[i]);
      });
    }

    // The 6th enqueue should be silently rejected (queue full)
    const overflowFn = vi.fn(async () => {
      executed.push(99);
    });
    await act(async () => {
      result.current.enqueue(overflowFn);
    });

    // Resolve all queued items one by one
    for (let i = 0; i < resolvers.length; i++) {
      await act(async () => {
        resolvers[i]();
        await new Promise((r) => setTimeout(r, 0));
      });
    }

    // Overflow fn should never have been called
    expect(overflowFn).not.toHaveBeenCalled();
    expect(executed).toEqual([0, 1, 2, 3, 4]);
  });

  it("isCapturing returns true during capture, false when idle", async () => {
    let resolveCapture: () => void = () => {};
    const { result } = renderHook(() => useCaptureQueue());

    expect(result.current.isCapturing()).toBe(false);

    await act(async () => {
      result.current.enqueue(
        () =>
          new Promise<void>((resolve) => {
            resolveCapture = resolve;
          }),
      );
      // Let drain pick it up
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isCapturing()).toBe(true);

    await act(async () => {
      resolveCapture();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isCapturing()).toBe(false);
  });

  it("handles rapid enqueue calls without race conditions", async () => {
    const order: number[] = [];

    const { result } = renderHook(() => useCaptureQueue());

    // Rapidly enqueue 4 instant-resolve captures
    await act(async () => {
      for (let i = 0; i < 4; i++) {
        const idx = i;
        result.current.enqueue(async () => {
          order.push(idx);
        });
      }
      // Let drain process them all
      await new Promise((r) => setTimeout(r, 50));
    });

    // All should execute in order
    expect(order).toEqual([0, 1, 2, 3]);
    expect(result.current.isCapturing()).toBe(false);
  });
});
