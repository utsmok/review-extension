import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRubric, useTabNavigation } from "@/components/contexts";
import ExportActions from "@/components/finalization/ExportActions";
import GradeSelector from "@/components/finalization/GradeSelector";
import { useActiveSession } from "@/hooks/useActiveSession";
import { PRINCIPLES } from "@/lib/principles";
import { principleAverage } from "@/lib/rubric";
import type { FinalizationGrade, ReviewFinalization } from "@/lib/types";
import { useSessionStore } from "@/stores/session";

export default function FinalizationScreen() {
  const { finalization, setFinalization, evaluations } = useActiveSession();
  const { rubric } = useRubric();
  const setActiveTab = useTabNavigation();

  const principleScores = useMemo(() => {
    if (!rubric) return [];
    const evalMap = new Map(evaluations.map((e) => [e.rubricId, e]));
    return PRINCIPLES.map((p) => {
      const avg = principleAverage(p.id, evaluations, rubric, evalMap);
      return { id: p.id, code: p.code, color: p.color, avg };
    });
  }, [evaluations, rubric]);

  const [grade, setGrade] = useState<FinalizationGrade | "">(finalization?.grade ?? "");
  const [conclusion, setConclusion] = useState(finalization?.conclusion ?? "");
  const [strengths, setStrengths] = useState<string[]>(finalization?.strengths ?? []);
  const [weaknesses, setWeaknesses] = useState<string[]>(finalization?.weaknesses ?? []);
  const [recommendations, setRecommendations] = useState(finalization?.recommendations ?? "");
  const [saved, setSaved] = useState(!!finalization?.finalizedAt);
  const [draftSaved, setDraftSaved] = useState(false);

  // Track if user has edited since last explicit save (to clear "Saved" indicator)
  const lastSavedData = useRef<ReviewFinalization | null>(finalization ?? null);

  // Autosave debounce timer
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guard: skip sync effect when the change originated from our own autosave/save/clear
  const isLocalChange = useRef(false);

  // ── Autosave: debounced 50ms, watches all fields ──────────────────────
  useEffect(() => {
    // Don't autosave when grade is empty (incomplete data)
    if (!grade) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      const currentFin = useSessionStore.getState().finalization;
      const data: ReviewFinalization = {
        grade,
        conclusion: conclusion.trim(),
        strengths: strengths.map((s) => s.trim()).filter(Boolean),
        weaknesses: weaknesses.map((w) => w.trim()).filter(Boolean),
        recommendations: recommendations.trim(),
        // Autosave preserves existing finalizedAt — does NOT set it
        finalizedAt: currentFin?.finalizedAt ?? "",
      };
      isLocalChange.current = true;
      setFinalization(data);
      setDraftSaved(true);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      draftTimerRef.current = setTimeout(() => setDraftSaved(false), 5000);
    }, 50);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [grade, conclusion, strengths, weaknesses, recommendations, setFinalization]);

  // ── Sync local state when store finalization changes externally ───────
  useEffect(() => {
    if (isLocalChange.current) {
      isLocalChange.current = false;
      return;
    }
    if (finalization) {
      setGrade(finalization.grade);
      setConclusion(finalization.conclusion);
      setStrengths(finalization.strengths);
      setWeaknesses(finalization.weaknesses);
      setRecommendations(finalization.recommendations);
      setSaved(!!finalization.finalizedAt);
      lastSavedData.current = finalization;
    } else {
      setGrade("");
      setConclusion("");
      setStrengths([]);
      setWeaknesses([]);
      setRecommendations("");
      setSaved(false);
      lastSavedData.current = null;
    }
  }, [finalization]);

  // ── Explicit Save: sets finalizedAt timestamp ─────────────────────────
  const handleSave = useCallback(() => {
    if (!grade) return;

    // Cancel pending autosave to prevent race
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const data: ReviewFinalization = {
      grade,
      conclusion: conclusion.trim(),
      strengths: strengths.map((s) => s.trim()).filter(Boolean),
      weaknesses: weaknesses.map((w) => w.trim()).filter(Boolean),
      recommendations: recommendations.trim(),
      finalizedAt: new Date().toISOString(),
    };
    isLocalChange.current = true;
    setFinalization(data);
    lastSavedData.current = data;
    setSaved(true);
  }, [grade, conclusion, strengths, weaknesses, recommendations, setFinalization]);

  const handleClear = useCallback(() => {
    // Cancel pending autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    setGrade("");
    setConclusion("");
    setStrengths([]);
    setWeaknesses([]);
    setRecommendations("");
    isLocalChange.current = true;
    setFinalization(null);
    setSaved(false);
    lastSavedData.current = null;
  }, [setFinalization]);

  // Detect edits to mark unsaved state (formal save needed)
  const handleGradeChange = (g: FinalizationGrade) => {
    setGrade(g);
    setSaved(false);
  };
  const handleConclusionChange = (v: string) => {
    setConclusion(v);
    setSaved(false);
  };
  const handleStrengthsChange = (items: string[]) => {
    setStrengths(items);
    setSaved(false);
  };
  const handleWeaknessesChange = (items: string[]) => {
    setWeaknesses(items);
    setSaved(false);
  };
  const handleRecommendationsChange = (v: string) => {
    setRecommendations(v);
    setSaved(false);
  };

  // Show "Finalized" banner only when formally finalized (finalizedAt is set)
  const isFormallyFinalized = !!finalization?.finalizedAt;

  // Overall average across all scored principles
  const overallAvg = useMemo(() => {
    const scored = principleScores.filter((p) => p.avg !== null);
    if (scored.length === 0) return null;
    return scored.reduce((sum, p) => sum + (p.avg ?? 0), 0) / scored.length;
  }, [principleScores]);

  // Score-to-color for the overall hero
  const overallColor = useMemo(() => {
    if (overallAvg === null) return "var(--ut-slate)";
    if (overallAvg >= 2.5) return "var(--score-3)";
    if (overallAvg >= 1.5) return "var(--score-2)";
    if (overallAvg >= 0.5) return "var(--score-1)";
    return "var(--score-0)";
  }, [overallAvg]);

  return (
    <div className="finalization-screen flex flex-col gap-ut-3 p-ut-4">
      <p className="text-ut-xs font-heading font-bold uppercase tracking-ut-kicker text-ut-slate">
        Review Summary
      </p>
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
        Finalize Review
      </h2>
      {draftSaved && !saved && (
        <p className="draft-saved-toast text-ut-xs text-ut-muted font-mono" aria-live="polite">
          Draft saved locally
        </p>
      )}

      {isFormallyFinalized && (
        <div className="finalized-banner finalized-banner--active rounded-ut-sm px-ut-4 py-ut-3 flex items-center gap-ut-3">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-ut-2">
              <svg
                className="finalized-banner__icon"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 1l2.1 4.3 4.9.7-3.5 3.4.8 4.6L9 11.8 4.7 14l.8-4.6L2 6l4.9-.7L9 1z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-heading font-bold uppercase tracking-ut-label text-trust-magenta text-ut-sm">
                Review Finalized
              </span>
            </div>
            <p className="text-ut-xs text-ut-muted font-mono mt-1">
              {new Date(finalization.finalizedAt).toLocaleString()}
            </p>
            <div className="flex items-center gap-ut-2 mt-1">
              <button
                type="button"
                className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta hover:text-trust-magenta-strong transition-colors"
                onClick={() => setActiveTab("Metadata")}
              >
                Export review &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Overall score hero */}
      {rubric && (
        <div
          className="finalization-hero-score rounded-ut-sm p-ut-4 text-center"
          style={{
            background:
              overallAvg !== null
                ? `linear-gradient(180deg, color-mix(in srgb, ${overallColor} 10%, var(--ut-grey)) 0%, var(--ut-grey) 100%)`
                : "var(--ut-grey)",
            borderTop:
              overallAvg !== null ? `6px solid ${overallColor}` : "6px solid var(--ut-border)",
          }}
          role="status"
          aria-label={
            overallAvg !== null
              ? `Overall score: ${overallAvg.toFixed(1)} out of 3.0`
              : "No scores yet"
          }
        >
          <div className="font-heading font-bold uppercase tracking-ut-kicker text-ut-sm text-ut-slate mb-1">
            Overall Score
          </div>
          {overallAvg !== null ? (
            <div className="finalization-score-number" style={{ color: overallColor }}>
              {overallAvg.toFixed(1)}
            </div>
          ) : (
            <div className="finalization-score-number finalization-score-number--empty">
              &ndash;
            </div>
          )}
          <div className="text-ut-xs text-ut-muted font-mono mt-1">out of 3.0</div>
        </div>
      )}

      {/* Per-principle score dashboard */}
      {rubric && (
        <ul className="finalization-principle-grid list-none p-0 m-0" aria-label="Principle scores">
          {principleScores.length > 0 &&
            principleScores.map((p) => {
              const pct = p.avg !== null ? (p.avg / 3) * 100 : 0;
              return (
                <li
                  key={p.id}
                  className="finalization-principle-card text-center p-ut-2 rounded-ut-sm"
                  aria-label={`${p.code}: ${p.avg !== null ? p.avg.toFixed(1) : "not scored"} out of 3.0`}
                  style={{
                    background: `color-mix(in srgb, ${p.color} 10%, var(--ut-white))`,
                    borderTop: `3px solid ${p.color}`,
                  }}
                >
                  <div className="font-mono text-ut-xs font-bold" style={{ color: p.color }}>
                    {p.code}
                  </div>
                  <div className="finalization-principle-score">
                    {p.avg !== null ? p.avg.toFixed(1) : "–"}
                  </div>
                  {/* Mini progress bar */}
                  <div
                    className="finalization-progress-track"
                    style={{
                      background: `color-mix(in srgb, ${p.color} 20%, var(--ut-white))`,
                    }}
                  >
                    <div
                      className="finalization-progress-fill"
                      style={{
                        background: p.color,
                        transform: `scaleX(${pct / 100})`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
        </ul>
      )}

      {/* Grade selector */}
      <GradeSelector grade={grade} onGradeChange={handleGradeChange} />
      <p className="text-ut-sm text-ut-muted">
        Select the overall recommendation based on scoring results and your professional judgment.
        The conclusion should stand on its own — a colleague reading only the report should
        understand your reasoning.
      </p>

      {/* Conclusion */}
      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Conclusion
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={4}
          placeholder="Summarize the key findings. Reference specific principles or criteria where relevant (e.g., 'Strong transparency but limited accessibility'). Mention the tool's primary strengths and the most significant concerns."
          value={conclusion}
          onChange={(e) => handleConclusionChange(e.target.value)}
        />
      </label>

      {/* Strengths */}
      <BulletListEditor
        label="Strengths"
        items={strengths}
        onChange={handleStrengthsChange}
        placeholder="e.g., Clear source list with coverage dates"
      />

      {/* Weaknesses */}
      <BulletListEditor
        label="Weaknesses"
        items={weaknesses}
        onChange={handleWeaknessesChange}
        placeholder="e.g., No accessibility statement; keyboard navigation incomplete"
      />

      {/* Recommendations */}
      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Recommendations
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={3}
          placeholder="Specific, actionable suggestions for the tool vendor or for UT's adoption decision (e.g., 'Request WCAG audit before institutional licensing')."
          value={recommendations}
          onChange={(e) => handleRecommendationsChange(e.target.value)}
        />
      </label>

      <ExportActions
        onFinalize={handleSave}
        onClear={handleClear}
        canFinalize={!!grade}
        saved={saved}
        showClear={!!finalization}
      />
    </div>
  );
}

function BulletListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingIndex !== null) editRef.current?.focus();
  }, [editingIndex]);

  // Handle submit (Enter key or button click)
  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setInputValue("");
    inputRef.current?.focus();
  };

  // Handle edit confirmation
  const handleEditConfirm = (idx: number) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      // Remove if emptied during edit
      handleRemove(idx);
    } else {
      const next = [...items];
      next[idx] = trimmed;
      onChange(next);
    }
    setEditingIndex(null);
  };

  const handleRemove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {label}
      </span>
      {/* Input row */}
      <div className="flex gap-ut-1">
        <input
          ref={inputRef}
          className="flex-1 border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button
          type="button"
          className="px-ut-3 text-ut-sm text-ut-blue hover:text-ut-navy font-heading font-bold"
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
        >
          Add
        </button>
      </div>
      {/* Items list */}
      {items.length > 0 && (
        <ul className="flex flex-col gap-ut-1 ml-ut-1">
          {items.map((item, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: simple string list, index is sufficient
            <li key={idx} className="bullet-item-enter flex items-start gap-ut-1 text-ut-sm">
              <span className="text-ut-slate shrink-0">•</span>
              {editingIndex === idx ? (
                <input
                  ref={editRef}
                  className="flex-1 border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-sm text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditConfirm(idx)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleEditConfirm(idx);
                    }
                    if (e.key === "Escape") {
                      setEditingIndex(null);
                    }
                  }}
                />
              ) : (
                <span className="flex-1 text-ut-text break-words">{item}</span>
              )}
              {editingIndex !== idx && (
                <>
                  <button
                    type="button"
                    title="Edit"
                    className="bullet-action-btn bullet-action-btn--edit shrink-0"
                    onClick={() => {
                      setEditingIndex(idx);
                      setEditValue(item);
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Remove"
                    className="bullet-action-btn bullet-action-btn--remove shrink-0"
                    onClick={() => handleRemove(idx)}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
