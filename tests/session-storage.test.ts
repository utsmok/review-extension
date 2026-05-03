import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

// Polyfill localStorage for Node environment (migrateLegacySession uses it)
// Node 22+ provides a partial localStorage that requires --localstorage-file,
// so we unconditionally override with an in-memory implementation.
const lsStore: Record<string, string> = {};
const ls = {
  getItem: (key: string): string | null => lsStore[key] ?? null,
  setItem: (key: string, value: string): void => { lsStore[key] = value; },
  removeItem: (key: string): void => { delete lsStore[key]; },
  clear: (): void => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
  get length(): number { return Object.keys(lsStore).length; },
  key: (index: number): string | null => Object.keys(lsStore)[index] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: ls, writable: true });
import type { Capture, Evaluation, SessionData } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
import {
  deleteFromIDB,
  loadFromIDB,
  migrateLegacySession,
  saveToIDB,
} from "@/lib/session-storage";

function makeSessionData(overrides?: Partial<SessionData>): SessionData {
  return {
    metadata: {
      id: "abc12345",
      toolName: "Test Tool",
      toolUrl: "https://example.com",
      startTime: "2025-01-01T00:00:00.000Z",
      status: "started",
    },
    captures: [],
    evaluations: [],
    questionModes: {},
    ...overrides,
  };
}

describe("IDB save/load/delete", () => {
  afterEach(async () => {
    try {
      await deleteFromIDB("test-id");
    } catch {
      // ignore if doesn't exist
    }
  });

  it("saveToIDB + loadFromIDB round-trips data", async () => {
    const data = makeSessionData();
    await saveToIDB("test-id", data);

    const loaded = await loadFromIDB("test-id");
    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.toolName).toBe("Test Tool");
    expect(loaded!.captures).toEqual([]);
    expect(loaded!.evaluations).toEqual([]);
  });

  it("loadFromIDB returns null for non-existent ID", async () => {
    const loaded = await loadFromIDB("non-existent-id");
    expect(loaded).toBeNull();
  });

  it("deleteFromIDB removes data", async () => {
    const data = makeSessionData();
    await saveToIDB("test-id", data);
    expect(await loadFromIDB("test-id")).not.toBeNull();

    await deleteFromIDB("test-id");
    expect(await loadFromIDB("test-id")).toBeNull();
  });

  it("preserves captures and evaluations in round-trip", async () => {
    const capture: Capture = {
      id: "cap-1",
      timestamp: "2025-01-01T01:00:00.000Z",
      sourceUrl: "https://example.com/page",
      pageTitle: "Test",
      screenshotBase64: "data:image/png;base64,abc",
      htmlContent: "<html></html>",
      notes: "A capture",
    };
    const evaluation: Evaluation = {
      rubricId: "TR.data_source_clarity",
      score: 2,
      notes: "Good",
      explicitEvidenceIds: ["cap-1"],
    };
    const data = makeSessionData({ captures: [capture], evaluations: [evaluation] });

    await saveToIDB("test-id", data);
    const loaded = await loadFromIDB("test-id");

    expect(loaded!.captures).toHaveLength(1);
    expect(loaded!.captures[0].id).toBe("cap-1");
    expect(loaded!.evaluations).toHaveLength(1);
    expect(loaded!.evaluations[0].explicitEvidenceIds).toEqual(["cap-1"]);
  });
});

