/**
 * TRUST Explainer — animated reveal of the actual nutrition label.
 *
 * Uses the screenshot captured from the real extension output
 * (built by capture-nutrition-label.mjs which uses the actual
 * report.css and data structure from buildNutritionLabel).
 */
import { useCurrentFrame, useVideoConfig, Img, interpolate, spring, staticFile } from "remotion";

const LABEL_SRC = staticFile("screenshots/nutrition-label.png");

export const TrustExplainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase 1: TRUST title (0–90 frames = 0–3s) ────────────────────────
  const titleScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });
  const titleFadeOut = interpolate(frame, [75, 90], [1, 0], { extrapolateRight: "clamp" });

  // ── Phase 2: Nutrition label reveal (90–270 frames = 3–9s) ───────────
  const labelOpacity = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" });
  const labelScale = spring({
    frame: Math.max(0, frame - 90),
    fps,
    config: { damping: 14, stiffness: 60 },
  });

  // Zoom into verdict section
  const zoomPhase = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: "clamp" });
  const panY = interpolate(zoomPhase, [0, 1], [0, -80]);
  const zoomScale = interpolate(zoomPhase, [0, 1], [1, 1.8]);

  // Zoom back out to show full label
  const unzoomPhase = interpolate(frame, [180, 200], [0, 1], { extrapolateRight: "clamp" });
  const finalPanY = interpolate(unzoomPhase, [0, 1], [panY, 0]);
  const finalZoom = interpolate(unzoomPhase, [0, 1], [zoomScale, 1]);

  // ── Phase 3: Fade out (260–300 frames = ~8.7–10s) ────────────────────
  const fadeOut = interpolate(frame, [260, 290], [1, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#f8f7f4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Phase 1: Title card */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          opacity: titleOpacity * titleFadeOut,
          transform: `scale(${titleScale})`,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 8, color: "#be185d" }}>
          TRUST
        </div>
        <div style={{ fontSize: 20, color: "#64748b", fontWeight: 400 }}>
          Evaluating AI search tools with confidence
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 14,
            color: "#be185d",
            opacity: subtitleOpacity,
            letterSpacing: 2,
            textTransform: "uppercase" as const,
          }}
        >
          Nutrition Label
        </div>
      </div>

      {/* Phase 2: Nutrition label */}
      <div
        style={{
          position: "absolute",
          opacity: labelOpacity * fadeOut,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          height: "100%",
          overflow: "hidden",
          paddingTop: 20,
        }}
      >
        <div
          style={{
            transform: `scale(${labelScale * finalZoom}) translateY(${finalPanY}px)`,
            transformOrigin: "top center",
            maxHeight: "100%",
          }}
        >
          <Img
            src={LABEL_SRC}
            style={{
              height: 680,
              width: "auto",
              borderRadius: 8,
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            }}
          />
        </div>
      </div>

      {/* Step indicator overlay */}
      {frame >= 95 && frame < 260 && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(frame, [95, 105, 250, 260], [0, 0.8, 0.8, 0], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "white",
              padding: "6px 16px",
              borderRadius: 20,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            {frame < 175 ? "RECOMMENDED — 23/30 points" : "5 principles · 10 questions · 1 verdict"}
          </div>
        </div>
      )}
    </div>
  );
};
