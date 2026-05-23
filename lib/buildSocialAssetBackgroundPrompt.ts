import type { AppProfile, SocialAssetPlan, SocialStrategyBrief } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { buildScreenshotColorHarmonyBlock } from "@/lib/applyScreenshotColorHarmony";
import {
  backgroundPromptCompositionBlock,
  backgroundPromptExclusionsBlock,
  backgroundPromptQualityBlock,
} from "@/lib/buildBackgroundPromptShared";

export function buildSocialAssetBackgroundPrompt(
  profile: AppProfile,
  strategy: SocialStrategyBrief,
  asset: SocialAssetPlan,
) {
  const platform = socialPlatformMeta[asset.platform];
  const usesScreenshot = asset.screenshotUsage !== "none";

  return [
    `Create a premium ${platform.label} marketing BACKGROUND ONLY.`,
    `Format: ${platform.formatLabel} (${asset.imageSize}). ChatGPT Images 2.0 quality.`,
    "",
    backgroundPromptExclusionsBlock(),
    "",
    backgroundPromptQualityBlock(strategy.colorProfile),
    "",
    buildScreenshotColorHarmonyBlock(strategy.colorProfile),
    "",
    "CREATIVE DIRECTION:",
    `- App: "${profile.appName}" (${profile.category})`,
    `- Post role: ${asset.role}`,
    `- Visual style: ${asset.visualStyle}`,
    `- Campaign theme: ${strategy.visualTheme}`,
    `- Positioning: ${strategy.positioning}`,
    strategy.accentColor ? `- Accent color: ${strategy.accentColor}` : "",
    strategy.brandColor ? `- Gradient secondary: ${strategy.brandColor}` : "",
    "",
    "Scene inspiration: lifestyle photography, cinematic gradient, or scroll-stopping branded environment.",
    "",
    backgroundPromptCompositionBlock(usesScreenshot),
    "",
    "Deliver a single background plate — no devices, no copy, no UI.",
  ].join("\n");
}
