import { APP_STORE_EXPORT_PRESETS, type AppStoreExportPreset } from "@/lib/appStoreImageSizes";
import type { AppStoreLintIssue, AppStoreLintResult } from "@/lib/appStoreExportLint";

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load slide image."));
    img.src = dataUrl;
  });
}

export async function lintAppStoreSlideDataUrl(
  dataUrl: string,
  preset: AppStoreExportPreset = "iphone_67",
): Promise<AppStoreLintResult> {
  const issues: AppStoreLintIssue[] = [];
  const target = APP_STORE_EXPORT_PRESETS[preset];

  try {
    const img = await loadImage(dataUrl);
    if (img.naturalWidth !== target.width || img.naturalHeight !== target.height) {
      issues.push({
        level: "warn",
        code: "dimensions",
        message: `Slide is ${img.naturalWidth}×${img.naturalHeight}; export preset ${preset} is ${target.width}×${target.height} (will resize on ZIP export).`,
      });
    }

    const aspect = img.naturalWidth / img.naturalHeight;
    const targetAspect = target.width / target.height;
    if (Math.abs(aspect - targetAspect) > 0.02) {
      issues.push({
        level: "error",
        code: "aspect",
        message: `Aspect ${aspect.toFixed(3)} does not match App Store ${targetAspect.toFixed(3)}.`,
      });
    }
  } catch {
    issues.push({
      level: "error",
      code: "load",
      message: "Could not read slide image for lint.",
    });
  }

  return {
    ok: !issues.some((i) => i.level === "error"),
    issues,
  };
}

export async function lintAppStoreSet(
  slides: Array<{ slideNumber: number; dataUrl: string }>,
  preset: AppStoreExportPreset = "iphone_67",
): Promise<AppStoreLintResult> {
  const allIssues: AppStoreLintIssue[] = [];

  for (const slide of slides) {
    const result = await lintAppStoreSlideDataUrl(slide.dataUrl, preset);
    for (const issue of result.issues) {
      allIssues.push({
        ...issue,
        message: `Slide ${slide.slideNumber}: ${issue.message}`,
      });
    }
  }

  return {
    ok: !allIssues.some((i) => i.level === "error"),
    issues: allIssues,
  };
}
