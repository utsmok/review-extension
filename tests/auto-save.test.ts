// @vitest-environment jsdom
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initAutoSave, teardownAutoSave } from "@/lib/auto-save";

// --- Mocks ---

const mockSave = vi.fn().mockResolvedValue(true);
const mockGetRepository = vi.fn(() => ({ save: mockSave }));
vi.mock("@/lib/session-repository", () => ({
  getRepository: () => mockGetRepository(),
}));

const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
vi.mock("@/stores/toast", () => ({
  toastError: (...args: unknown[]) => mockToastError(...args),
  toastWarning: (...args: unknown[]) => mockToastWarning(...args),
}));

// We'll inject getState/subscribe per-store below
const sessionGetState = vi.fn();
const sessionSubscribe = vi.fn();
const registryGetState = vi.fn();

vi.mock("@/stores/session", () => ({
  useSessionStore: {
    getState: (...args: unknown[]) => sessionGetState(...args),
    subscribe: (...args: unknown[]) => sessionSubscribe(...args),
  },
}));

vi.mock("@/stores/registry", () => ({
  useRegistryStore: {
    getState: (...args: unknown[]) => registryGetState(...args),
  },
}));

// --- Helpers ---

let listener: () => void;

function defaultSessionState(overrides?: Record<string, unknown>) {
  return {
    status: "active",
    session: { id: "sess-1", toolName: "T", toolUrl: "https://x", startTime: "", status: "started" },
    captures: [],
    evaluations: [],
    finalization: null,
    ...overrides,
  };
}

function advanceTimer(ms: number) {
  vi.advanceTimersByTime(ms);
}

// --- Tests ---

describe("auto-save", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSave.mockReset();
    mockToastError.mockReset();
    mockToastWarning.mockReset();

    // Reset module-level state by calling teardown before each init
    teardownAutoSave();

    // Default: subscribe captures the listener
    sessionSubscribe.mockReset();
    sessionSubscribe.mockImplementation((cb: () => void) => {
      listener = cb;
      return () => {};
    });

    sessionGetState.mockReset();
    registryGetState.mockReset();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("triggers debounced saveToIDB 300ms after store change", () => {
    sessionGetState.mockReturnValueOnce(defaultSessionState());
    registryGetState.mockReturnValueOnce({ activeSessionId: "sess-1" });
    mockSave.mockResolvedValue(true);

    // For flush()
    sessionGetState.mockReturnValueOnce(defaultSessionState());
    registryGetState.mockReturnValueOnce({ activeSessionId: "sess-1" });

    initAutoSave();

    // Trigger store change
    listener();

    // Not yet called — debounce window
    expect(mockSave).not.toHaveBeenCalled();

    advanceTimer(300);

    expect(mockSave).toHaveBeenCalledExactlyOnceWith("sess-1", {
      metadata: expect.any(Object),
      captures: [],
      evaluations: [],
      finalization: null,
    });
  });

  it("debounces rapid changes — only one saveToIDB call", () => {
    // subscribe listener setup
    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });
    mockSave.mockResolvedValue(true);

    initAutoSave();

    // Rapid-fire 5 changes
    for (let i = 0; i < 5; i++) {
      listener();
      advanceTimer(100);
    }

    // Still within debounce window (500ms elapsed, timer reset each time)
    expect(mockSave).not.toHaveBeenCalled();

    advanceTimer(300);

    // Only one save after final debounce settles
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("flushes immediately on visibilitychange to hidden", () => {
    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });
    mockSave.mockResolvedValue(true);

    initAutoSave();

    // Trigger a store change to start the debounce timer
    listener();

    // Simulate visibilitychange → hidden
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
      writable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(mockSave).toHaveBeenCalledTimes(1);

    // Advance past the debounce window — should NOT double-save
    advanceTimer(300);
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Restore
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
      writable: true,
    });
  });

  it("teardownAutoSave stops further saves", () => {
    const unsub = vi.fn();
    sessionSubscribe.mockImplementation((cb: () => void) => {
      listener = cb;
      return unsub;
    });
    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });
    mockSave.mockResolvedValue(true);

    initAutoSave();
    teardownAutoSave();

    expect(unsub).toHaveBeenCalled();

    // Re-init to verify clean slate
    const unsub2 = vi.fn();
    sessionSubscribe.mockImplementation((cb: () => void) => {
      listener = cb;
      return unsub2;
    });
    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });

    initAutoSave();
    listener();
    advanceTimer(300);

    expect(mockSave).toHaveBeenCalledTimes(1); // Only from the second init
  });

  it("does not save when status is 'empty'", () => {
    sessionGetState.mockReturnValue(defaultSessionState({ status: "empty" }));
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });

    initAutoSave();
    listener();
    advanceTimer(300);

    expect(mockSave).not.toHaveBeenCalled();
  });

  it("handles saveToIDB failure — calls toastWarning and dispatches trust-save-failed", async () => {
    mockSave.mockResolvedValue(false);
    mockToastWarning.mockImplementation(() => {});

    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });

    const failedListener = vi.fn();
    document.addEventListener("trust-save-failed", failedListener);

    initAutoSave();
    listener();
    advanceTimer(300);

    // Wait for the async flush to complete
    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalled();
    expect(mockToastWarning).toHaveBeenCalledWith("Auto-save failed — your work may not be saved.");
    expect(failedListener).toHaveBeenCalled();

    document.removeEventListener("trust-save-failed", failedListener);
  });

  it("dispatches trust-save-succeeded on successful save", async () => {
    mockSave.mockResolvedValue(true);

    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });

    const successListener = vi.fn();
    document.addEventListener("trust-save-succeeded", successListener);

    initAutoSave();
    listener();
    advanceTimer(300);

    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalled();
    expect(successListener).toHaveBeenCalled();
    const event = successListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toHaveProperty("timestamp");
    expect(typeof event.detail.timestamp).toBe("number");

    document.removeEventListener("trust-save-succeeded", successListener);
  });

  it("dispatches trust-save-failed on failed save", async () => {
    mockSave.mockResolvedValue(false);

    sessionGetState.mockReturnValue(defaultSessionState());
    registryGetState.mockReturnValue({ activeSessionId: "sess-1" });

    const failedListener = vi.fn();
    document.addEventListener("trust-save-failed", failedListener);

    initAutoSave();
    listener();
    advanceTimer(300);

    await vi.runAllTimersAsync();

    expect(mockSave).toHaveBeenCalled();
    expect(failedListener).toHaveBeenCalled();

    document.removeEventListener("trust-save-failed", failedListener);
  });
});
