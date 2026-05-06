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
export const SCHEMA_VERSION = 2;

// --- IdbSessionRepository ---

export class IdbSessionRepository implements SessionRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
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
      const db = await this.getDB();
      data.schemaVersion = SCHEMA_VERSION;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(data, id);
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
      req.onsuccess = () => resolve(req.result ?? null);
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
