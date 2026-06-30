import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

/**
 * Edit Mode: a transient (non-persisted) UI state that, when active, reveals inline
 * editing affordances on the live review interface. Edits target the global
 * framework-customization store (same semantics as the Settings editors) — see the
 * guardrail banner. The provider is mounted at the app root so the state survives
 * navigating between the review and Settings.
 */
interface EditModeContextValue {
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  toggleEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: false,
  setEditMode: () => {},
  toggleEditMode: () => {},
});

export function EditModeProvider({
  children,
  initialEditMode = false,
}: {
  children: ReactNode;
  /** Start in edit mode (useful for tests and embeds). */
  initialEditMode?: boolean;
}) {
  const [editMode, setEditMode] = useState(initialEditMode);
  const value = useMemo<EditModeContextValue>(
    () => ({
      editMode,
      setEditMode,
      toggleEditMode: () => setEditMode((on) => !on),
    }),
    [editMode],
  );
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

/** Read the edit-mode state and setters. */
export function useEditMode(): EditModeContextValue {
  return useContext(EditModeContext);
}
