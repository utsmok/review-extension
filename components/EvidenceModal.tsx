import { useEffect, useRef, useState } from "react";
import type { Capture } from "@/lib/types";
import { useSessionStore } from "@/stores/session";

const PEN_COLORS = [
  { label: "Black", value: "#172033" },
  { label: "Red", value: "#c60c30" },
  { label: "Blue", value: "#007d9c" },
];

const PEN_SIZES = [2, 4, 6];

interface EvidenceModalProps {
  capture: Capture;
  onClose: () => void;
}

export default function EvidenceModal({ capture, onClose }: EvidenceModalProps) {
  const updateCapture = useSessionStore((s) => s.updateCapture);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [penColor, setPenColor] = useState(PEN_COLORS[0].value);
  const [penSize, setPenSize] = useState(PEN_SIZES[1]);
  const [erasing, setErasing] = useState(false);
  const [notes, setNotes] = useState(capture.notes);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const imageSrc = capture.annotatedScreenshotBase64 ?? capture.screenshotBase64;

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
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const hasDrawing = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data.some((v, i) => i % 4 === 3 && v > 0);
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: 720, padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="drawing-toolbar">
          {PEN_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              className={`color-swatch ${!erasing && penColor === c.value ? "is-active" : ""}`}
              style={{ background: c.value }}
              onClick={() => {
                setErasing(false);
                setPenColor(c.value);
              }}
            />
          ))}
          <span style={{ width: 1, height: 16, background: "var(--ut-border)", margin: "0 2px" }} />
          {PEN_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              title={`${s}px`}
              className={penSize === s ? "is-active" : ""}
              onClick={() => setPenSize(s)}
            >
              {s}
            </button>
          ))}
          <span style={{ width: 1, height: 16, background: "var(--ut-border)", margin: "0 2px" }} />
          <button
            type="button"
            className={erasing ? "is-active" : ""}
            onClick={() => setErasing(!erasing)}
          >
            ✕ Eraser
          </button>
          <button type="button" onClick={clearCanvas}>
            Clear
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="bg-ut-green text-white"
            style={{ border: "none", padding: "var(--space-1) var(--space-3)", fontSize: "var(--text-xs)", fontFamily: "var(--ff-heading)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "var(--ls-label)", cursor: "pointer" }}
            onClick={handleSave}
          >
            Save
          </button>
        </div>

        {/* Image + canvas */}
        <div
          ref={containerRef}
          style={{ position: "relative", overflow: "auto", maxHeight: "50vh" }}
        >
          <img
            src={imageSrc}
            alt="Evidence"
            onLoad={handleImageLoad}
            style={{ display: "block", width: "100%" }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              cursor: erasing ? "cell" : "crosshair",
            }}
          />
        </div>

        {/* Metadata */}
        <div style={{ padding: "var(--space-3)" }}>
          {capture.pageTitle && (
            <p className="text-ut-xs font-bold text-ut-text mb-1">{capture.pageTitle}</p>
          )}
          <p className="text-ut-xs font-mono text-ut-muted mb-1" style={{ wordBreak: "break-all" }}>
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
    </div>
  );
}
