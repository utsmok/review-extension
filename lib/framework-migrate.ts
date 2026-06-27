import { getRepository } from "@/lib/session-repository";
import type { SessionData, SessionMetadata } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";

/** Rewrite oldVal → newVal in one metadata array field across every stored session. */
export async function migrateOptionRename(
  field: string,
  oldVal: string,
  newVal: string,
): Promise<number> {
  const repo = getRepository();
  const { sessionIndex } = useRegistryStore.getState();
  let touched = 0;
  for (const id of Object.keys(sessionIndex)) {
    const data: SessionData | null = await repo.load(id);
    if (!data) continue;
    const arr = (data.metadata as unknown as Record<string, unknown>)[field];
    if (!Array.isArray(arr) || !arr.includes(oldVal)) continue;
    const next = arr.map((v) => (v === oldVal ? newVal : v));
    (data.metadata as unknown as Record<string, unknown>)[field] = next;
    await repo.save(id, data);
    useRegistryStore
      .getState()
      .updateSessionMetadata(id, { [field]: next } as Partial<SessionMetadata>);
    touched++;
  }
  return touched;
}
