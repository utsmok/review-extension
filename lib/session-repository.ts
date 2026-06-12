import type { SessionData } from "@/lib/types";
import { idbRequest, openIDBStore } from "./idb-helpers";
import { runMigrations, CURRENT_SCHEMA_VERSION as SCHEMA_VERSION } from "./migrations";

// --- Interface ---

/** Abstraction over session persistence (IDB or in-memory for tests). */
export interface SessionRepository {
  save(id: string, data: SessionData): Promise<boolean>;
  load(id: string): Promise<SessionData | null>;
  delete(id: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// --- IDB Constants ---

const DB_NAME = "trust-review-sessions";
const STORE_NAME = "sessions";

export { CURRENT_SCHEMA_VERSION as SCHEMA_VERSION } from "./migrations";

// --- IdbSessionRepository ---

export class IdbSessionRepository implements SessionRepository {
  private getDB = openIDBStore(DB_NAME, STORE_NAME, SCHEMA_VERSION, (db) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  });

  async isAvailable(): Promise<boolean> {
    try {
      await this.getDB();
      return true;
    } catch {
      return false;
    }
  }

  async save(id: string, data: SessionData): Promise<boolean> {
    try {
      // Quota guard: warn when storage is running low to prevent silent data loss.
      if (navigator.storage?.estimate) {
        const { quota, usage } = await navigator.storage.estimate();
        if (quota && usage) {
          // Estimate: ~500KB base overhead + ~2MB per capture (screenshot + HTML archive)
          const estimatedSize = 500_000 + data.captures.length * 2_000_000;
          const headroom = quota - usage;
          if (estimatedSize > headroom * 0.8) {
            console.warn(
              `Storage quota low: ${Math.round(usage / 1e6)}MB / ${Math.round(quota / 1e6)}MB used. ` +
                `Session (~${Math.round(estimatedSize / 1e6)}MB) may fail to save. ` +
                `Delete old reviews to free space.`,
            );
          }
        }
      }
      const db = await this.getDB();
      const clone = { ...data, schemaVersion: SCHEMA_VERSION };
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(clone, id);
      const { promise, resolve, reject } = Promise.withResolvers<boolean>();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error("Transaction aborted"));
      return promise;
    } catch {
      return false;
    }
  }

  async load(id: string): Promise<SessionData | null> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    const data = (await idbRequest<SessionData | null>(req)) ?? null;
    if (data && data.schemaVersion !== SCHEMA_VERSION) {
      return runMigrations(data);
    }
    return data;
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("Transaction aborted"));
    return promise;
  }
}

// --- InMemorySessionRepository ---

export class InMemorySessionRepository implements SessionRepository {
  private store = new Map<string, SessionData>();

  async save(id: string, data: SessionData): Promise<boolean> {
    this.store.set(id, structuredClone(data));
    return true;
  }

  async load(id: string): Promise<SessionData | null> {
    const data = this.store.get(id);
    return data ? structuredClone(data) : null;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
// --- Module-level DI ---

let currentRepository: SessionRepository = new IdbSessionRepository();
/** Get the currently configured repository instance. */
export function getRepository(): SessionRepository {
  return currentRepository;
}
/** Replace the repository instance (used by tests to inject InMemorySessionRepository). */
export function setRepository(repo: SessionRepository): void {
  currentRepository = repo;
}

/** Reset to default IDB repository (useful for test cleanup) */
export function resetRepository(): void {
  currentRepository = new IdbSessionRepository();
}
