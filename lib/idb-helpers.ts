/**
 * Minimal IDB helper shared by session-repository and screenshot-store.
 * Uses Promise.withResolvers() for linear control flow.
 */

/** Open an IndexedDB database with a singleton promise and auto-reconnect. */
export function openIDBStore(
  dbName: string,
  _storeName: string,
  version: number,
  onUpgrade: (db: IDBDatabase) => void,
): () => Promise<IDBDatabase> {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function open(): Promise<IDBDatabase> {
    const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => onUpgrade(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error(`Database "${dbName}" upgrade blocked: close other tabs and retry`));
    return promise;
  }

  function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = open();
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

  return getDB;
}

/**
 * Wrap an IDB request in a promise using Promise.withResolvers().
 * Provides a terse way to await IDB transaction results.
 */
export function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  return promise;
}
