import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SessionMetadata, Settings } from "@/lib/types";

interface RegistryState {
  sessionIndex: Record<string, SessionMetadata>;
  activeSessionId: string | null;
  settings: Settings;

  setActiveSessionId: (id: string | null) => void;
  addSession: (metadata: SessionMetadata) => void;
  deleteSession: (id: string) => void;
  markSessionDone: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
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
        preferredRubric: "trust-full",
      },

      setActiveSessionId: (id) => set({ activeSessionId: id }),

      addSession: (metadata) =>
        set((s) => ({
          sessionIndex: { ...s.sessionIndex, [metadata.id]: metadata },
          activeSessionId: metadata.id,
        })),

      deleteSession: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.sessionIndex;
          return {
            sessionIndex: rest,
            activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
          };
        }),

      markSessionDone: (id) =>
        set((s) => ({
          sessionIndex: s.sessionIndex[id]
            ? { ...s.sessionIndex, [id]: { ...s.sessionIndex[id], status: "done" as const } }
            : s.sessionIndex,
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      updateSessionMetadata: (id, patch) =>
        set((s) => ({
          sessionIndex: s.sessionIndex[id]
            ? { ...s.sessionIndex, [id]: { ...s.sessionIndex[id], ...patch } }
            : s.sessionIndex,
        })),
    }),
    { name: "trust-review-registry" },
  ),
);
