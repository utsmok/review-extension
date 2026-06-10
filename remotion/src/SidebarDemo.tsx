import { AbsoluteFill, useCurrentFrame } from "remotion";
import Evaluation from "@/components/Evaluation";
import { StoreProvider } from "./StoreProvider";
import type { Evaluation as EvalType } from "@/lib/types";
import { RUBRIC_DATA } from "@/data/rubrics";
import "@/entrypoints/sidepanel/style.css";

/**
 * Minimal proof-of-concept: render the Evaluation component
 * with progressively scored questions driven by frame counter.
 */
export function SidebarDemo() {
  const frame = useCurrentFrame();

  const allQuestionIds = Object.keys(RUBRIC_DATA.scoring_rubric);
  const scoredCount = Math.min(allQuestionIds.length, Math.floor(frame / 20));

  const evaluations: EvalType[] = allQuestionIds.slice(0, scoredCount).map((id, i) => ({
    rubricId: id,
    score: (i % 3) + 1,
    notes: "",
    evidenceIds: [],
  }));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "var(--ut-canvas)",
        fontFamily: "var(--ff-body)",
      }}
    >
      <StoreProvider evaluations={evaluations} finalization={null}>
        <div
          style={{
            width: 420,
            height: 780,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header bar */}
          <div
            style={{
              height: 44,
              background: "var(--trust-magenta-tint)",
              borderBottom: "2px solid var(--trust-magenta-border)",
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                font: "bold 12px var(--ff-heading)",
                color: "var(--trust-magenta)",
                letterSpacing: "var(--ls-label)",
                textTransform: "uppercase",
              }}
            >
              Consensus
            </span>
          </div>
          {/* Evaluation panel */}
          <div style={{ flex: 1, overflow: "auto" }}>
            <Evaluation />
          </div>
        </div>
      </StoreProvider>
    </AbsoluteFill>
  );
}
