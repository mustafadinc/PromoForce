import { applyScreenshotColorHarmonyToStoreBrief } from "@/lib/applyScreenshotColorHarmony";
import {
  STORE_SLIDE_COUNT,
  type AppProfile,
  type ScreenshotColorProfile,
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
import { coerceStrategyText } from "@/lib/strategyText";
import type { StrategyImageInput } from "@/lib/strategyImageUtils";
import type { ScreenshotIntelligence } from "@/lib/campaignTypes";
import {
  attachScreenshotIntelligence,
  formatScreenshotIntelligenceForPrompt,
} from "@/lib/screenshotIntelligenceFormat";
import { normalizeMockupPose } from "@/lib/mockupPose";
import { mockupAssetForSlide, normalizeMockupAssetId } from "@/lib/assetMockup";
import { alignStoreStrategyToIntelligence } from "@/lib/syncSlideToScreenshot";
import { DEFAULT_LOCALE, getLocaleDefinition, localeExpertPrompt, type LocaleCode } from "@/lib/locales";

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
  locale: LocaleCode,
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
  const headlines = normalizeHeadlineFields(
    {
      headline: String(raw.headline || fallbackSlide.headline),
      headlineVerb: raw.headlineVerb,
      headlineDescriptor: raw.headlineDescriptor,
      subheadline: raw.subheadline,
      keywordTheme: raw.keywordTheme,
      asoBeat,
    },
    locale,
  );

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
    keywordTheme: String(raw.keywordTheme || "").trim() || undefined,
    showSocialProof: asoBeat === "social_proof" || Boolean(raw.showSocialProof),
    mockupPose:
      screenshotUsage === "none"
        ? undefined
        : normalizeMockupPose(raw.mockupPose, slideNumber),
    mockupAssetId:
      screenshotUsage === "none"
        ? undefined
        : raw.mockupAssetId
          ? normalizeMockupAssetId(raw.mockupAssetId)
          : mockupAssetForSlide(slideNumber),
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

function normalizeStrategyBrief(
  raw: Partial<StrategyBrief>,
  profile: AppProfile,
  screenshotCount: number,
  locale: LocaleCode = DEFAULT_LOCALE,
): StrategyBrief {
  const slideCount = profile.slideCount ?? 5;
  const fallback = buildFallbackStoreStrategy(profile, screenshotCount);
  const slides = Array.isArray(raw.slides) ? raw.slides.slice(0, slideCount) : [];
  const backgroundScenes = normalizeBackgroundScenes(raw.backgroundScenes, profile);

  while (slides.length < slideCount) {
    slides.push(fallback.slides[slides.length]);
  }

  const screenshotAssessments = normalizeScreenshotAssessments(raw.screenshotAssessments, screenshotCount);

  const normalizedSlides = slides.map((slide, index) =>
    normalizeSlide(slide, index, screenshotCount, fallback.slides[index], profile, backgroundScenes, locale),
  );

  const withScreenshots = assignUniqueScreenshots(
    attachAssessmentToSlides(normalizedSlides, screenshotAssessments),
    screenshotCount,
    screenshotAssessments,
  );

  const brief: StrategyBrief = {
    locale,
    positioning: String(raw.positioning || fallback.positioning).trim(),
    primaryMessage: String(raw.primaryMessage || fallback.primaryMessage).trim(),
    targetAudience: String(raw.targetAudience || fallback.targetAudience).trim(),
    narrativeArc: String(raw.narrativeArc || fallback.narrativeArc).trim(),
    designSystem: String(raw.designSystem || fallback.designSystem).trim(),
    visualTheme: coerceStrategyText(raw.visualTheme, fallback.visualTheme),
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
  colorProfile: ScreenshotColorProfile | null = null,
  screenshotIntelligence: ScreenshotIntelligence[] = [],
  locale: LocaleCode = profile.locales?.[0] || DEFAULT_LOCALE,
): Promise<StrategyBrief> {
  const apiKey = getOpenAIKey();
  const chatModel = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const screenshotCount = images.length;
  const slideCount = profile.slideCount ?? 5;
  const localeDef = getLocaleDefinition(locale);

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
  > = [
    {
      type: "text",
      text: [
        `TARGET LOCALE: ${localeDef.nativeLabel} (${localeDef.code}). Write ALL copy natively — not a translation.`,
        buildAsoStrategyPromptBlock(profile, screenshotCount),
        screenshotIntelligence.length
          ? formatScreenshotIntelligenceForPrompt(profile, screenshotIntelligence)
          : "",
        colorProfile
          ? [
              "",
              "Screenshot color analysis (backgrounds, accentColor, brandColor, and visualTheme MUST harmonize with this):",
              `- UI tone: ${colorProfile.uiTone}`,
              `- Dominant colors: ${colorProfile.dominantColors.join(", ")}`,
              `- Suggested accent: ${colorProfile.accentColor}`,
              `- Gradient secondary: ${colorProfile.secondaryColor}`,
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
        temperature: 0.45,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              localeExpertPrompt(localeDef),
              "You are a senior App Store Optimization (ASO) strategist and creative director.",
              `You design ${slideCount}-slide screenshot sets that convert browsers into installers.`,
              slideCount === 5
                ? "Every set tells ONE cohesive story: slide 1 pain/desire → slide 2 relief → slides 3–4 proof → slide 5 CTA recap."
                : `Every set tells ONE cohesive story: slide 1 is the hook (pain/desire), slides 2 to ${slideCount - 1} are features/proof, and slide ${slideCount} is the CTA recap.`,
              `Never use CTA verbs on slide 1 hook. Slide ${slideCount} must recap benefits from earlier slides.`,
              "Headlines are benefit-first, 3–6 words, one keyword theme per slide (Apple OCR-indexes caption text).",
              "Do NOT repeat the same VERB+DESCRIPTOR headline template on every slide.",
              "featureHighlights and all copy must be in the target locale language.",
              "Match uploaded screenshots to the slide where they best prove the message.",
              "Prefer lifestyle_with_person or lifestyle_environment backgrounds — reserve abstract_brand for CTA only.",
              `For each screenshot slide (1–${slideCount - 1}), mockupPose should use tilt_left or tilt_right, or showcase_upright when a straight premium 3D device is better. Avoid plain upright unless the user explicitly wants a flat front frame. Use placement auto or explicit left/right. sceneDescription must place people on the opposite side from the device.`,
              "Rate each uploaded screenshot great, usable, or retake with specific issues. Split every headline into headlineVerb and headlineDescriptor when appropriate for the locale.",
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

    return alignStoreStrategyToIntelligence(
      attachScreenshotIntelligence(
        applyScreenshotColorHarmonyToStoreBrief(
          normalizeStrategyBrief(JSON.parse(content) as Partial<StrategyBrief>, profile, screenshotCount, locale),
          colorProfile,
        ),
        screenshotIntelligence,
      ),
      profile,
    );
  } catch {
    const fallbackBrief = alignStoreStrategyToIntelligence(
      attachScreenshotIntelligence(
        applyScreenshotColorHarmonyToStoreBrief(
          applyCreativeDirectorDefaults(buildFallbackStoreStrategy(profile, screenshotCount), profile),
          colorProfile,
        ),
        screenshotIntelligence,
      ),
      profile,
    );
    return { ...fallbackBrief, locale };
  }
}

export async function generateMultiLocaleStrategyBriefs(
  profile: AppProfile,
  localeContexts: Partial<
    Record<
      LocaleCode,
      {
        colorProfile: import("@/lib/campaignTypes").ScreenshotColorProfile | null;
        screenshotIntelligence: ScreenshotIntelligence[];
        images: StrategyImageInput[];
      }
    >
  >,
) {
  const locales = profile.locales?.length ? profile.locales : [DEFAULT_LOCALE];
  const strategies: Partial<Record<LocaleCode, StrategyBrief>> = {};
  let combinedIntelligence: ScreenshotIntelligence[] = [];

  for (const locale of locales) {
    const ctx = localeContexts[locale];
    if (!ctx?.images.length) continue;

    const brief = await generateStrategyBrief(
      profile,
      ctx.images,
      ctx.colorProfile,
      ctx.screenshotIntelligence,
      locale,
    );
    strategies[locale] = brief;
    combinedIntelligence = [...combinedIntelligence, ...ctx.screenshotIntelligence];
  }

  const primaryLocale = locales.find((l) => strategies[l]) || locales[0] || DEFAULT_LOCALE;
  return {
    strategies,
    primaryLocale,
    strategy: strategies[primaryLocale]!,
    screenshotIntelligence: combinedIntelligence,
  };
}
