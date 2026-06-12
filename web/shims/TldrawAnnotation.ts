/**
 * Web trial replacement for components/TldrawAnnotation.
 * Provides the same type exports and ActionBar component without importing tldraw.
 * The ActionBar is a no-op since the editor is always null in the trial.
 */
import type { ReactNode } from "react";

// Re-export the types that useTldrawEditor and EvidenceModal import
export type Editor = Record<string, unknown>;
export type TLShapeId = string;

// Stub ActionBar — never actually renders because EvidenceModal guards with {editor && ...}
export interface ActionBarProps {
  editor: Editor | null;
  imageShapeId: TLShapeId | null;
  onClear: () => void;
  onSave: () => void;
}

export function ActionBar(_props: ActionBarProps): ReactNode {
  return null;
}

export const AssetRecordType = {
  createId: () => "" as string,
};

export const createShapeId = () => "" as TLShapeId;
