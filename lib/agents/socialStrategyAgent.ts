import { applyScreenshotColorHarmonyToSocialBrief } from "@/lib/applyScreenshotColorHarmony";
import {
  buildFallbackSocialStrategy,
  normalizeSocialAsset,
  normalizeSocialStrategyBrief,
} from "@/lib/socialStrategyNormalize";
import type { StrategyImageInput } from "@/lib/strategyImageUtils";
import {
  type AppProfile,
  type ScreenshotColorProfile,
  type ScreenshotIntelligence,
  type SocialStrategyBrief,
} from "@/lib/campaignTypes";
import {
  attachScreenshotIntelligence,
  formatScreenshotIntelligenceForPrompt,
} from "@/lib/screenshotIntelligenceFormat";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for strategy generation.");
  }
  return apiKey;
}

export async function generateSocialStrategyBrief(
  profile: AppProfile,
  images: StrategyImageInput[],
  performanceContext = "",
  colorProfile: ScreenshotColorProfile | null = null,
  screenshotIntelligence: ScreenshotIntelligence[] = [],
): Promise<SocialStrategyBrief> {
  const apiKey = getOpenAIKey();
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const screenshotCount = images.length;

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
  > = [
    {
      type: "text",
      text: [
        "Analyze this mobile app and create a social launch pack strategy.",
        "",
        "App profile:",
        `- App name: ${profile.appName}`,
        `- Category: ${profile.category}`,
        `- Description: ${profile.description}`,
        `- Target audience: ${profile.targetAudience || "Mobile app users"}`,
        `- Uploaded screenshots: ${screenshotCount}`,
        performanceContext,
        screenshotIntelligence.length
          ? formatScreenshotIntelligenceForPrompt(profile, screenshotIntelligence)
          : "",
        "",
        "Return JSON only with keys: positioning, primaryMessage, targetAudience, visualTheme, assets.",
        "assets must contain exactly 4 items for:",
        "1) instagram_feed (launch hero, square)",
        "2) instagram_story (feature/demo, vertical static)",
        "3) instagram_reels (short-form video reel, vertical — hook-led, uses screenshot as hero frame)",
        "4) twitter (announcement, wide — prefer text-only unless screenshot adds value)",
        "",
        "Each asset needs: assetNumber, platform, role, headline, subheadline, hook, caption, hashtags, screenshotIndex, screenshotUsage, visualStyle, copyVariantB.",
        "For instagram_reels also include: format=reels, videoTemplate (screenshot_reel when multiple screens show different features | mood_teaser | kinetic_headline).",
        "copyVariantB: alternate A/B test copy with different hook, caption, hashtags for the same visual.",
        "platform must be instagram_feed, instagram_story, instagram_reels, or twitter.",
        "role must be launch, feature, or engagement.",
        "screenshotUsage must be hero_mockup, feature_mockup, or none.",
        "screenshotIndex is 0-based and null when screenshotUsage is none.",
        "hashtags: array of 3-6 strings without # prefix.",
        "hook: first attention-grabbing line for the post.",
        "caption: full post body excluding hashtags.",
        "Decide strategically whether each asset uses a screenshot or text-only brand creative.",
        colorProfile
          ? [
              "",
              "Screenshot color analysis (visualTheme and each visualStyle MUST harmonize):",
              `- UI tone: ${colorProfile.uiTone}`,
              `- Dominant colors: ${colorProfile.dominantColors.join(", ")}`,
              `- Accent: ${colorProfile.accentColor}`,
              colorProfile.harmonyGuidance,
            ].join("\n")
          : "",
      ].join("\n"),
    },
    ...images.map((image) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${image.mimeType};base64,${image.base64}`,
        detail: "low" as const,
      },
    })),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a senior social media marketing director for mobile apps. Write scroll-stopping copy and visual plans for indie founders.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Social strategy model returned empty content.");
    }

    return attachScreenshotIntelligence(
      applyScreenshotColorHarmonyToSocialBrief(
        normalizeSocialStrategyBrief(JSON.parse(content) as Partial<SocialStrategyBrief>, profile, screenshotCount),
        colorProfile,
      ),
      screenshotIntelligence,
    );
  } catch {
    const fallback = buildFallbackSocialStrategy(profile, screenshotCount);
    return attachScreenshotIntelligence(
      applyScreenshotColorHarmonyToSocialBrief(
        {
          ...fallback,
          assets: fallback.assets.map((asset, index) => normalizeSocialAsset(asset, index, screenshotCount)),
        },
        colorProfile,
      ),
      screenshotIntelligence,
    );
  }
}

export { ensureSocialStrategyBrief } from "@/lib/socialStrategyNormalize";
