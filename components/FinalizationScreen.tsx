import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useRubric, useTabNavigation } from "@/lib/contexts";
import { PRINCIPLES } from "@/lib/principles";
import { principleAverage } from "@/lib/rubric";
import type { FinalizationGrade, ReviewFinalization } from "@/lib/types";
import { useSessionStore } from "@/stores/session";
const GRADES: { value: FinalizationGrade; label: string; color: string; tint: string }[] = [
  { value: "pass", label: "Pass", color: "bg-ut-green", tint: "bg-grade-pass-tint" },
  {
    value: "conditional",
    label: "Conditional",
    color: "bg-score-1-strong",
    tint: "bg-grade-conditional-tint",
  },
  { value: "fail", label: "Fail", color: "bg-ut-red", tint: "bg-grade-fail-tint" },
];

export default function FinalizationScreen() {
  const { finalization, setFinalization, evaluations } = useActiveSession();
  const { rubric } = useRubric();
  const setActiveTab = useTabNavigation();

  const principleScores = useMemo(() => {
    if (!rubric) return [];
    return PRINCIPLES.map((p) => {
      const avg = principleAverage(p.id, evaluations, rubric);
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

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
        Finalize Review
      </h2>
      {draftSaved && !saved && (
        <p className="draft-saved-toast text-ut-xs text-ut-muted font-mono" aria-live="polite">
          Draft saved locally
        </p>
      )}

      {isFormallyFinalized && (
        <div className="bg-trust-magenta-tint rounded-ut-sm px-ut-3 py-ut-2">
          <p className="text-ut-xs text-ut-muted font-mono">
            Finalized {new Date(finalization.finalizedAt).toLocaleString()}
          </p>
          <div className="flex items-center gap-ut-2 mt-1">
            <span className="text-ut-xs text-ut-muted font-heading uppercase tracking-ut-label">
              Ready to export
            </span>
            <button
              type="button"
              className="text-ut-xs font-heading font-bold uppercase tracking-ut-label text-trust-magenta hover:text-trust-magenta-strong transition-colors"
              onClick={() => setActiveTab("Metadata")}
            >
              Export review &rarr;
            </button>
          </div>
        </div>
      )}
      {/* Per-principle score summary */}
      {rubric && (
        <ul className="grid grid-cols-5 gap-ut-1 list-none p-0 m-0" aria-label="Principle scores">
          {principleScores.map((p) => (
            <li
              key={p.id}
              className="text-center p-ut-2 rounded-ut-sm"
              aria-label={`${p.code}: ${p.avg !== null ? p.avg.toFixed(1) : "not scored"} out of 3.0`}
              style={{ background: `color-mix(in srgb, ${p.color} 7%, transparent)` }}
            >
              <div className="font-mono text-ut-xs font-bold" style={{ color: p.color }}>
                {p.code}
              </div>
              <div className="text-ut-lg font-bold text-ut-text">
                {p.avg !== null ? p.avg.toFixed(1) : "–"}
              </div>
              <div className="text-ut-xs text-ut-muted">/3.0</div>
            </li>
          ))}
        </ul>
      )}

      {/* Grade selector */}
      <div>
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy mb-1 block">
          Overall Grade
        </span>
        <div className="flex gap-ut-2">
          {GRADES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => handleGradeChange(g.value)}
              className={`grade-btn flex-1 px-ut-3 py-ut-2 rounded-ut-sm text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase ${
                grade === g.value
                  ? `${g.color} text-white is-selected`
                  : `border border-ut-border ${g.tint} text-ut-text hover:brightness-95`
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conclusion */}
      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Conclusion
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={4}
          placeholder="Overall summary of the review..."
          value={conclusion}
          onChange={(e) => handleConclusionChange(e.target.value)}
        />
      </label>

      {/* Strengths */}
      <BulletListEditor
        label="Strengths"
        items={strengths}
        onChange={handleStrengthsChange}
        placeholder="Describe a strength..."
      />

      {/* Weaknesses */}
      <BulletListEditor
        label="Weaknesses"
        items={weaknesses}
        onChange={handleWeaknessesChange}
        placeholder="Describe a weakness..."
      />

      {/* Recommendations */}
      <label className="flex flex-col gap-1">
        <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
          Recommendations
        </span>
        <textarea
          className="border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text resize-y focus:outline-none focus:ring-2 focus:ring-ut-blue"
          rows={3}
          placeholder="Suggestions for improvement..."
          value={recommendations}
          onChange={(e) => handleRecommendationsChange(e.target.value)}
        />
      </label>

      {/* Actions */}
      <div className="border-t-2 border-ut-border pt-ut-3 mt-1 flex items-center gap-ut-2">
        <button
          type="button"
          className="flex-1 rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase disabled:opacity-50 bg-trust-magenta text-white hover:bg-trust-magenta-strong transition-colors"
          disabled={!grade}
          onClick={handleSave}
        >
          Lock & Finalize Review
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-ut-green text-ut-xs font-heading font-bold uppercase tracking-ut-label shrink-0">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7.5l3 3 6-6" />
            </svg>
            Saved
          </span>
        )}
      </div>
      {finalization && (
        <button
          type="button"
          className="w-full rounded-ut-sm px-ut-4 py-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase text-ut-slate hover:text-ut-red"
          onClick={handleClear}
        >
          Clear Finalization
        </button>
      )}
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
                    className="text-ut-xs text-ut-slate hover:text-ut-blue shrink-0"
                    onClick={() => {
                      setEditingIndex(idx);
                      setEditValue(item);
                    }}
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    className="text-ut-xs text-ut-slate hover:text-ut-red shrink-0"
                    onClick={() => handleRemove(idx)}
                  >
                    remove
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
