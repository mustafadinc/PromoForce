import { getMockupScreenStyles } from "@/lib/mockupScreenFit";

export { getMockupScreenStyles };

/** Remove pure-black letterbox from top/bottom only — never crop left/right. */

const LETTERBOX_CHANNEL_MAX = 12;
const LETTERBOX_RATIO = 0.992;
const MAX_VERTICAL_TRIM_RATIO = 0.14;

function isLetterboxPixel(r: number, g: number, b: number, a: number) {
  if (a < 16) return true;
  return r <= LETTERBOX_CHANNEL_MAX && g <= LETTERBOX_CHANNEL_MAX && b <= LETTERBOX_CHANNEL_MAX;
}

function rowMostlyLetterbox(data: Uint8ClampedArray, width: number, y: number) {
  let dark = 0;
  const offset = y * width * 4;
  for (let x = 0; x < width; x++) {
    const i = offset + x * 4;
    if (isLetterboxPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) dark++;
  }
  return dark / width >= LETTERBOX_RATIO;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load screenshot."));
    img.src = dataUrl;
  });
}

function trimVerticalLetterbox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { top: number; height: number } | null {
  let top = 0;
  let bottom = height - 1;

  while (top < bottom && rowMostlyLetterbox(data, width, top)) top++;
  while (bottom > top && rowMostlyLetterbox(data, width, bottom)) bottom--;

  const trimmedH = bottom - top + 1;
  const removedH = height - trimmedH;

  if (removedH < 6) return null;
  if (removedH > height * MAX_VERTICAL_TRIM_RATIO) return null;
  if (trimmedH < height * 0.82) return null;

  return { top, height: trimmedH };
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

export type NormalizedScreenshot = {
  dataUrl: string;
  file: File;
  width: number;
  height: number;
};

export async function normalizeScreenshotForMockup(file: File): Promise<NormalizedScreenshot> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read screenshot."));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(rawUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: rawUrl, file, width, height };
  }

  ctx.drawImage(img, 0, 0);
  const crop = trimVerticalLetterbox(ctx.getImageData(0, 0, width, height).data, width, height);
  if (!crop) {
    return { dataUrl: rawUrl, file, width, height };
  }

  const out = document.createElement("canvas");
  out.width = width;
  out.height = crop.height;
  const outCtx = out.getContext("2d");
  if (!outCtx) {
    return { dataUrl: rawUrl, file, width, height };
  }

  outCtx.drawImage(canvas, 0, crop.top, width, crop.height, 0, 0, width, crop.height);
  const dataUrl = out.toDataURL("image/png");
  const normalizedFile = await dataUrlToFile(dataUrl, file.name.replace(/\.\w+$/, "") + ".png");

  return {
    dataUrl,
    file: normalizedFile,
    width,
    height: crop.height,
  };
}
