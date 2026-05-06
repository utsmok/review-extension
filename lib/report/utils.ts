/** HTML-escape a string for safe embedding in templates. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Validate URL starts with http:// or https:// */
export function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/** Render a URL as a link if valid, otherwise as plain text */
export function safeLink(url: string, attrs: string = ""): string {
  const escaped = esc(url);
  if (isSafeUrl(url)) {
    return `<a href="${escaped}" rel="noopener noreferrer" target="_blank" ${attrs}>${escaped}</a>`;
  }
  return `<span class="url-plain">${escaped}</span>`;
}

/** Format date consistently as YYYY-MM-DD HH:mm */
export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Resize and compress a base64 data-URL image. Returns original if resize fails. */
export async function compressScreenshot(
  dataUrl: string,
  maxWidth = 800,
  quality = 0.8,
): Promise<string> {
  try {
    if (!dataUrl.startsWith("data:image/")) return dataUrl;
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
    if (img.width <= maxWidth) return dataUrl;
    const scale = maxWidth / img.width;
    const canvas = document.createElement("canvas");
    canvas.width = maxWidth;
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}
