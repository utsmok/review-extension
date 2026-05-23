import { useCallback, useRef, useState } from "react";

/**
 * Serial capture queue — prevents concurrent captures from interleaving.
 * Queues up to MAX_QUEUE captures; additional clicks are rejected.
 */
export const MAX_QUEUE = 4;

export function useCaptureQueue() {
  const [isCapturing, setIsCapturing] = useState(false);
  const queueRef = useRef<(() => Promise<void>)[]>([]);
  const runningRef = useRef(false);

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    runningRef.current = true;
    setIsCapturing(true);
    try {
      await next();
    } finally {
      runningRef.current = false;
      if (queueRef.current.length > 0) {
        drain();
      } else {
        setIsCapturing(false);
      }
    }
  }, []);

  const enqueue = useCallback(
    (fn: () => Promise<void>) => {
      if (queueRef.current.length >= MAX_QUEUE) return;
      queueRef.current.push(fn);
      drain();
    },
    [drain],
  );

  return { enqueue, isCapturing };
}
