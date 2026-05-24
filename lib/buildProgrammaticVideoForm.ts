import type { ScreenshotIntelligence, UploadedScreenshot, VideoTemplateId } from "@/lib/campaignTypes";
import { pickReelSegmentLabels } from "@/lib/screenshotIntelligenceFormat";

async function previewUrlToDataUrl(previewUrl: string): Promise<string> {
  if (previewUrl.startsWith("data:")) return previewUrl;
  const response = await fetch(previewUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read screenshot."));
    reader.readAsDataURL(blob);
  });
}

export async function appendProgrammaticVideoFields(
  videoForm: FormData,
  options: {
    screenshots: UploadedScreenshot[];
    template: VideoTemplateId;
    headline: string;
    coverDataUrl: string;
    screenshotIntelligence?: ScreenshotIntelligence[];
    width: number;
    height: number;
    postId: string;
  },
) {
  const { screenshots, template, headline, coverDataUrl, screenshotIntelligence, width, height, postId } = options;

  videoForm.append("headline", headline);
  videoForm.append("template", template);
  videoForm.append("width", String(width));
  videoForm.append("height", String(height));
  videoForm.append("postId", postId);

  const useScreenshotReel = template === "screenshot_reel" && screenshots.length >= 2;

  if (useScreenshotReel) {
    const stillsBase64 = await Promise.all(
      screenshots.slice(0, 4).map((shot) => previewUrlToDataUrl(shot.previewUrl)),
    );
    videoForm.append("stillsBase64", JSON.stringify(stillsBase64));
    videoForm.append(
      "segmentLabels",
      JSON.stringify(pickReelSegmentLabels(screenshotIntelligence ?? [], headline, stillsBase64.length)),
    );
  } else {
    videoForm.append("stillBase64", coverDataUrl);
  }
}
