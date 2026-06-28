import { describe, expect, it } from "vitest";
import { runPackMigrations } from "@/lib/migrations";
import { makeEvaluation, makeMetadata } from "@/tests/fixtures";

describe("pack versioning + question-rename migration", () => {
  it("rewrites evaluation rubricId values matching questionRenames", () => {
    const data = {
      metadata: makeMetadata({ packVersion: 1 }),
      captures: [],
      evaluations: [
        makeEvaluation({ rubricId: "old_key" }),
        makeEvaluation({ rubricId: "unrelated_key" }),
        makeEvaluation({ rubricId: "old_key" }),
      ],
      finalization: null,
      schemaVersion: 3,
    };
    const result = runPackMigrations(data, {
      fromVersion: 1,
      toVersion: 2,
      questionRenames: { old_key: "new_key" },
    });
    expect(result.evaluations[0].rubricId).toBe("new_key");
    expect(result.evaluations[1].rubricId).toBe("unrelated_key");
    expect(result.evaluations[2].rubricId).toBe("new_key");
    expect(result.metadata.packVersion).toBe(2);
  });

  it("returns data unchanged when packVersion is already at toVersion", () => {
    const data = {
      metadata: makeMetadata({ packVersion: 2 }),
      captures: [],
      evaluations: [makeEvaluation({ rubricId: "old_key" })],
      finalization: null,
      schemaVersion: 3,
    };
    const result = runPackMigrations(data, {
      fromVersion: 1,
      toVersion: 2,
      questionRenames: { old_key: "new_key" },
    });
    expect(result).toBe(data); // identity — no clone
    expect(result.evaluations[0].rubricId).toBe("old_key");
  });

  it("returns data unchanged when packVersion is greater than toVersion", () => {
    const data = {
      metadata: makeMetadata({ packVersion: 5 }),
      captures: [],
      evaluations: [makeEvaluation({ rubricId: "old_key" })],
      finalization: null,
      schemaVersion: 3,
    };
    const result = runPackMigrations(data, {
      fromVersion: 3,
      toVersion: 4,
      questionRenames: { old_key: "new_key" },
    });
    expect(result).toBe(data);
  });

  it("returns data unchanged when packVersion is null (no migration needed)", () => {
    const data = {
      metadata: makeMetadata(),
      captures: [],
      evaluations: [makeEvaluation({ rubricId: "old_key" })],
      finalization: null,
      schemaVersion: 3,
    };
    const result = runPackMigrations(data, {
      fromVersion: 1,
      toVersion: 2,
      questionRenames: { old_key: "new_key" },
    });
    // null packVersion means no prior stamp, so nothing to migrate
    expect(result).toBe(data);
  });

  it("handles multiple renames in a single migration", () => {
    const data = {
      metadata: makeMetadata({ packVersion: 1 }),
      captures: [],
      evaluations: [makeEvaluation({ rubricId: "old_a" }), makeEvaluation({ rubricId: "old_b" })],
      finalization: null,
      schemaVersion: 3,
    };
    const result = runPackMigrations(data, {
      fromVersion: 1,
      toVersion: 2,
      questionRenames: { old_a: "new_a", old_b: "new_b" },
    });
    expect(result.evaluations[0].rubricId).toBe("new_a");
    expect(result.evaluations[1].rubricId).toBe("new_b");
  });

  it("does not mutate the original data", () => {
    const data = {
      metadata: makeMetadata({ packVersion: 1 }),
      captures: [],
      evaluations: [makeEvaluation({ rubricId: "old_key" })],
      finalization: null,
      schemaVersion: 3,
    };
    const originalRubricId = data.evaluations[0].rubricId;
    runPackMigrations(data, {
      fromVersion: 1,
      toVersion: 2,
      questionRenames: { old_key: "new_key" },
    });
    expect(data.evaluations[0].rubricId).toBe(originalRubricId);
  });

  it("no-op when questionRenames is empty", () => {
    const data = {
      metadata: makeMetadata({ packVersion: 1 }),
      captures: [],
      evaluations: [makeEvaluation({ rubricId: "some_key" })],
      finalization: null,
      schemaVersion: 3,
    };
    const result = runPackMigrations(data, {
      fromVersion: 1,
      toVersion: 2,
      questionRenames: {},
    });
    expect(result.metadata.packVersion).toBe(2);
    expect(result.evaluations[0].rubricId).toBe("some_key");
  });
});
