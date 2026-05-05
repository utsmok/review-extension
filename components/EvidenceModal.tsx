import { useEffect, useRef, useState } from "react";
import type { Capture } from "@/lib/types";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useAutoFocus, useFocusTrap } from "@/lib/hooks";

function getPenColors() {
  const style = getComputedStyle(document.documentElement);
  return [
    { label: "Black", value: style.getPropertyValue("--ut-text").trim() || "#172033" },
    { label: "Red", value: style.getPropertyValue("--ut-error").trim() || "#c60c30" },
    { label: "Blue", value: style.getPropertyValue("--ut-navy").trim() || "#007d9c" },
  ];
}

const PEN_SIZES = [2, 4, 6];

interface EvidenceModalProps {
  capture: Capture;
  onClose: () => void;
}

export default function EvidenceModal({ capture, onClose }: EvidenceModalProps) {
  const { updateCapture } = useActiveSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [penColor, setPenColor] = useState(getPenColors()[0].value);
  const [penSize, setPenSize] = useState(PEN_SIZES[1]);
  const [erasing, setErasing] = useState(false);
  const [notes, setNotes] = useState(capture.notes);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const hasDrawn = useRef(false);

  const imageSrc = capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;

  useFocusTrap(panelRef);
  useAutoFocus(panelRef, ".color-swatch");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e);
    hasDrawn.current = true;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = erasing ? "rgba(0,0,0,1)" : penColor;
    ctx.lineWidth = erasing ? penSize * 4 : penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (erasing) {
      ctx.globalCompositeOperation = "destination-out";
    } else {
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    setDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const hasDrawing = hasDrawn.current;
    if (!hasDrawing) {
      updateCapture(capture.id, { notes });
      onClose();
      return;
    }

    const img = new Image();
    img.onload = () => {
      const compCanvas = document.createElement("canvas");
      compCanvas.width = img.naturalWidth;
      compCanvas.height = img.naturalHeight;
      const ctx = compCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      ctx.drawImage(canvas, 0, 0, img.naturalWidth, img.naturalHeight);
      updateCapture(capture.id, {
        annotatedScreenshotBase64: compCanvas.toDataURL("image/png"),
        notes,
      });
      onClose();
    };
    img.src = imageSrc;
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
  };

  const penColors = getPenColors();

  return (
    <button type="button" className="modal-backdrop" tabIndex={-1} onClick={onClose} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}>
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
        <div className="drawing-toolbar" role="toolbar" aria-label="Annotation tools">
          <div role="radiogroup" aria-label="Pen color">
            {penColors.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                aria-label={c.label}
                aria-pressed={!erasing && penColor === c.value}
                className={`color-swatch ${!erasing && penColor === c.value ? "is-active" : ""}`}
                style={{ background: c.value }}
                onClick={() => {
                  setErasing(false);
                  setPenColor(c.value);
                }}
              />
            ))}
          </div>
          <span className="toolbar-separator" />
          <div role="radiogroup" aria-label="Pen size">
            {PEN_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                title={`${s}px`}
                aria-label={`${s}px pen size`}
                aria-pressed={penSize === s}
                className={penSize === s ? "is-active" : ""}
                onClick={() => setPenSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="toolbar-separator" />
          <button
            type="button"
            aria-label="Eraser"
            aria-pressed={erasing}
            className={erasing ? "is-active" : ""}
            onClick={() => setErasing(!erasing)}
          >
            ✕ Eraser
          </button>
          <button type="button" aria-label="Clear annotations" onClick={clearCanvas}>
            Clear
          </button>
          <div className="flex-1" />
          <button
            type="button"
            className="btn-save px-ut-3 py-ut-1 text-ut-xs font-heading font-bold uppercase tracking-ut-label cursor-pointer"
            onClick={handleSave}
          >
            Save
          </button>
        </div>

        {/* Image + canvas */}
        <div
          ref={containerRef}
          className="relative overflow-auto max-h-[50vh]"
        >
          <img
            src={imageSrc}
            alt="Evidence"
            onLoad={handleImageLoad}
            className="block w-full"
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: erasing ? "cell" : "crosshair" }}
          />
        </div>

        {/* Metadata */}
        <div className="p-ut-3">
          {capture.pageTitle && (
            <p className="text-ut-xs font-bold text-ut-text mb-1">{capture.pageTitle}</p>
          )}
          <p className="text-ut-xs font-mono text-ut-muted mb-1 break-all">
            {capture.sourceUrl}
          </p>
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
