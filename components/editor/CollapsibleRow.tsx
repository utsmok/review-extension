import { type ReactNode, useState } from "react";

/**
 * Progressive-disclosure row: an always-visible summary that expands to
 * reveal editable detail. Used to collapse the "wall of options" in the
 * field / rubric / branding / grade editors so a reviewer sees the list
 * first and only opens what they want to change.
 */
export interface CollapsibleRowProps {
  /** Always-visible summary content. Keep it to one line. */
  summary: ReactNode;
  /** Detail content, revealed on expand. */
  children: ReactNode;
  defaultOpen?: boolean;
  /** Shows a magenta "edited" dot — set when the item diverges from shipped default. */
  edited?: boolean;
  testId?: string;
}

export default function CollapsibleRow({
  summary,
  children,
  defaultOpen = false,
  edited = false,
  testId,
}: CollapsibleRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`border rounded-ut-sm bg-ut-white transition-colors ${
        open ? "border-trust-magenta-border" : "border-ut-border"
      }`}
      data-testid={testId}
      data-open={open}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-ut-2 px-ut-3 py-ut-2 text-left hover:bg-trust-magenta/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
      >
        <svg
          aria-hidden="true"
          className={`w-3 h-3 text-ut-muted shrink-0 transition-transform ${
            open ? "rotate-90" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0 flex items-center gap-ut-2">{summary}</div>
        {edited && (
          <span
            role="img"
            title="Edited from shipped default"
            aria-label="Edited from shipped default"
            className="w-1.5 h-1.5 rounded-full bg-trust-magenta shrink-0"
          />
        )}
      </button>
      {open && (
        <div className="border-t border-ut-border px-ut-3 py-ut-3 space-y-ut-2 bg-ut-offwhite/50">
          {children}
        </div>
      )}
    </div>
  );
}
