import type { SessionData } from "@/lib/types";
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
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, SCHEMA_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error("Database upgrade blocked — close other tabs and retry"));
    });
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.openDB();
      this.dbPromise
        .then((db) => {
          db.onclose = () => {
            this.dbPromise = null;
          };
          db.onerror = () => {
            this.dbPromise = null;
          };
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
        })
        .catch(() => {
          this.dbPromise = null;
        });
    }
    return this.dbPromise;
  }

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
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(clone, id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error("Transaction aborted"));
      });
    } catch {
      return false;
    }
  }

  async load(id: string): Promise<SessionData | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const data = req.result ?? null;
        if (data && data.schemaVersion !== SCHEMA_VERSION) {
          resolve(runMigrations(data));
        } else {
          resolve(data);
        }
      };
      req.onerror = () => reject(req.error);
      tx.onabort = () => reject(new Error("Transaction aborted"));
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error("Transaction aborted"));
    });
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
