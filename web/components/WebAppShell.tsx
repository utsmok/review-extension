import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface WebAppShellProps {
  children: ReactNode;
  onSettingsClick?: () => void;
  showSettingsButton?: boolean;
}

const MIN_SIDEBAR_PX = 280;
const MAX_SIDEBAR_PX = 600;
const DEFAULT_SIDEBAR_PX = 420;
const DIVIDER_PX = 6;

export default function WebAppShell({
  children,
  onSettingsClick,
  showSettingsButton,
}: WebAppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_PX);
  const [isMobile, setIsMobile] = useState(false);
  const [trustImgError, setTrustImgError] = useState(false);
  const [lisaImgError, setLisaImgError] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Responsive check — mobile skips split layout
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const next = Math.min(MAX_SIDEBAR_PX, Math.max(MIN_SIDEBAR_PX, startWidth.current + delta));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const trialBanner = (
    <div className="bg-amber-100 border-b border-amber-300 px-ut-4 py-ut-2 flex items-center gap-2">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <p className="text-ut-xs text-amber-900 flex-1">
        <strong>Trial version</strong> — This demo lets you explore the full review workflow.
        Screenshots are mocked. Some features (annotations, real captures) require the{" "}
        <a
          href="https://chromewebstore.google.com/detail/trust-review/leclhemhkfmogioabkfcboddalmlncjg"
          className="underline font-semibold hover:text-amber-700"
        >
          browser extension
        </a>
        .
      </p>
    </div>
  );

  const header = (
    <header className="border-b border-ut-border px-ut-4 py-ut-2 flex items-center gap-2 bg-ut-white shrink-0">
      {trustImgError ? (
        <span className="text-ut-sm font-display font-bold uppercase tracking-ut-kicker text-trust-magenta">
          TRUST
        </span>
      ) : (
        <img src="/trust.svg" alt="TRUST" className="h-6" onError={() => setTrustImgError(true)} />
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
  );

  const footer = (
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
    </footer>
  );

  // Mobile: no split, just the sidebar content full-width
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-ut-white">
        {trialBanner}
        {header}
        <main id="main-content" className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
        {footer}
      </div>
    );
  }

  // Desktop: resizable split — mock browser | sidebar
  return (
    <div className="flex flex-col h-screen bg-ut-white">
      {trialBanner}
      <div className="flex flex-1 min-h-0">
        {/* Left: mock browser pane */}
        <div
          className="bg-gray-100 flex flex-col overflow-hidden"
          style={{ width: `calc(100% - ${sidebarWidth + DIVIDER_PX}px)` }}
        >
          {/* Fake browser chrome */}
          <div className="bg-gray-200 border-b border-gray-300 px-3 py-2 flex items-center gap-2 shrink-0">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-400 font-mono truncate">
              example-tool.edu/search?q=climate+change
            </div>
          </div>
          {/* Placeholder content */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-4">🌐</div>
              <h2 className="text-xl font-bold text-gray-400 mb-2">Browser Preview</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                This area simulates the browser page showing the tool under review. In the real
                extension, you would see the actual website here while the review panel runs
                alongside it as a sidebar.
              </p>
              <p className="text-gray-300 text-xs mt-4">
                Drag the divider to resize the review panel
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="bg-ut-border hover:bg-trust-magenta/40 active:bg-trust-magenta/60 cursor-col-resize shrink-0 transition-colors"
          style={{ width: DIVIDER_PX }}
          onMouseDown={onMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          aria-valuemin={MIN_SIDEBAR_PX}
          aria-valuemax={MAX_SIDEBAR_PX}
          aria-label="Resize review panel"
          tabIndex={0}
        />

        {/* Right: sidebar (review panel) */}
        <div
          className="flex flex-col bg-ut-white shrink-0 overflow-hidden"
          style={{ width: sidebarWidth }}
        >
          {header}
          <main id="main-content" className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </main>
          {footer}
        </div>
      </div>
    </div>
  );
}
