import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toastError, toastSuccess, toastWarning, useToastStore } from "@/stores/toast";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe("useToastStore", () => {
  it("initial state has empty toasts array", () => {
    const { toasts } = useToastStore.getState();
    expect(toasts).toEqual([]);
  });

  it("addToast adds a toast with correct type and message", () => {
    useToastStore.getState().addToast("error", "something broke");

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe("error");
    expect(toasts[0].message).toBe("something broke");
  });

  it("addToast increments id", () => {
    useToastStore.getState().addToast("success", "first");
    useToastStore.getState().addToast("success", "second");

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(2);
    expect(toasts[1].id).toBeGreaterThan(toasts[0].id);
  });

  it("removeToast removes the specified toast", () => {
    useToastStore.getState().addToast("error", "a");
    useToastStore.getState().addToast("success", "b");

    const { toasts: before } = useToastStore.getState();
    const targetId = before[0].id;

    useToastStore.getState().removeToast(targetId);

    const { toasts: after } = useToastStore.getState();
    expect(after).toHaveLength(1);
    expect(after[0].message).toBe("b");
  });

  it("removeToast on non-existent id is no-op", () => {
    useToastStore.getState().addToast("warning", "keep me");

    useToastStore.getState().removeToast(999999);

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("keep me");
  });

  it("convenience functions add correct type", () => {
    toastError("e");
    toastSuccess("s");
    toastWarning("w");

    const { toasts } = useToastStore.getState();
    expect(toasts).toHaveLength(3);
    expect(toasts[0].type).toBe("error");
    expect(toasts[1].type).toBe("success");
    expect(toasts[2].type).toBe("warning");
  });

  describe("auto-dismiss", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("removes toast after 5000ms", () => {
      useToastStore.getState().addToast("error", "bye");
      expect(useToastStore.getState().toasts).toHaveLength(1);

      vi.advanceTimersByTime(5000);

      expect(useToastStore.getState().toasts).toEqual([]);
    });

    it("does not remove other toasts", () => {
      useToastStore.getState().addToast("error", "first");

      const { toasts: added } = useToastStore.getState();
      const firstId = added[0].id;

      vi.advanceTimersByTime(1000);
      useToastStore.getState().addToast("success", "second");
      vi.advanceTimersByTime(4000);

      const { toasts: afterDismiss } = useToastStore.getState();
      expect(afterDismiss).toHaveLength(1);
      expect(afterDismiss[0].id).not.toBe(firstId);
      expect(afterDismiss[0].message).toBe("second");
    });
  });

  it("maintains correct order with multiple toasts", () => {
    toastError("e");
    toastWarning("w");
    toastSuccess("s");

    const { toasts } = useToastStore.getState();
    expect(toasts.map((t) => t.message)).toEqual(["e", "w", "s"]);
  });
});
