import type { SessionData } from "./types";

export const CURRENT_SCHEMA_VERSION = 3;

type Migration = (data: SessionData) => SessionData;

const migrations = new Map<number, Migration>();

// v1→v2: ensure finalization field exists
migrations.set(1, (data: SessionData): SessionData => {
  data.finalization = data.finalization ?? null;
  return data;
});

// v2→v3: discipline changed from string to string[]
migrations.set(2, (data: SessionData): SessionData => {
  const d = (data.metadata as unknown as Record<string, unknown>)?.discipline;
  if (typeof d === "string" && d.length > 0) {
    data.metadata.discipline = [d];
  } else if (typeof d === "string") {
    data.metadata.discipline = undefined;
  }
  return data;
});

export function runMigrations(data: SessionData): SessionData {
  const startVersion = data.schemaVersion ?? 1;
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
