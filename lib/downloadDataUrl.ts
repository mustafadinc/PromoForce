/** Trigger a file download from a data: or blob: URL (works for large MP4 base64 payloads). */
export function downloadDataUrl(dataUrl: string, filename: string) {
  if (typeof window === "undefined") return;

  try {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) {
      throw new Error("Invalid data URL");
    }

    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }
}
