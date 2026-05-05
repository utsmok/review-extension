import { useEffect, useRef, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useTabNavigation } from "@/lib/tab-navigation-context";
import type { FinalizationGrade, ReviewFinalization } from "@/lib/types";

const GRADES: { value: FinalizationGrade; label: string; color: string; tint: string }[] = [
  { value: "pass", label: "Pass", color: "bg-ut-green", tint: "bg-grade-pass-tint" },
  {
    value: "conditional",
    label: "Conditional",
    color: "bg-score-1",
    tint: "bg-grade-conditional-tint",
  },
  { value: "fail", label: "Fail", color: "bg-ut-red", tint: "bg-grade-fail-tint" },
];

export default function FinalizationScreen() {
  const { finalization, setFinalization } = useActiveSession();
  const setActiveTab = useTabNavigation();

  const [grade, setGrade] = useState<FinalizationGrade | "">(finalization?.grade ?? "");
  const [conclusion, setConclusion] = useState(finalization?.conclusion ?? "");
  const [strengths, setStrengths] = useState<string[]>(finalization?.strengths ?? [""]);
  const [weaknesses, setWeaknesses] = useState<string[]>(finalization?.weaknesses ?? [""]);
  const [recommendations, setRecommendations] = useState(finalization?.recommendations ?? "");
  const [saved, setSaved] = useState(!!finalization);

  // Track if user has edited since last save (to clear persistent "Saved" indicator)
  const lastSavedData = useRef<ReviewFinalization | null>(finalization ?? null);

  // C8: Sync local state when store finalization changes externally
  useEffect(() => {
    if (finalization) {
      setGrade(finalization.grade);
      setConclusion(finalization.conclusion);
      setStrengths(finalization.strengths.length > 0 ? finalization.strengths : [""]);
      setWeaknesses(finalization.weaknesses.length > 0 ? finalization.weaknesses : [""]);
      setRecommendations(finalization.recommendations);
      setSaved(true);
      lastSavedData.current = finalization;
    } else {
      setGrade("");
      setConclusion("");
      setStrengths([""]);
      setWeaknesses([""]);
      setRecommendations("");
      setSaved(false);
      lastSavedData.current = null;
    }
  }, [finalization]);

  const handleSave = () => {
    if (!grade) return;

    const data: ReviewFinalization = {
      grade,
      conclusion: conclusion.trim(),
      strengths: strengths.map((s) => s.trim()).filter(Boolean),
      weaknesses: weaknesses.map((w) => w.trim()).filter(Boolean),
      recommendations: recommendations.trim(),
      finalizedAt: new Date().toISOString(),
    };
    setFinalization(data);
    lastSavedData.current = data;
    setSaved(true);
  };

  const handleClear = () => {
    setGrade("");
    setConclusion("");
    setStrengths([""]);
    setWeaknesses([""]);
    setRecommendations("");
    setFinalization(null);
    setSaved(false);
    lastSavedData.current = null;
  };

  // Detect edits to mark unsaved state
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

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
        Finalize Review
      </h2>

      {finalization && (
        <div className="border-l-2 border-trust-magenta pl-ut-2">
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
              className={`flex-1 px-ut-3 py-ut-2 rounded-ut-sm text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase transition-colors ${
                grade === g.value
                  ? `${g.color} text-white`
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
          Save Finalization
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

/**
 * Stable key counter — persists across renders so items keep their keys
 * when the list is modified.
 */
let bulletIdCounter = 0;
function nextBulletId(): string {
  return `item-${++bulletIdCounter}`;
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
  // Track stable keys per item position
  const keysRef = useRef<string[]>([]);

  // Ensure we have a key for every item
  if (keysRef.current.length < items.length) {
    while (keysRef.current.length < items.length) {
      keysRef.current.push(nextBulletId());
    }
  }
  // Trim if items were removed
  if (keysRef.current.length > items.length) {
    keysRef.current = keysRef.current.slice(0, items.length);
  }

  const handleRemove = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    keysRef.current = keysRef.current.filter((_, i) => i !== idx);
    onChange(next);
  };

  const handleAdd = () => {
    keysRef.current.push(nextBulletId());
    onChange([...items, ""]);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {label}
      </span>
      {items.map((item, idx) => (
        <div key={keysRef.current[idx]} className="flex gap-ut-1">
          <input
            className="flex-1 border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
            placeholder={placeholder}
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
          />
          {items.length > 1 && (
            <button
              type="button"
              className="px-ut-2 text-ut-slate hover:text-ut-red transition-colors"
              onClick={() => handleRemove(idx)}
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="self-start text-ut-sm text-ut-blue hover:text-ut-navy font-heading font-bold uppercase tracking-ut-label"
        onClick={handleAdd}
      >
        + Add {label.toLowerCase().slice(0, -1)}
      </button>
    </div>
  );
}
