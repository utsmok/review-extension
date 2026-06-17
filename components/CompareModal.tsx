import { useEffect, useRef } from "react";
import { useAutoFocus, useFocusTrap } from "@/hooks/useFocus";
import { PRINCIPLES } from "@/lib/principles";
import type { ComparisonEntry } from "@/lib/types";

interface CompareModalProps {
  entries: ComparisonEntry[];
  onClose: () => void;
}

export default function CompareModal({ entries, onClose }: CompareModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);
  useAutoFocus(panelRef);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Compute best values for highlighting (only when >= 2 tools)
  const best: Record<string, number> = {};
  if (entries.length >= 2) {
    for (const e of entries) {
      if (e.total[0] > (best.total ?? 0)) best.total = e.total[0];
      for (const [key, val] of Object.entries(e.principleAverages)) {
        if (val !== null && val > (best[key] ?? 0)) best[key] = val;
      }
    }
  }

  return (
    <div
      role="presentation"
      className="modal-backdrop"
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Tool comparison"
        style={{ maxWidth: "48rem", maxHeight: "80vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-ut-md font-heading font-bold uppercase tracking-ut-uppercase text-ut-text mb-3">
          Compare Tools
        </h2>

        <table className="w-full text-ut-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1.5 text-ut-muted font-heading font-bold uppercase tracking-ut-label text-ut-xs">
                Criterion
              </th>
              {entries.map((e) => (
                <th
                  key={e.id}
                  className="text-left p-1.5 text-ut-text font-heading font-bold text-ut-xs"
                >
                  {e.toolName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Verdict row */}
            <tr className="border-t border-ut-border">
              <td className="p-1.5 text-ut-muted">Verdict</td>
              {entries.map((e) => (
                <td key={e.id} className="p-1.5 text-ut-text">
                  {e.conclusion || "—"}
                </td>
              ))}
            </tr>

            {/* Total score row */}
            <tr className="border-t border-ut-border">
              <td className="p-1.5 text-ut-muted">Score</td>
              {entries.map((e) => {
                const isBest = entries.length >= 2 && e.total[0] === best.total;
                return (
                  <td
                    key={e.id}
                    className={`p-1.5 text-ut-text ${isBest ? "font-bold underline" : ""}`}
                  >
                    {e.total[1] > 0 ? `${e.total[0]}/${e.total[1]}` : "—"}
                  </td>
                );
              })}
            </tr>

            {/* Per-principle rows */}
            {PRINCIPLES.map((p) => (
              <tr key={p.id} className="border-t border-ut-border">
                <td className="p-1.5 text-ut-muted flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.fullName}
                </td>
                {entries.map((e) => {
                  const val = e.principleAverages[p.id];
                  const isBest = entries.length >= 2 && val !== null && val === best[p.id];
                  return (
                    <td
                      key={e.id}
                      className={`p-1.5 text-ut-text ${isBest ? "font-bold underline" : ""}`}
                      data-testid={`cell-${e.toolName}-${p.id}`}
                    >
                      {val !== null ? val.toFixed(1) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Strengths */}
            <tr className="border-t border-ut-border">
              <td className="p-1.5 text-ut-muted">Strengths</td>
              {entries.map((e) => (
                <td key={e.id} className="p-1.5 text-ut-text">
                  {e.strengths.length > 0 ? (
                    <ul className="list-disc pl-3 m-0 space-y-0.5">
                      {e.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>

            {/* Weaknesses */}
            <tr className="border-t border-ut-border">
              <td className="p-1.5 text-ut-muted">Weaknesses</td>
              {entries.map((e) => (
                <td key={e.id} className="p-1.5 text-ut-text">
                  {e.weaknesses.length > 0 ? (
                    <ul className="list-disc pl-3 m-0 space-y-0.5">
                      {e.weaknesses.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
