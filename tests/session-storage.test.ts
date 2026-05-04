import { afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import type { Capture, Evaluation, SessionData } from "@/lib/types";
import {
  deleteFromIDB,
  loadFromIDB,
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
    finalization: null,
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
