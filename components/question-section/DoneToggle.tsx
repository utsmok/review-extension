interface DoneToggleProps {
  isDone: boolean;
  onToggle: () => void;
}

export function DoneToggle({ isDone, onToggle }: DoneToggleProps) {
  return (
    <button
      type="button"
      className={`ml-auto text-ut-xs font-mono uppercase tracking-ut-label px-ut-2 py-ut-1 rounded-ut-sm border transition-all duration-150 ${
        isDone
          ? "border-ut-green bg-ut-green/10 text-ut-green"
          : "border-ut-border text-ut-muted hover:text-ut-text hover:border-ut-slate"
      }`}
      title={isDone ? "Remove manual done override" : "Mark as done (overrides progress)"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      {isDone ? "✓ Done" : "Mark done"}
    </button>
  );
}
