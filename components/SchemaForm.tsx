import { useMemo } from "react";
import {
  BooleanToggle,
  EmailInput,
  ImageInput,
  SelectInput,
  TextAreaInput,
  TextInput,
  UrlInput,
} from "@/components/field-inputs";
import { getActiveFields, getFieldValue, setFieldValue } from "@/lib/field-schema";
import type { FieldDescriptor, FieldSurface, SessionMetadata } from "@/lib/types";

// ---------------------------------------------------------------------------
// SchemaForm — renders fields driven by FieldDescriptor[] from the schema.
// Supports metadata, finalization, and settings surfaces.
// ---------------------------------------------------------------------------

export interface SchemaFormProps {
  /** Which surface to render (filters getActiveFields). */
  surface: FieldSurface;
  /** Current session data (mutated in-place on change). */
  session: SessionMetadata | Record<string, unknown>;
  /** Called after every field mutation (session already updated). */
  onChange: (desc: FieldDescriptor) => void;
  /** Optional: render extra UI (e.g. capture panel) for a given descriptor. */
  renderFieldExtra?: (desc: FieldDescriptor) => React.ReactNode;
  /** Optional: callback for image-capture actions. */
  onCapture?: (desc: FieldDescriptor) => void;
  /** Optional: field IDs to exclude from rendering. */
  excludeFields?: string[];
  /** Optional: only render these field IDs (takes precedence over excludeFields). */
  includeFields?: string[];
}

export default function SchemaForm({
  surface,
  session,
  onChange,
  renderFieldExtra,
  onCapture,
  excludeFields,
  includeFields,
}: SchemaFormProps) {
  const fields = useMemo(() => {
    const all = getActiveFields(surface);
    if (includeFields) return all.filter((f) => includeFields.includes(f.id));
    if (excludeFields) return all.filter((f) => !excludeFields.includes(f.id));
    return all;
  }, [surface, includeFields, excludeFields]);

  if (fields.length === 0) return null;

  // Sort by group then order
  const sorted = [...fields].sort((a, b) => {
    const groupCmp = (a.group ?? "").localeCompare(b.group ?? "");
    return groupCmp !== 0 ? groupCmp : a.order - b.order;
  });

  return (
    <div className="flex flex-col gap-ut-4">
      {sorted.map((desc) => (
        <div key={desc.id} className="meta-field" data-testid={`field-${desc.id}`}>
          <FieldRenderer
            desc={desc}
            session={session}
            onChange={() => onChange(desc)}
            onCapture={onCapture}
            renderFieldExtra={renderFieldExtra}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal field renderer — dispatches to the correct input component
// ---------------------------------------------------------------------------
function FieldRenderer({
  desc,
  session,
  onChange,
  onCapture,
  renderFieldExtra,
}: {
  desc: FieldDescriptor;
  session: SessionMetadata | Record<string, unknown>;
  onChange: () => void;
  onCapture?: (desc: FieldDescriptor) => void;
  renderFieldExtra?: (desc: FieldDescriptor) => React.ReactNode;
}) {
  const value = getFieldValue(session as SessionMetadata, desc);

  const handleChange = (v: unknown) => {
    setFieldValue(session as SessionMetadata, desc, v);
    onChange();
  };

  switch (desc.type) {
    case "text":
      return (
        <>
          <TextInput desc={desc} value={value} onChange={handleChange} />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "textarea":
      return (
        <>
          <TextAreaInput desc={desc} value={value} onChange={handleChange} />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "url":
      return (
        <>
          <UrlInput desc={desc} value={value} onChange={handleChange} />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "email":
      return (
        <>
          <EmailInput desc={desc} value={value} onChange={handleChange} />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "boolean":
      return (
        <>
          <BooleanToggle desc={desc} value={value} onChange={handleChange} />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "image":
      return (
        <>
          <ImageInput desc={desc} value={value} onChange={handleChange} onCapture={onCapture} />
          {renderFieldExtra?.(desc)}
        </>
      );
    case "select":
    case "multi-select":
      return (
        <>
          <SelectInput desc={desc} value={value} onChange={handleChange} />
          {renderFieldExtra?.(desc)}
        </>
      );
    default:
      return null;
  }
}
