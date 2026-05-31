import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AssetRecordType,
  createShapeId,
  type Editor,
  type TLShapeId,
  useValue,
  type TLComponents,
  type TLUiOverrides,
} from "tldraw";

const Tldraw = lazy(() => import("tldraw").then((m) => ({ default: m.Tldraw })));

import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useRubric } from "@/lib/contexts";
import { useAutoFocus, useFocusTrap } from "@/hooks/useFocus";
import { getAccentKey, getCategoryLabel, getLinkedRubricIdsForCapture } from "@/lib/rubric";
import type { Capture } from "@/lib/types";
import RubricChipGroup from "./RubricChipGroup";

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
    // Remove tools we don't need in the annotation context
    delete tools.text;
    delete tools.note;
    delete tools.frame;
    delete tools.embed;
    delete tools.asset;
    return tools;
  },
};

/* ── Props ──────────────────────────────────────────────────────── */

interface EvidenceModalProps {
  capture: Capture;
  onClose: () => void;
}

export default function EvidenceModal({ capture, onClose }: EvidenceModalProps) {
  const { updateCapture, evaluations, linkCaptureToRubric, unlinkCaptureFromRubric } =
    useActiveSession();
  const { rubric, usesAi } = useRubric();
  const panelRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const animateClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [imageShapeId, setImageShapeId] = useState<TLShapeId | null>(null);
  const [notes, setNotes] = useState(capture.notes);
  const [hintVisible, setHintVisible] = useState(true);
  const screenshotUrl = useScreenshotUrl(capture.id);
  const imageSrc = screenshotUrl ?? capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;

  /* ── Focus / keyboard ── */
  useFocusTrap(panelRef);
  useAutoFocus(panelRef, ".annotation-actions button");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") animateClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [animateClose]);
  /* ── Cleanup tldraw side-effect handlers on unmount ── */
  useEffect(() => {
    return () => {
      if (editor) {
        const fns = (editor as Editor & { _cleanupFns?: (() => void)[] })._cleanupFns;
        fns?.forEach((fn) => {
          fn();
        });
      }
    };
  }, [editor]);
  /* ── Auto-hide pan/zoom hint ── */
  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  /* ── tldraw mount: load image as locked background ── */
  const onMount = (ed: Editor) => {
    setEditor(ed);

    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const assetId = AssetRecordType.createId();
      ed.createAssets([
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

      const shapeId = createShapeId();
      ed.createShape({
        id: shapeId,
        type: "image",
        x: 0,
        y: 0,
        isLocked: true,
        props: { w, h, assetId },
      });

      // Keep image at bottom z-order
      const ensureBottom = () => {
        const shape = ed.getShape(shapeId);
        if (!shape) return;
        const pageId = ed.getCurrentPageId();
        if (shape.parentId !== pageId) ed.moveShapesToPage([shape], pageId);
        const siblings = ed.getSortedChildIdsForParent(pageId);
        const bottom = ed.getShape(siblings[0]);
        if (bottom && bottom.id !== shapeId) ed.sendToBack([shape]);
      };

      ensureBottom();
      const rmCreate = ed.sideEffects.registerAfterCreateHandler("shape", ensureBottom);
      const rmChange = ed.sideEffects.registerAfterChangeHandler("shape", ensureBottom);
      const rmLock = ed.sideEffects.registerBeforeChangeHandler("shape", (prev, next) => {
        if (next.id !== shapeId || next.isLocked) return next;
        return { ...prev, isLocked: true };
      });

      // Set default tool to arrow
      ed.setCurrentTool("arrow");
      ed.clearHistory();

      setImageShapeId(shapeId);

      // Cleanup stored on editor for later use
      (ed as Editor & { _cleanupFns?: (() => void)[] })._cleanupFns = [rmCreate, rmChange, rmLock];
    };
    img.src = imageSrc;
  };

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

  /* ── Rubric tagging data ── */
  const linkedRubricIds = useMemo(
    () => getLinkedRubricIdsForCapture(capture.id, evaluations),
    [capture.id, evaluations],
  );

  /* ── Save handler ── */
  const handleSave = async () => {
    if (!editor || !imageShapeId) {
      updateCapture(capture.id, { notes });
      onClose();
      return;
    }

    // Export all shapes on the page (includes background image + annotations)
    const allShapeIds = [...editor.getCurrentPageShapeIds()];
    try {
      const { blob } = await editor.toImage(allShapeIds, { format: "png" });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      updateCapture(capture.id, {
        annotatedScreenshotBase64: dataUrl,
        notes,
      });
    } catch {
      updateCapture(capture.id, { notes });
    }
    animateClose();
  };

  /* ── Clear annotations (remove non-image shapes) ── */
  const handleClear = () => {
    if (!editor || !imageShapeId) return;
    const allIds = [...editor.getCurrentPageShapeIds()];
    const toDelete = allIds.filter((id) => id !== imageShapeId);
    if (toDelete.length > 0) editor.deleteShapes(toDelete);
  };

  return (
    <button
      type="button"
      className={`modal-backdrop modal-backdrop--evidence ${closing ? "closing" : ""}`}
      tabIndex={-1}
      onClick={animateClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          animateClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel modal-panel--evidence p-0"
        role="dialog"
        aria-modal="true"
        aria-label="Evidence viewer and annotation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Action bar — Save / Clear / Zoom */}
        {editor && (
          <ActionBar
            editor={editor}
            imageShapeId={imageShapeId}
            onClear={handleClear}
            onSave={handleSave}
          />
        )}

        {/* tldraw canvas with built-in UI */}
        <div className="tldraw-evidence-container">
          <Suspense fallback={<div className="tldraw-loading">Loading annotation editor…</div>}>
            <Tldraw onMount={onMount} components={TL_UI_COMPONENTS} overrides={TL_UI_OVERRIDES} />
          </Suspense>
          {/* Edge-fade overlay: subtle shadow when image extends beyond viewport */}
          <div className="tldraw-edge-fade" aria-hidden="true" />
          {/* Pan/zoom hint */}
          <div className={`tldraw-hint${hintVisible ? "" : " hidden"}`} aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ verticalAlign: "-2px" }}
            >
              <title>Right-click</title>
              <rect x="6" y="4" width="12" height="16" rx="1" />
              <line x1="12" y1="18" x2="12" y2="18.01" />
            </svg>{" "}
            Right-click to pan · Ctrl+Scroll to zoom
          </div>
        </div>

        {/* Rubric tagging */}
        <details className="mx-ut-3 mt-ut-2 shrink-0 overflow-y-auto max-h-[20vh]">
          <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-muted cursor-pointer hover:text-ut-navy">
            Tag to rubric items ({linkedRubricIds.length})
          </summary>
          <div className="mt-ut-2 space-y-ut-2 pb-ut-1">
            {/* Quality Gates */}
            <div>
              <p className="section-kicker mb-ut-1">Quality Gates</p>
              {Object.entries(rubric.quality_gate).map(([cat, questions]) => (
                <div key={cat} className="mb-ut-1" data-accent-key="control">
                  <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
                  <RubricChipGroup
                    questions={questions}
                    categoryKey={cat}
                    linkedIds={linkedRubricIds}
                    usesAi={usesAi}
                    isQG
                    onToggle={(rubricId, linked) =>
                      linked
                        ? unlinkCaptureFromRubric(capture.id, rubricId)
                        : linkCaptureToRubric(capture.id, rubricId)
                    }
                  />
                </div>
              ))}
            </div>
            {/* Scoring Rubric */}
            <div>
              <p className="section-kicker mb-ut-1">Scoring Rubric</p>
              {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
                <div key={cat} className="mb-ut-1" data-accent-key={getAccentKey(cat)}>
                  <p className="text-ut-xs text-ut-slate">{getCategoryLabel(cat)}</p>
                  <RubricChipGroup
                    questions={questions}
                    categoryKey={cat}
                    linkedIds={linkedRubricIds}
                    usesAi={usesAi}
                    onToggle={(rubricId, linked) =>
                      linked
                        ? unlinkCaptureFromRubric(capture.id, rubricId)
                        : linkCaptureToRubric(capture.id, rubricId)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* Notes + Metadata */}
        <div className="p-ut-3">
          {capture.pageTitle && (
            <p className="text-ut-xs font-bold text-ut-text mb-ut-1">{capture.pageTitle}</p>
          )}
          <p className="text-ut-xs font-mono text-ut-muted mb-ut-1 break-all">
            {capture.sourceUrl}
          </p>
          <p className="text-ut-xs text-ut-slate mb-ut-2">
            {new Date(capture.timestamp).toLocaleString()}
          </p>
          <textarea
            className="w-full border border-ut-border rounded-ut-sm text-ut-xs p-ut-2 resize-y bg-ut-grey"
            rows={2}
            placeholder="Notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </button>
  );
}

/* ── Action bar (Save / Clear / Zoom) ─────────────────────────────── */

interface ActionBarProps {
  editor: Editor;
  imageShapeId: TLShapeId | null;
  onClear: () => void;
  onSave: () => void;
}

const ZOOM_STEP = 0.1;

function ActionBar({ editor, imageShapeId, onClear, onSave }: ActionBarProps) {
  const zoomLevel = useValue("zoomLevel", () => editor.getCamera().z, [editor]);

  const handleZoomIn = () => {
    const { x, y, z } = editor.getCamera();
    editor.setCamera({ x, y, z: z + ZOOM_STEP }, { animation: { duration: 150 } });
  };

  const handleZoomOut = () => {
    const { x, y, z } = editor.getCamera();
    editor.setCamera({ x, y, z: Math.max(0.1, z - ZOOM_STEP) }, { animation: { duration: 150 } });
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
