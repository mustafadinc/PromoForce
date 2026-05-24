import type { SocialAssetPlan, ScreenshotUsage, SocialPlatform } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";

export function normalizeSocialAssetEdit(
  asset: SocialAssetPlan,
  patch: Partial<SocialAssetPlan>,
  screenshotCount: number,
): SocialAssetPlan {
  const next = { ...asset, ...patch };

  if (patch.platform) {
    next.imageSize = socialPlatformMeta[patch.platform].imageSize;
    if (patch.platform === "instagram_reels") {
      next.format = "reels";
      next.videoTemplate = next.videoTemplate ?? "mood_teaser";
    } else if (next.format === "reels") {
      next.format = "single";
      next.videoTemplate = undefined;
    }
  }

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

export const socialPlatformOptions: Array<{ value: SocialPlatform; label: string; hint: string }> = [
  { value: "instagram_feed", label: "Instagram Feed Post", hint: "Square 1080×1080 image post" },
  { value: "instagram_story", label: "Instagram Story", hint: "Vertical 1080×1920 story frame" },
  { value: "instagram_reels", label: "Instagram Reels", hint: "Vertical 1080×1920 MP4 video" },
  { value: "twitter", label: "X / Twitter Post", hint: "Wide 1600×900 announcement card" },
];

export const screenshotUsageOptions: Array<{ value: ScreenshotUsage; label: string }> = [
  { value: "hero_mockup", label: "Hero mockup (use screenshot)" },
  { value: "feature_mockup", label: "Feature mockup (use screenshot)" },
  { value: "none", label: "Text only (no screenshot)" },
];
