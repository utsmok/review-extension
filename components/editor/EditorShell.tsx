import type { ReactNode } from "react";

/**
 * Shared shell for every framework-customization editor.
 * Gives all editors an identical header (Back + title + one-line
 * subtitle) and an optional footer, so the 6 screens stop looking like
 * 6 different dialects. Design-system compliant: flat, ≤2px radius,
 * magenta identity, uppercase heading.
 */
export interface EditorShellProps {
  /** Screen title, e.g. "Fields & options". Shown uppercase in magenta. */
  title: string;
  /** One-line "what this screen does", shown muted under the title. */
  subtitle?: string;
  onBack: () => void;
  /** Optional sticky footer (e.g. reset / export actions). */
  footer?: ReactNode;
  children: ReactNode;
}

export default function EditorShell({
  title,
  subtitle,
  onBack,
  footer,
  children,
}: EditorShellProps) {
  return (
    <div className="flex flex-col h-full" data-testid="editor-shell">
      <header className="border-b border-ut-border bg-ut-white px-ut-4 py-ut-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to framework customization"
          className="flex items-center gap-1 -ml-1 px-1 py-0.5 rounded-ut-sm text-ut-muted hover:text-trust-magenta transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-ut-2xs font-heading font-bold uppercase tracking-ut-label">
            Back
          </span>
        </button>
        <h1 className="mt-ut-1 font-heading text-ut-sub font-bold uppercase tracking-ut-heading text-trust-magenta">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-ut-xs text-ut-muted leading-relaxed">{subtitle}</p>}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-ut-4 py-ut-4">{children}</div>

      {footer && (
        <footer className="border-t border-ut-border bg-ut-white px-ut-4 py-ut-2 shrink-0">
          {footer}
        </footer>
      )}
    </div>
  );
}
