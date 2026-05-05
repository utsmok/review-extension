import type { SessionData } from "@/lib/types";

const DB_NAME = "trust-review-sessions";
const STORE_NAME = "sessions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
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

// Cached connection singleton
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB();
    dbPromise
      .then((db) => {
        db.onclose = () => {
          dbPromise = null;
        };
        db.onerror = () => {
          dbPromise = null;
        };
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
      })
      .catch(() => {
        dbPromise = null;
      });
  }
  return dbPromise;
}

export async function saveToIDB(id: string, data: SessionData): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(data, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("Transaction aborted"));
  });
}

export async function loadFromIDB(id: string): Promise<SessionData | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(new Error("Transaction aborted"));
  });
}

export async function deleteFromIDB(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("Transaction aborted"));
  });
}

export function saveToIDBFireAndForget(id: string, data: SessionData): void {
  saveToIDB(id, data).catch((err) => console.error("Fire-and-forget IDB save failed:", err));
}
