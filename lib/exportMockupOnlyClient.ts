import {
  APP_STORE_EXPORT_HEIGHT,
  APP_STORE_EXPORT_WIDTH,
  getAppStoreGenerationSize,
  parseImageSize,
} from "@/lib/appStoreImageSizes";
import type { GeneratedSlide, MockupAssetId, MockupPose, StrategyBrief } from "@/lib/campaignTypes";
import { downloadDataUrl } from "@/lib/downloadDataUrl";
import { mockupAssetForSlide, normalizeMockupAssetId } from "@/lib/assetMockup";
import { normalizeMockupPose } from "@/lib/mockupPose";

type ScreenshotPreview = { index: number; previewUrl: string };

async function previewUrlToDataUrl(previewUrl: string): Promise<string> {
  if (previewUrl.startsWith("data:")) return previewUrl;
  const response = await fetch(previewUrl);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function canExportMockupOnly(
  slideNumber: number,
  strategy: StrategyBrief | null | undefined,
  screenshotPreviews: ScreenshotPreview[],
): boolean {
  if (!strategy) return false;
  const plan = strategy.slides.find((slide) => slide.slideNumber === slideNumber);
  if (!plan || plan.screenshotUsage === "none" || plan.screenshotIndex == null) return false;
  return screenshotPreviews.some((shot) => shot.index === plan.screenshotIndex);
}

export async function downloadMockupOnlyPng(
  slide: GeneratedSlide,
  strategy: StrategyBrief,
  screenshotPreviews: ScreenshotPreview[],
): Promise<void> {
  const plan = strategy.slides.find((item) => item.slideNumber === slide.slideNumber);
  if (!plan || plan.screenshotIndex == null) {
    throw new Error("This slide has no screenshot to composite.");
  }

  const previewUrl = screenshotPreviews.find((shot) => shot.index === plan.screenshotIndex)?.previewUrl;
  if (!previewUrl) {
    throw new Error("Screenshot preview is missing — re-upload screenshots.");
  }

  const mockupAssetId = normalizeMockupAssetId(
    slide.mockupAssetId ?? plan.mockupAssetId ?? mockupAssetForSlide(slide.slideNumber),
  );
  const mockupPose = normalizeMockupPose(slide.mockupPose ?? plan.mockupPose, slide.slideNumber);
  const screenshotDataUrl = await previewUrlToDataUrl(previewUrl);
  const { width, height } = parseImageSize(getAppStoreGenerationSize());

  const response = await fetch("/api/assets/export-mockup-only", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      screenshotDataUrl,
      mockupAssetId,
      mockupPose,
      mockupColor: slide.mockupColor,
      slideNumber: slide.slideNumber,
      phoneHeightRatio: plan.phoneHeightRatio,
      width,
      height,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "Mockup export failed.");
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  downloadDataUrl(
    dataUrl,
    `app-store-mockup-${slide.slideNumber}-${APP_STORE_EXPORT_WIDTH}x${APP_STORE_EXPORT_HEIGHT}.png`,
  );
}
