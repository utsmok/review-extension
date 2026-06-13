import { create } from "zustand";
import { deleteScreenshot, saveAnnotatedScreenshot, saveScreenshot } from "@/lib/screenshot-store";
import type {
  Capture,
  Evaluation,
  ReviewFinalization,
  SessionData,
  SessionMetadata,
  StoreStatus,
} from "@/lib/types";
import { toastError, toastSuccess } from "@/stores/toast";

export interface QuickNote {
  id: string;
  text: string;
  timestamp: string;
}

/**
 * Zustand session store. Session metadata (including reviewer-provided fields
 * like toolName, company, and notes) is stored unencrypted in IndexedDB via
 * the session-repository layer. IDB is accessible to extensions sharing the
 * same origin.
 */
export interface SessionState {
  status: StoreStatus;
  session: SessionMetadata | null;
  captures: Capture[];
  evaluations: Evaluation[];
  finalization: ReviewFinalization | null;
  quickNotes: QuickNote[];
  /** Captures pending permanent deletion (5-second undo window). */
  recentlyDeleted: Array<{
    capture: Capture;
    evidenceLinks: Record<string, string[]>;
    metadataPatch: Partial<SessionMetadata>;
  }>;

  /** Hydrate the store from a full SessionData object (e.g. after IDB load). */
  loadSession: (data: SessionData) => void;
  /** Reset store to empty state. */
  clear: () => void;
  /** Update the store status indicator. */
  setStatus: (s: StoreStatus) => void;
  /** Shallow-merge metadata fields onto the active session. No-op if no session is loaded. */
  updateMetadata: (patch: Partial<SessionMetadata>) => void;

  /** Add a capture and persist its screenshot to IDB. */
  addCapture: (capture: Capture) => void;
  /** Update capture fields by ID. Persists annotated screenshots to IDB when present. */
  updateCapture: (id: string, patch: Partial<Capture>) => void;
  /** Soft-delete a capture with a 5-second undo window before IDB cleanup. */
  removeCapture: (id: string) => void;
  /** Undo the most recent capture deletion within the undo window. */
  undoDeleteCapture: () => void;

  /** Set or upsert an evaluation for a rubric question (partial merge). */
  setEvaluation: (rubricId: string, patch: Partial<Evaluation>) => void;
  /** Add a capture as explicit evidence for a rubric question. */
  linkCaptureToRubric: (captureId: string, rubricId: string) => void;
  /** Remove a capture from a rubric question's explicit evidence list. */
  unlinkCaptureFromRubric: (captureId: string, rubricId: string) => void;
  /** Tag a capture as evidence for a specific metadata field (e.g. "toolLogoUrl"). */
  linkCaptureToMetadataField: (captureId: string, field: string) => void;

  /** Store the finalization verdict and update the session's finalizedAt timestamp. */
  setFinalization: (data: ReviewFinalization | null) => void;

  /** Add a quick note entry. */
  addQuickNote: (note: QuickNote) => void;
  /** Remove a quick note by ID. */
  removeQuickNote: (id: string) => void;
}

const emptyState = {
  status: "empty" as StoreStatus,
  session: null as SessionMetadata | null,
  captures: [] as Capture[],
  evaluations: [] as Evaluation[],
  finalization: null as ReviewFinalization | null,
  quickNotes: [] as QuickNote[],
  recentlyDeleted: [] as SessionState["recentlyDeleted"],
};

/** Timer for the 5-second undo window before permanent IDB screenshot deletion. */
let deleteTimer: ReturnType<typeof setTimeout> | null = null;