describe("migrateLegacySession", () => {
  beforeEach(() => {
    useRegistryStore.setState({
      sessionIndex: {},
      activeSessionId: null,
      settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full" },
    });
  });

  afterEach(() => {
    localStorage.removeItem("trust-review-session");
    localStorage.removeItem("trust-review-migrated");
    localStorage.clear();
  });

  it("migrates a legacy localStorage session to IDB and registry", async () => {
    const legacyState = {
      state: {
        session: {
          toolName: "Legacy Tool",
          toolUrl: "https://legacy.example.com",
          startTime: "2024-06-01T00:00:00.000Z",
        },
        captures: [
          {
            id: "cap-old",
            timestamp: "2024-06-01T01:00:00.000Z",
            sourceUrl: "https://legacy.example.com",
            pageTitle: "Legacy",
            screenshotBase64: "data:image/png;base64,old",
            htmlContent: "<html></html>",
            notes: "",
            linkedRubricIds: ["TR.data_source_clarity"], // should be stripped
          },
        ],
        evaluations: [],
        questionModes: {},
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();

    // Should be in IDB now
    const id = expect.any(String);
    // The deterministic ID is computed from toolName, toolUrl, startTime
    // We can find it in the registry
    const registry = useRegistryStore.getState();
    const sessionIds = Object.keys(registry.sessionIndex);
    expect(sessionIds).toHaveLength(1);

    const sessionId = sessionIds[0];
    const meta = registry.sessionIndex[sessionId];
    expect(meta.toolName).toBe("Legacy Tool");
    expect(meta.status).toBe("started");

    const loaded = await loadFromIDB(sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.toolName).toBe("Legacy Tool");

    // linkedRubricIds should be stripped from captures
    expect(loaded!.captures).toHaveLength(1);
    const capture = loaded!.captures[0] as unknown as Record<string, unknown>;
    expect(capture.linkedRubricIds).toBeUndefined();
    expect(capture.id).toBe("cap-old");

    // localStorage should be cleaned up
    expect(localStorage.getItem("trust-review-session")).toBeNull();
    expect(localStorage.getItem("trust-review-migrated")).toBe("1");
  });

  it("is idempotent — running twice produces same result", async () => {
    const legacyState = {
      state: {
        session: {
          toolName: "Idempotent Tool",
          toolUrl: "https://idempotent.example.com",
          startTime: "2024-06-01T00:00:00.000Z",
        },
        captures: [],
        evaluations: [],
        questionModes: {},
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();
    const registryAfterFirst = useRegistryStore.getState();
    const firstIds = Object.keys(registryAfterFirst.sessionIndex);

    // Reset the migration flag but keep IDB data
    localStorage.setItem("trust-review-migrated", "0");
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();
    const registryAfterSecond = useRegistryStore.getState();
    const secondIds = Object.keys(registryAfterSecond.sessionIndex);

    // Same session, not duplicated
    expect(secondIds).toEqual(firstIds);
    expect(secondIds).toHaveLength(1);
  });

  it("skips when no legacy data exists", async () => {
    // No trust-review-session in localStorage
    await migrateLegacySession();

    const registry = useRegistryStore.getState();
    expect(Object.keys(registry.sessionIndex)).toHaveLength(0);
    expect(localStorage.getItem("trust-review-migrated")).toBe("1");
  });

  it("converts 'basic' questionModes to 'standard'", async () => {
    const legacyState = {
      state: {
        session: {
          toolName: "Basic Mode Tool",
          toolUrl: "https://basic.example.com",
          startTime: "2024-06-01T00:00:00.000Z",
        },
        captures: [],
        evaluations: [],
        questionModes: {
          "TR.data_source_clarity": "basic",
          "RE.accuracy_and_hallucination": "expert",
        },
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();

    const registry = useRegistryStore.getState();
    const sessionId = Object.keys(registry.sessionIndex)[0];
    const loaded = await loadFromIDB(sessionId);

    expect(loaded!.questionModes["TR.data_source_clarity"]).toBe("standard");
    expect(loaded!.questionModes["RE.accuracy_and_hallucination"]).toBe("expert");
  });

  it("strips linkedRubricIds from captures", async () => {
    const legacyState = {
      state: {
        session: {
          toolName: "Strip Tool",
          toolUrl: "https://strip.example.com",
          startTime: "2024-06-01T00:00:00.000Z",
        },
        captures: [
          {
            id: "cap-1",
            timestamp: "2024-06-01T01:00:00.000Z",
            sourceUrl: "https://strip.example.com",
            pageTitle: "Strip",
            screenshotBase64: "",
            htmlContent: "",
            notes: "",
            linkedRubricIds: ["TR.data_source_clarity", "RE.accuracy_and_hallucination"],
          },
        ],
        evaluations: [],
        questionModes: {},
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();

    const registry = useRegistryStore.getState();
    const sessionId = Object.keys(registry.sessionIndex)[0];
    const loaded = await loadFromIDB(sessionId);

    expect(loaded!.captures).toHaveLength(1);
    const capture = loaded!.captures[0] as unknown as Record<string, unknown>;
    expect(capture.linkedRubricIds).toBeUndefined();
    expect(capture.id).toBe("cap-1");
  });
});
