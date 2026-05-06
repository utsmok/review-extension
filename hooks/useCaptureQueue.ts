import { useRef } from "react";

/**
 * Serial capture queue — prevents concurrent captures from interleaving.
 * Queues up to MAX_QUEUE captures; additional clicks are rejected.
 */
export const MAX_QUEUE = 4;

export function useCaptureQueue() {
  const queueRef = useRef<(() => Promise<void>)[]>([]);
  const runningRef = useRef(false);

  function enqueue(fn: () => Promise<void>) {
    if (queueRef.current.length >= MAX_QUEUE) return;
    queueRef.current.push(fn);
    drain();
  }

  async function drain() {
    if (runningRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    runningRef.current = true;
    try {
      await next();
    } finally {
      runningRef.current = false;
      drain();
    }
  }

  const isCapturing = () => runningRef.current || queueRef.current.length > 0;

  return { enqueue, isCapturing };
}
