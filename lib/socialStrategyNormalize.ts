import { buildCopyVariants, ensureCopyVariants } from "@/lib/copyVariants";
import { coerceStrategyText } from "@/lib/strategyText";
import {
  SOCIAL_ASSET_COUNT,
  type AppProfile,
  type SocialAssetPlan,
  type SocialAssetRole,
  type SocialPlatform,
  type SocialStrategyBrief,
  type ScreenshotUsage,
  socialPlatformMeta,
} from "@/lib/campaignTypes";

const defaultPlatforms: SocialPlatform[] = [
  "instagram_feed",
  "instagram_story",
  "instagram_reels",
  "twitter",
];

export function buildFallbackSocialStrategy(profile: AppProfile, screenshotCount: number): SocialStrategyBrief {
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
      platform: "instagram_reels" as const,
      role: "feature" as const,
      format: "reels" as const,
      videoTemplate: screenshotCount >= 2 ? ("screenshot_reel" as const) : ("mood_teaser" as const),
      headline: profile.appName,
      subheadline: profile.description.slice(0, 120),
      hook: `This app changed how I use my phone.`,
      caption: `${profile.description} Try ${profile.appName} — link in bio.`,
      hashtags: ["Reels", "AppTok", profile.category.replace(/\s+/g, "")],
      screenshotIndex: screenshotCount > 0 ? 0 : null,
      screenshotUsage: (screenshotCount > 0 ? "hero_mockup" : "none") as ScreenshotUsage,
      visualStyle: "Cinematic vertical reel with slow zoom and bold hook overlay.",
      imageSize: socialPlatformMeta.instagram_reels.imageSize,
    },
    {
      assetNumber: 4,
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

export function normalizeSocialAsset(
  raw: Partial<SocialAssetPlan>,
  index: number,
  screenshotCount: number,
): SocialAssetPlan {
  const assetNumber = index + 1;
  const platform: SocialPlatform =
    raw.platform === "instagram_feed" ||
    raw.platform === "instagram_story" ||
    raw.platform === "instagram_reels" ||
    raw.platform === "twitter"
      ? raw.platform
      : defaultPlatforms[index] ?? "instagram_feed";

  const isReels = platform === "instagram_reels" || raw.format === "reels";

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
    format: isReels ? "reels" : raw.format === "single" || raw.format === "story" ? raw.format : "single",
    videoTemplate: isReels
      ? raw.videoTemplate === "logo_reveal" ||
        raw.videoTemplate === "mood_teaser" ||
        raw.videoTemplate === "screenshot_reel" ||
        raw.videoTemplate === "kinetic_headline" ||
        raw.videoTemplate === "countdown_teaser"
        ? raw.videoTemplate
        : "mood_teaser"
      : undefined,
    copyVariants: buildCopyVariants(
      String(raw.hook || "").trim(),
      String(raw.caption || "").trim(),
      hashtags,
      (raw as { copyVariantB?: { hook?: string; caption?: string; hashtags?: string[] } }).copyVariantB,
    ),
    selectedVariantId: "A",
  });
}

export function normalizeSocialStrategyBrief(
  raw: Partial<SocialStrategyBrief>,
  profile: AppProfile,
  screenshotCount: number,
): SocialStrategyBrief {
  const fallback = buildFallbackSocialStrategy(profile, screenshotCount);
  let assets: Partial<SocialAssetPlan>[] = Array.isArray(raw.assets)
    ? raw.assets.map((asset) => ({ ...asset }))
    : [];

  const hasReels = assets.some(
    (asset) => asset.platform === "instagram_reels" || asset.format === "reels",
  );

  if (!hasReels) {
    const reelsTemplate = fallback.assets.find((asset) => asset.platform === "instagram_reels");
    if (reelsTemplate) {
      const twitterIndex = assets.findIndex((asset) => asset.platform === "twitter");
      const insertAt = twitterIndex >= 0 ? twitterIndex : assets.length;
      assets.splice(insertAt, 0, reelsTemplate);
    }
  }

  while (assets.length < SOCIAL_ASSET_COUNT) {
    assets.push(fallback.assets[assets.length]);
  }

  assets = assets.slice(0, SOCIAL_ASSET_COUNT);

  return {
    positioning: coerceStrategyText(raw.positioning, fallback.positioning),
    primaryMessage: coerceStrategyText(raw.primaryMessage, fallback.primaryMessage),
    targetAudience: coerceStrategyText(raw.targetAudience, fallback.targetAudience),
    visualTheme: coerceStrategyText(raw.visualTheme, fallback.visualTheme),
    assets: assets.map((asset, index) => normalizeSocialAsset(asset, index, screenshotCount)),
  };
}

/** Upgrade legacy 3-asset strategies to include Reels (client-safe — no sharp/server imports). */
export function ensureSocialStrategyBrief(
  strategy: SocialStrategyBrief,
  profile: AppProfile,
  screenshotCount: number,
): SocialStrategyBrief {
  return normalizeSocialStrategyBrief(strategy, profile, screenshotCount);
}
