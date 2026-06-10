import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import Evaluation from "@/components/Evaluation";
import Metadata from "@/components/Metadata";
import FinalizationScreen from "@/components/FinalizationScreen";
import { StoreProvider } from "./StoreProvider";
import { RUBRIC_DATA } from "@/data/rubrics";
import { computeCompletion } from "@/lib/rubric";
import type { Evaluation as EvalType, ReviewFinalization } from "@/lib/types";
import "@/entrypoints/sidepanel/style.css";

const TABS = [
  "Evaluation",
  "Evaluation",
  "Evaluation",
  "Evaluation",
  "Metadata",
  "Finalize",
] as const;
const SCENE_DURATION = 80; // frames per scene (~2.7s @ 30fps)

/**
 * Generate evaluation state for a given scene index.
 * Scene 0: empty, scene 1: 3 questions, scene 2: 7 questions, scene 3: all 10
 */
function getEvaluationsForScene(scene: number): EvalType[] {
  const allIds = Object.keys(RUBRIC_DATA.scoring_rubric);
  const counts = [0, 4, 7, 10];
  const count = counts[Math.min(scene, counts.length - 1)];
  return allIds.slice(0, count).map((id, i) => ({
    rubricId: id,
    score: (i % 3) + 1,
    notes: "",
    explicitEvidenceIds: [],
  }));
}

function getFinalizationForScene(
  scene: number,
  evaluations: EvalType[],
): ReviewFinalization | null {
  if (scene < 5) return null;
  const completion = computeCompletion(evaluations, RUBRIC_DATA, true);
  if (completion < 100) return null;
  return {
    finalizedAt: new Date().toISOString(),
    grade: "pass",
    conclusion:
      "Consensus demonstrates strong transparency and usability with clear source attribution.",
    strengths: ["Clear source attribution", "Intuitive interface", "Good academic coverage"],
    weaknesses: ["Limited methodology disclosure", "Data provenance transparency"],
  };
}

/** Tab indicator bar at the bottom of the sidebar. */
function TabBar({ activeTab }: { activeTab: string }) {
  const tabs = ["Evaluation", "Metadata", "Finalize", "Captures"];
  return (
    <div
      style={{
        display: "flex",
        borderTop: "1px solid var(--ut-border, #e0e0e0)",
        background: "var(--ut-panel-bg, #fff)",
        padding: "0 4px",
      }}
    >
      {tabs.map((tab) => (
        <div
          key={tab}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "6px 0",
            fontSize: 10,
            fontFamily: "var(--ff-heading, system-ui)",
            fontWeight: tab === activeTab ? 700 : 400,
            color: tab === activeTab ? "var(--trust-magenta, #a83279)" : "var(--ut-muted, #999)",
            borderBottom:
              tab === activeTab
                ? "2px solid var(--trust-magenta, #a83279)"
                : "2px solid transparent",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {tab}
        </div>
      ))}
    </div>
  );
}

/**
 * ExtensionWalkthrough: Shows the TRUST Review sidepanel in action.
 * Drives through evaluation → metadata → finalization using real components.
 *
 * Timeline (16s @ 30fps = 480 frames):
 *   0-80:     Evaluation empty
 *   80-160:   Questions being scored
 *   160-240:  More questions scored
 *   240-320:  All scored
 *   320-400:  Metadata tab
 *   400-480:  Finalization tab
 */
export function ExtensionWalkthrough() {
  const frame = useCurrentFrame();

  const sceneIndex = Math.min(Math.floor(frame / SCENE_DURATION), TABS.length - 1);
  const activeTab = TABS[sceneIndex];
  const evaluations = getEvaluationsForScene(sceneIndex);
  const finalization = getFinalizationForScene(sceneIndex, evaluations);

  // Fade in the sidebar
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#eef0f3",
        fontFamily: "var(--ff-body, system-ui, sans-serif)",
      }}
    >
      {/* Fake browser background */}
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
            width: 420,
            height: 780,
            background: "var(--ut-white, #fff)",
            borderRadius: 8,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.15), 4px 0 24px rgba(0,0,0,0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            opacity: fadeIn,
          }}
        >
          <StoreProvider evaluations={evaluations} finalization={finalization}>
            {/* Header bar */}
            <div
              style={{
                height: 44,
                background: "var(--trust-magenta-tint, #fde8f3)",
                borderBottom: "2px solid var(--trust-magenta-border, #f0c0d8)",
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                flexShrink: 0,
                gap: 8,
              }}
            >
              <span
                style={{
                  font: "bold 12px var(--ff-heading, system-ui)",
                  color: "var(--trust-magenta, #a83279)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                TRUST Review
              </span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  font: "600 13px var(--ff-heading, system-ui)",
                  color: "var(--trust-magenta, #a83279)",
                }}
              >
                Consensus
              </span>
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              {activeTab === "Evaluation" && <Evaluation />}
              {activeTab === "Metadata" && <Metadata />}
              {activeTab === "Finalize" && <FinalizationScreen />}
            </div>

            {/* Tab bar */}
            <TabBar activeTab={activeTab} />
          </StoreProvider>
        </div>
      </div>
    </AbsoluteFill>
  );
}
