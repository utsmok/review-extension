import { useEffect, useRef, useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useTabNavigation } from "@/lib/tab-navigation-context";
import type { FinalizationGrade, ReviewFinalization } from "@/lib/types";

const GRADES: { value: FinalizationGrade; label: string; color: string }[] = [
  { value: "pass", label: "Pass", color: "bg-ut-green" },
  { value: "conditional", label: "Conditional", color: "bg-score-1" },
  { value: "fail", label: "Fail", color: "bg-ut-red" },
];

export default function FinalizationScreen() {
  const { finalization, setFinalization } = useActiveSession();
  const setActiveTab = useTabNavigation();

  const [grade, setGrade] = useState<FinalizationGrade | "">(finalization?.grade ?? "");
  const [conclusion, setConclusion] = useState(finalization?.conclusion ?? "");
  const [strengths, setStrengths] = useState<string[]>(finalization?.strengths ?? [""]);
  const [weaknesses, setWeaknesses] = useState<string[]>(finalization?.weaknesses ?? [""]);
  const [recommendations, setRecommendations] = useState(finalization?.recommendations ?? "");
  const [justSaved, setJustSaved] = useState(false);

  // C8: Sync local state when store finalization changes externally
  useEffect(() => {
    if (finalization) {
      setGrade(finalization.grade);
      setConclusion(finalization.conclusion);
      setStrengths(finalization.strengths.length > 0 ? finalization.strengths : [""]);
      setWeaknesses(finalization.weaknesses.length > 0 ? finalization.weaknesses : [""]);
      setRecommendations(finalization.recommendations);
    } else {
      setGrade("");
      setConclusion("");
      setStrengths([""]);
      setWeaknesses([""]);
      setRecommendations("");
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
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleClear = () => {
    setGrade("");
    setConclusion("");
    setStrengths([""]);
    setWeaknesses([""]);
    setRecommendations("");
    setFinalization(null);
    setJustSaved(false);
  };

  const _updateListItem = (
    list: string[],
    setter: (v: string[]) => void,
    idx: number,
    value: string,
  ) => {
    const next = [...list];
    next[idx] = value;
    setter(next);
  };

  const _removeListItem = (list: string[], setter: (v: string[]) => void, idx: number) => {
    setter(list.filter((_, i) => i !== idx));
  };

  const _addListItem = (list: string[], setter: (v: string[]) => void) => {
    setter([...list, ""]);
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
          {(justSaved || finalization) && (
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
          )}
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
              onClick={() => setGrade(g.value)}
              className={`flex-1 px-ut-3 py-ut-2 rounded-ut-sm text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase transition-colors ${
                grade === g.value
                  ? `${g.color} text-white`
                  : "border border-ut-border bg-ut-grey text-ut-text hover:bg-neutral-100"
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
          onChange={(e) => setConclusion(e.target.value)}
        />
      </label>

      {/* Strengths */}
      <BulletListEditor
        label="Strengths"
        items={strengths}
        onChange={(items) => setStrengths(items)}
        placeholder="Describe a strength..."
      />

      {/* Weaknesses */}
      <BulletListEditor
        label="Weaknesses"
        items={weaknesses}
        onChange={(items) => setWeaknesses(items)}
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
          onChange={(e) => setRecommendations(e.target.value)}
        />
      </label>

      {/* Actions */}
      <div className="border-t-2 border-ut-border pt-ut-3 mt-1">
        <button
          type="button"
          className={`w-full rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase disabled:opacity-50 transition-colors ${
            justSaved
              ? "bg-ut-green text-white"
              : "bg-trust-magenta text-white hover:bg-trust-magenta-strong"
          }`}
          disabled={!grade || justSaved}
          onClick={handleSave}
        >
          {justSaved ? "Saved" : "Save Finalization"}
        </button>
        {finalization && (
          <button
            type="button"
            className="w-full mt-ut-2 rounded-ut-sm px-ut-4 py-2 text-ut-sm transition-colors font-heading font-bold uppercase tracking-ut-uppercase text-ut-slate hover:text-ut-red"
            onClick={handleClear}
          >
            Clear Finalization
          </button>
        )}
      </div>
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
