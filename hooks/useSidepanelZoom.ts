import { useEffect } from "react";

const STORAGE_KEY = "omp-sidepanel-zoom";
const MIN = 0.8;
const MAX = 1.5;
const STEP = 0.1;
const DEFAULT = 1.0;

function clampZoom(v: number): number {
  return Math.round(Math.min(MAX, Math.max(MIN, v)) * 100) / 100;
}

function loadZoom(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT;
  const parsed = Number.parseFloat(stored);
  return Number.isNaN(parsed) ? DEFAULT : clampZoom(parsed);
}

function applyZoom(level: number): void {
  if (level === 1) {
    document.documentElement.style.removeProperty("zoom");
  } else {
    document.documentElement.style.zoom = String(level);
  }
}

export function useSidepanelZoom(): { zoom: number; setZoom: (level: number) => void } {
  // On mount, restore persisted zoom
  useEffect(() => {
    const level = loadZoom();
    applyZoom(level);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ctrl+= or Ctrl++  → zoom in
      if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        const next = clampZoom(loadZoom() + STEP);
        applyZoom(next);
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      // Ctrl+- → zoom out
      if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        const next = clampZoom(loadZoom() - STEP);
        applyZoom(next);
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      // Ctrl+0 → reset
      if (e.ctrlKey && e.key === "0") {
        e.preventDefault();
        applyZoom(DEFAULT);
        localStorage.setItem(STORAGE_KEY, String(DEFAULT));
      }
    }

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const current = loadZoom();
      const delta = e.deltaY > 0 ? -STEP : STEP;
      const next = clampZoom(current + delta);
      applyZoom(next);
      localStorage.setItem(STORAGE_KEY, String(next));
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  return {
    zoom: loadZoom(),
    setZoom: (level: number) => {
      const clamped = clampZoom(level);
      applyZoom(clamped);
      localStorage.setItem(STORAGE_KEY, String(clamped));
    },
  };
}
