/**
 * Inner tldraw annotation component — lazy-loaded so tldraw stays out of the main chunk.
 * This file is the ONLY file that statically imports from "tldraw".
 */
import type { TLComponents, TLShapeId, TLUiOverrides, Editor as TldrawEditor } from "tldraw";
import { AssetRecordType, createShapeId, Tldraw, useValue } from "tldraw";

/* ── tldraw UI configuration ─────────────────────────────────────── */
const TL_UI_COMPONENTS: TLComponents = {
  MainMenu: null,
  Minimap: null,
  ContextMenu: null,
  ActionsMenu: null,
  QuickActions: null,
  SharePanel: null,
  CursorChatBubble: null,
  TopPanel: null,
  MenuPanel: null,
  DebugPanel: null,
  DebugMenu: null,
  HelperButtons: null,
  NavigationPanel: null,
  PageMenu: null,
  FollowingIndicator: null,
  RichTextToolbar: null,
  ImageToolbar: null,
  VideoToolbar: null,
};

const TL_UI_OVERRIDES: TLUiOverrides = {
  tools(_editor, tools) {
    delete tools.text;
    delete tools.note;
    delete tools.frame;
    delete tools.embed;
    delete tools.asset;
    return tools;
  },
};

export interface TldrawAnnotationProps {
  onMount: (editor: TldrawEditor) => void;
}

export default function TldrawAnnotation({ onMount }: TldrawAnnotationProps) {
  return <Tldraw onMount={onMount} components={TL_UI_COMPONENTS} overrides={TL_UI_OVERRIDES} />;
}

/* ── Action bar (Save / Clear / Zoom) ─────────────────────────────── */

export interface ActionBarProps {
  editor: TldrawEditor;
  imageShapeId: TLShapeId | null;
  onClear: () => void;
  onSave: () => void;
}

const ZOOM_STEP = 0.1;

export function ActionBar({ editor, imageShapeId, onClear, onSave }: ActionBarProps) {
  const zoomLevel = useValue("zoomLevel", () => editor.getCamera().z, [editor]);

  const handleZoomIn = () => {
    const { x, y, z } = editor.getCamera();
    const newZ = Math.min(5, z + ZOOM_STEP);
    const vp = editor.getViewportPageBounds();
    const cx = vp.center.x;
    const cy = vp.center.y;
    const newX = cx - ((cx - x) / z) * newZ;
    const newY = cy - ((cy - y) / z) * newZ;
    editor.setCamera({ x: newX, y: newY, z: newZ }, { animation: { duration: 150 } });
  };

  const handleZoomOut = () => {
    const { x, y, z } = editor.getCamera();
    const newZ = Math.max(0.1, z - ZOOM_STEP);
    const vp = editor.getViewportPageBounds();
    const cx = vp.center.x;
    const cy = vp.center.y;
    const newX = cx - ((cx - x) / z) * newZ;
    const newY = cy - ((cy - y) / z) * newZ;
    editor.setCamera({ x: newX, y: newY, z: newZ }, { animation: { duration: 150 } });
  };

  const handleZoomToFit = () => {
    if (!imageShapeId) return;
    const shape = editor.getShape(imageShapeId);
    if (!shape) return;
    const { w, h } = shape.props as { w: number; h: number };
    editor.zoomToBounds({ x: 0, y: 0, w, h }, { inset: 16 });
  };

  const zoomPct = `${Math.round(zoomLevel * 100)}%`;

  return (
    <div className="annotation-actions" role="toolbar" aria-label="Annotation actions">
      <button
        type="button"
        title="Zoom out"
        aria-label="Zoom out"
        className="annotation-actions__btn"
        onClick={handleZoomOut}
      >
        −
      </button>
      <button
        type="button"
        title="Fit image to view"
        aria-label={`Zoom: ${zoomPct}. Click to fit.`}
        className="annotation-actions__zoom"
        onClick={handleZoomToFit}
      >
        {zoomPct}
      </button>
      <button
        type="button"
        title="Zoom in"
        aria-label="Zoom in"
        className="annotation-actions__btn"
        onClick={handleZoomIn}
      >
        +
      </button>

      <span className="annotation-actions__sep" />

      <button
        type="button"
        title="Clear all annotations"
        aria-label="Clear annotations"
        className="annotation-actions__btn"
        onClick={onClear}
      >
        Clear
      </button>

      <div className="flex-1" />

      <button
        type="button"
        title="Save and close"
        className="annotation-actions__save"
        onClick={onSave}
      >
        Save
      </button>
    </div>
  );
}

export type { TLShapeId, TldrawEditor as Editor };
// Re-export tldraw utilities for EvidenceModal.
// Since this entire module is lazy-loaded, these don't pull tldraw into the main chunk.
export { AssetRecordType, createShapeId };
