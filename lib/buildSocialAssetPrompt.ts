import type { AppProfile, ImageSize, SocialAssetPlan, SocialPlatform, SocialStrategyBrief } from "@/lib/campaignTypes";
import { SOCIAL_ASSET_COUNT, socialPlatformMeta } from "@/lib/campaignTypes";

export function buildSocialAssetPrompt(
  profile: AppProfile,
  strategy: SocialStrategyBrief,
  asset: SocialAssetPlan,
) {
  const platform = socialPlatformMeta[asset.platform];

  const screenshotLine =
    asset.screenshotUsage === "none"
      ? "Do not include a phone mockup or app UI screenshot. Use typography, gradients, and brand visuals only."
      : asset.screenshotUsage === "hero_mockup"
        ? "Place the uploaded app screenshot inside a premium iPhone mockup as the hero visual."
        : "Place the uploaded app screenshot inside a premium iPhone mockup to highlight this message.";

  return [
    `Create a ${platform.label} marketing image for the mobile app "${profile.appName}".`,
    `Format: ${platform.formatLabel} (${asset.imageSize}), premium social launch quality.`,
    "",
    "Use this exact on-image copy (do not paraphrase or invent new text):",
    `- Headline: "${asset.headline}"`,
    `- Subheadline: "${asset.subheadline}"`,
    "",
    `Post role: ${asset.role}. Platform tone: ${platform.label}.`,
    screenshotLine,
    "",
    `Campaign positioning: ${strategy.positioning}.`,
    `Primary message: ${strategy.primaryMessage}.`,
    `Visual theme: ${strategy.visualTheme}.`,
    `Visual direction: ${asset.visualStyle}.`,
    "",
    "Designed for social feed scroll-stopping impact: bold hierarchy, readable text, cohesive brand look.",
  ].join(" ");
}

export function formatSocialPostCopy(asset: Pick<SocialAssetPlan, "hook" | "caption" | "hashtags">) {
  const tags = asset.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  return [asset.hook, "", asset.caption, "", tags].filter(Boolean).join("\n");
}

export function platformLabel(platform: SocialPlatform) {
  return socialPlatformMeta[platform].label;
}

export { SOCIAL_ASSET_COUNT };
