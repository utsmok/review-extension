import { saveAnnotatedScreenshot, saveScreenshot, deleteScreenshot } from "@/lib/screenshot-store";
import { create } from "zustand";
import type {
  Capture,
  Evaluation,
  ReviewFinalization,
  SessionData,
  SessionMetadata,
  StoreStatus,
} from "@/lib/types";

/**
 * Zustand session store. Session metadata (including reviewer-provided fields
 * like toolName, company, and notes) is stored unencrypted in IndexedDB via
 * the session-repository layer. IDB is accessible to extensions sharing the
 * same origin.
 */
interface SessionState {
  status: StoreStatus;
  session: SessionMetadata | null;
  captures: Capture[];
  evaluations: Evaluation[];
  finalization: ReviewFinalization | null;

  loadSession: (data: SessionData) => void;
  clear: () => void;
  setStatus: (s: StoreStatus) => void;
  updateMetadata: (patch: Partial<SessionMetadata>) => void;

  addCapture: (capture: Capture) => void;
  updateCapture: (id: string, patch: Partial<Capture>) => void;
  removeCapture: (id: string) => void;

  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void;
  linkCaptureToRubric: (captureId: string, rubricId: string) => void;
  unlinkCaptureFromRubric: (captureId: string, rubricId: string) => void;
  linkCaptureToMetadataField: (captureId: string, field: string) => void;

  setFinalization: (data: ReviewFinalization | null) => void;
}

const emptyState = {
  status: "empty" as StoreStatus,
  session: null as SessionMetadata | null,
  captures: [] as Capture[],
  evaluations: [] as Evaluation[],
  finalization: null as ReviewFinalization | null,
};

export const useSessionStore = create<SessionState>()((set) => ({
  ...emptyState,

  loadSession: (data: SessionData) =>
    set({
      status: "active",
      session: data.metadata,
      captures: data.captures,
      evaluations: data.evaluations,
      finalization: data.finalization ?? null,
    }),

  clear: () => set(emptyState),

  setStatus: (s: StoreStatus) => set({ status: s }),

  updateMetadata: (patch) =>
    set((s) => ({
      session: s.session ? { ...s.session, ...patch } : null,
    })),

  addCapture: (capture) => {
    // Save heavy screenshot data to separate IDB store immediately
    saveScreenshot(capture).catch((err) => {
      console.error("Failed to persist screenshot:", err);
    });
    set((s) => ({ captures: [...s.captures, capture] }));
  },

  updateCapture: (id, patch) =>
    set((s) => {
      // If annotated screenshot is being updated, persist to screenshot store
      if (patch.annotatedScreenshotBase64) {
        saveAnnotatedScreenshot(id, patch.annotatedScreenshotBase64).catch((err) => {
          console.error("Failed to persist annotated screenshot:", err);
        });
      }
      return {
        captures: s.captures.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      };
    }),

  removeCapture: (id) =>
    set((s) => {
      // Delete screenshot from separate IDB store
      deleteScreenshot(id).catch((err) => {
        console.error("Failed to delete screenshot:", err);
      });
      const removed = s.captures.find((c) => c.id === id);
      const metadataPatch: Partial<SessionMetadata> = {};
      if (removed?.metadataField === "toolLogoUrl") metadataPatch.toolLogoUrl = "";
      if (removed?.metadataField === "termsConditionsUrl") metadataPatch.termsConditionsUrl = "";
      return {
        captures: s.captures.filter((c) => c.id !== id),
        evaluations: s.evaluations.map((e) => ({
          ...e,
          explicitEvidenceIds: e.explicitEvidenceIds.filter((eid) => eid !== id),
        })),
        session: s.session ? { ...s.session, ...metadataPatch } : s.session,
      };
    }),

  // Shallow-merges patch into existing evaluation (preserves notes, explicitEvidenceIds, etc.).
  // Callers may pass partial updates — only the supplied fields are overwritten.
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

  linkCaptureToMetadataField: (captureId, field) =>
    set((s) => ({
      captures: s.captures.map((c) => (c.id === captureId ? { ...c, metadataField: field } : c)),
    })),

  setFinalization: (data) =>
    set((s) => ({
      finalization: data,
      session: s.session ? { ...s.session, finalizedAt: data?.finalizedAt } : null,
    })),
}));
