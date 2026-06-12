import { useEffect, useState } from "react";
import type { Editor, TLShapeId } from "@/components/TldrawAnnotation";

interface UseTldrawEditorReturn {
  editor: Editor | null;
  imageShapeId: TLShapeId | null;
  onMount: (editor: Editor) => void;
}

/**
 * Manages the tldraw editor lifecycle: mount, background image loading,
 * z-order enforcement, lock guard, and camera constraints.
 *
 * The dynamic import of TldrawAnnotation is intentional — a static import
 * would pull the tldraw library into the main bundle, defeating code splitting.
 */
export function useTldrawEditor(imageSrc: string | undefined): UseTldrawEditorReturn {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [imageShapeId, setImageShapeId] = useState<TLShapeId | null>(null);

  const onMount = (ed: Editor) => {
    setEditor(ed);
  };

  /* ── Load image as locked background once editor + imageSrc are ready ── */
  useEffect(() => {
    if (!editor || !imageSrc) return;

    let cancelled = false;
    let cleanupFns: (() => void)[] = [];

    const img = new Image();
    img.onload = async () => {
      if (cancelled) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Dynamic import needed — TldrawAnnotation statically imports tldraw,
      // so a static import here would pull tldraw into the main bundle.
      const { AssetRecordType: ART, createShapeId: makeShapeId } = await import(
        "@/components/TldrawAnnotation"
      );
      if (cancelled) return;

      const assetId = ART.createId();
      editor.createAssets([
        {
          id: assetId,
          typeName: "asset",
          type: "image",
          meta: {},
          props: {
            w,
            h,
            mimeType: "image/png",
            src: imageSrc,
            name: "evidence",
            isAnimated: false,
          },
        },
      ]);

      const shapeId = makeShapeId();
      editor.createShape({
        id: shapeId,
        type: "image",
        x: 0,
        y: 0,
        isLocked: true,
        props: { w, h, assetId },
      });

      // Keep image at bottom z-order
      const ensureBottom = () => {
        const shape = editor.getShape(shapeId);
        if (!shape) return;
        const pageId = editor.getCurrentPageId();
        if (shape.parentId !== pageId) editor.moveShapesToPage([shape], pageId);
        const siblings = editor.getSortedChildIdsForParent(pageId);
        const bottom = editor.getShape(siblings[0]);
        if (bottom && bottom.id !== shapeId) editor.sendToBack([shape]);
      };

      ensureBottom();
      const rmCreate = editor.sideEffects.registerAfterCreateHandler("shape", ensureBottom);
      const rmChange = editor.sideEffects.registerAfterChangeHandler("shape", ensureBottom);
      const rmLock = editor.sideEffects.registerBeforeChangeHandler("shape", (prev, next) => {
        if (next.id !== shapeId || next.isLocked) return next;
        return { ...prev, isLocked: true };
      });
      cleanupFns = [rmCreate, rmChange, rmLock];

      // Set default tool to arrow
      editor.setCurrentTool("arrow");
      editor.clearHistory();

      setImageShapeId(shapeId);
    };
    img.onerror = () => {
      if (cancelled) return;
      // Image failed to load — canvas stays blank, user can still annotate
      editor.clearHistory();
    };
    img.src = imageSrc;

    return () => {
      cancelled = true;
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
    };
  }, [editor, imageSrc]);

  /* ── Camera constraints ── */
  useEffect(() => {
    if (!editor || !imageShapeId) return;
    const shape = editor.getShape(imageShapeId);
    if (!shape) return;
    const { w, h } = shape.props as { w: number; h: number };
    editor.setCameraOptions({
      constraints: {
        initialZoom: "default",
        baseZoom: "fit-min-100",
        bounds: { x: 0, y: 0, w, h },
        padding: { x: 0, y: 0 },
        origin: { x: 0.5, y: 0.5 },
        behavior: "contain",
      },
    });
    editor.setCamera(editor.getCamera(), { reset: true });
  }, [editor, imageShapeId]);

  return { editor, imageShapeId, onMount };
}
