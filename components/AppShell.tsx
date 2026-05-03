import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-ut-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-ut-border px-ut-4 py-ut-2 flex items-center gap-2 bg-ut-white">
        <img
          src="/trust.svg"
          alt="TRUST"
          className="h-6"
          onError={(e) => {
            e.currentTarget.replaceWith(document.createTextNode("TRUST"));
          }}
        />
        <span className="text-ut-sm font-display font-bold uppercase tracking-ut-kicker text-trust-magenta">
          Information Tool Reviews
        </span>
      </header>

      {/* Scrollable content area */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* Sticky footer */}
      <footer className="sticky bottom-0 border-t border-ut-border px-ut-4 py-ut-2 flex items-center gap-2 bg-ut-white">
        <img
          src="/lisa-eis.svg"
          alt="LISA-EIS"
          className="h-5"
          onError={(e) => {
            e.currentTarget.replaceWith(document.createTextNode("LISA-EIS"));
          }}
        />
        <a
          href="https://www.utwente.nl/en/library/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ut-xs text-ut-slate hover:text-ut-navy transition-colors"
        >
          LISA-EIS / University of Twente
        </a>
      </footer>
    </div>
  );
}
