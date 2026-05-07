import { type ReactNode, useEffect, useRef, useState } from "react";
import ToastContainer from "./Toast";

interface AppShellProps {
  children: ReactNode;
  onSettingsClick?: () => void;
  showSettingsButton?: boolean;
}

type SaveStatus = "idle" | "saved" | "failed";

export default function AppShell({ children, onSettingsClick, showSettingsButton }: AppShellProps) {
  const [trustImgError, setTrustImgError] = useState(false);
  const [lisaImgError, setLisaImgError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onSuccess(e: Event) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setSaveStatus("saved");
      timeoutRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
    }
    function onFailure() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setSaveStatus("failed");
    }

    document.addEventListener("trust-save-succeeded", onSuccess);
    document.addEventListener("trust-save-failed", onFailure);
    return () => {
      document.removeEventListener("trust-save-succeeded", onSuccess);
      document.removeEventListener("trust-save-failed", onFailure);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-ut-white">
      <ToastContainer />
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
        <span
          className="text-ut-sm font-display font-bold uppercase tracking-ut-kicker text-trust-magenta"
          title="TRUST Framework — Transparent, Reliable, User-centric, Sound, Traceable"
        >
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Settings</title>
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
      </header>

      <main className="flex-1 min-h-0">{children}</main>

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
          href="https://www.utwente.nl/library/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ut-xs text-ut-slate hover:text-ut-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ut-blue transition-colors"
        >
          LISA-EIS / University of Twente
        </a>
        {saveStatus === "saved" && (
          <span data-testid="save-status" className="text-ut-xs text-ut-green ml-auto">
            Saved
          </span>
        )}
        {saveStatus === "failed" && (
          <span data-testid="save-status" className="text-ut-xs text-ut-red ml-auto">
            Save failed
          </span>
        )}
      </footer>
    </div>
  );
}
