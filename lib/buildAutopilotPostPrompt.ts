import type { AppProfile, AutopilotStrategyBrief, CalendarPostPlan } from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";

export function buildAutopilotPostPrompt(
  profile: AppProfile,
  strategy: AutopilotStrategyBrief,
  post: CalendarPostPlan,
  sessionBrandMemory: string,
) {
  const platform = socialPlatformMeta[post.platform];

  const screenshotLine =
    post.screenshotUsage === "none"
      ? "Do not include a phone mockup or app UI screenshot. Use typography, gradients, and brand visuals only."
      : post.screenshotUsage === "hero_mockup"
        ? "Place the uploaded app screenshot inside a premium iPhone mockup as the hero visual."
        : "Place the uploaded app screenshot inside a premium iPhone mockup to highlight this message.";

  return [
    `Create day ${post.day} of a ${strategy.duration}-day social content calendar for "${profile.appName}".`,
    `Platform: ${platform.label}. Format: ${platform.formatLabel} (${post.imageSize}).`,
    "",
    "Use this exact on-image copy (do not paraphrase or invent new text):",
    `- Headline: "${post.headline}"`,
    `- Subheadline: "${post.subheadline}"`,
    "",
    `Post role: ${post.role}.`,
    screenshotLine,
    "",
    `Campaign positioning: ${strategy.positioning}.`,
    `Primary message: ${strategy.primaryMessage}.`,
    `Visual theme: ${strategy.visualTheme}.`,
    `Brand voice: ${strategy.brandVoice}.`,
    `Visual direction: ${post.visualStyle}.`,
    "",
    sessionBrandMemory,
    "",
    "Maintain visual consistency with earlier posts in this calendar while keeping day-specific messaging fresh.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatCalendarPostCopy(post: Pick<CalendarPostPlan, "hook" | "caption" | "hashtags">) {
  const tags = post.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ");
  return [post.hook, "", post.caption, "", tags].filter(Boolean).join("\n");
}
