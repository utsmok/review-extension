import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as lifecycle from "@/lib/session-lifecycle";
import {
  getRepository,
  InMemorySessionRepository,
  resetRepository,
  setRepository,
} from "@/lib/session-repository";
import type { Capture, SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import { useSessionStore } from "@/stores/session";

// Regression guard for the screenshot-misplace bug: the deselect path in
// useActiveSession now routes through saveCurrentSession, which must persist each
// capture's screenshot to the separate screenshot store (the store export/UI read
// from) and save the session record with screenshots stripped.
const { saveScreenshot } = vi.hoisted(() => ({ saveScreenshot: vi.fn() }));
vi.mock("@/lib/screenshot-store", () => ({
  saveScreenshot: (...args: unknown[]) => saveScreenshot(...(args as [Capture])),
  deleteScreenshotsForCaptures: vi.fn().mockResolvedValue(undefined),
}));

function makeMeta(id = "s1"): SessionMetadata {
  return {
    id,
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: "2025-01-01T00:00:00.000Z",
    status: "started",
  };
}

function makeCapture(id: string, screenshotBase64: string): Capture {
  return {
    id,
    timestamp: "2025-01-01T00:00:00.000Z",
    sourceUrl: "https://example.com",
    pageTitle: "Page",
    screenshotBase64,
    htmlContent: "",
    notes: "",
  };
}

beforeEach(() => {
  saveScreenshot.mockClear();
  setRepository(new InMemorySessionRepository());
  useRegistryStore.setState({
    sessionIndex: {},
    activeSessionId: "s1",
    settings: { reviewerName: "", reviewerEmail: "", labs: {} },
  });
  useSessionStore.setState({ status: "empty", session: null, captures: [], evaluations: [] });
});

afterAll(() => resetRepository());

describe("saveCurrentSession — screenshot invariant", () => {
  it("persists each capture's screenshot to the screenshot store, then strips it from the session record", async () => {
    const meta = makeMeta();
    const captures = [
      makeCapture("c1", "data:image/png;base64,AAA"),
      makeCapture("c2", "data:image/png;base64,BBB"),
    ];
    const data: SessionData = { metadata: meta, captures, evaluations: [], finalization: null };
    useSessionStore.getState().loadSession(data);

    await lifecycle.saveCurrentSession();

    expect(saveScreenshot).toHaveBeenCalledTimes(2);
    expect(saveScreenshot).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }));
    expect(saveScreenshot).toHaveBeenCalledWith(expect.objectContaining({ id: "c2" }));

    const saved = await getRepository().load(meta.id);
    expect(saved).not.toBeNull();
    expect(saved?.captures.every((c) => c.screenshotBase64 === "")).toBe(true);
  });

  it("does not persist captures without screenshot data", async () => {
    const meta = makeMeta();
    useSessionStore.getState().loadSession({
      metadata: meta,
      captures: [makeCapture("c1", "")],
      evaluations: [],
      finalization: null,
    });

    await lifecycle.saveCurrentSession();

    expect(saveScreenshot).not.toHaveBeenCalled();
  });
});
