import { useState } from "react";
import EditableText from "@/components/editor/EditableText";
import type { FieldDescriptor } from "@/lib/types";

export default function ImageInput({
  desc,
  value,
  onChange,
  onCapture,
  editable,
  onOverride,
}: {
  desc: FieldDescriptor;
  value: unknown;
  onChange: (v: unknown) => void;
  onCapture?: (desc: FieldDescriptor) => void;
  editable?: boolean;
  onOverride?: (patch: Partial<FieldDescriptor>) => void;
}) {
  const strVal = typeof value === "string" ? value : "";
  const [imgError, setImgError] = useState(false);

  const label = (
    <EditableText
      disabled={!editable}
      multiline={false}
      value={desc.label}
      onChange={(v) => onOverride?.({ label: v })}
      label={`${desc.id} label`}
      className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy"
    />
  );

  const help =
    editable || desc.helpText ? (
      <EditableText
        disabled={!editable}
        value={desc.helpText ?? ""}
        onChange={(v) => onOverride?.({ helpText: v })}
        label={`${desc.id} help`}
        className="text-ut-xs text-ut-muted"
      />
    ) : null;

  if (editable) {
    return (
      <div className="flex flex-col gap-1">
        {label}
        <div className="flex items-center gap-ut-2">
          <input
            type="url"
            className="meta-input meta-url-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue flex-1 min-w-0 overflow-hidden text-ellipsis"
            maxLength={desc.maxLength ?? 2048}
            placeholder={desc.placeholder ?? "e.g. https://example.com/logo.png"}
            value={strVal}
            onChange={(e) => {
              onChange(e.target.value);
              setImgError(false);
            }}
          />
          {strVal && !imgError && (
            <img
              src={strVal}
              alt={desc.label}
              className="meta-logo-img"
              onError={() => setImgError(true)}
            />
          )}
          {strVal && imgError && (
            <span
              className="meta-logo-img text-ut-xs text-state-warning flex items-center justify-center"
              title="Image failed to load"
            >
              ⚠
            </span>
          )}
        </div>
        {desc.captureable && onCapture && (
          <div className="meta-capture-panel">
            <div className="meta-capture-actions">
              <button type="button" onClick={() => onCapture(desc)}>
                Capture Page
              </button>
            </div>
          </div>
        )}
        {help}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-ut-sm font-heading font-bold uppercase tracking-ut-label text-ut-navy">
        {desc.label}
      </span>
      <div className="flex items-center gap-ut-2">
        <input
          type="url"
          className="meta-input meta-url-input border border-ut-border rounded-ut-sm bg-ut-grey px-ut-3 py-ut-2 text-ut-md text-ut-text focus:outline-none focus:ring-2 focus:ring-ut-blue flex-1 min-w-0 overflow-hidden text-ellipsis"
          maxLength={desc.maxLength ?? 2048}
          placeholder={desc.placeholder ?? "e.g. https://example.com/logo.png"}
          value={strVal}
          onChange={(e) => {
            onChange(e.target.value);
            setImgError(false);
          }}
        />
        {strVal && !imgError && (
          <img
            src={strVal}
            alt={desc.label}
            className="meta-logo-img"
            onError={() => setImgError(true)}
          />
        )}
        {strVal && imgError && (
          <span
            className="meta-logo-img text-ut-xs text-state-warning flex items-center justify-center"
            title="Image failed to load"
          >
            ⚠
          </span>
        )}
      </div>
      {desc.captureable && onCapture && (
        <div className="meta-capture-panel">
          <div className="meta-capture-actions">
            <button type="button" onClick={() => onCapture(desc)}>
              Capture Page
            </button>
          </div>
        </div>
      )}
      {desc.helpText && <p className="text-ut-xs text-ut-muted">{desc.helpText}</p>}
    </div>
  );
}