export const useSessionStore = create<SessionState>()((set, get) => ({
  ...emptyState,

  // ── Session lifecycle ──────────────────────────────────────────────────

  loadSession: (data: SessionData) =>
    set({
      status: "active",
      session: data.metadata,
      captures: data.captures,
      evaluations: data.evaluations,
      finalization: data.finalization ?? null,
      quickNotes: data.quickNotes ?? [],
      recentlyDeleted: [],
    }),

  clear: () => {
    if (deleteTimer !== null) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }
    set(emptyState);
  },

  setStatus: (s) => set({ status: s }),

  updateMetadata: (patch) =>
    set((s) => ({
      session: s.session
        ? { ...s.session, ...patch }
        : (() => {
            console.warn("updateMetadata called with no active session");
            return null;
          })(),
    })),

  // ── Capture management ─────────────────────────────────────────────────

  addCapture: (capture) => {
    // Save heavy screenshot data to separate IDB store immediately
    saveScreenshot(capture).catch((err) => {
      console.error("Failed to persist screenshot to IndexedDB:", err);
      toastError("Failed to save screenshot. Storage may be full.");
    });
    set((s) => ({ captures: [...s.captures, capture] }));
  },

  updateCapture: (id, patch) =>
    set((s) => {
      // If annotated screenshot is being updated, persist to screenshot store
      if (patch.annotatedScreenshotBase64) {
        saveAnnotatedScreenshot(id, patch.annotatedScreenshotBase64).catch((err) => {
          console.error("Failed to persist annotated screenshot to IndexedDB:", err);
          toastError("Failed to save annotation. Storage may be full.");
        });
      }
      return {
        captures: s.captures.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      };
    }),

  removeCapture: (id) => {
    const state = get();
    const removed = state.captures.find((c) => c.id === id);
    if (!removed) return;

    // Snapshot the evidence links for this capture across all evaluations
    const evidenceLinks: Record<string, string[]> = {};
    for (const e of state.evaluations) {
      if (e.explicitEvidenceIds.includes(id)) {
        evidenceLinks[e.rubricId] = e.explicitEvidenceIds;
      }
    }

    // Snapshot the metadata values before clearing (for undo restoration)
    const previousMetadata: Partial<SessionMetadata> = {};
    const metadataPatch: Partial<SessionMetadata> = {};
    if (removed.metadataField === "toolLogoUrl" && state.session) {
      previousMetadata.toolLogoUrl = state.session.toolLogoUrl ?? "";
      metadataPatch.toolLogoUrl = "";
    }
    if (removed.metadataField === "termsConditionsUrl" && state.session) {
      previousMetadata.termsConditionsUrl = state.session.termsConditionsUrl ?? "";
      metadataPatch.termsConditionsUrl = "";
    }

    // Store for undo, then remove from active state
    set((s) => ({
      captures: s.captures.filter((c) => c.id !== id),
      evaluations: s.evaluations.map((e) => ({
        ...e,
        explicitEvidenceIds: e.explicitEvidenceIds.filter((eid) => eid !== id),
      })),
      session: s.session ? { ...s.session, ...metadataPatch } : s.session,
      recentlyDeleted: [
        ...s.recentlyDeleted,
        { capture: removed, evidenceLinks, metadataPatch: previousMetadata },
      ],
    }));

    // Cancel any prior pending delete timer
    if (deleteTimer !== null) clearTimeout(deleteTimer);

    // Show undo toast
    toastSuccess("Capture deleted", {
      label: "Undo",
      onClick: () => get().undoDeleteCapture(),
    });

    // Schedule permanent deletion after 5 seconds
    deleteTimer = setTimeout(() => {
      deleteTimer = null;
      const current = get();
      if (current.recentlyDeleted.length > 0) {
        // Permanently delete ALL pending screenshots at once
        for (const item of current.recentlyDeleted) {
          deleteScreenshot(item.capture.id).catch((err) => {
            console.error("Failed to delete screenshot from IndexedDB:", err);
            toastError("Failed to delete a screenshot from storage. It may need manual cleanup.");
          });
        }
        set({ recentlyDeleted: [] });
      }
    }, 5000);
  },

  undoDeleteCapture: () => {
    const state = get();
    if (state.recentlyDeleted.length === 0) return;

    // Cancel the pending permanent deletion timer
    if (deleteTimer !== null) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }

    const last = state.recentlyDeleted[state.recentlyDeleted.length - 1];

    // Restore metadata field values from before deletion
    const metadataPatch = last.metadataPatch;

    set((s) => {
      // Restore evidence links
      const evals = s.evaluations.map((e) => {
        const originalIds = last.evidenceLinks[e.rubricId];
        if (originalIds) {
          return { ...e, explicitEvidenceIds: originalIds };
        }
        return e;
      });

      return {
        captures: [...s.captures, last.capture],
        evaluations: evals,
        session: s.session ? { ...s.session, ...metadataPatch } : s.session,
        recentlyDeleted: s.recentlyDeleted.slice(0, -1),
      };
    });
  },
  // ── Evaluation management ──────────────────────────────────────────────

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

  // ── Finalization ───────────────────────────────────────────────────────

  setFinalization: (data) =>
    set((s) => ({
      finalization: data,
      session: s.session
        ? { ...s.session, finalizedAt: data?.finalizedAt }
        : (() => {
            console.warn("setFinalization called with no active session");
            return null;
          })(),
    })),

  // ── Quick Notes ────────────────────────────────────────────────────────

  addQuickNote: (note) => set((s) => ({ quickNotes: [...s.quickNotes, note] })),
  removeQuickNote: (id) => set((s) => ({ quickNotes: s.quickNotes.filter((n) => n.id !== id) })),
}));
