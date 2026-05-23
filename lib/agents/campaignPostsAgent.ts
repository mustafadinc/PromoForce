import type {
  AppProfile,
  CalendarDuration,
  CalendarPostPlan,
  CampaignPhase,
  PostFormat,
  VisualTemplateId,
  VideoTemplateId,
} from "@/lib/campaignTypes";
import { socialPlatformMeta } from "@/lib/campaignTypes";
import type { DirectorPlan } from "@/lib/agents/campaignDirectorAgent";
import { buildCopyVariants, ensureCopyVariants } from "@/lib/copyVariants";

const formats: PostFormat[] = ["single", "carousel", "story", "reels"];
const visualTemplates: VisualTemplateId[] = [
  "hero_mockup",
  "quote_card",
  "stat_card",
  "comparison_split",
  "annotated_screenshot",
  "feature_spotlight",
];
const videoTemplates: VideoTemplateId[] = [
  "logo_reveal",
  "mood_teaser",
  "screenshot_reel",
  "kinetic_headline",
  "countdown_teaser",
];

function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY required");
  return key;
}

export async function runCampaignPostsAgent(
  profile: AppProfile,
  duration: CalendarDuration,
  startDate: string,
  director: DirectorPlan,
  screenshotCount: number,
  performanceContext: string,
): Promise<CalendarPostPlan[]> {
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

  const phaseSummary = director.phases
    .map((p) => `${p.id} (days ${p.dayStart}-${p.dayEnd}): ${p.name} — ${p.narrativeFocus}`)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
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
            "You plan daily social posts for a mobile app. Each post needs unique format and visual approach. Return JSON only.",
        },
        {
          role: "user",
          content: [
            `App: ${profile.appName}`,
            `Duration: ${duration} days starting ${startDate}`,
            `Positioning: ${director.positioning}`,
            `Voice: ${director.brandVoice}`,
            `Visual theme: ${director.visualTheme}`,
            `Screenshots available: ${screenshotCount}`,
            performanceContext,
            "",
            "Campaign phases:",
            phaseSummary,
            "",
            `Return JSON: { "posts": [ exactly ${duration} items ] }`,
            "Each post: day, platform (instagram_feed|instagram_story|twitter), role, format (single|carousel|story|reels), phaseId, visualTemplate, videoTemplate (if reels), headline, subheadline, hook, caption, hashtags, screenshotIndex, screenshotUsage, screenshotRationale, visualStyle, scheduledTime, copyVariantB, carouselSlides (if carousel: array of {slideIndex, headline, subheadline, visualTemplate, screenshotIndex}).",
            "Rules:",
            "- AI decides format per day — vary single/carousel/story/reels; NOT all mockups.",
            "- carousel: 3-5 slides telling one mini-story.",
            "- reels: pick videoTemplate from logo_reveal|mood_teaser|screenshot_reel|kinetic_headline|countdown_teaser.",
            "- quote_card/stat_card days: screenshotUsage none.",
            "- Mix platforms across calendar.",
            "- featureHighlights-style short hooks; hashtags 3-6 without #.",
            "- scheduledTime HH:MM 24h.",
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("Posts agent returned empty");

  const raw = JSON.parse(content) as { posts?: Partial<CalendarPostPlan>[] };
  return normalizePosts(raw.posts, duration, startDate, screenshotCount, director.phases);
}

function normalizePosts(
  raw: Partial<CalendarPostPlan>[] | undefined,
  duration: CalendarDuration,
  startDate: string,
  screenshotCount: number,
  phases: CampaignPhase[],
): CalendarPostPlan[] {
  const platforms = ["instagram_feed", "instagram_story", "twitter"] as const;
  const posts: CalendarPostPlan[] = [];

  for (let day = 1; day <= duration; day++) {
    const item = raw?.[day - 1];
    const phase = phases.find((p) => day >= p.dayStart && day <= p.dayEnd) ?? phases[0];
    const platform = item?.platform && platforms.includes(item.platform) ? item.platform : platforms[(day - 1) % 3];
    const format = item?.format && formats.includes(item.format) ? item.format : day % 7 === 0 ? "reels" : day % 5 === 0 ? "carousel" : "single";

    let screenshotUsage = item?.screenshotUsage ?? (screenshotCount > 0 && day % 4 !== 0 ? "feature_mockup" : "none");
    if (item?.visualTemplate === "quote_card" || item?.visualTemplate === "stat_card") {
      screenshotUsage = "none";
    }

    let screenshotIndex: number | null =
      typeof item?.screenshotIndex === "number" ? item.screenshotIndex : screenshotUsage === "none" ? null : (day - 1) % screenshotCount;
    if (screenshotUsage === "none" || screenshotCount === 0) screenshotIndex = null;
    else if (screenshotIndex !== null) screenshotIndex = Math.min(Math.max(screenshotIndex, 0), screenshotCount - 1);

    const hashtags = Array.isArray(item?.hashtags)
      ? item.hashtags.map((t) => String(t).replace(/^#/, "").trim()).filter(Boolean).slice(0, 8)
      : [];

    const hook = String(item?.hook || `Day ${day} update`).trim();
    const caption = String(item?.caption || "").trim();

    const scheduledTime = String(item?.scheduledTime || ["09:00", "12:30", "18:00"][(day - 1) % 3]).trim();
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + day - 1);
    const [h, m] = scheduledTime.split(":").map(Number);
    scheduledDate.setHours(h || 9, m || 0, 0, 0);

    posts.push(
      ensureCopyVariants({
        day,
        platform,
        role: item?.role ?? "feature",
        format,
        phaseId: item?.phaseId ?? phase?.id,
        visualTemplate:
          item?.visualTemplate && visualTemplates.includes(item.visualTemplate)
            ? item.visualTemplate
            : format === "reels"
              ? undefined
              : "hero_mockup",
        videoTemplate:
          item?.videoTemplate && videoTemplates.includes(item.videoTemplate)
            ? item.videoTemplate
            : format === "reels"
              ? "mood_teaser"
              : undefined,
        carouselSlides: Array.isArray(item?.carouselSlides) ? item.carouselSlides : undefined,
        headline: String(item?.headline || `Day ${day}`).trim(),
        subheadline: String(item?.subheadline || "").trim(),
        hook,
        caption,
        hashtags,
        screenshotIndex,
        screenshotUsage,
        screenshotRationale: String(item?.screenshotRationale || "AI planned").trim(),
        visualStyle: String(item?.visualStyle || "Premium social creative").trim(),
        imageSize: socialPlatformMeta[platform].imageSize,
        scheduledTime,
        scheduledAt: scheduledDate.toISOString(),
        copyVariants: buildCopyVariants(
          hook,
          caption,
          hashtags,
          (item as { copyVariantB?: { hook?: string; caption?: string; hashtags?: string[] } })?.copyVariantB,
        ),
        selectedVariantId: "A",
      }),
    );
  }

  return posts;
}
