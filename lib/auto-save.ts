/**
 * Auto-save singleton — subscribes to session store changes once and persists
 * to IndexedDB with a single debounced timer. Eliminates N-way amplification
 * that occurred when each consumer created its own subscription.
 *
 * Also registers a single visibilitychange listener to flush on tab-switch.
 */
import { useSessionStore } from "@/stores/session";
import { useRegistryStore } from "@/stores/registry";
import { saveToIDB } from "@/lib/session-storage";

let timerRef: ReturnType<typeof setTimeout> | undefined;
let unsub: (() => void) | null = null;
let visibilityHandler: (() => void) | null = null;
let initialized = false;

function flush(): void {
  const { session: s, captures: c, evaluations: e, finalization: f } = useSessionStore.getState();
  const activeId = useRegistryStore.getState().activeSessionId;
  if (s && activeId) {
    saveToIDB(activeId, { metadata: s, captures: c, evaluations: e, finalization: f });
  }
}

/**
 * Initialize the auto-save singleton. Safe to call multiple times —
 * subsequent calls are no-ops. Call from a single root component (App.tsx).
 */
export function initAutoSave(): void {
  if (initialized) return;
  initialized = true;

  // Effect 2: Debounced auto-save on every store change
  unsub = useSessionStore.subscribe(() => {
    const { status } = useSessionStore.getState();
    const activeId = useRegistryStore.getState().activeSessionId;
    if (status !== "active" || !activeId) return;

    if (timerRef !== undefined) clearTimeout(timerRef);
    timerRef = setTimeout(() => {
      flush();
    }, 300);
  });

  // Effect 3: Flush on panel close / tab switch (single listener)
  visibilityHandler = () => {
    if (document.visibilityState === "hidden") {
      // Cancel pending debounce — we're flushing now
      if (timerRef !== undefined) clearTimeout(timerRef);
      timerRef = undefined;
      flush();
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);
}

/**
 * Tear down auto-save listeners. Only needed for hot-module reload in dev.
 */
export function teardownAutoSave(): void {
  if (unsub) {
    unsub();
    unsub = null;
  }
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = null;
  }
  if (timerRef !== undefined) {
    clearTimeout(timerRef);
    timerRef = undefined;
  }
  initialized = false;
}
