import { APP_STORE_EXPORT_HEIGHT, APP_STORE_EXPORT_WIDTH } from "@/lib/appStoreImageSizes";

/** Target App Store 6.7" portrait aspect (width / height). */
export const APP_STORE_SCREENSHOT_ASPECT = APP_STORE_EXPORT_WIDTH / APP_STORE_EXPORT_HEIGHT;

const ASPECT_TOLERANCE = 0.08;

export type ScreenshotAspectIssue = {
  index: number;
  width: number;
  height: number;
  aspect: number;
  message: string;
};

export function checkScreenshotAspect(
  index: number,
  width: number,
  height: number,
): ScreenshotAspectIssue | null {
  if (!width || !height) return null;

  const aspect = width / height;
  const delta = Math.abs(aspect - APP_STORE_SCREENSHOT_ASPECT) / APP_STORE_SCREENSHOT_ASPECT;

  if (delta <= ASPECT_TOLERANCE) return null;

  const isLandscape = width > height;
  return {
    index,
    width,
    height,
    aspect,
    message: isLandscape
      ? `Screen ${index + 1} is landscape (${width}×${height}) — App Store sets expect portrait ~${APP_STORE_EXPORT_WIDTH}×${APP_STORE_EXPORT_HEIGHT}. Crop or re-export from simulator.`
      : `Screen ${index + 1} aspect (${width}×${height}) differs from App Store portrait — may letterbox or crop heavily in the mockup.`,
  };
}

export function lintScreenshotAspects(
  items: Array<{ index: number; width?: number; height?: number }>,
): ScreenshotAspectIssue[] {
  return items
    .map((item) =>
      item.width && item.height ? checkScreenshotAspect(item.index, item.width, item.height) : null,
    )
    .filter((item): item is ScreenshotAspectIssue => item !== null);
}
