import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: () => void;
}

/**
 * Registers global keyboard shortcuts within the sidepanel.
 * Only active when not typing in an input/textarea/select element.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = [
        e.ctrlKey && "Ctrl",
        e.shiftKey && "Shift",
        e.altKey && "Alt",
        e.key,
      ]
        .filter(Boolean)
        .join("+");

      const action = shortcuts[key];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
