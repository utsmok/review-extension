// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Zustand persist captures `window.localStorage` at import time.
// WxtVitest's jsdom provides a broken localStorage — stub it BEFORE store imports.
const lsStore: Record<string, string> = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  return store;
});

import { useActiveSession } from "@/hooks/useActiveSession";
import * as lifecycle from "@/lib/session-lifecycle";
import {
  getRepository,
  InMemorySessionRepository,
  resetRepository,
  setRepository,
} from "@/lib/session-repository";
import type { SessionData } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";
import { makeMetadata, RUBRIC } from "@/tests/fixtures";

// --- Mocks ---

vi.mock("@/lib/session-lifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session-lifecycle")>();
  return {
    ...actual,
    initAutoSave: vi.fn(),
    teardownAutoSave: vi.fn(),
  };
});

vi.mock("@/lib/export", () => ({
  exportSession: vi.fn().mockResolvedValue(new Blob(["test"])),
  downloadBlob: vi.fn(),
  sanitizeFilename: vi.fn((s: string) => s),
}));

vi.mock("@/stores/toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/toast")>();
  return {
    ...actual,
    toastError: vi.fn(),
  };
});

// Re-import mocked modules for assertion access
import { initAutoSave } from "@/lib/session-lifecycle";
import { downloadBlob, exportSession, sanitizeFilename } from "@/lib/export";
import { toastError } from "@/stores/toast";

// --- Helpers ---

/** Seed repository + registry with a session so loadSessionById can find it. */
async function seedSession(id: string) {
  const meta = makeMetadata({ id });
  const data: SessionData = {
    metadata: meta,
    captures: [],
    evaluations: [],
    finalization: null,
  };
  await getRepository().save(id, data);
  useRegistryStore.getState().addSession(meta);
  return { meta, data };
}

/** Flush pending React effects + microtasks. */
async function flushEffects() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// --- Setup / teardown ---

let hookResult: {
  result: { current: ReturnType<typeof useActiveSession> };
  unmount: () => void;
} | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(lsStore)) delete lsStore[k];
  setRepository(new InMemorySessionRepository());
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: null,
    settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full", labs: {} },
  });
  useSessionStore.setState({
    status: "empty",
    session: null,
    captures: [],
    evaluations: [],
    finalization: null,
  });
});

afterEach(() => {
  hookResult?.unmount();
  hookResult = null;
});

afterAll(() => {
  resetRepository();
});

// --- Tests ---

