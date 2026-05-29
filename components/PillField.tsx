import { useState } from "react";

interface PillFieldProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  /** In single-select mode, clicking the selected option deselects it */
  single?: boolean;
  maxHeight?: string;
}

/** Derive custom entries: those in the value array that aren't predefined */
function getCustom(predefined: readonly string[], values: string[]): string[] {
  const set = new Set<string>(predefined);
  return values.filter((v) => !set.has(v));
}

export default function PillField({
  label,
  options,
  selected,
  onChange,
  placeholder,
  allowCustom = true,
  single = false,
  maxHeight,
}: PillFieldProps) {
  const [customInput, setCustomInput] = useState("");

  const custom = getCustom(options, selected);

  const togglePredefined = (opt: string) => {
    if (single) {
      // Single-select: toggle off if already selected
      onChange(selected.includes(opt) ? [] : [opt]);
    } else {
      const next = selected.includes(opt)
        ? selected.filter((v) => v !== opt)
        : [...selected, opt];
      onChange(next);
    }
  };

  const removeCustom = (val: string) => {
    onChange(selected.filter((v) => v !== val));
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
      setCustomInput("");
    }
  };

  return (
    <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
      <legend className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {label}
      </legend>
      <div
        className={`flex flex-wrap gap-ut-1 mb-ut-1${maxHeight ? ` ${maxHeight}` : ""}`}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`pill-toggle text-ut-xs px-ut-2 py-ut-1 border rounded-ut-sm ${selected.includes(opt) ? "bg-trust-magenta text-white border-trust-magenta" : "border-ut-border text-ut-muted hover:border-ut-slate"}`}
            onClick={() => togglePredefined(opt)}
          >
            {opt}
          </button>
        ))}
        {custom.map((opt) => (
          <button
            key={opt}
            type="button"
            className="pill-toggle text-ut-xs px-ut-2 py-ut-1 border rounded-ut-sm bg-trust-magenta text-white border-trust-magenta"
            onClick={() => removeCustom(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {allowCustom && placeholder && (
        <div className="flex gap-ut-1">
          <input
            className="flex-1 border border-ut-border rounded-ut-sm bg-ut-grey px-ut-2 py-ut-1 text-ut-xs text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue"
            placeholder={placeholder}
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
      )}
    </fieldset>
  );
}
