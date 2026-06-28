import type { ReactNode } from "react";

/**
 * Consistent label + optional help text wrapping an input control.
 * Use across all editors so field rows share one rhythm and de-jargon
 * copy has a dedicated home (the `hint`). Renders a div/span (not a
 * <label>) so it composes with any control; the control itself carries
 * the accessible name via its own aria-label.
 */
export interface LabeledFieldProps {
  label: string;
  /** Plain-language explanation of what the field affects. */
  hint?: string;
  children: ReactNode;
}

export default function LabeledField({ label, hint, children }: LabeledFieldProps) {
  return (
    <div className="block">
      <span className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {label}
      </span>
      {hint && (
        <span className="block mt-0.5 text-ut-2xs text-ut-muted leading-relaxed">{hint}</span>
      )}
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

/**
 * Shared className for text inputs inside editors — keeps every form
 * control visually identical across the six screens.
 */
export const editorInputClass =
  "w-full text-ut-xs text-ut-text bg-ut-white border border-ut-border rounded-ut-sm px-ut-2 py-ut-1 focus:outline-none focus:border-trust-magenta focus:ring-2 focus:ring-trust-magenta/30";
