interface QuestionNotesProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function QuestionNotes({ value, onChange, placeholder, maxLength }: QuestionNotesProps) {
  return (
    <textarea
      className="w-full border border-ut-border rounded-ut-sm text-ut-sm p-ut-2 mt-ut-2 resize-y bg-ut-white"
      rows={2}
      placeholder={placeholder ?? "Notes..."}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
    />
  );
}
