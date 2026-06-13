import { idbRequest, openIDBStore } from "./idb-helpers";
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

const getDB = openIDBStore(DB_NAME, STORE_NAME, DB_VERSION, (db) => {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: "id" });
  }
});

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
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob);
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    await promise;
  } catch {
    // IDB unavailable (e.g. jsdom test environment) — screenshots stay in-memory only
  }
}

/** Load a single screenshot blob by capture ID. Returns null if not found or IDB unavailable. */
export async function loadScreenshot(id: string): Promise<ScreenshotBlob | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    return (await idbRequest<ScreenshotBlob | null>(req)) ?? null;
  } catch {
    return null;
  }
}

/** Bulk-load screenshots for multiple capture IDs. Returns a Map keyed by ID. */
export async function loadAllScreenshots(ids: string[]): Promise<Map<string, ScreenshotBlob>> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    const all = await idbRequest<ScreenshotBlob[]>(req);
    const idSet = new Set(ids);
    const result = new Map<string, ScreenshotBlob>();
    for (const item of all) {
      if (idSet.has(item.id)) {
        result.set(item.id, item);
      }
    }
    return result;
  } catch {
    return new Map();
  }
}

/** Delete a single screenshot blob by capture ID. No-op if IDB unavailable. */
export async function deleteScreenshot(id: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    await promise;
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
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      const blob: ScreenshotBlob = req.result ?? { id, screenshotBase64: "" };
      blob.annotatedScreenshotBase64 = annotatedScreenshotBase64;
      store.put(blob);
    };
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    await promise;
  } catch {
    // IDB unavailable — annotated data stays in-memory only
  }
}

/** Delete screenshots for a set of capture IDs (e.g., on session deletion). */
export async function deleteScreenshotsForCaptures(captureIds: string[]): Promise<void> {
  if (captureIds.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of captureIds) {
      store.delete(id);
    }
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    await promise;
  } catch {
    // IDB unavailable — no-op
  }
}
/** Clear all screenshots from the store. Used for cleanup/reset. */
export async function deleteAllScreenshots(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    await promise;
  } catch {
    // DB may not exist
  }
}
