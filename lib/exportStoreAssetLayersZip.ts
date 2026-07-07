import JSZip from "jszip";
import type { GeneratedSlide, StrategyBrief } from "@/lib/campaignTypes";
import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";
import { resizeDataUrlToPreset } from "@/lib/exportAppStoreZip";
import { buildMockupOnlyBlob, canExportMockupOnly } from "@/lib/exportMockupOnlyClient";

type ScreenshotPreview = { index: number; previewUrl: string };

export type StoreAssetLayer = "screenshots" | "mockups" | "backgrounds";

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid data URL.");
  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function paddedSlide(slide: GeneratedSlide) {
  return String(slide.slideNumber).padStart(2, "0");
}

export async function buildStoreAssetLayerZipBlob(
  layer: StoreAssetLayer,
  slides: GeneratedSlide[],
  preset: AppStoreExportPreset,
  strategy: StrategyBrief | null,
  screenshotPreviews: ScreenshotPreview[],
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(layer) ?? zip;
  const { width, height, label } = APP_STORE_EXPORT_PRESETS[preset];
  let added = 0;

  for (const slide of slides) {
    if (layer === "screenshots") {
      const blob = await resizeDataUrlToPreset(slide.dataUrl, width, height);
      folder.file(`${paddedSlide(slide)}-generated-screenshot-${width}x${height}.png`, blob);
      added += 1;
    }

    if (layer === "backgrounds" && slide.backgroundDataUrl) {
      folder.file(`${paddedSlide(slide)}-background.png`, dataUrlToBlob(slide.backgroundDataUrl));
      added += 1;
    }

    if (layer === "mockups" && strategy && canExportMockupOnly(slide.slideNumber, strategy, screenshotPreviews)) {
      const blob = await buildMockupOnlyBlob(slide, strategy, screenshotPreviews);
      folder.file(`${paddedSlide(slide)}-mockup-transparent.png`, blob);
      added += 1;
    }
  }

  if (!added) {
    throw new Error(`No ${layer} available to export.`);
  }

  zip.file(
    "README.txt",
    [
      "PromoForce layered asset export",
      `Layer: ${layer}`,
      `Preset: ${label}`,
      `Files: ${added}`,
      "",
      "screenshots = final generated App Store screenshots",
      "mockups = transparent device mockups with uploaded app UI",
      "backgrounds = AI-generated background plates",
    ].join("\n"),
  );

  return zip.generateAsync({ type: "blob" });
}

export async function downloadStoreAssetLayerZip(
  layer: StoreAssetLayer,
  slides: GeneratedSlide[],
  preset: AppStoreExportPreset,
  strategy: StrategyBrief | null,
  screenshotPreviews: ScreenshotPreview[],
) {
  const blob = await buildStoreAssetLayerZipBlob(layer, slides, preset, strategy, screenshotPreviews);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `promoforce-${layer}-${preset}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
