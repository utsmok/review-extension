import { useEffect, useMemo, useRef, useState } from "react";
import {
  AssetRecordType,
  DefaultColorStyle,
  type Editor,
  type TLShapeId,
  Tldraw,
  createShapeId,
  track,
  useValue,
} from "tldraw";

import { useActiveSession } from "@/hooks/useActiveSession";
import { useAutoFocus, useFocusTrap } from "@/lib/hooks";
import { getAccentKey, getCategoryLabel, getLinkedRubricIdsForCapture } from "@/lib/rubric";
import type { Capture } from "@/lib/types";
import { useRubric } from "@/lib/contexts";
import RubricChipGroup from "./RubricChipGroup";

/* ── Color palette (maps tldraw named colors → display labels) ── */
const PEN_COLORS = [
  { label: "Black", value: "black" },
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
] as const;

type ToolId = "arrow" | "draw" | "eraser";

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

  const [editor, setEditor] = useState<Editor | null>(null);
  const [imageShapeId, setImageShapeId] = useState<TLShapeId | null>(null);
  const [notes, setNotes] = useState(capture.notes);

  const imageSrc = capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;

  /* ── Focus / keyboard ── */
  useFocusTrap(panelRef);
  useAutoFocus(panelRef, ".drawing-toolbar button");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

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
    onClose();
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
      className="modal-backdrop"
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel max-w-[720px] p-0"
        role="dialog"
        aria-modal="true"
        aria-label="Evidence viewer and annotation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        {editor && <Toolbar editor={editor} imageShapeId={imageShapeId} onClear={handleClear} onSave={handleSave} />}

        {/* tldraw canvas */}
        <div className="tldraw-evidence-container">
          <Tldraw
            onMount={onMount}
            hideUi
            components={{
              PageMenu: null,
              DebugMenu: null,
              HelperButtons: null,
              NavigationPanel: null,
            }}
          />
        </div>

        {/* Rubric tagging */}
        <details className="mx-ut-3 mt-ut-2">
          <summary className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-muted cursor-pointer hover:text-ut-navy">
            Tag to rubric items ({linkedRubricIds.length})
          </summary>
          <div className="mt-1 space-y-1.5 pb-1">
            {/* Quality Gates */}
            <div>
              <p className="section-kicker mb-1">Quality Gates</p>
              {Object.entries(rubric.quality_gate).map(([cat, questions]) => (
                <div key={cat} className="ml-ut-1 mb-1" data-accent-key="control">
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
              <p className="section-kicker mb-1">Scoring Rubric</p>
              {Object.entries(rubric.scoring_rubric).map(([cat, questions]) => (
                <div key={cat} className="ml-ut-1 mb-1" data-accent-key={getAccentKey(cat)}>
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
            <p className="text-ut-xs font-bold text-ut-text mb-1">{capture.pageTitle}</p>
          )}
          <p className="text-ut-xs font-mono text-ut-muted mb-1 break-all">{capture.sourceUrl}</p>
          <p className="text-ut-xs text-ut-slate mb-2">
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

/* ── Toolbar (reactive via track) ──────────────────────────────────── */

interface ToolbarProps {
  editor: Editor;
  imageShapeId: TLShapeId | null;
  onClear: () => void;
  onSave: () => void;
}

const Toolbar = track(function Toolbar({ editor, imageShapeId: _imageShapeId, onClear, onSave }: ToolbarProps) {
  const currentToolId = useValue("currentToolId", () => editor.getCurrentToolId(), [editor]);
  const [activeColor, setActiveColor] = useState<string>("black");
  const [isHighlighter, setIsHighlighter] = useState(false);

  const selectTool = (tool: ToolId) => {
    editor.setCurrentTool(tool);
    if (tool === "draw" && isHighlighter) {
      editor.setOpacityForNextShapes(0.4);
    }
  };

  const toggleHighlighter = () => {
    const next = !isHighlighter;
    setIsHighlighter(next);
    if (currentToolId === "draw") {
      editor.setOpacityForNextShapes(next ? 0.4 : 1);
    }
  };

  const setColor = (color: string) => {
    setActiveColor(color);
    editor.setStyleForNextShapes(DefaultColorStyle, color as never);
  };

  return (
    <div className="drawing-toolbar" role="toolbar" aria-label="Annotation tools">
      {/* Tools */}
      <button
        type="button"
        aria-label="Arrow tool"
        aria-pressed={currentToolId === "arrow"}
        className={currentToolId === "arrow" ? "is-active" : ""}
        onClick={() => selectTool("arrow")}
      >
        → Arrow
      </button>
      <button
        type="button"
        aria-label="Highlighter"
        aria-pressed={currentToolId === "draw" && isHighlighter}
        className={currentToolId === "draw" && isHighlighter ? "is-active" : ""}
        onClick={() => {
          if (currentToolId !== "draw") selectTool("draw");
          toggleHighlighter();
        }}
      >
        ☐ Highlighter
      </button>
      <button
        type="button"
        aria-label="Pen"
        aria-pressed={currentToolId === "draw" && !isHighlighter}
        className={currentToolId === "draw" && !isHighlighter ? "is-active" : ""}
        onClick={() => {
          setIsHighlighter(false);
          selectTool("draw");
          editor.setOpacityForNextShapes(1);
        }}
      >
        ✏ Draw
      </button>
      <button
        type="button"
        aria-label="Eraser"
        aria-pressed={currentToolId === "eraser"}
        className={currentToolId === "eraser" ? "is-active" : ""}
        onClick={() => selectTool("eraser")}
      >
        ✕ Eraser
      </button>

      <span className="toolbar-separator" />

      {/* Colors */}
      <div role="radiogroup" aria-label="Pen color">
        {PEN_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            aria-label={c.label}
            aria-pressed={activeColor === c.value}
            className={`color-swatch ${activeColor === c.value ? "is-active" : ""}`}
            style={{
              background:
                c.value === "black"
                  ? "#172033"
                  : c.value === "red"
                    ? "#c60c30"
                    : "#007d9c",
            }}
            onClick={() => setColor(c.value)}
          />
        ))}
      </div>

      <span className="toolbar-separator" />

      <button type="button" aria-label="Clear annotations" onClick={onClear}>
        Clear
      </button>

      <div className="flex-1" />

      <button
        type="button"
        className="btn-save px-ut-3 py-ut-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label cursor-pointer"
        onClick={onSave}
      >
        Save
      </button>
    </div>
  );
});
