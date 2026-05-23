import type { UploadedScreenshot } from "@/lib/campaignTypes";
import { normalizeScreenshotForMockup } from "@/lib/normalizeScreenshotForMockup";

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export function readImageDimensionsFromDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

export async function buildUploadedScreenshot(file: File, index: number): Promise<UploadedScreenshot> {
  const normalized = await normalizeScreenshotForMockup(file);
  return {
    file: normalized.file,
    previewUrl: normalized.dataUrl,
    index,
    width: normalized.width,
    height: normalized.height,
  };
}
