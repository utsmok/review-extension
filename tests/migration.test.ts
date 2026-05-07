import { afterEach, afterAll, beforeEach, describe, expect, it } from "vitest";

// Polyfill localStorage for Node environment (migrateLegacySession uses it)
// Node 22+ provides a partial localStorage that requires --localstorage-file,
// so we unconditionally override with an in-memory implementation.
const lsStore: Record<string, string> = {};
const ls = {
  getItem: (key: string): string | null => lsStore[key] ?? null,
  setItem: (key: string, value: string): void => { lsStore[key] = value; },
  removeItem: (key: string): void => { delete lsStore[key]; },
  clear: (): void => { Object.keys(lsStore).forEach((k) => { void delete lsStore[k]; }); },
  get length(): number { return Object.keys(lsStore).length; },
  key: (index: number): string | null => Object.keys(lsStore)[index] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: ls, writable: true });
import { useRegistryStore } from "@/stores/registry";
import { getRepository, InMemorySessionRepository, setRepository, resetRepository } from "@/lib/session-repository";
import { migrateLegacySession } from "@/lib/migration";

describe("migrateLegacySession", () => {
  beforeEach(() => {
    setRepository(new InMemorySessionRepository());
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

  afterAll(() => {
    resetRepository();
  });

  it("migrates a legacy localStorage session to repository and registry", async () => {
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
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();

    // Should be in repository now
    const registry = useRegistryStore.getState();
    const sessionIds = Object.keys(registry.sessionIndex);
    expect(sessionIds).toHaveLength(1);

    const sessionId = sessionIds[0];
    const meta = registry.sessionIndex[sessionId];
    expect(meta.toolName).toBe("Legacy Tool");
    expect(meta.status).toBe("started");

    const loaded = await getRepository().load(sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded?.metadata.toolName).toBe("Legacy Tool");

    // linkedRubricIds should be stripped from captures
    expect(loaded?.captures).toHaveLength(1);
    const capture = loaded?.captures[0] as unknown as Record<string, unknown>;
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
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();
    const registryAfterFirst = useRegistryStore.getState();
    const firstIds = Object.keys(registryAfterFirst.sessionIndex);

    // Reset the migration flag but keep repository data
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
      },
    };
    localStorage.setItem("trust-review-session", JSON.stringify(legacyState));

    await migrateLegacySession();

    const registry = useRegistryStore.getState();
    const sessionId = Object.keys(registry.sessionIndex)[0];
    const loaded = await getRepository().load(sessionId);

    expect(loaded?.captures).toHaveLength(1);
    const capture = loaded?.captures[0] as unknown as Record<string, unknown>;
    expect(capture.linkedRubricIds).toBeUndefined();
    expect(capture.id).toBe("cap-1");
  });
});
