import {
  type AppProfile,
  type AutopilotPostRole,
  type AutopilotStrategyBrief,
  type BrandMemory,
  type CalendarDuration,
  type CalendarPostPlan,
  type ScreenshotUsage,
  type SocialPlatform,
  socialPlatformMeta,
} from "@/lib/campaignTypes";
import { formatBrandMemoryForPrompt } from "@/lib/brandMemory";
import { buildCopyVariants, ensureCopyVariants } from "@/lib/copyVariants";
import { fileToStrategyImage } from "@/lib/agents/strategyAgent";
import { coerceStrategyText } from "@/lib/strategyText";

type StrategyImageInput = {
  index: number;
  mimeType: string;
  base64: string;
};

const platforms: SocialPlatform[] = ["instagram_feed", "instagram_story", "twitter"];
const roles: AutopilotPostRole[] = [
  "launch",
  "feature",
  "storytelling",
  "engagement",
  "tip",
  "cta",
  "behind_the_scenes",
];
const times = ["09:00", "12:30", "18:00"];

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for autopilot strategy generation.");
  }
  return apiKey;
}

function buildFallbackPost(
  profile: AppProfile,
  day: number,
  duration: CalendarDuration,
  screenshotCount: number,
  startDate: string,
): CalendarPostPlan {
  const platform = platforms[(day - 1) % platforms.length];
  const role = roles[(day - 1) % roles.length];
  const useScreenshot = screenshotCount > 0 && day % 3 !== 0;
  const screenshotUsage: ScreenshotUsage = useScreenshot
    ? day === 1
      ? "hero_mockup"
      : "feature_mockup"
    : "none";

  const headlines: Record<AutopilotPostRole, string> = {
    launch: profile.appName,
    feature: "Built for your workflow",
    storytelling: "Why we built this",
    engagement: "Question for you",
    cta: "Try it today",
    tip: "Pro tip",
    behind_the_scenes: "Behind the build",
  };

  const scheduledTime = times[(day - 1) % times.length];
  const scheduledDate = new Date(startDate);
  scheduledDate.setDate(scheduledDate.getDate() + day - 1);
  const [h, m] = scheduledTime.split(":").map(Number);
  scheduledDate.setHours(h || 9, m || 0, 0, 0);

  return ensureCopyVariants({
    day,
    platform,
    role,
    format: day % 7 === 0 ? "reels" : day % 5 === 0 ? "carousel" : "single",
    phaseId: day <= 5 ? "tease" : day <= 12 ? "launch" : day <= 22 ? "education" : "community",
    visualTemplate: day % 4 === 0 ? "quote_card" : "hero_mockup",
    videoTemplate: day % 7 === 0 ? "mood_teaser" : undefined,
    headline: day === 1 ? profile.appName : headlines[role],
    subheadline: profile.description.slice(0, 100),
    hook:
      day === 1
        ? `Introducing ${profile.appName} 🚀`
        : `Day ${day} of ${duration}: something worth sharing about ${profile.appName}.`,
    caption: `${profile.description} ${profile.targetAudience ? `Made for ${profile.targetAudience}.` : ""}`.trim(),
    hashtags: [
      profile.appName.replace(/\s+/g, ""),
      profile.category.replace(/\s+/g, ""),
      "BuildInPublic",
      "IndieApp",
    ].slice(0, 5),
    screenshotIndex: useScreenshot ? (day - 1) % screenshotCount : null,
    screenshotUsage,
    screenshotRationale: useScreenshot
      ? "Product visual helps explain the message on this day."
      : "Text-only post for variety and feed balance.",
    visualStyle: "Cohesive calendar aesthetic with premium mobile app marketing polish.",
    imageSize: socialPlatformMeta[platform].imageSize,
    scheduledTime,
    scheduledAt: scheduledDate.toISOString(),
    selectedVariantId: "A",
  });
}

