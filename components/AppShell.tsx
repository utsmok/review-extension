import { type ReactNode, useState } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
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
