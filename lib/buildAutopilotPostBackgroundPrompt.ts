import type { AppProfile, AutopilotStrategyBrief, CalendarPostPlan } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import { buildScreenshotColorHarmonyBlock } from "@/lib/applyScreenshotColorHarmony";
import {
  backgroundPromptCompositionBlock,
  backgroundPromptExclusionsBlock,
  backgroundPromptQualityBlock,
} from "@/lib/buildBackgroundPromptShared";

export function buildAutopilotPostBackgroundPrompt(
  profile: AppProfile,
  strategy: AutopilotStrategyBrief,
  post: CalendarPostPlan,
  sessionBrandMemory: string,
) {
  const platform = socialPlatformMeta[post.platform];
  const usesScreenshot = post.screenshotUsage !== "none";

  return [
    `Create day ${post.day} social calendar BACKGROUND ONLY for ${platform.label}.`,
    `Format: ${platform.formatLabel} (${post.imageSize}). ChatGPT Images 2.0 quality.`,
    "",
    backgroundPromptExclusionsBlock(),
    "",
    backgroundPromptQualityBlock(strategy.colorProfile),
    "",
    buildScreenshotColorHarmonyBlock(strategy.colorProfile),
    "",
    "CREATIVE DIRECTION:",
    `- App: "${profile.appName}" (${profile.category})`,
    `- Day ${post.day} role: ${post.role}`,
    `- Visual style: ${post.visualStyle}`,
    `- Calendar theme: ${strategy.visualTheme}`,
    `- Brand voice: ${strategy.brandVoice}`,
    strategy.accentColor ? `- Accent color: ${strategy.accentColor}` : "",
    strategy.brandColor ? `- Gradient secondary: ${strategy.brandColor}` : "",
    "",
    sessionBrandMemory,
    "",
    backgroundPromptCompositionBlock(usesScreenshot),
    "",
    "Maintain visual consistency with earlier calendar posts while keeping this day distinct.",
    "Deliver a single background plate — no devices, no copy, no UI.",
  ]
    .filter(Boolean)
    .join("\n");
}
