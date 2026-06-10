import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import Evaluation from "@/components/Evaluation";
import Metadata from "@/components/Metadata";
import FinalizationScreen from "@/components/FinalizationScreen";
import { StoreProvider } from "./StoreProvider";
import { RUBRIC_DATA } from "@/data/rubrics";
import { computeCompletion, getVisibleRubricQuestionIds } from "@/lib/rubric";
import type { Evaluation as EvalType, ReviewFinalization } from "@/lib/types";
import "@/entrypoints/sidepanel/style.css";

// ── Scene boundaries (frames @ 30fps, total 480 = 16s) ──────────────────
const SCENES = {
  emptyEval: [0, 100], // 0–3.3s: empty evaluation
  scoring: [100, 250], // 3.3–8.3s: scoring in progress (0→10 questions)
  allScored: [250, 320], // 8.3–10.7s: all 10 scored
  metadata: [320, 380], // 10.7–12.7s: metadata tab
  finalize: [380, 480], // 12.7–16s: finalization tab
} as const;

const ALL_QUESTION_IDS = getVisibleRubricQuestionIds(RUBRIC_DATA, true);

// ── Helpers ─────────────────────────────────────────────────────────────

/** Build evaluation entries for `count` scored questions. */
function makeEvals(count: number): EvalType[] {
  return ALL_QUESTION_IDS.slice(0, count).map((id, i) => ({
    rubricId: id,
    score: ((i % 3) + 1) as 1 | 2 | 3,
    notes: "",
    explicitEvidenceIds: [],
  }));
}

function makeFinalization(): ReviewFinalization {
  return {
    finalizedAt: new Date().toISOString(),
    grade: "pass",
    conclusion:
      "Consensus demonstrates strong transparency and usability with clear source attribution.",
    strengths: ["Clear source attribution", "Intuitive interface", "Good academic coverage"],
    weaknesses: ["Limited methodology disclosure", "Data provenance transparency"],
    recommendations: "Improve methodology documentation and add data provenance indicators.",
  };
}

// ── Scene logic ─────────────────────────────────────────────────────────

function getSceneState(frame: number) {
  // Determine active tab
  let activeTab: string;
  if (frame < SCENES.metadata[0]) activeTab = "Evaluation";
  else if (frame < SCENES.finalize[0]) activeTab = "Metadata";
  else activeTab = "Finalize";

  // Determine evaluation count (smooth interpolation during scoring scene)
  let evalCount: number;
  if (frame < SCENES.scoring[0]) {
    evalCount = 0;
  } else if (frame < SCENES.allScored[0]) {
    // Smoothly ramp from 0 to all questions during scoring scene
    evalCount = Math.round(
      interpolate(frame, [SCENES.scoring[0], SCENES.allScored[0]], [0, ALL_QUESTION_IDS.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
    );
  } else {
    evalCount = ALL_QUESTION_IDS.length;
  }

  const evaluations = makeEvals(evalCount);
  const completion = computeCompletion(evaluations, RUBRIC_DATA, true);
  const finalization = activeTab === "Finalize" ? makeFinalization() : null;

  return { activeTab, evaluations, completion, finalization };
}

// ── Tab bar (uses real CSS classes from components.css) ─────────────────

function TabBar({ activeTab }: { activeTab: string }) {
  const tabs = ["Evaluation", "Metadata", "Finalize", "Captures"];
  return (
    <div className="sidebar-tab-bar">
      {tabs.map((tab) => (
        <div key={tab} className={`sidebar-tab ${tab === activeTab ? "is-active" : ""}`}>
          {tab}
        </div>
      ))}
    </div>
  );
}

// ── Progress indicator ──────────────────────────────────────────────────

function ProgressIndicator({ completion }: { completion: number }) {
  const metaDone = completion > 0; // show metadata ✓ once evals start
  const evalPct = completion;
  const finalizeReady = completion === 100;

  return (
    <div
      style={{
        padding: "4px 16px",
        borderBottom: "1px solid #bfc6cf",
        background: "#f3f4f6",
        display: "flex",
        gap: 8,
        fontSize: 11,
        color: "#4f5e73",
        flexShrink: 0,
        fontFamily: "var(--ff-body, system-ui, sans-serif)",
      }}
    >
      <span style={{ color: metaDone ? "#1a7f37" : "#4f5e73" }}>
        Metadata {metaDone ? "✓" : "○"}
      </span>
      <span style={{ color: "#bfc6cf" }}>·</span>
      <span>Evaluation {evalPct}%</span>
      <span style={{ color: "#bfc6cf" }}>·</span>
      <span style={{ color: finalizeReady ? "#1a7f37" : "#4f5e73" }}>
        Finalize {finalizeReady ? "✓" : "○"}
      </span>
      <span style={{ color: "#bfc6cf" }}>·</span>
      <span>Captures 0</span>
    </div>
  );
}

// ── Main composition ────────────────────────────────────────────────────

export function ExtensionWalkthrough() {
  const frame = useCurrentFrame();
  const { activeTab, evaluations, completion, finalization } = getSceneState(frame);

  // Sidebar fade-in over first 20 frames
  const sidebarOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tab content cross-fade: brief fade-out/in at scene transitions
  // Transition points: 320 (→Metadata), 380 (→Finalize)
  let contentOpacity = 1;
  const transitions = [SCENES.metadata[0], SCENES.finalize[0]];
  const FADE_FRAMES = 10;

  for (const t of transitions) {
    const fadeOut = interpolate(frame, [t - FADE_FRAMES, t], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const fadeIn = interpolate(frame, [t, t + FADE_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    if (frame >= t - FADE_FRAMES && frame < t) {
      contentOpacity = Math.min(contentOpacity, fadeOut);
    } else if (frame >= t && frame < t + FADE_FRAMES) {
      contentOpacity = Math.min(contentOpacity, fadeIn);
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#e8eaed" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Sidebar mockup */}
        <div
          style={{
            width: 400,
            height: 680,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12), 4px 0 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            opacity: sidebarOpacity,
          }}
        >
          <StoreProvider evaluations={evaluations} finalization={finalization}>
            {/* 1. Top accent bar */}
            <div style={{ height: 8, background: "#8e036c", flexShrink: 0 }} />

            {/* 2. Header bar */}
            <div
              style={{
                height: 40,
                background: "#fbe8f5",
                borderBottom: "2px solid #c991ab",
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  cursor: "default",
                  lineHeight: 1,
                }}
              >
                ✕
              </span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  fontSize: 12,
                  color: "#4c5e74",
                  fontFamily: "var(--ff-body, system-ui, sans-serif)",
                }}
              >
                Reviewing:
              </span>
              {/* Tool icon placeholder */}
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "#d1d5db",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#8e036c",
                  fontFamily: "var(--ff-body, system-ui, sans-serif)",
                }}
              >
                Consensus
              </span>
            </div>

            {/* 3. Tab bar (uses real CSS) */}
            <TabBar activeTab={activeTab} />

            {/* 4. Progress indicator */}
            <ProgressIndicator completion={completion} />

            {/* 5. Tab content (fade transitions) */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                background: "#f3f4f6",
                opacity: contentOpacity,
              }}
            >
              {activeTab === "Evaluation" && <Evaluation />}
              {activeTab === "Metadata" && <Metadata />}
              {activeTab === "Finalize" && <FinalizationScreen />}
            </div>
          </StoreProvider>
        </div>
      </div>
    </AbsoluteFill>
  );
}
