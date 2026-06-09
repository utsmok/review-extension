import { downloadBlob, exportSession, sanitizeFilename } from "@/lib/export";
import * as lifecycle from "@/lib/session-lifecycle";
import type { RubricData } from "@/lib/types";
import { useSessionStore } from "@/stores/session";
import { toastError } from "@/stores/toast";

/**
 * Hook that provides the export action for the active session.
 * Extracted from useActiveSession to separate export concerns.
 */
export function useExportSession() {
  const exportAndClose = async (rubric: RubricData) => {
    try {
      const {
        session: s,
        captures: c,
        evaluations: e,
        finalization: f,
        quickNotes: qn,
      } = useSessionStore.getState();
      if (!s) throw new Error("No active session");
      const blob = await exportSession(s, c, e, rubric, f, qn);
      if (blob.size === 0) throw new Error("Export produced an empty file. Please try again.");
      downloadBlob(blob, `TRUST_Review_${sanitizeFilename(s.toolName)}.zip`);
      // Save session to IDB after export (no close — user can continue working)
      await lifecycle.saveCurrentSession();
      return { blobSize: blob.size };
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Export failed. Please try again.");
      return undefined;
    }
  };

  return { exportAndClose };
}
