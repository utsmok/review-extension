import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { idbRequest, openIDBStore } from "@/lib/idb-helpers";

describe("openIDBStore", () => {
  it("opens a database and returns a getDB function", async () => {
    const getDB = openIDBStore("test-db", "test-store", 1, (db) => {
      if (!db.objectStoreNames.contains("test-store")) {
        db.createObjectStore("test-store", { keyPath: "id" });
      }
    });

    const db = await getDB();
    expect(db.name).toBe("test-db");
    expect(db.objectStoreNames.contains("test-store")).toBe(true);
    db.close();
  });

  it("returns the same DB instance on repeated calls (singleton)", async () => {
    const getDB = openIDBStore("test-singleton", "store", 1, (db) => {
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store", { keyPath: "id" });
      }
    });

    const db1 = await getDB();
    const db2 = await getDB();
    expect(db1).toBe(db2);
    db1.close();
  });

  it("allows writing and reading a record via the store", async () => {
    const getDB = openIDBStore("test-crud", "items", 1, (db) => {
      if (!db.objectStoreNames.contains("items")) {
        db.createObjectStore("items", { keyPath: "id" });
      }
    });

    const db = await getDB();
    const tx = db.transaction("items", "readwrite");
    const store = tx.objectStore("items");

    await idbRequest(store.put({ id: "a", value: 42 }));
    const result = await idbRequest(store.get("a"));

    expect(result).toEqual({ id: "a", value: 42 });

    const allKeys = await idbRequest(store.getAllKeys());
    expect(allKeys).toContain("a");

    db.close();
  });

  it("resolves to undefined for missing keys", async () => {
    const getDB = openIDBStore("test-miss", "store", 1, (db) => {
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store", { keyPath: "id" });
      }
    });

    const db = await getDB();
    const tx = db.transaction("store", "readonly");
    const result = await idbRequest(tx.objectStore("store").get("nope"));
    expect(result).toBeUndefined();
    db.close();
  });
});

describe("idbRequest", () => {
  it("resolves with the IDB request result", async () => {
    const getDB = openIDBStore("test-idbreq", "store", 1, (db) => {
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store", { keyPath: "id" });
      }
    });

    const db = await getDB();
    const tx = db.transaction("store", "readwrite");
    const store = tx.objectStore("store");

    await idbRequest(store.put({ id: "k1", data: "hello" }));
    const got = await idbRequest(store.get("k1"));

    expect(got).toEqual({ id: "k1", data: "hello" });
    db.close();
  });

  it("rejects when the IDB request fails", async () => {
    const getDB = openIDBStore("test-idbreq-err", "store", 1, (db) => {
      if (!db.objectStoreNames.contains("store")) {
        db.createObjectStore("store", { keyPath: "id" });
      }
    });

    const db = await getDB();
    const tx = db.transaction("store", "readwrite");
    const store = tx.objectStore("store");

    // Put a record first, then try to add a duplicate to trigger ConstraintError
    await idbRequest(store.put({ id: "dup", val: 1 }));
    await expect(idbRequest(store.add({ id: "dup", val: 2 }))).rejects.toThrow();

    db.close();
  });
});
