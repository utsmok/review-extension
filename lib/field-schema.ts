import { FRAMEWORK_CONFIG } from "@/data/framework";
import type { FieldDescriptor, FieldSurface, SessionMetadata } from "@/lib/types";
import { getActiveFrameworkConfig } from "./framework-config";

/** All shipped field descriptors (no customization). */
export function getFields(): readonly FieldDescriptor[] {
  return FRAMEWORK_CONFIG.fields;
}

/** Active descriptors: customization-merged, enabled-only, ordered within group. */
export function getActiveFields(surface?: FieldSurface): FieldDescriptor[] {
  const fields = getActiveFrameworkConfig().fields
    .filter((f) => f.enabled)
    .filter((f) => (surface ? f.surface === surface : true));
  return [...fields].sort((a, b) =>
    a.group === b.group ? a.order - b.order : String(a.group).localeCompare(String(b.group)),
  );
}

export function getFieldsBySurface(surface: FieldSurface): FieldDescriptor[] {
  return getActiveFields(surface);
}

export function getField(id: string): FieldDescriptor {
  const f = getActiveFrameworkConfig().fields.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown field: ${id}`);
  return f;
}

/** Read a field's value from a session. Custom fields read from `customFields`. */
export function getFieldValue(session: SessionMetadata, desc: FieldDescriptor): unknown {
  if (desc.custom) return session.customFields?.[desc.storageKey];
  return (session as unknown as Record<string, unknown>)[desc.storageKey];
}

/** Mutate a session's field value. Custom fields write to `customFields`. */
export function setFieldValue(
  session: SessionMetadata,
  desc: FieldDescriptor,
  value: unknown,
): void {
  if (desc.custom) {
    session.customFields = { ...(session.customFields ?? {}), [desc.storageKey]: value };
    return;
  }
  (session as unknown as Record<string, unknown>)[desc.storageKey] = value;
}
