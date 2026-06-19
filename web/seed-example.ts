import { importSessionFromZipFile } from "@/lib/session-lifecycle";
import { useRegistryStore } from "@/stores/registry";

/**
 * Static example review served alongside the demo. Relative to the demo entry
 * at `site/try/index.html`, so `../example/` resolves to `site/example/`.
 * Sibling of the downloadable .zip linked from the marketing site.
 */
const EXAMPLE_ZIP_URL = "../example/trust-review-ai2-asta.zip";

/**
 * localStorage flag so we never re-seed on top of a user's own data after they
 * delete the example. IDB itself also persists, so on a second visit the
 * registry is non-empty and we bail before any fetch.
 */
const SEEDED_FLAG = "trust-web-example-seeded";

/**
 * Synchronous check for whether the demo should seed the example on this mount.
 * Used to set the initial loading state so the UI shows a loading screen only
 * on a genuinely fresh visit (no prior seed flag and no sessions in the
 * persisted registry) — never on a return visit where the example is already
 * loaded.
 */
export function shouldSeedExample(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(SEEDED_FLAG)) return false;
  const { sessionIndex } = useRegistryStore.getState();
  return Object.keys(sessionIndex).length === 0;
}

/**
 * Seed the web demo with the Ai2 Asta example review on first visit.
 *
 * Runs only when the registry is empty AND we have not seeded before. Fetches
 * the example .zip and routes it through the real import pipeline, then marks
 * the new session active — the normal `useActiveSession` effect loads it from
 * IDB into the store. Non-fatal: a failed fetch/import just leaves the user on
 * the empty session manager so the rest of the demo still works.
 *
 * @returns the new session id, or null if seeding was skipped or failed.
 */
export async function seedExampleSession(): Promise<string | null> {
  if (!shouldSeedExample()) return null;

  try {
    const res = await fetch(EXAMPLE_ZIP_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    const id = await importSessionFromZipFile(blob);
    localStorage.setItem(SEEDED_FLAG, "1");
    useRegistryStore.getState().setActiveSessionId(id);
    return id;
  } catch (err) {
    console.warn("Example seed failed (non-fatal):", err);
    return null;
  }
}
