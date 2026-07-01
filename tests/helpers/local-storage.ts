import { vi } from "vitest";

/**
 * Zustand persist captures window.localStorage at import time.
 * WXT jsdom provides a broken localStorage — stub it BEFORE store imports.
 *
 * Used as a Vitest setupFile so it runs before any test module.
 * Also importable in individual tests that need `_lsStore` for assertions.
 */
const store: Record<string, string> = {};

vi.hoisted(() => {
  const shim = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
  globalThis.localStorage = shim as Storage;
  // dnd-kit (used by SortableItem) accesses ResizeObserver at import time.
  // jsdom doesn't provide it — stub before any dnd-kit module resolves.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

export { store as localStorageStore };
