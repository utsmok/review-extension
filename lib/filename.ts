/**
 * Sanitize a string for use as a filename. Strips path separators, parent
 * directory references, and characters invalid on Windows.
 *
 * Used at the export/download boundary to prevent path traversal in ZIP
 * entry names and download filenames.
 */
export function sanitizeFilename(name: string): string {
  // biome-ignore lint/complexity/useRegexLiterals: must use RegExp constructor to avoid noControlCharactersInRegex
  const INVALID_CHARS = new RegExp("[<>:\"/\\\\|?*\u0000-\u001F]", "g");
  return (
    name
      .replace(INVALID_CHARS, "_")
      .replace(/\.+/g, ".")
      .replace(/^\.+/, "")
      .trim() || "review"
  );
}
