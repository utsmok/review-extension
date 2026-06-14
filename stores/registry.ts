import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionMetadata, Settings } from "@/lib/types";

/**
 * Zustand registry store, persisted to localStorage via zustand/middleware persist.
 * The `settings` field contains reviewer name and email, stored unencrypted
 * in localStorage. The browser's origin-scoped storage is accessible to
 * extensions sharing the same origin.
 */
interface RegistryState {
  /** All known sessions keyed by session UUID. */
  sessionIndex: Record<string, SessionMetadata>;
  /** UUID of the currently active session, or null. */
  activeSessionId: string | null;
  /** Global reviewer settings (name, email, Labs flags). */
  settings: Settings;

  /** Set or clear the currently active session by ID. */
  setActiveSessionId: (id: string | null) => void;
  /** Register a new session and make it active. */
  addSession: (metadata: SessionMetadata) => void;
  /** Remove a session from the index. Clears activeSessionId if it matched. */
  deleteSession: (id: string) => void;
  /** Mark a session as finalized ("done"). No-op if the ID is not in the index. */
  markSessionDone: (id: string) => void;
  /** Shallow-merge settings fields (reviewer name, email). */
  updateSettings: (patch: Partial<Settings>) => void;
  /** Update metadata fields on a registered session. No-op if the ID is not in the index. */
  updateSessionMetadata: (id: string, patch: Partial<SessionMetadata>) => void;
}

export const useRegistryStore = create<RegistryState>()(
  persist(
    (set) => ({
      sessionIndex: {},
      activeSessionId: null,
      settings: {
        reviewerName: "",
        reviewerEmail: "",
        labs: {},
      },

      /** Set or clear the currently active session by ID. */
      setActiveSessionId: (id) => set({ activeSessionId: id }),

      /** Register a new session and make it active. */
      addSession: (metadata) =>
        set((s) => ({
          sessionIndex: { ...s.sessionIndex, [metadata.id]: metadata },
          activeSessionId: metadata.id,
        })),

      /** Remove a session from the index. Clears activeSessionId if it matched. */
      deleteSession: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.sessionIndex;
          return {
            sessionIndex: rest,
            activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
          };
        }),

      /** Mark a session as finalized ("done"). No-op if the ID is not in the index. */
      markSessionDone: (id) =>
        set((s) => ({
          sessionIndex: s.sessionIndex[id]
            ? { ...s.sessionIndex, [id]: { ...s.sessionIndex[id], status: "done" as const } }
            : s.sessionIndex,
        })),

      /** Shallow-merge settings fields (reviewer name, email). */
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      /** Update metadata fields on a registered session. No-op if the ID is not in the index. */
      updateSessionMetadata: (id, patch) =>
        set((s) => ({
          sessionIndex: s.sessionIndex[id]
            ? { ...s.sessionIndex, [id]: { ...s.sessionIndex[id], ...patch } }
            : s.sessionIndex,
        })),
    }),
    {
      name: "trust-review-registry",
      merge: (persisted, current) => {
        const p = persisted as RegistryState;
        const persistedSettings = { ...(p?.settings ?? {}) } as Record<string, unknown>;
        delete persistedSettings.preferredRubric;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...persistedSettings,
            labs: {
              ...current.settings.labs,
              ...(p?.settings?.labs ?? {}),
            },
          },
        };
      },
    },
  ),
);
