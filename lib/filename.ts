/**
 * Sanitize a string for use as a filename. Strips path separators, parent
 * directory references, and characters invalid on Windows.
 *
 * Used at the export/download boundary to prevent path traversal in ZIP
 * entry names and download filenames.
 */
export function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\.+/g, ".")
      .replace(/^\.+/, "")
      .trim() || "review"
  );
}
