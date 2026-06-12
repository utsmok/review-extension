/**
 * No-op replacement for useSidepanelZoom.
 * Sidepanel zoom is not relevant in a full-page web context.
 */
export function useSidepanelZoom(): { zoom: number; setZoom: (_level: number) => void } {
  return { zoom: 1, setZoom: () => {} };
}
