import JSZip from "jszip";
import type { GeneratedSlide } from "@/lib/campaignTypes";
import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function resizeDataUrlToPreset(dataUrl: string, width: number, height: number): Promise<Blob> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PNG export failed."));
    }, "image/png");
  });
}

export async function buildAppStoreZipBlob(
  slides: GeneratedSlide[],
  preset: AppStoreExportPreset,
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(`app-store-${preset}`) ?? zip;
  const { width, height, label } = APP_STORE_EXPORT_PRESETS[preset];

  for (const slide of slides) {
    const blob = await resizeDataUrlToPreset(slide.dataUrl, width, height);
    const name = `${String(slide.slideNumber).padStart(2, "0")}-${slide.role.replace(/\s+/g, "-")}-${width}x${height}.png`;
    folder.file(name, blob);
  }

  zip.file(
    "README.txt",
    `PromoForce App Store export\nPreset: ${label}\nSlides: ${slides.length}\n`,
  );

  return zip.generateAsync({ type: "blob" });
}

export function downloadAppStoreZip(
  slides: GeneratedSlide[],
  preset: AppStoreExportPreset,
  filename?: string,
) {
  return buildAppStoreZipBlob(slides, preset).then((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `promoforce-app-store-${preset}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

export async function downloadSingleAppStoreSlide(
  slide: GeneratedSlide,
  preset: AppStoreExportPreset,
) {
  const { width, height } = APP_STORE_EXPORT_PRESETS[preset];
  const blob = await resizeDataUrlToPreset(slide.dataUrl, width, height);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `app-store-slide-${slide.slideNumber}-${width}x${height}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
