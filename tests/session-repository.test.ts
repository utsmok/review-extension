import { afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import type { Capture, Evaluation, SessionData } from "@/lib/types";
import {
  IdbSessionRepository,
  InMemorySessionRepository,
  SCHEMA_VERSION,
  getRepository,
  resetRepository,
  setRepository,
} from "@/lib/session-repository";

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
    finalization: null,
    ...overrides,
  };
}

describe("IdbSessionRepository", () => {
  const repo = new IdbSessionRepository();

  afterEach(async () => {
    try {
      await repo.delete("test-id");
    } catch {
      // ignore if doesn't exist
    }
  });

  it("save + load round-trips data", async () => {
    const data = makeSessionData();
    await repo.save("test-id", data);

    const loaded = await repo.load("test-id");
    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.toolName).toBe("Test Tool");
    expect(loaded!.captures).toEqual([]);
    expect(loaded!.evaluations).toEqual([]);
  });

  it("load returns null for non-existent ID", async () => {
    const loaded = await repo.load("non-existent-id");
    expect(loaded).toBeNull();
  });

  it("delete removes data", async () => {
    const data = makeSessionData();
    await repo.save("test-id", data);
    expect(await repo.load("test-id")).not.toBeNull();

    await repo.delete("test-id");
    expect(await repo.load("test-id")).toBeNull();
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

    await repo.save("test-id", data);
    const loaded = await repo.load("test-id");

    expect(loaded!.captures).toHaveLength(1);
    expect(loaded!.captures[0].id).toBe("cap-1");
    expect(loaded!.evaluations).toHaveLength(1);
    expect(loaded!.evaluations[0].explicitEvidenceIds).toEqual(["cap-1"]);
  });

  it("stamps schemaVersion on save", async () => {
    const data = makeSessionData();
    await repo.save("test-id", data);

    const loaded = await repo.load("test-id");
    expect(loaded).not.toBeNull();
    expect(loaded!.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("returns false from save when IDB fails", async () => {
    // Patch: make openDB always fail by overriding indexedDB temporarily
    const originalOpen = indexedDB.open;
    indexedDB.open = () => {
      throw new Error("IDB not available");
    };

    try {
      const failingRepo = new IdbSessionRepository();
      const data = makeSessionData();
      const result = await failingRepo.save("test-id", data);
      expect(result).toBe(false);
    } finally {
      indexedDB.open = originalOpen;
    }
  });
});

describe("InMemorySessionRepository", () => {
  const repo = new InMemorySessionRepository();

  it("save + load round-trips data", async () => {
    const data = makeSessionData();
    const result = await repo.save("test-id", data);
    expect(result).toBe(true);

    const loaded = await repo.load("test-id");
    expect(loaded).not.toBeNull();
    expect(loaded!.metadata.toolName).toBe("Test Tool");
  });

  it("load returns null for non-existent ID", async () => {
    const loaded = await repo.load("non-existent-id");
    expect(loaded).toBeNull();
  });

  it("delete removes data", async () => {
    await repo.save("test-id", makeSessionData());
    expect(await repo.load("test-id")).not.toBeNull();

    await repo.delete("test-id");
    expect(await repo.load("test-id")).toBeNull();
  });

  it("isAvailable returns true", async () => {
    expect(await repo.isAvailable()).toBe(true);
  });

  it("returns a clone (mutations to saved data are isolated)", async () => {
    const data = makeSessionData();
    await repo.save("test-id", data);

    const loaded = await repo.load("test-id");
    loaded!.metadata.toolName = "Mutated";

    const reloaded = await repo.load("test-id");
    expect(reloaded!.metadata.toolName).toBe("Test Tool");
  });
});

describe("DI helpers", () => {
  afterEach(() => {
    resetRepository();
  });

  it("getRepository returns IdbSessionRepository by default", () => {
    expect(getRepository()).toBeInstanceOf(IdbSessionRepository);
  });

  it("setRepository changes the current repository", () => {
    const mem = new InMemorySessionRepository();
    setRepository(mem);
    expect(getRepository()).toBe(mem);
  });

  it("resetRepository restores IdbSessionRepository", () => {
    setRepository(new InMemorySessionRepository());
    resetRepository();
    expect(getRepository()).toBeInstanceOf(IdbSessionRepository);
  });
});
