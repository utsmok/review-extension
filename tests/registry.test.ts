import { beforeEach, describe, expect, it } from "vitest";
import type { SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";

function makeMetadata(overrides?: Partial<SessionMetadata>): SessionMetadata {
  return {
    id: crypto.randomUUID(),
    toolName: "Test Tool",
    toolUrl: "https://example.com",
    startTime: "2025-01-01T00:00:00.000Z",
    status: "started",
    ...overrides,
  };
}

describe("registry store", () => {
  beforeEach(() => {
    useRegistryStore.setState({
      sessionIndex: {},
      activeSessionId: null,
      settings: { reviewerName: "", reviewerEmail: "", preferredRubric: "trust-full" },
    });
  });

  describe("setActiveSessionId", () => {
    it("sets the active session ID", () => {
      const store = useRegistryStore.getState();
      store.setActiveSessionId("abc-123");

      expect(useRegistryStore.getState().activeSessionId).toBe("abc-123");
    });

    it("clears the active session ID when passed null", () => {
      const store = useRegistryStore.getState();
      store.setActiveSessionId("abc-123");
      store.setActiveSessionId(null);

      expect(useRegistryStore.getState().activeSessionId).toBeNull();
    });
  });

  describe("addSession", () => {
    it("adds metadata to sessionIndex and sets activeSessionId", () => {
      const meta = makeMetadata({ id: "sess-1" });
      useRegistryStore.getState().addSession(meta);

      const state = useRegistryStore.getState();
      expect(state.sessionIndex["sess-1"]).toEqual(meta);
      expect(state.activeSessionId).toBe("sess-1");
    });

    it("can add multiple sessions", () => {
      const meta1 = makeMetadata({ id: "sess-1" });
      const meta2 = makeMetadata({ id: "sess-2" });
      useRegistryStore.getState().addSession(meta1);
      useRegistryStore.getState().addSession(meta2);

      const state = useRegistryStore.getState();
      expect(Object.keys(state.sessionIndex)).toHaveLength(2);
      expect(state.activeSessionId).toBe("sess-2");
    });
  });

  describe("deleteSession", () => {
    it("removes session from index and clears activeSessionId if matching", () => {
      const meta = makeMetadata({ id: "sess-1" });
      useRegistryStore.getState().addSession(meta);
      expect(useRegistryStore.getState().activeSessionId).toBe("sess-1");

      useRegistryStore.getState().deleteSession("sess-1");

      const state = useRegistryStore.getState();
      expect(state.sessionIndex["sess-1"]).toBeUndefined();
      expect(state.activeSessionId).toBeNull();
    });

    it("leaves activeSessionId alone if it does not match", () => {
      const meta1 = makeMetadata({ id: "sess-1" });
      const meta2 = makeMetadata({ id: "sess-2" });
      useRegistryStore.getState().addSession(meta1);
      useRegistryStore.getState().addSession(meta2);

      useRegistryStore.getState().deleteSession("sess-1");

      const state = useRegistryStore.getState();
      expect(state.sessionIndex["sess-1"]).toBeUndefined();
      expect(state.activeSessionId).toBe("sess-2");
    });
  });

  describe("markSessionDone", () => {
    it("sets session status to done", () => {
      const meta = makeMetadata({ id: "sess-1", status: "started" });
      useRegistryStore.getState().addSession(meta);

      useRegistryStore.getState().markSessionDone("sess-1");

      expect(useRegistryStore.getState().sessionIndex["sess-1"].status).toBe("done");
    });

    it("no-ops for non-existent session", () => {
      const meta = makeMetadata({ id: "sess-1" });
      useRegistryStore.getState().addSession(meta);

      useRegistryStore.getState().markSessionDone("non-existent");

      const state = useRegistryStore.getState();
      expect(Object.keys(state.sessionIndex)).toHaveLength(1);
      expect(state.sessionIndex["sess-1"].status).toBe("started");
    });
  });

  describe("updateSettings", () => {
    it("merges settings partially", () => {
      useRegistryStore.getState().updateSettings({ reviewerName: "Alice" });

      const settings = useRegistryStore.getState().settings;
      expect(settings.reviewerName).toBe("Alice");
      expect(settings.reviewerEmail).toBe("");
      expect(settings.preferredRubric).toBe("trust-full");
    });

    it("merges multiple fields", () => {
      useRegistryStore.getState().updateSettings({ reviewerName: "Bob", reviewerEmail: "bob@example.com" });

      const settings = useRegistryStore.getState().settings;
      expect(settings.reviewerName).toBe("Bob");
      expect(settings.reviewerEmail).toBe("bob@example.com");
    });
  });

  describe("updateSessionMetadata", () => {
    it("merges metadata for an existing session", () => {
      const meta = makeMetadata({ id: "sess-1", toolName: "Original" });
      useRegistryStore.getState().addSession(meta);

      useRegistryStore.getState().updateSessionMetadata("sess-1", { toolName: "Updated", company: "Acme" });

      const updated = useRegistryStore.getState().sessionIndex["sess-1"];
      expect(updated.toolName).toBe("Updated");
      expect(updated.company).toBe("Acme");
      expect(updated.toolUrl).toBe("https://example.com");
    });

    it("no-ops for non-existent session", () => {
      const meta = makeMetadata({ id: "sess-1" });
      useRegistryStore.getState().addSession(meta);

      useRegistryStore.getState().updateSessionMetadata("non-existent", { toolName: "Ghost" });

      const state = useRegistryStore.getState();
      expect(Object.keys(state.sessionIndex)).toHaveLength(1);
      expect(state.sessionIndex["sess-1"].toolName).toBe("Test Tool");
    });
  });
});
