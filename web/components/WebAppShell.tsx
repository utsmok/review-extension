import type { ReactNode } from "react";

interface WebAppShellProps {
  children: ReactNode;
  onSettingsClick?: () => void;
  showSettingsButton?: boolean;
}

export default function WebAppShell({ children, onSettingsClick, showSettingsButton }: WebAppShellProps) {
  return (
    <div className="min-h-screen bg-ut-canvas">
      {/* Top bar */}
      <header className="bg-ut-white border-b border-ut-border sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-ut-4 py-ut-2 flex items-center justify-between">
          <h1 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
            TRUST Review — Web Trial
          </h1>
          <div className="flex items-center gap-ut-2">
            <span className="text-ut-2xs text-ut-muted font-mono">
              Trial version — install the extension for full features
            </span>
            {showSettingsButton && onSettingsClick && (
              <button
                type="button"
                className="p-ut-1 rounded hover:bg-ut-offwhite transition-colors text-ut-muted hover:text-ut-navy"
                onClick={onSettingsClick}
                aria-label="Settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-hidden="true">
                  <title>Settings</title>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area — full height below header */}
      <main className="max-w-[1200px] mx-auto">
        {children}
      </main>
    </div>
  );
}
