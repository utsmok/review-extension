import type { SessionData } from "@/lib/types";

// --- Interface ---

export interface SessionRepository {
  save(id: string, data: SessionData): Promise<boolean>;
  load(id: string): Promise<SessionData | null>;
  delete(id: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// --- IDB Constants ---

const DB_NAME = "trust-review-sessions";
const STORE_NAME = "sessions";
export const SCHEMA_VERSION = 3;

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
          const payloadSize = JSON.stringify(data).length;
          const headroom = quota - usage;
          if (payloadSize > headroom * 0.8) {
            console.warn(
              `Storage quota low: ${Math.round(usage / 1e6)}MB / ${Math.round(quota / 1e6)}MB, ` +
                `payload ~${Math.round(payloadSize / 1e6)}MB. Save may fail.`,
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
          resolve(migrateSessionData(data));
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

// --- Schema Migration ---

/**
 * Apply in-memory transformations to upgrade stored session data to the current
 * schema version. Add version-specific migration steps as needed.
 * This runs at load time so data is always up-to-date before reaching the store.
 */
function migrateSessionData(data: SessionData): SessionData {
  // Version 1→2: ensure finalization field exists (added in schema v2)
  if (!data.schemaVersion || data.schemaVersion < 2) {
    data.finalization = data.finalization ?? null;
  }
  // Version 2→v3: discipline changed from string to string[]
  if (!data.schemaVersion || data.schemaVersion < 3) {
    const d = (data.metadata as unknown as Record<string, unknown>)?.discipline;
    if (typeof d === "string" && d.length > 0) {
      data.metadata.discipline = [d];
    } else if (typeof d === "string") {
      data.metadata.discipline = undefined;
    }
  }
  data.schemaVersion = SCHEMA_VERSION;
  return data;
}

// --- Module-level DI ---

let currentRepository: SessionRepository = new IdbSessionRepository();

export function getRepository(): SessionRepository {
  return currentRepository;
}

export function setRepository(repo: SessionRepository): void {
  currentRepository = repo;
}

/** Reset to default IDB repository (useful for test cleanup) */
export function resetRepository(): void {
  currentRepository = new IdbSessionRepository();
}
