import { create } from "zustand";
import type { Capture, Evaluation, SessionData, SessionMetadata, StoreStatus } from "@/lib/types";

interface SessionState {
  status: StoreStatus;
  session: SessionMetadata | null;
  captures: Capture[];
  evaluations: Evaluation[];
  questionModes: Record<string, "expert" | "standard">;

  loadSession: (data: SessionData) => void;
  clear: () => void;
  setStatus: (s: StoreStatus) => void;
  updateMetadata: (patch: Partial<SessionMetadata>) => void;

  addCapture: (capture: Capture) => void;
  updateCapture: (id: string, patch: Partial<Capture>) => void;
  removeCapture: (id: string) => void;

  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void;
  setQuestionMode: (rubricId: string, mode: "expert" | "standard") => void;
  linkCaptureToRubric: (captureId: string, rubricId: string) => void;
  unlinkCaptureFromRubric: (captureId: string, rubricId: string) => void;
}

const emptyState = {
  status: "empty" as StoreStatus,
  session: null as SessionMetadata | null,
  captures: [] as Capture[],
  evaluations: [] as Evaluation[],
  questionModes: {} as Record<string, "expert" | "standard">,
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...emptyState,

  loadSession: (data: SessionData) =>
    set({
      status: "active",
      session: data.metadata,
      captures: data.captures,
      evaluations: data.evaluations,
      questionModes: data.questionModes,
    }),

  clear: () => set(emptyState),

  setStatus: (s: StoreStatus) => set({ status: s }),

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

  setQuestionMode: (rubricId, mode) =>
    set((s) => ({ questionModes: { ...s.questionModes, [rubricId]: mode } })),

  linkCaptureToRubric: (captureId, rubricId) =>
    set((s) => {
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

      return { evaluations };
    }),

  unlinkCaptureFromRubric: (captureId, rubricId) =>
    set((s) => ({
      evaluations: s.evaluations.map((e) =>
        e.rubricId === rubricId
          ? {
              ...e,
              explicitEvidenceIds: e.explicitEvidenceIds.filter((id) => id !== captureId),
            }
          : e,
      ),
    })),
}));
