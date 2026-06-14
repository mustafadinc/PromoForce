import type Konva from "konva";
import {
  APP_STORE_EXPORT_HEIGHT,
  APP_STORE_EXPORT_WIDTH,
  APP_STORE_GENERATION_HEIGHT,
  APP_STORE_GENERATION_WIDTH,
} from "@/lib/appStoreImageSizes";

export type ExportSlideOptions = {
  pixelRatio?: number;
  mimeType?: "image/png";
  quality?: number;
};

/** Export Konva stage at App Store Connect upload dimensions (client-final). */
export function exportSlidePngFromStage(
  stage: Konva.Stage,
  options: ExportSlideOptions = {},
): string {
  const pixelRatio =
    options.pixelRatio ??
    Math.max(
      APP_STORE_EXPORT_WIDTH / APP_STORE_GENERATION_WIDTH,
      APP_STORE_EXPORT_HEIGHT / APP_STORE_GENERATION_HEIGHT,
    );

  return stage.toDataURL({
    pixelRatio,
    mimeType: options.mimeType ?? "image/png",
    quality: options.quality ?? 1,
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function exportFilename(slideNumber: number) {
  return `app-store-slide-${slideNumber}-${APP_STORE_EXPORT_WIDTH}x${APP_STORE_EXPORT_HEIGHT}.png`;
}
