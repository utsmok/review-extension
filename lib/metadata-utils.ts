/**
 * Coerce a metadata field to a string array.
 * Older exports may store arrays (discipline, dataSources, etc.) as plain strings.
 * Returns `[]` for null/undefined, wraps non-empty strings as single-element arrays.
 */
export function ensureArray(val: string | string[] | undefined): string[] {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  // At this point val is a string (the only remaining type)
  return val ? [val] : [];
}
