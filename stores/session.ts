import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Capture, Evaluation, SessionMetadata } from "@/lib/types";

interface SessionState {
  session: SessionMetadata | null;
  captures: Capture[];
  evaluations: Evaluation[];

  startSession: (metadata: SessionMetadata) => void;
  endSession: () => void;
  updateMetadata: (patch: Partial<SessionMetadata>) => void;

  addCapture: (capture: Capture) => void;
  updateCapture: (id: string, patch: Partial<Capture>) => void;
  removeCapture: (id: string) => void;

  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void;
  linkCaptureToRubric: (captureId: string, rubricId: string) => void;
  unlinkCaptureFromRubric: (captureId: string, rubricId: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      captures: [],
      evaluations: [],

      startSession: (metadata) => set({ session: metadata, captures: [], evaluations: [] }),

      endSession: () => set({ session: null, captures: [], evaluations: [] }),

      updateMetadata: (patch) =>
        set((s) => ({
          session: s.session ? { ...s.session, ...patch } : null,
        })),

      addCapture: (capture) => set((s) => ({ captures: [...s.captures, capture] })),

      updateCapture: (id, patch) =>
        set((s) => ({
          captures: s.captures.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      removeCapture: (id) =>
        set((s) => ({
          captures: s.captures.filter((c) => c.id !== id),
          evaluations: s.evaluations.map((e) => ({
            ...e,
            explicitEvidenceIds: e.explicitEvidenceIds.filter((eid) => eid !== id),
          })),
        })),

      setEvaluation: (rubricId, patch) =>
        set((s) => {
          const existing = s.evaluations.findIndex((e) => e.rubricId === rubricId);
          if (existing >= 0) {
            const updated = [...s.evaluations];
            updated[existing] = { ...updated[existing], ...patch } as Evaluation;
            return { evaluations: updated };
          }
          return {
            evaluations: [
              ...s.evaluations,
              { rubricId, notes: "", explicitEvidenceIds: [], ...patch } as Evaluation,
            ],
          };
        }),

      linkCaptureToRubric: (captureId, rubricId) =>
        set((s) => {
          const captures = s.captures.map((c) =>
            c.id === captureId && !c.linkedRubricIds.includes(rubricId)
              ? { ...c, linkedRubricIds: [...c.linkedRubricIds, rubricId] }
              : c,
          );

          const existingIdx = s.evaluations.findIndex((e) => e.rubricId === rubricId);
          let evaluations: Evaluation[];
          if (existingIdx >= 0) {
            evaluations = s.evaluations.map((e) =>
              e.rubricId === rubricId && !e.explicitEvidenceIds.includes(captureId)
                ? {
                    ...e,
                    explicitEvidenceIds: [...e.explicitEvidenceIds, captureId],
                  }
                : e,
            );
          } else {
            evaluations = [
              ...s.evaluations,
              {
                rubricId,
                score: "",
                notes: "",
                explicitEvidenceIds: [captureId],
              },
            ];
          }

          return { captures, evaluations };
        }),

      unlinkCaptureFromRubric: (captureId, rubricId) =>
        set((s) => ({
          captures: s.captures.map((c) =>
            c.id === captureId
              ? {
                  ...c,
                  linkedRubricIds: c.linkedRubricIds.filter((r) => r !== rubricId),
                }
              : c,
          ),
          evaluations: s.evaluations.map((e) =>
            e.rubricId === rubricId
              ? {
                  ...e,
                  explicitEvidenceIds: e.explicitEvidenceIds.filter((id) => id !== captureId),
                }
              : e,
          ),
        })),
    }),
    { name: "trust-review-session" },
  ),
);
