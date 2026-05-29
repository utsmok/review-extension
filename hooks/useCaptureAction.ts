import { useCallback, useState } from "react";
import { toastError } from "@/stores/toast";

export function useCaptureAction() {
  const [capturing, setCapturing] = useState(false);

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T | null> => {
    setCapturing(true);
    try {
      return await action();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Capture failed");
      return null;
    } finally {
      setCapturing(false);
    }
  }, []);

  return { capturing, run };
}
