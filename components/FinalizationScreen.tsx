import { useState } from "react";
import { useActiveSession } from "@/hooks/useActiveSession";
import type { FinalizationGrade, ReviewFinalization } from "@/lib/types";

const GRADES: { value: FinalizationGrade; label: string; color: string }[] = [
  { value: "pass", label: "Pass", color: "bg-ut-green" },
  { value: "conditional", label: "Conditional", color: "bg-[#ea580c]" },
  { value: "fail", label: "Fail", color: "bg-ut-red" },
];

export default function FinalizationScreen() {
  const { finalization, setFinalization, updateMetadata } = useActiveSession();

  const [grade, setGrade] = useState<FinalizationGrade | "">(finalization?.grade ?? "");
  const [conclusion, setConclusion] = useState(finalization?.conclusion ?? "");
  const [strengths, setStrengths] = useState<string[]>(finalization?.strengths ?? [""]);
  const [weaknesses, setWeaknesses] = useState<string[]>(finalization?.weaknesses ?? [""]);
  const [recommendations, setRecommendations] = useState(finalization?.recommendations ?? "");

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
    updateMetadata({ finalizedAt: data.finalizedAt });
  };

  const handleClear = () => {
    setGrade("");
    setConclusion("");
    setStrengths([""]);
    setWeaknesses([""]);
    setRecommendations("");
    setFinalization(null);
    updateMetadata({ finalizedAt: undefined });
  };

  const updateListItem = (list: string[], setter: (v: string[]) => void, idx: number, value: string) => {
    const next = [...list];
    next[idx] = value;
    setter(next);
  };

  const removeListItem = (list: string[], setter: (v: string[]) => void, idx: number) => {
    setter(list.filter((_, i) => i !== idx));
  };

  const addListItem = (list: string[], setter: (v: string[]) => void) => {
    setter([...list, ""]);
  };

  return (
    <div className="flex flex-col gap-ut-3 p-ut-4">
      <h2 className="font-heading text-ut-body font-bold uppercase tracking-ut-heading text-trust-magenta">
        Finalize Review
      </h2>

      {finalization && (
        <p className="text-ut-xs text-ut-muted font-mono">
          Finalized {new Date(finalization.finalizedAt).toLocaleString()}
        </p>
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
          className="w-full bg-trust-magenta text-white rounded-ut-sm px-ut-4 py-ut-3 text-ut-sm font-heading font-bold uppercase tracking-ut-uppercase hover:bg-trust-magenta-strong disabled:opacity-50 transition-colors"
          disabled={!grade}
          onClick={handleSave}
        >
          Save Finalization
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
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {label}
      </span>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-ut-1">
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
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              &times;
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="self-start text-ut-sm text-ut-blue hover:text-ut-navy font-heading font-bold uppercase tracking-ut-label"
        onClick={() => onChange([...items, ""])}
      >
        + Add {label.toLowerCase().slice(0, -1)}
      </button>
    </div>
  );
}
