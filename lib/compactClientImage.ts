/** Client-side image compaction before upload — keeps FormData under server limits. */

const STYLE_REF_MAX_EDGE = 768;
const STYLE_REF_JPEG_QUALITY = 0.82;

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = dataUrl;
  });
}

export async function compactDataUrlForUpload(
  dataUrl: string,
  maxEdge = STYLE_REF_MAX_EDGE,
  quality = STYLE_REF_JPEG_QUALITY,
): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function dataUrlToBase64Payload(dataUrl: string): Promise<string> {
  const compact = await compactDataUrlForUpload(dataUrl);
  return compact.includes(",") ? compact.split(",")[1]! : compact;
}