describe("useActiveSession", () => {
  // ── Effect 1: load when activeSessionId is set ──────────────────────

  describe("Effect 1 — load on activeSessionId set", () => {
    it("calls loadSessionById when activeSessionId is set and status is empty", async () => {
      await seedSession("sess-load");

      act(() => {
        useRegistryStore.getState().setActiveSessionId("sess-load");
      });

      hookResult = renderHook(() => useActiveSession());
      await flushEffects();

      await waitFor(() => {
        expect(useSessionStore.getState().status).toBe("active");
      });
      expect(useSessionStore.getState().session?.id).toBe("sess-load");
    });

    it("calls toastError and resets status when loadSessionById rejects", async () => {
      const spy = vi.spyOn(lifecycle, "loadSessionById").mockRejectedValue(new Error("IDB broken"));

      act(() => {
        useRegistryStore.getState().setActiveSessionId("sess-bad");
      });

      hookResult = renderHook(() => useActiveSession());
      await flushEffects();

      await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith(
          "Failed to load session. It may be corrupted or storage is unavailable.",
        );
      });
      expect(useSessionStore.getState().status).toBe("empty");
      spy.mockRestore();
    });
  });

  // ── Effect 1: save + clear when activeSessionId becomes null ────────

  describe("Effect 1 — save and clear on activeSessionId null", () => {
    it("saves session to repository and clears store when activeSessionId becomes null", async () => {
      await seedSession("sess-clear");
      const data = (await getRepository().load("sess-clear")) as SessionData;

      act(() => {
        useRegistryStore.getState().setActiveSessionId("sess-clear");
        useSessionStore.getState().loadSession(data);
      });

      hookResult = renderHook(() => useActiveSession());

      act(() => {
        useRegistryStore.getState().setActiveSessionId(null);
      });

      await flushEffects();

      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().status).toBe("empty");

      const saved = await getRepository().load("sess-clear");
      expect(saved).not.toBeNull();
      expect(saved?.metadata.id).toBe("sess-clear");
    });
  });

  // ── Effect 2: auto-save init ───────────────────────────────────────

  describe("Effect 2 — auto-save init", () => {
    it("calls initAutoSave on mount", () => {
      hookResult = renderHook(() => useActiveSession());
      expect(initAutoSave).toHaveBeenCalled();
    });
  });

  // ── closeSession ───────────────────────────────────────────────────

  describe("closeSession", () => {
    it("saves current session, clears store, and nullifies activeSessionId", async () => {
      await seedSession("sess-close");
      const data = (await getRepository().load("sess-close")) as SessionData;

      act(() => {
        useRegistryStore.getState().setActiveSessionId("sess-close");
        useSessionStore.getState().loadSession(data);
      });

      hookResult = renderHook(() => useActiveSession());

      await act(async () => {
        hookResult?.result.current.closeSession();
      });

      await flushEffects();

      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().status).toBe("empty");
      expect(useRegistryStore.getState().activeSessionId).toBeNull();

      const saved = await getRepository().load("sess-close");
      expect(saved).not.toBeNull();
    });
  });

  // ── exportAndClose ─────────────────────────────────────────────────

  describe("exportAndClose", () => {
    it("exports, downloads, and marks done on success", async () => {
      await seedSession("sess-export");
      const data = (await getRepository().load("sess-export")) as SessionData;

      act(() => {
        useRegistryStore.getState().setActiveSessionId("sess-export");
        useSessionStore.getState().loadSession(data);
      });

      hookResult = renderHook(() => useActiveSession());

      const blob = new Blob(["zip-content"]);
      vi.mocked(exportSession).mockResolvedValue(blob);
      vi.mocked(sanitizeFilename).mockReturnValue("Test_Tool");

      await act(async () => {
        await hookResult?.result.current.exportAndClose(RUBRIC);
      });

      expect(exportSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: "sess-export" }),
        expect.any(Array),
        expect.any(Array),
        RUBRIC,
        null,
        expect.any(Array),
        undefined, // reviewer — empty settings → undefined
        expect.any(Array), // principleSummaries
      );
      expect(downloadBlob).toHaveBeenCalledWith(blob, "TRUST_Review_Test_Tool.zip");

      expect(useRegistryStore.getState().activeSessionId).toBe("sess-export");
      expect(useSessionStore.getState().session).not.toBeNull();
    });

    it("calls toastError when no session is active", async () => {
      hookResult = renderHook(() => useActiveSession());

      await act(async () => {
        await hookResult?.result.current.exportAndClose(RUBRIC);
      });

      expect(toastError).toHaveBeenCalledWith("No active session");
      expect(exportSession).not.toHaveBeenCalled();
    });

    it("calls toastError with error message when exportSession throws", async () => {
      await seedSession("sess-throw");
      const data = (await getRepository().load("sess-throw")) as SessionData;

      act(() => {
        useRegistryStore.getState().setActiveSessionId("sess-throw");
        useSessionStore.getState().loadSession(data);
      });

      hookResult = renderHook(() => useActiveSession());

      vi.mocked(exportSession).mockRejectedValue(new Error("ZIP generation failed"));

      await act(async () => {
        await hookResult?.result.current.exportAndClose(RUBRIC);
      });

      expect(toastError).toHaveBeenCalledWith("ZIP generation failed");
    });
  });

  // ── Delegated lifecycle functions ──────────────────────────────────

  describe("delegated lifecycle functions", () => {
    it("exposes switchToSession, createSession, deleteSession, markDoneAndClose as functions", () => {
      hookResult = renderHook(() => useActiveSession());
      const { switchToSession, createSession, deleteSession, markDoneAndClose } =
        hookResult!.result.current;

      expect(typeof switchToSession).toBe("function");
      expect(typeof createSession).toBe("function");
      expect(typeof deleteSession).toBe("function");
      expect(typeof markDoneAndClose).toBe("function");
    });
  });
});
