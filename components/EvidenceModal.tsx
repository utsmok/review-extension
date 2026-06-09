import { lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRubric } from "@/components/contexts";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useAutoFocus, useFocusTrap } from "@/hooks/useFocus";
import { useScreenshotUrl } from "@/hooks/useScreenshotUrl";
import { getAccentKey, getCategoryLabel, getLinkedRubricIdsForCapture } from "@/lib/rubric";
import type { Capture } from "@/lib/types";
import RubricChipGroup from "./RubricChipGroup";
import type { Editor, TLShapeId } from "./TldrawAnnotation";
import TldrawCanvas from "./TldrawCanvas";

const LazyActionBar = lazy(() =>
  import("./TldrawAnnotation").then((m) => ({ default: m.ActionBar })),
);

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
  /* ── Auto-hide pan/zoom hint ── */
  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  /* ── tldraw mount: store editor reference ── */
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

      // Dynamic import — tldraw is already loaded at this point (editor exists),
      // but this avoids a static dependency that defeats code splitting.
      const { AssetRecordType: ART, createShapeId: makeShapeId } = await import(
        "./TldrawAnnotation"
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
          <LazyActionBar
            editor={editor}
            imageShapeId={imageShapeId}
            onClear={handleClear}
            onSave={handleSave}
          />
        )}

        {/* tldraw canvas with built-in UI */}
        <div className="tldraw-evidence-container">
          <TldrawCanvas onMount={onMount} />
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