function buildFallbackPhases(duration: CalendarDuration) {
  if (duration === 7) {
    return [
      { id: "launch", name: "Launch", goal: "Announce", dayStart: 1, dayEnd: 3, narrativeFocus: "Hero + problem" },
      { id: "value", name: "Value", goal: "Educate", dayStart: 4, dayEnd: 5, narrativeFocus: "Features" },
      { id: "cta", name: "CTA", goal: "Convert", dayStart: 6, dayEnd: 7, narrativeFocus: "Download" },
    ];
  }
  return [
    { id: "tease", name: "Pre-launch", goal: "Curiosity", dayStart: 1, dayEnd: 5, narrativeFocus: "Tease" },
    { id: "launch", name: "Launch", goal: "Downloads", dayStart: 6, dayEnd: 12, narrativeFocus: "Demo + proof" },
    { id: "education", name: "Education", goal: "Retain", dayStart: 13, dayEnd: 22, narrativeFocus: "Tips" },
    { id: "community", name: "Community", goal: "Engage", dayStart: 23, dayEnd: 30, narrativeFocus: "UGC + CTA" },
  ];
}

function buildFallbackAutopilotStrategy(
  profile: AppProfile,
  duration: CalendarDuration,
  startDate: string,
  screenshotCount: number,
): AutopilotStrategyBrief {
  return {
    positioning: `${profile.appName} — ${profile.description}`,
    primaryMessage: profile.description,
    targetAudience: profile.targetAudience || "Mobile app users",
    visualTheme: "Consistent premium gradient system with clean typography across the calendar.",
    brandVoice: "Confident, friendly, founder-led, clear and concise.",
    duration,
    startDate,
    contentPillars: ["Product value", "Feature education", "Community engagement", "Launch momentum"],
    phases: buildFallbackPhases(duration),
    posts: Array.from({ length: duration }, (_, index) =>
      buildFallbackPost(profile, index + 1, duration, screenshotCount, startDate),
    ),
  };
}

function normalizePost(raw: Partial<CalendarPostPlan>, index: number, screenshotCount: number): CalendarPostPlan {
  const day = index + 1;
  const platform: SocialPlatform =
    raw.platform === "instagram_feed" || raw.platform === "instagram_story" || raw.platform === "twitter"
      ? raw.platform
      : platforms[index % platforms.length];

  const role: AutopilotPostRole =
    raw.role && roles.includes(raw.role as AutopilotPostRole) ? (raw.role as AutopilotPostRole) : roles[index % roles.length];

  const screenshotUsage: ScreenshotUsage =
    raw.screenshotUsage === "hero_mockup" ||
    raw.screenshotUsage === "feature_mockup" ||
    raw.screenshotUsage === "none"
      ? raw.screenshotUsage
      : "none";

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

  const format =
    raw.format === "carousel" || raw.format === "story" || raw.format === "reels" || raw.format === "single"
      ? raw.format
      : "single";

  return ensureCopyVariants({
    day,
    platform,
    role,
    format,
    phaseId: raw.phaseId,
    visualTemplate: raw.visualTemplate,
    videoTemplate: raw.videoTemplate,
    carouselSlides: raw.carouselSlides,
    headline: String(raw.headline || `Day ${day}`).trim(),
    subheadline: String(raw.subheadline || "").trim(),
    hook: String(raw.hook || "").trim(),
    caption: String(raw.caption || "").trim(),
    hashtags,
    screenshotIndex,
    screenshotUsage,
    screenshotRationale: String(raw.screenshotRationale || "AI marketing decision.").trim(),
    visualStyle: String(raw.visualStyle || "Premium social calendar creative.").trim(),
    imageSize: socialPlatformMeta[platform].imageSize,
    scheduledTime: String(raw.scheduledTime || times[index % times.length]).trim(),
    copyVariants: buildCopyVariants(
      String(raw.hook || "").trim(),
      String(raw.caption || "").trim(),
      hashtags,
      (raw as { copyVariantB?: { hook?: string; caption?: string; hashtags?: string[] } }).copyVariantB,
    ),
    selectedVariantId: "A",
  });
}

