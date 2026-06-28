import type { SessionData } from "./types";

export const CURRENT_SCHEMA_VERSION = 3;

type Migration = (data: SessionData) => SessionData;

const migrations = new Map<number, Migration>();

// v1→v2: ensure finalization field exists
migrations.set(1, (data: SessionData): SessionData => {
  return { ...data, finalization: data.finalization ?? null };
});

// v2→v3: discipline changed from string to string[]
migrations.set(2, (data: SessionData): SessionData => {
  const d = (data.metadata as unknown as Record<string, unknown>)?.discipline;
  if (typeof d === "string" && d.length > 0) {
    return { ...data, metadata: { ...data.metadata, discipline: [d] } };
  } else if (typeof d === "string") {
    return { ...data, metadata: { ...data.metadata, discipline: undefined } };
  }
  return data;
});

/** Run all pending schema migrations from the stored version to the current version. */
export function runMigrations(data: SessionData): SessionData {
  const startVersion = data.schemaVersion ?? 1;
  if (startVersion > CURRENT_SCHEMA_VERSION) return data;
  if (startVersion === CURRENT_SCHEMA_VERSION) return data;
  let current = data;
  for (let v = startVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations.get(v);
    if (migrate) {
      current = migrate(current);
    }
  }
  current.schemaVersion = CURRENT_SCHEMA_VERSION;
  return current;
}

/** Parameters for a single pack migration step. */
export interface PackMigrationParams {
  fromVersion: number;
  toVersion: number;
  questionRenames: Record<string, string>;
}

/**
 * Run a pack-level question-rename migration on a session's evaluations.
 *
 * - If `metadata.packVersion` is `null` or `undefined`, returns data unchanged
 *   (the session was created before pack versioning existed — no rubricId rewrites apply).
 * - If `metadata.packVersion` is already >= `toVersion`, returns data unchanged (idempotent).
 * - Otherwise, clones the session, rewrites every `evaluation.rubricId` that appears
 *   as a key in `questionRenames`, stamps `metadata.packVersion = toVersion`, and returns.
 */
export function runPackMigrations(data: SessionData, m: PackMigrationParams): SessionData {
  const { toVersion, questionRenames } = m;
  const current = data.metadata.packVersion ?? null;

  if (current === null || current >= toVersion) {
    return data;
  }

  // Clone — never mutate the original
  const result: SessionData = {
    ...data,
    metadata: { ...data.metadata, packVersion: toVersion },
    evaluations: data.evaluations.map((ev) => {
      const renamed = questionRenames[ev.rubricId];
      return renamed ? { ...ev, rubricId: renamed } : ev;
    }),
  };

  return result;
}
