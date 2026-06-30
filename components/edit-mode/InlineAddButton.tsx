import { useState } from "react";
import { editorInputClass } from "@/components/editor";

/**
 * Inline (+) affordance. A compact "+ Add X" button reveals a title input;
 * submitting (Enter or the Add button) calls `onAdd(title)` and collapses.
 * A slug/label hint is derived from the title. Render only when editMode is on.
 */
export default function InlineAddButton({
  noun,
  onAdd,
  placeholder,
}: {
  /** Lowercase singular, e.g. "question" / "check" / "field" / "grade". */
  noun: string;
  onAdd: (title: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-ut-xs text-trust-magenta hover:text-trust-magenta-strong font-bold"
        data-testid={`inline-add-${noun}`}
      >
        + Add {noun}
      </button>
    );
  }

  const submit = () => {
    const v = title.trim();
    if (!v) return;
    onAdd(v);
    setTitle("");
    setOpen(false);
  };

  return (
    <div className="space-y-ut-1 border-t border-ut-border pt-ut-2">
      <input
        type="text"
        className={editorInputClass}
        placeholder={placeholder ?? `New ${noun} title`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setTitle("");
            setOpen(false);
          }
        }}
        aria-label={`New ${noun} title`}
        data-testid={`inline-add-${noun}-input`}
      />
      <div className="flex items-center justify-end gap-ut-2">
        <button
          type="button"
          className="text-ut-xs text-ut-muted hover:text-ut-navy"
          onClick={() => {
            setTitle("");
            setOpen(false);
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="bg-trust-magenta text-white hover:bg-trust-magenta-strong rounded-ut-sm px-ut-3 py-ut-1 font-heading uppercase tracking-ut-label text-ut-xs disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={!title.trim()}
          onClick={submit}
        >
          Add
        </button>
      </div>
    </div>
  );
}
