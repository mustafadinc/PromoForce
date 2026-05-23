import type { SocialAssetPlan, ScreenshotUsage } from "@/lib/campaignTypes";

export function normalizeSocialAssetEdit(
  asset: SocialAssetPlan,
  patch: Partial<SocialAssetPlan>,
  screenshotCount: number,
): SocialAssetPlan {
  const next = { ...asset, ...patch };

  if (patch.hashtags) {
    next.hashtags = patch.hashtags.filter(Boolean);
  }

  if (next.screenshotUsage === "none" || screenshotCount === 0) {
    next.screenshotIndex = null;
    next.screenshotUsage = "none";
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
