import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * A small popup editor: renders a gear trigger button that toggles an
 * absolute-positioned panel hosting arbitrary controls (color swatches, type
 * selectors, etc.). Closes on outside-click or Escape. Render only when editMode.
 *
 * The panel is positioned relative to the trigger's nearest positioned ancestor;
 * callers should ensure the affordance has a `relative` wrapper when needed.
 */
export default function PopupEditor({
  ariaLabel,
  children,
  panelClassName = "",
}: {
  ariaLabel: string;
  children: ReactNode;
  /** Extra classes on the dropdown panel. */
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        title="Style"
        className="text-ut-muted hover:text-ut-navy p-0.5 rounded-ut-sm transition-colors"
      >
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`${ariaLabel} options`}
          data-testid="popup-editor-panel"
          className={`absolute z-50 top-full right-0 mt-1 bg-ut-white border border-ut-border rounded-ut-sm p-ut-2 w-48 ${panelClassName}`}
        >
          {children}
        </div>
      )}
    </span>
  );
}
