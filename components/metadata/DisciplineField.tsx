import { useEffect, useRef, useState } from "react";
import {
  DISCIPLINE_DEFAULT,
  DISCIPLINE_OPTIONS,
  DISCIPLINE_OTHERS,
  MAX_CUSTOM_LENGTH,
} from "@/lib/metadata-options";

function DisciplineField({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const predefined = new Set<string>(DISCIPLINE_OPTIONS);
  const custom = selected.filter((v) => !predefined.has(v));

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((v) => v !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
      setCustomInput("");
    }
  };

  // Auto-expand ONCE on mount if the session already has non-default disciplines
  // (e.g. imported data). After that the user's collapse choice is respected —
  // previously the effect re-expanded on every render once any non-default
  // discipline was present, making "fewer options" impossible to collapse.
  const hasNonDefault = selected.some((s) => s !== DISCIPLINE_DEFAULT);
  const didAutoExpand = useRef(false);
  useEffect(() => {
    if (!didAutoExpand.current && hasNonDefault) {
      setExpanded(true);
      didAutoExpand.current = true;
    }
  }, [hasNonDefault]);
  const isOpen = expanded;

  return (
    <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
      <legend className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        Discipline
      </legend>
      <div className="flex flex-wrap gap-ut-1 mb-ut-1">
        <button
          type="button"
          title={DISCIPLINE_DEFAULT}
          className={`pill-toggle meta-pill-btn text-ut-xs px-ut-2 py-ut-1 border rounded-ut-sm ${selected.includes(DISCIPLINE_DEFAULT) ? "bg-trust-magenta text-white border-trust-magenta" : "border-ut-border text-ut-muted hover:border-ut-slate"}`}
          onClick={() => toggle(DISCIPLINE_DEFAULT)}
        >
          {DISCIPLINE_DEFAULT}
        </button>
        <button
          type="button"
          className="text-ut-xs text-ut-muted hover:text-trust-magenta underline underline-offset-2 transition-colors px-ut-1"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={isOpen}
        >
          {isOpen ? "fewer options ↑" : "more options ↓"}
        </button>
      </div>
      {isOpen && (
        <>
          <div className="flex flex-wrap gap-ut-1 mb-ut-1 max-h-48 overflow-y-auto">
            {DISCIPLINE_OTHERS.map((opt) => (
              <button
                key={opt}
                type="button"
                title={opt}
                className={`pill-toggle meta-pill-btn text-ut-xs px-ut-2 py-ut-1 border rounded-ut-sm truncate max-w-[200px] ${selected.includes(opt) ? "bg-trust-magenta text-white border-trust-magenta" : "border-ut-border text-ut-muted hover:border-ut-slate"}`}
                onClick={() => toggle(opt)}
              >
                {opt}
              </button>
            ))}
            {custom.map((opt) => (
              <button
                key={opt}
                type="button"
                title={opt}
                className="pill-toggle meta-pill-btn text-ut-xs px-ut-2 py-ut-1 border rounded-ut-sm bg-trust-magenta text-white border-trust-magenta truncate max-w-[200px]"
                onClick={() => onChange(selected.filter((v) => v !== opt))}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex gap-ut-1">
            <input
              className="meta-custom-input flex-1 min-w-0 border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
              placeholder="Add custom discipline..."
              maxLength={MAX_CUSTOM_LENGTH}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
          </div>
        </>
      )}
    </fieldset>
  );
}

export default DisciplineField;
