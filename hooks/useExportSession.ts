import { downloadBlob, exportSession, sanitizeFilename } from "@/lib/export";
import type { ReviewerInfo } from "@/lib/export-pipeline";
import * as lifecycle from "@/lib/session-lifecycle";
import type { RubricData } from "@/lib/types";
import { useRegistryStore } from "@/stores/registry";
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

      const { reviewerName, reviewerEmail } = useRegistryStore.getState().settings;
      const reviewer: ReviewerInfo | undefined =
        reviewerName || reviewerEmail ? { name: reviewerName, email: reviewerEmail } : undefined;
      const blob = await exportSession(s, c, e, rubric, f, qn, reviewer);

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
