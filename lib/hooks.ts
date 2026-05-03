import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0,
  );
}

export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef]);
}

export function useRovingTabIndex<T extends string>(
  tabs: readonly T[],
  initialTab: T,
): {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
} {
  const [activeTab, setActiveTab] = useState<T>(initialTab);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = tabs.indexOf(activeTab);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveTab(tabs[(idx + 1) % tabs.length]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveTab(tabs[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveTab(tabs[tabs.length - 1]);
      }
    },
    [activeTab, tabs],
  );
  return { activeTab, setActiveTab, handleKeyDown };
}

export function useAutoFocus(
  containerRef: React.RefObject<HTMLElement | null>,
  targetSelector?: string,
) {
  const focused = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || focused.current) return;

    let target: HTMLElement | null = null;

    if (targetSelector) {
      target = container.querySelector<HTMLElement>(targetSelector);
    }

    if (!target) {
      const focusable = getFocusableElements(container);
      target = focusable[0] ?? null;
    }

    if (target) {
      target.focus();
      focused.current = true;
    }
  }, [containerRef, targetSelector]);
}
