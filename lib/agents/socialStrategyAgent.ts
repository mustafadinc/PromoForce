import { buildCopyVariants, ensureCopyVariants } from "@/lib/copyVariants";
import {
  SOCIAL_ASSET_COUNT,
  type AppProfile,
  type ImageSize,
  type SocialAssetPlan,
  type SocialAssetRole,
  type SocialPlatform,
  type SocialStrategyBrief,
  type ScreenshotUsage,
  socialPlatformMeta,
} from "@/lib/campaignTypes";

type StrategyImageInput = {
  index: number;
  mimeType: string;
  base64: string;
};

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for strategy generation.");
  }
  return apiKey;
}

function buildFallbackSocialStrategy(profile: AppProfile, screenshotCount: number): SocialStrategyBrief {
  const rawAssets = [
    {
      assetNumber: 1,
      platform: "instagram_feed" as const,
      role: "launch" as const,
      headline: profile.appName,
      subheadline: profile.description,
      hook: `Introducing ${profile.appName} 🚀`,
      caption: `${profile.description} Built for ${profile.targetAudience || "mobile users"}.`,
      hashtags: [profile.appName.replace(/\s+/g, ""), profile.category.replace(/\s+/g, ""), "AppLaunch", "IndieApp"],
      screenshotIndex: screenshotCount > 0 ? 0 : null,
      screenshotUsage: (screenshotCount > 0 ? "hero_mockup" : "none") as ScreenshotUsage,
      visualStyle: "Bold launch post with app mockup and clean typography.",
      imageSize: socialPlatformMeta.instagram_feed.imageSize,
    },
    {
      assetNumber: 2,
      platform: "instagram_story" as const,
      role: "feature" as const,
      headline: "See it in action",
      subheadline: profile.description.slice(0, 120),
      hook: "Swipe up to try it 👆",
      caption: `Here's what ${profile.appName} looks like in action.`,
      hashtags: ["AppDemo", "MobileApp"],
      screenshotIndex: screenshotCount > 1 ? 1 : screenshotCount > 0 ? 0 : null,
      screenshotUsage: (screenshotCount > 0 ? "feature_mockup" : "none") as ScreenshotUsage,
      visualStyle: "Vertical story layout with immersive product focus.",
      imageSize: socialPlatformMeta.instagram_story.imageSize,
    },
    {
      assetNumber: 3,
      platform: "twitter" as const,
      role: "engagement" as const,
      headline: profile.appName,
      subheadline: "Now available",
      hook: `We just launched ${profile.appName}.`,
      caption: `${profile.description} Would love your feedback.`,
      hashtags: ["BuildInPublic", "AppLaunch"],
      screenshotIndex: null,
      screenshotUsage: "none" as const,
      visualStyle: "Wide announcement card with strong headline and minimal copy.",
      imageSize: socialPlatformMeta.twitter.imageSize,
    },
  ];

  const assets: SocialAssetPlan[] = rawAssets.map((asset) =>
    ensureCopyVariants({ ...asset, selectedVariantId: "A" }),
  );

  return {
    positioning: `${profile.appName} — ${profile.description}`,
    primaryMessage: profile.description,
    targetAudience: profile.targetAudience || "Mobile app users",
    visualTheme: "Cohesive social launch look with premium gradients and readable type.",
    assets,
  };
}

