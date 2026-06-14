import { afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";

import { CURRENT_SCHEMA_VERSION, runMigrations } from "@/lib/migrations";
import { IdbSessionRepository, SCHEMA_VERSION } from "@/lib/session-repository";
import type { SessionData } from "@/lib/types";
import { makeCapture, makeEvaluation, makeFinalization, makeMetadata } from "@/tests/fixtures";

// ── Constants from session-repository ────────────────────────────────────

const DB_NAME = "trust-review-sessions";
const STORE_NAME = "sessions";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeRawSession(overrides?: Partial<SessionData>): SessionData {
  return {
    metadata: makeMetadata(),
    captures: [],
    evaluations: [],
    finalization: null,
    ...overrides,
  };
}

/**
 * Write raw session data directly to IndexedDB, bypassing the repository's
 * `save()` method (which always stamps schemaVersion = SCHEMA_VERSION).
 * This lets us store v1 or versionless data to test migration on load.
 */
async function writeRaw(id: string, data: SessionData): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ── Unit tests for runMigrations ─────────────────────────────────────────

describe("runMigrations (unit)", () => {
  it("migrates v1 data (no schemaVersion) to current version", () => {
    const raw = makeRawSession();
    delete (raw as unknown as Record<string, unknown>).finalization;
    delete (raw as unknown as Record<string, unknown>).schemaVersion;

    const result = runMigrations(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.finalization).toBeNull();
  });

  it("migrates v2 data with discipline string to string[]", () => {
    const raw = makeRawSession({ schemaVersion: 2 });
    (raw.metadata as unknown as Record<string, unknown>).discipline = "Physics";

    const result = runMigrations(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.metadata.discipline).toEqual(["Physics"]);
  });

  it("migrates v2 data with empty string discipline to undefined", () => {
    const raw = makeRawSession({ schemaVersion: 2 });
    (raw.metadata as unknown as Record<string, unknown>).discipline = "";

    const result = runMigrations(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.metadata.discipline).toBeUndefined();
  });

  it("returns v3 (current) data unchanged", () => {
    const fin = makeFinalization();
    const raw = makeRawSession({ schemaVersion: CURRENT_SCHEMA_VERSION, finalization: fin });

    const result = runMigrations(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.finalization).toEqual(fin);
  });

  it("returns future-version data as-is with no migrations applied", () => {
    const raw = makeRawSession({ schemaVersion: 99 } as Partial<SessionData>);
    // Cast to bypass type check for future version
    const future = raw as SessionData & { schemaVersion: number };

    const result = runMigrations(future);
    // schemaVersion is left untouched (downgrade protection)
    expect(result.schemaVersion).toBe(99);
    // But no migration logic ran — data is otherwise untouched
    expect(result.captures).toEqual([]);
    expect(result.evaluations).toEqual([]);
  });

  it("applies each migration in order (v1→v2→v3)", () => {
    const raw = makeRawSession({ schemaVersion: 1 });
    delete (raw as unknown as Record<string, unknown>).finalization;
    (raw.metadata as unknown as Record<string, unknown>).discipline = "Biology";

    const result = runMigrations(raw);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    // v1→v2 applied: finalization was set
    expect(result.finalization).toBeNull();
    // v2→v3 applied: discipline converted
    expect(result.metadata.discipline).toEqual(["Biology"]);
  });
});

// ── Integration tests (via IdbSessionRepository.load) ────────────────────

describe("migrateSessionData (via IdbSessionRepository.load)", () => {
  const repo = new IdbSessionRepository();

  afterEach(async () => {
    try {
      await repo.delete("migration-test");
    } catch {
      // already gone
    }
  });

  it("migrates v1 session (schemaVersion=1, no finalization) to v2", async () => {
    const raw = makeRawSession({ schemaVersion: 1 });
    // Ensure no finalization key at all
    delete (raw as unknown as Record<string, unknown>).finalization;
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.finalization).toBeNull();
  });

  it("migrates session with no schemaVersion field", async () => {
    const raw = makeRawSession();
    // No schemaVersion at all
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.finalization).toBeNull();
  });

  it("does not re-migrate session already at current schema version", async () => {
    const fin = makeFinalization();
    const raw = makeRawSession({
      schemaVersion: SCHEMA_VERSION,
      finalization: fin,
    });
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.finalization).toEqual(fin);
  });

  it("preserves existing finalization during v1→v2 migration", async () => {
    const fin = makeFinalization();
    const raw = makeRawSession({ schemaVersion: 1, finalization: fin });
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.finalization).toEqual(fin);
  });

  it("preserves captures, evaluations, and metadata through migration", async () => {
    const capture = makeCapture();
    const evaluation = makeEvaluation();
    const metadata = makeMetadata({
      toolName: "Migration Tool",
      toolUrl: "https://migration.test",
    });
    const raw = makeRawSession({
      metadata,
      captures: [capture],
      evaluations: [evaluation],
      schemaVersion: 1,
    });
    delete (raw as unknown as Record<string, unknown>).finalization;
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    // All fields preserved
    expect(loaded?.metadata.toolName).toBe("Migration Tool");
    expect(loaded?.metadata.toolUrl).toBe("https://migration.test");
    expect(loaded?.captures).toHaveLength(1);
    expect(loaded?.captures[0].id).toBe(capture.id);
    expect(loaded?.evaluations).toHaveLength(1);
    expect(loaded?.evaluations[0].rubricId).toBe(evaluation.rubricId);
    // Migration applied
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.finalization).toBeNull();
  });

  it("migrates v2 session with string discipline to v3 string[]", async () => {
    const metadata = makeMetadata({
      discipline: "Computer Science" as unknown as string[] | undefined,
    });
    const raw = makeRawSession({ metadata, schemaVersion: 2 });
    // Force discipline to be a string (overriding the type)
    (raw.metadata as unknown as Record<string, unknown>).discipline = "Computer Science";
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.metadata.discipline).toEqual(["Computer Science"]);
  });

  it("migrates v2 session with empty string discipline to undefined", async () => {
    const metadata = makeMetadata();
    const raw = makeRawSession({ metadata, schemaVersion: 2 });
    (raw.metadata as unknown as Record<string, unknown>).discipline = "";
    await writeRaw("migration-test", raw);

    const loaded = await repo.load("migration-test");
    expect(loaded).not.toBeNull();
    expect(loaded?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded?.metadata.discipline).toBeUndefined();
  });
});
