import { type ReactNode, useState } from "react";

interface AppShellProps {
  children: ReactNode;
  onSettingsClick?: () => void;
  showSettingsButton?: boolean;
}

export default function AppShell({ children, onSettingsClick, showSettingsButton }: AppShellProps) {
  const [trustImgError, setTrustImgError] = useState(false);
  const [lisaImgError, setLisaImgError] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-ut-white">
      <header className="border-b border-ut-border px-ut-4 py-ut-2 flex items-center gap-2 bg-ut-white shrink-0">
        {trustImgError ? (
          <span className="text-ut-sm font-display font-bold uppercase tracking-ut-kicker text-trust-magenta">
            TRUST
          </span>
        ) : (
          <img
            src="/trust.svg"
            alt="TRUST"
            className="h-6"
            onError={() => setTrustImgError(true)}
          />
        )}
        <span className="text-ut-sm font-display font-bold uppercase tracking-ut-kicker text-trust-magenta">
          Information Tool Reviews
        </span>
        <div className="flex-1" />
        {showSettingsButton && onSettingsClick && (
          <button
            type="button"
            className="text-ut-muted hover:text-ut-navy transition-colors p-1"
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M13.1 10a1.2 1.2 0 0 0 .24 1.32l.04.04a1.45 1.45 0 1 1-2.06 2.06l-.04-.04a1.2 1.2 0 0 0-1.32-.24 1.2 1.2 0 0 0-.73 1.1v.11a1.45 1.45 0 0 1-2.9 0v-.06a1.2 1.2 0 0 0-.79-1.1 1.2 1.2 0 0 0-1.32.24l-.04.04a1.45 1.45 0 1 1-2.06-2.06l.04-.04a1.2 1.2 0 0 0 .24-1.32 1.2 1.2 0 0 0-1.1-.73h-.11a1.45 1.45 0 0 1 0-2.9h.06a1.2 1.2 0 0 0 1.1-.79 1.2 1.2 0 0 0-.24-1.32l-.04-.04a1.45 1.45 0 1 1 2.06-2.06l.04.04a1.2 1.2 0 0 0 1.32.24H8a1.2 1.2 0 0 0 .73-1.1v-.11a1.45 1.45 0 0 1 2.9 0v.06a1.2 1.2 0 0 0 .79 1.1 1.2 1.2 0 0 0 1.32-.24l.04-.04a1.45 1.45 0 1 1 2.06 2.06l-.04.04a1.2 1.2 0 0 0-.24 1.32v0a1.2 1.2 0 0 0 1.1.73h.11a1.45 1.45 0 0 1 0 2.9h-.06a1.2 1.2 0 0 0-1.1.79z" />
            </svg>
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">{children}</main>

      <footer className="border-t border-ut-border px-ut-4 py-ut-2 flex items-center gap-2 bg-ut-white shrink-0">
        {lisaImgError ? (
          <span className="text-ut-xs text-ut-slate">LISA-EIS</span>
        ) : (
          <img
            src="/lisa-eis.svg"
            alt="LISA-EIS"
            className="h-5"
            onError={() => setLisaImgError(true)}
          />
        )}
        <a
          href="https://www.utwente.nl/en/library/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ut-xs text-ut-slate hover:text-ut-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue transition-colors"
        >
          LISA-EIS / University of Twente
        </a>
      </footer>
    </div>
  );
}
