import {
  STORE_SLIDE_COUNT,
  type AppProfile,
  type ScreenshotUsage,
  type SlideRole,
  type StoreSlidePlan,
  type StrategyBrief,
} from "@/lib/campaignTypes";
import {
  assignUniqueScreenshots,
  buildAsoStrategyPromptBlock,
  buildFallbackStoreStrategy,
  normalizeStoreSlideBeat,
  storeSlideBeatMeta,
} from "@/lib/storeSetAsoFramework";
import {
  applyCreativeDirectorDefaults,
  normalizeBackgroundScenes,
  normalizeHeadlineFields,
  normalizeSlideCreativeFields,
} from "@/lib/storeCreativeDirector";
import type { ScreenshotAssessment, ScreenshotQualityRating } from "@/lib/campaignTypes";
import type { StrategyImageInput } from "@/lib/strategyImageUtils";

export type { StrategyImageInput };
export { fileToStrategyImage, prepareStrategyImages } from "@/lib/strategyImageUtils";

function getOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for strategy generation.");
  }
  return apiKey;
}

function normalizeSlide(
  raw: Partial<StoreSlidePlan>,
  index: number,
  screenshotCount: number,
  fallbackSlide: StoreSlidePlan,
  profile: AppProfile,
  scenes: ReturnType<typeof normalizeBackgroundScenes>,
): StoreSlidePlan {
  const slideNumber = index + 1;
  const asoBeat = normalizeStoreSlideBeat(raw.asoBeat, slideNumber);
  const beatMeta = storeSlideBeatMeta[asoBeat];

  const role: SlideRole =
    raw.role === "hero" || raw.role === "feature" || raw.role === "cta" ? raw.role : beatMeta.role;

  const screenshotUsage: ScreenshotUsage =
    raw.screenshotUsage === "hero_mockup" ||
    raw.screenshotUsage === "feature_mockup" ||
    raw.screenshotUsage === "none"
      ? raw.screenshotUsage
      : beatMeta.defaultScreenshotUsage;

  let screenshotIndex: number | null =
    typeof raw.screenshotIndex === "number" ? raw.screenshotIndex : screenshotUsage === "none" ? null : 0;

  if (screenshotUsage === "none" || screenshotCount === 0) {
    screenshotIndex = null;
  } else if (screenshotIndex !== null) {
    screenshotIndex = Math.min(Math.max(screenshotIndex, 0), screenshotCount - 1);
  }

  const creative = normalizeSlideCreativeFields(raw, slideNumber, profile, scenes);
  const headlines = normalizeHeadlineFields({
    headline: String(raw.headline || fallbackSlide.headline),
    headlineVerb: raw.headlineVerb,
    headlineDescriptor: raw.headlineDescriptor,
  });

  const screenshotRating = normalizeScreenshotRating(raw.screenshotRating);
  const screenshotIssues = Array.isArray(raw.screenshotIssues)
    ? raw.screenshotIssues.map((i) => String(i).trim()).filter(Boolean)
    : [];

  return {
    slideNumber,
    role,
    asoBeat,
    conversionGoal: String(raw.conversionGoal || beatMeta.conversionGoal).trim(),
    ...headlines,
    subheadline: String(raw.subheadline || fallbackSlide.subheadline).trim(),
    screenshotIndex,
    screenshotUsage,
    screenshotRationale: String(raw.screenshotRationale || beatMeta.copyGuidance).trim(),
    screenshotRating,
    screenshotIssues,
    retakeGuidance: String(raw.retakeGuidance || "").trim() || undefined,
    visualStyle: String(raw.visualStyle || beatMeta.visualVariantHint).trim(),
    visualVariant: String(raw.visualVariant || beatMeta.visualVariantHint).trim(),
    breakoutPanelDescription: String(raw.breakoutPanelDescription || "").trim() || undefined,
    ...creative,
  };
}

function normalizeScreenshotRating(value: unknown): ScreenshotQualityRating | undefined {
  if (value === "great" || value === "usable" || value === "retake") {
    return value;
  }
  return undefined;
}

function normalizeScreenshotAssessments(raw: unknown, screenshotCount: number): ScreenshotAssessment[] {
  if (!Array.isArray(raw)) return [];

  const out: ScreenshotAssessment[] = [];
  for (const item of raw) {
    const row = item as Partial<ScreenshotAssessment>;
    const index = typeof row.index === "number" ? row.index : -1;
    if (index < 0 || index >= screenshotCount) continue;

    out.push({
      index,
      rating: normalizeScreenshotRating(row.rating) || "usable",
      issues: Array.isArray(row.issues) ? row.issues.map((i) => String(i).trim()).filter(Boolean) : [],
      retakeGuidance: String(row.retakeGuidance || "").trim() || undefined,
      description: String(row.description || "").trim() || undefined,
    });
  }
  return out;
}

