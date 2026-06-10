/**
 * Extension Walkthrough — animated tour through the actual extension UI.
 *
 * Uses screenshots captured by capture-screenshots.mjs which loads the
 * real extension in Chrome via Playwright and captures each workflow step.
 *
 * Scenes:
 *  1. Start screen (0–80 frames)
 *  2. Evaluation tab with scores (80–220 frames)
 *  3. Metadata tab (220–340 frames)
 *  4. Finalization tab with verdict (340–480 frames)
 */
import { useCurrentFrame, useVideoConfig, Img, interpolate, spring, staticFile } from "remotion";

const SCREENSHOTS = {
  start: staticFile("screenshots/start-screen.png"),
  evaluationEmpty: staticFile("screenshots/evaluation-empty.png"),
  evaluationScored: staticFile("screenshots/evaluation-scored.png"),
  metadata: staticFile("screenshots/metadata.png"),
  finalization: staticFile("screenshots/finalization.png"),
};

interface Scene {
  id: string;
  src: string;
  startFrame: number;
  endFrame: number;
  label: string;
  description: string;
}

const SCENES: Scene[] = [
  {
    id: "start",
    src: SCREENSHOTS.start,
    startFrame: 0,
    endFrame: 80,
    label: "Step 1",
    description: "Start a new review",
  },
  {
    id: "eval-empty",
    src: SCREENSHOTS.evaluationEmpty,
    startFrame: 80,
    endFrame: 150,
    label: "Step 2",
    description: "Evaluate against the TRUST rubric",
  },
  {
    id: "eval-scored",
    src: SCREENSHOTS.evaluationScored,
    startFrame: 150,
    endFrame: 260,
    label: "Step 2",
    description: "Score quality gates & rubric questions",
  },
  {
    id: "metadata",
    src: SCREENSHOTS.metadata,
    startFrame: 260,
    endFrame: 360,
    label: "Step 3",
    description: "Record tool metadata & details",
  },
  {
    id: "finalize",
    src: SCREENSHOTS.finalization,
    startFrame: 360,
    endFrame: 480,
    label: "Step 4",
    description: "Finalize & export as .zip",
  },
];

/** Animated scene card that slides in from the right. */
function SceneCard({
  scene,
  frame,
  fps,
  isActive,
}: {
  scene: Scene;
  frame: number;
  fps: number;
  isActive: boolean;
}) {
  const localFrame = Math.max(0, frame - scene.startFrame);
  const progress = spring({
    frame: localFrame,
    fps,
    config: { damping: 14, stiffness: 80 },
    durationInFrames: 20,
  });

  // Fade out when scene ends
  const fadeOutRange = [scene.endFrame - 20, scene.endFrame];
  const fadeOut =
    frame >= fadeOutRange[0]
      ? interpolate(frame, fadeOutRange, [1, 0], { extrapolateRight: "clamp" })
      : 1;

  const opacity = isActive ? progress * fadeOut : 0;
  const translateX = interpolate(progress, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        transform: `translateX(${translateX}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Phone mockup frame */}
      <div
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
          backgroundColor: "#fff",
        }}
      >
        <Img
          src={scene.src}
          style={{
            height: 560,
            width: "auto",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

/** Step label overlay. */
function StepOverlay({ scene, frame, fps }: { scene: Scene; frame: number; fps: number }) {
  const localFrame = Math.max(0, frame - scene.startFrame);
  const labelOpacity = interpolate(localFrame, [5, 20], [0, 1], { extrapolateRight: "clamp" });
  const labelFadeOut =
    frame >= scene.endFrame - 15
      ? interpolate(frame, [scene.endFrame - 15, scene.endFrame], [1, 0], {
          extrapolateRight: "clamp",
        })
      : 1;

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: 32,
        right: 32,
        opacity: labelOpacity * labelFadeOut,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Step badge */}
        <div
          style={{
            backgroundColor: "#be185d",
            color: "white",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {scene.label.split(" ")[1]}
        </div>
        {/* Description */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#1e293b",
            letterSpacing: 0.5,
          }}
        >
          {scene.description}
        </div>
      </div>
    </div>
  );
}

/** Progress bar at the bottom. */
function ProgressBar({ frame }: { frame: number }) {
  const totalFrames = SCENES[SCENES.length - 1].endFrame;
  const progress = Math.min(frame / totalFrames, 1);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: "rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          backgroundColor: "#be185d",
          transition: "width 0.1s ease-out",
        }}
      />
    </div>
  );
}

export const ExtensionWalkthrough: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find the current active scene
  const activeScene = SCENES.find((s) => frame >= s.startFrame && frame < s.endFrame);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#f1f0ed",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          backgroundColor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          zIndex: 10,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: "#be185d", letterSpacing: 2 }}>
          TRUST REVIEW
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginLeft: 12 }}>
          — A structured walkthrough
        </div>
      </div>

      {/* Scenes */}
      {SCENES.map((scene) => {
        const isActive = frame >= scene.startFrame && frame < scene.endFrame;
        return (
          <SceneCard key={scene.id} scene={scene} frame={frame} fps={fps} isActive={isActive} />
        );
      })}

      {/* Step overlay */}
      {activeScene && <StepOverlay scene={activeScene} frame={frame} fps={fps} />}

      {/* Progress bar */}
      <ProgressBar frame={frame} />

      {/* Final frame: call to action */}
      {frame >= SCENES[SCENES.length - 1].endFrame - 30 && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(
              frame,
              [SCENES[SCENES.length - 1].endFrame - 30, SCENES[SCENES.length - 1].endFrame - 15],
              [0, 1],
              { extrapolateRight: "clamp" },
            ),
          }}
        >
          <div
            style={{
              backgroundColor: "#be185d",
              color: "white",
              padding: "8px 24px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            ⬇ Install the TRUST Review extension
          </div>
        </div>
      )}
    </div>
  );
};
