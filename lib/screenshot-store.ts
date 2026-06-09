import type { Capture } from "./types";

const DB_NAME = "trust-review-screenshots";
const STORE_NAME = "screenshots";
const DB_VERSION = 1;

export interface ScreenshotBlob {
  /** Capture ID */
  id: string;
  /** Base64 data-URL of the original screenshot */
  screenshotBase64: string;
  /** Base64 data-URL of the annotated screenshot, if any */
  annotatedScreenshotBase64?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Screenshots DB blocked"));
  });
}

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

/** Persist a capture's screenshot (and optional annotation) to the separate IDB store. Silently fails if IDB is unavailable. */
export async function saveScreenshot(capture: Capture): Promise<void> {
  try {
    const db = await getDB();
    const blob: ScreenshotBlob = {
      id: capture.id,
      screenshotBase64: capture.screenshotBase64,
    };
    if (capture.annotatedScreenshotBase64) {
      blob.annotatedScreenshotBase64 = capture.annotatedScreenshotBase64;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IDB unavailable (e.g. jsdom test environment) — screenshots stay in-memory only
  }
}

/** Load a single screenshot blob by capture ID. Returns null if not found or IDB unavailable. */
export async function loadScreenshot(id: string): Promise<ScreenshotBlob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Bulk-load screenshots for multiple capture IDs. Returns a Map keyed by ID. */
export async function loadAllScreenshots(ids: string[]): Promise<Map<string, ScreenshotBlob>> {
  try {
    const db = await getDB();
    const result = new Map<string, ScreenshotBlob>();
    return new Promise((resolve, _reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      let pending = ids.length;
      if (pending === 0) {
        resolve(result);
        return;
      }
      for (const id of ids) {
        const req = store.get(id);
        req.onsuccess = () => {
          if (req.result) result.set(id, req.result);
          pending--;
          if (pending === 0) resolve(result);
        };
        req.onerror = () => {
          pending--;
          if (pending === 0) resolve(result);
        };
      }
    });
  } catch {
    return new Map();
  }
}

/** Delete a single screenshot blob by capture ID. No-op if IDB unavailable. */
export async function deleteScreenshot(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IDB unavailable — no-op
  }
}

/** Update only the annotated screenshot for a capture (reads existing blob, patches, writes back). */
export async function saveAnnotatedScreenshot(
  id: string,
  annotatedScreenshotBase64: string,
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const blob: ScreenshotBlob = req.result ?? { id, screenshotBase64: "" };
        blob.annotatedScreenshotBase64 = annotatedScreenshotBase64;
        store.put(blob);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IDB unavailable — annotated data stays in-memory only
  }
}

/** Delete screenshots for a set of capture IDs (e.g., on session deletion). */
export async function deleteScreenshotsForCaptures(captureIds: string[]): Promise<void> {
  if (captureIds.length === 0) return;
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const id of captureIds) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IDB unavailable — no-op
  }
}
/** Clear all screenshots from the store. Used for cleanup/reset. */
export async function deleteAllScreenshots(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // DB may not exist
  }
}