function attachAssessmentToSlides(
  slides: StoreSlidePlan[],
  assessments: ScreenshotAssessment[],
): StoreSlidePlan[] {
  if (!assessments.length) return slides;

  return slides.map((slide) => {
    if (slide.screenshotIndex === null) return slide;
    const assessment = assessments.find((a) => a.index === slide.screenshotIndex);
    if (!assessment) return slide;

    return {
      ...slide,
      screenshotRating: assessment.rating,
      screenshotIssues: assessment.issues,
      retakeGuidance: assessment.retakeGuidance,
    };
  });
}

function normalizeStrategyBrief(raw: Partial<StrategyBrief>, profile: AppProfile, screenshotCount: number): StrategyBrief {
  const fallback = buildFallbackStoreStrategy(profile, screenshotCount);
  const slides = Array.isArray(raw.slides) ? raw.slides.slice(0, STORE_SLIDE_COUNT) : [];
  const backgroundScenes = normalizeBackgroundScenes(raw.backgroundScenes, profile);

  while (slides.length < STORE_SLIDE_COUNT) {
    slides.push(fallback.slides[slides.length]);
  }

  const screenshotAssessments = normalizeScreenshotAssessments(raw.screenshotAssessments, screenshotCount);

  const normalizedSlides = slides.map((slide, index) =>
    normalizeSlide(slide, index, screenshotCount, fallback.slides[index], profile, backgroundScenes),
  );

  const withScreenshots = assignUniqueScreenshots(
    attachAssessmentToSlides(normalizedSlides, screenshotAssessments),
    screenshotCount,
    screenshotAssessments,
  );

  const brief: StrategyBrief = {
    positioning: String(raw.positioning || fallback.positioning).trim(),
    primaryMessage: String(raw.primaryMessage || fallback.primaryMessage).trim(),
    targetAudience: String(raw.targetAudience || fallback.targetAudience).trim(),
    narrativeArc: String(raw.narrativeArc || fallback.narrativeArc).trim(),
    designSystem: String(raw.designSystem || fallback.designSystem).trim(),
    visualTheme: String(raw.visualTheme || fallback.visualTheme).trim(),
    accentColor: String(raw.accentColor || fallback.accentColor).trim(),
    brandColor: String(raw.brandColor || raw.accentColor || fallback.brandColor).trim(),
    setMode:
      raw.setMode === "solid" || raw.setMode === "hybrid"
        ? raw.setMode
        : "lifestyle",
    styleAnchorSlide: typeof raw.styleAnchorSlide === "number" ? raw.styleAnchorSlide : 1,
    screenshotAssessments,
    backgroundScenes,
    slides: withScreenshots,
  };

  return applyCreativeDirectorDefaults(brief, profile);
}

export async function generateStrategyBrief(
  profile: AppProfile,
  images: StrategyImageInput[],
): Promise<StrategyBrief> {
  const apiKey = getOpenAIKey();
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const screenshotCount = images.length;

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
  > = [
    {
      type: "text",
      text: buildAsoStrategyPromptBlock(profile, screenshotCount),
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
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You are a senior App Store Optimization (ASO) strategist and creative director.",
              "You design 5-slide screenshot sets that convert browsers into installers.",
              "Every set tells ONE cohesive story with varied slides — never clone the same layout/copy, never feel like random unrelated ads.",
              "Headlines are benefit-first, short, and unique per slide.",
              "Match uploaded screenshots to the slide where they best prove the message.",
              "As creative director, decide deliberately which backgrounds include people, which are environment-only, which are abstract brand worlds, and which slides reuse the same generated background.",
              "Rate each uploaded screenshot great, usable, or retake with specific issues. Split every headline into headlineVerb (action verb) and headlineDescriptor (benefit words), both uppercase.",
            ].join(" "),
          },
          {
            role: "user",
            content: userContent,
          },
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
      throw new Error("Strategy model returned empty content.");
    }

    return normalizeStrategyBrief(JSON.parse(content) as Partial<StrategyBrief>, profile, screenshotCount);
  } catch {
    return applyCreativeDirectorDefaults(buildFallbackStoreStrategy(profile, screenshotCount), profile);
  }
}
