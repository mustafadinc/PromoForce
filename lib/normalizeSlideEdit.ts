import type { AppProfile, ScreenshotUsage, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { getLocaleDefinition } from "@/lib/locales";
import { phoneHeightRatioForMockupScale } from "@/lib/mockupPose";
import {
  buildSlidePatchForScreenshot,
  shouldSyncSlideToScreenshot,
} from "@/lib/syncSlideToScreenshot";

export function normalizeSlideEdit(
  slide: StoreSlidePlan,
  patch: Partial<StoreSlidePlan>,
  screenshotCount: number,
  context?: {
    strategy?: StrategyBrief;
    appProfile?: AppProfile;
  },
): StoreSlidePlan {
  let mergedPatch = { ...patch };

  if (
    context?.strategy &&
    context.appProfile &&
    shouldSyncSlideToScreenshot(slide, patch)
  ) {
    const sync = buildSlidePatchForScreenshot(
      context.strategy,
      slide,
      patch.screenshotIndex,
      context.appProfile,
    );
    mergedPatch = { ...mergedPatch, ...sync.patch };
  }

  const next = { ...slide, ...mergedPatch };

  if (
    "headlineVerb" in mergedPatch ||
    "headlineDescriptor" in mergedPatch
  ) {
    const localeDef = getLocaleDefinition(context?.strategy?.locale);
    const sep = localeDef.script === "cjk" ? "" : " ";
    const headline = [next.headlineVerb?.trim(), next.headlineDescriptor?.trim()]
      .filter(Boolean)
      .join(sep);
    if (headline) {
      next.headline = headline;
    }
  }

  if ("screenshotUsage" in patch && !("showAppBranding" in patch)) {
    next.showAppBranding = next.screenshotUsage === "hero_mockup";
  }

  if (mergedPatch.mockupPose && !("phoneHeightRatio" in mergedPatch)) {
    next.phoneHeightRatio = phoneHeightRatioForMockupScale(mergedPatch.mockupPose.scale);
  }

  if (next.screenshotUsage === "none" || screenshotCount === 0) {
    next.screenshotIndex = null;
    next.screenshotUsage = "none";
    next.showAppBranding = false;
  } else if (next.screenshotIndex === null) {
    next.screenshotIndex = 0;
  } else {
    next.screenshotIndex = Math.min(Math.max(next.screenshotIndex, 0), screenshotCount - 1);
  }

  return next;
}

export const screenshotUsageOptions: Array<{ value: ScreenshotUsage; label: string }> = [
  { value: "hero_mockup", label: "Hero mockup (use screenshot)" },
  { value: "feature_mockup", label: "Feature mockup (use screenshot)" },
  { value: "none", label: "Text only (no screenshot)" },
];
