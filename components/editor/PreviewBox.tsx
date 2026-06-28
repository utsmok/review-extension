import type { ReactNode } from "react";

/**
 * Bordered preview container for "what your change will look like" panels
 * (grade chip preview, report-header preview, principle-color strip).
 * Visually distinct from edit fields so it reads as output, not input.
 */
export interface PreviewBoxProps {
  label?: string;
  children: ReactNode;
  testId?: string;
}

export default function PreviewBox({ label = "Preview", children, testId }: PreviewBoxProps) {
  return (
    <div
      className="border border-ut-border rounded-ut-sm bg-ut-white px-ut-3 py-ut-2"
      data-testid={testId}
    >
      <span className="block mb-ut-2 text-ut-2xs font-mono font-bold uppercase tracking-ut-label text-ut-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
