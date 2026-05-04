// Traffic-light score indicator for PDF embedding.
// Generates a data URL for a 4-circle horizontal score display.

const CIRCLE_R = 8;
const CIRCLE_GAP = 5;
const STROKE_W = 1.0;
const CANVAS_H = (CIRCLE_R + STROKE_W) * 2 + 2;

type ScoreValue = 0 | 1 | 2 | 3 | "na";

const COLORS = {
  filled: "#172033",
  red: "#c60c30",
  orange: "#ea580c",
  darkGreen: "#0e7490",
  lightGreen: "#4a8355",
  naFill: "#d4d8de",
  naStroke: "#bfc6cf",
  emptyFill: "#ffffff",
  emptyStroke: "#172033",
} as const;

function fillForIndex(score: ScoreValue, i: number): { fill: string; stroke: string } {
  if (score === "na") return { fill: COLORS.naFill, stroke: COLORS.naStroke };
  const fills: Record<number, (i: number) => { fill: string; stroke: string }> = {
    0: (i) => i === 0 ? { fill: COLORS.red, stroke: COLORS.red } : { fill: COLORS.emptyFill, stroke: COLORS.emptyStroke },
    1: (i) => i === 0 ? { fill: COLORS.filled, stroke: COLORS.filled } : i === 1 ? { fill: COLORS.orange, stroke: COLORS.orange } : { fill: COLORS.emptyFill, stroke: COLORS.emptyStroke },
    2: (i) => i < 2 ? { fill: COLORS.filled, stroke: COLORS.filled } : i === 2 ? { fill: COLORS.darkGreen, stroke: COLORS.darkGreen } : { fill: COLORS.emptyFill, stroke: COLORS.emptyStroke },
    3: (i) => i < 2 ? { fill: COLORS.filled, stroke: COLORS.filled } : i === 2 ? { fill: COLORS.darkGreen, stroke: COLORS.darkGreen } : { fill: COLORS.lightGreen, stroke: COLORS.lightGreen },
  };
  return fills[score](i);
}

const cache = new Map<string, string>();

// Valid 1x1 transparent PNG
const PLACEHOLDER_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

function isCanvasAvailable(): boolean {
  return typeof document !== "undefined" && typeof document.createElement === "function";
}

export function scoreIndicatorUrl(score: ScoreValue | -1): string {
  const key = String(score);
  if (cache.has(key)) return cache.get(key)!;

  if (!isCanvasAvailable()) {
    cache.set(key, PLACEHOLDER_PNG);
    return PLACEHOLDER_PNG;
  }

  const n = 4;
  const cellW = CIRCLE_R * 2 + CIRCLE_GAP;
  const canvasW = cellW * n + STROKE_W * 2;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = Math.ceil(canvasW * scale);
  canvas.height = Math.ceil(CANVAS_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const resolved: ScoreValue = score === -1 ? "na" : (score as ScoreValue);

  for (let i = 0; i < n; i++) {
    const cx = STROKE_W + CIRCLE_R + i * cellW;
    const cy = CANVAS_H / 2;
    const { fill, stroke } = fillForIndex(resolved, i);
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_R, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = STROKE_W;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  const url = canvas.toDataURL("image/png");
  cache.set(key, url);
  return url;
}

export function averageScoreIndicatorUrl(
  scores: (number | "na" | "" | undefined)[],
): string {
  const numeric = scores.filter((s): s is number => typeof s === "number");
  if (numeric.length === 0) return scoreIndicatorUrl("na");
  const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
  const rounded = Math.round(avg) as 0 | 1 | 2 | 3;
  return scoreIndicatorUrl(rounded);
}