function normalizeAsset(raw: Partial<SocialAssetPlan>, index: number, screenshotCount: number): SocialAssetPlan {
  const assetNumber = index + 1;
  const platform: SocialPlatform =
    raw.platform === "instagram_feed" || raw.platform === "instagram_story" || raw.platform === "twitter"
      ? raw.platform
      : (["instagram_feed", "instagram_story", "twitter"] as const)[index];

  const role: SocialAssetRole =
    raw.role === "launch" || raw.role === "feature" || raw.role === "engagement" ? raw.role : "launch";

  const screenshotUsage: ScreenshotUsage =
    raw.screenshotUsage === "hero_mockup" ||
    raw.screenshotUsage === "feature_mockup" ||
    raw.screenshotUsage === "none"
      ? raw.screenshotUsage
      : platform === "twitter"
        ? "none"
        : "hero_mockup";

  let screenshotIndex: number | null =
    typeof raw.screenshotIndex === "number" ? raw.screenshotIndex : screenshotUsage === "none" ? null : 0;

  if (screenshotUsage === "none" || screenshotCount === 0) {
    screenshotIndex = null;
  } else if (screenshotIndex !== null) {
    screenshotIndex = Math.min(Math.max(screenshotIndex, 0), screenshotCount - 1);
  }

  const hashtags = Array.isArray(raw.hashtags)
    ? raw.hashtags.map((tag) => String(tag).replace(/^#/, "").trim()).filter(Boolean).slice(0, 8)
    : [];

  return ensureCopyVariants({
    assetNumber,
    platform,
    role,
    headline: String(raw.headline || `Asset ${assetNumber}`).trim(),
    subheadline: String(raw.subheadline || "").trim(),
    hook: String(raw.hook || "").trim(),
    caption: String(raw.caption || "").trim(),
    hashtags,
    screenshotIndex,
    screenshotUsage,
    visualStyle: String(raw.visualStyle || "Premium social marketing layout.").trim(),
    imageSize: socialPlatformMeta[platform].imageSize,
    copyVariants: buildCopyVariants(
      String(raw.hook || "").trim(),
      String(raw.caption || "").trim(),
      hashtags,
      (raw as { copyVariantB?: { hook?: string; caption?: string; hashtags?: string[] } }).copyVariantB,
    ),
    selectedVariantId: "A",
  });
}

function normalizeSocialStrategyBrief(
  raw: Partial<SocialStrategyBrief>,
  profile: AppProfile,
  screenshotCount: number,
): SocialStrategyBrief {
  const fallback = buildFallbackSocialStrategy(profile, screenshotCount);
  const assets = Array.isArray(raw.assets) ? raw.assets.slice(0, SOCIAL_ASSET_COUNT) : [];

  while (assets.length < SOCIAL_ASSET_COUNT) {
    assets.push(fallback.assets[assets.length]);
  }

  return {
    positioning: String(raw.positioning || fallback.positioning).trim(),
    primaryMessage: String(raw.primaryMessage || fallback.primaryMessage).trim(),
    targetAudience: String(raw.targetAudience || fallback.targetAudience).trim(),
    visualTheme: String(raw.visualTheme || fallback.visualTheme).trim(),
    assets: assets.map((asset, index) => normalizeAsset(asset, index, screenshotCount)),
  };
}

export async function generateSocialStrategyBrief(
  profile: AppProfile,
  images: StrategyImageInput[],
  performanceContext = "",
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
        "",
        "Return JSON only with keys: positioning, primaryMessage, targetAudience, visualTheme, assets.",
        "assets must contain exactly 3 items for:",
        "1) instagram_feed (launch hero, square)",
        "2) instagram_story (feature/demo, vertical)",
        "3) twitter (announcement, wide — prefer text-only unless screenshot adds value)",
        "",
        "Each asset needs: assetNumber, platform, role, headline, subheadline, hook, caption, hashtags, screenshotIndex, screenshotUsage, visualStyle, copyVariantB.",
        "copyVariantB: alternate A/B test copy with different hook, caption, hashtags for the same visual.",
        "platform must be instagram_feed, instagram_story, or twitter.",
        "role must be launch, feature, or engagement.",
        "screenshotUsage must be hero_mockup, feature_mockup, or none.",
        "screenshotIndex is 0-based and null when screenshotUsage is none.",
        "hashtags: array of 3-6 strings without # prefix.",
        "hook: first attention-grabbing line for the post.",
        "caption: full post body excluding hashtags.",
        "Decide strategically whether each asset uses a screenshot or text-only brand creative.",
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

    return normalizeSocialStrategyBrief(JSON.parse(content) as Partial<SocialStrategyBrief>, profile, screenshotCount);
  } catch {
    const fallback = buildFallbackSocialStrategy(profile, screenshotCount);
    return {
      ...fallback,
      assets: fallback.assets.map((asset, index) => normalizeAsset(asset, index, screenshotCount)),
    };
  }
}

export { fileToStrategyImage } from "@/lib/agents/strategyAgent";
