import { useCallback, useEffect, useRef, useState } from "react";
import { editorInputClass } from "./LabeledField";

interface EditableTextProps {
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  multiline?: boolean;
}

const PLACEHOLDER = "Click to add\u2026";

function computeRows(text: string, minRows: number): number {
  const lines = text.split("\n").length;
  return Math.min(Math.max(lines, minRows), 8);
}

export default function EditableText({
  value,
  onChange,
  label,
  placeholder = PLACEHOLDER,
  rows = 1,
  className,
  multiline = true,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Sync local value when entering edit mode
  const enterEdit = useCallback(() => {
    setLocalValue(value);
    setEditing(true);
  }, [value]);

  const commitEdit = useCallback(() => {
    onChange(localValue);
    setEditing(false);
  }, [localValue, onChange]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  // Auto-focus the input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  if (editing) {
    const rowCount = multiline ? computeRows(localValue, rows) : undefined;
    const shared = `${editorInputClass} resize-none`;

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          data-testid="editable-text-input"
          className={shared}
          value={localValue}
          rows={rowCount}
          aria-label={label}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              cancelEdit();
            } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              commitEdit();
            }
          }}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        data-testid="editable-text-input"
        type="text"
        className={shared}
        value={localValue}
        aria-label={label}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            cancelEdit();
          } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            commitEdit();
          }
        }}
      />
    );
  }

  const isEmpty = value === "";
  const Tag = multiline ? "div" : "span";

  return (
    <Tag
      data-testid="editable-text-display"
      role="button"
      tabIndex={0}
      aria-label={label}
      className={[
        className,
        "cursor-text hover:underline decoration-dotted decoration-ut-border underline-offset-2",
        isEmpty ? "text-ut-muted italic" : "whitespace-pre-wrap",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={enterEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          if (e.key === " ") e.preventDefault();
          enterEdit();
        }
      }}
    >
      {isEmpty ? placeholder : value}
    </Tag>
  );
}