function normalizeAutopilotBrief(
  raw: Partial<AutopilotStrategyBrief>,
  profile: AppProfile,
  duration: CalendarDuration,
  startDate: string,
  screenshotCount: number,
): AutopilotStrategyBrief {
  const fallback = buildFallbackAutopilotStrategy(profile, duration, startDate, screenshotCount);
  const posts = Array.isArray(raw.posts) ? raw.posts.slice(0, duration) : [];

  while (posts.length < duration) {
    posts.push(fallback.posts[posts.length]);
  }

  const phases = Array.isArray(raw.phases) && raw.phases.length ? raw.phases : fallback.phases;

  const contentPillars = Array.isArray(raw.contentPillars)
    ? raw.contentPillars.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
    : fallback.contentPillars;

  return {
    positioning: String(raw.positioning || fallback.positioning).trim(),
    primaryMessage: String(raw.primaryMessage || fallback.primaryMessage).trim(),
    targetAudience: String(raw.targetAudience || fallback.targetAudience).trim(),
    visualTheme: coerceStrategyText(raw.visualTheme, fallback.visualTheme),
    brandVoice: String(raw.brandVoice || fallback.brandVoice).trim(),
    duration,
    startDate,
    contentPillars,
    phases,
    posts: posts.map((post, index) => normalizePost(post, index, screenshotCount)),
  };
}

export async function generateAutopilotStrategyBrief(
  profile: AppProfile,
  images: StrategyImageInput[],
  duration: CalendarDuration,
  startDate: string,
  brandMemory: BrandMemory | null,
  performanceContext = "",
): Promise<AutopilotStrategyBrief> {
  if (process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY) {
    try {
      const { generateAutopilotStrategyV2 } = await import("@/lib/agents/generateAutopilotStrategyV2");
      return await generateAutopilotStrategyV2(
        profile,
        duration,
        startDate,
        images.length,
        brandMemory,
        performanceContext,
      );
    } catch {
      // Fall through to legacy single-agent path
    }
  }

  const apiKey = getOpenAIKey();
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const screenshotCount = images.length;
  const memoryBlock = formatBrandMemoryForPrompt(brandMemory);

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
  > = [
    {
      type: "text",
      text: [
        `You are the marketing director. Create a ${duration}-day social content calendar for this mobile app.`,
        "",
        "App profile:",
        `- App name: ${profile.appName}`,
        `- Category: ${profile.category}`,
        `- Description: ${profile.description}`,
        `- Target audience: ${profile.targetAudience || "Mobile app users"}`,
        `- Uploaded screenshots: ${screenshotCount}`,
        `- Calendar start date: ${startDate}`,
        memoryBlock,
        performanceContext,
        "",
        "Return JSON only with keys: positioning, primaryMessage, targetAudience, visualTheme, brandVoice, contentPillars, posts.",
        `posts must contain exactly ${duration} items.`,
        "Each post: day, platform, role, headline, subheadline, hook, caption, hashtags, screenshotIndex, screenshotUsage, screenshotRationale, visualStyle, scheduledTime, copyVariantB.",
        "copyVariantB: alternate A/B caption variant with different hook, caption, hashtags.",
        "platform: instagram_feed | instagram_story | twitter.",
        "role: launch | feature | storytelling | engagement | cta | tip | behind_the_scenes.",
        "screenshotUsage: hero_mockup | feature_mockup | none.",
        "screenshotRationale: one sentence explaining why you used or skipped screenshots (marketing director decision).",
        "Vary platforms across the calendar. Not every day needs a screenshot — balance product visuals with text-only brand posts.",
        "Mix launch, feature, engagement, tips, and CTAs across the calendar.",
        "scheduledTime: suggest posting time as HH:MM (24h).",
        "hashtags: 3-6 strings without # prefix.",
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
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a senior mobile app marketing director running daily social autopilot for indie founders. Plan strategically, write sharp copy, and decide when screenshots help vs hurt.",
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
      throw new Error("Autopilot strategy model returned empty content.");
    }

    return normalizeAutopilotBrief(
      JSON.parse(content) as Partial<AutopilotStrategyBrief>,
      profile,
      duration,
      startDate,
      screenshotCount,
    );
  } catch {
    const fallback = buildFallbackAutopilotStrategy(profile, duration, startDate, screenshotCount);
    return {
      ...fallback,
      posts: fallback.posts.map((post, index) => normalizePost(post, index, screenshotCount)),
    };
  }
}

export { fileToStrategyImage };
