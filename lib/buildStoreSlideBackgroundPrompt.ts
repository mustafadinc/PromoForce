import type { AppProfile, BackgroundTreatment, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { buildScreenshotColorHarmonyBlock } from "@/lib/applyScreenshotColorHarmony";
import {
  backgroundPromptAestheticsBlock,
  backgroundPromptBannedAestheticsBlock,
  backgroundPromptCompositionBlock,
  backgroundPromptExclusionsBlock,
  backgroundPromptQualityBlock,
} from "@/lib/buildBackgroundPromptShared";
import { getAppStoreGenerationSize } from "@/lib/appStoreImageSizes";
import {
  appendPlacementToSceneDescription,
  placementAwarePersonTreatment,
} from "@/lib/mockupKeepOutZone";
import { normalizeMockupPose, resolveMockupPlacement, type MockupPose } from "@/lib/mockupPose";
import { resolveBackgroundScene } from "@/lib/storeCreativeDirector";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";
import { backgroundPromptFromVisualPlan, getSlideVisualPlan } from "@/lib/visualArtDirector/planVisualSet";

const treatmentPrompts: Record<BackgroundTreatment, string> = {
  lifestyle_with_person:
    "Include ONE person naturally in the scene (side profile, over-shoulder, or soft silhouette). Person supports focus/productivity mood — NOT looking at camera, NOT holding a phone. Cinematic editorial portrait quality.",
  lifestyle_environment:
    "NO people, NO faces, NO hands. Environment-only scene: desk, workspace, nature path, or interior atmosphere. Props and lighting tell the story.",
  abstract_brand:
    "Premium abstract brand world for CTA/accent slides ONLY: restrained gradient depth, soft light rays — NO people. NO neon grids, rings, or particle tunnels.",
  cta_brand:
    "Premium download CTA atmosphere: cinematic brand gradient depth, soft light rays, subtle energy particles in accent color. NO people. This is a BACKGROUND PLATE ONLY — never a finished marketing poster.",
};

const ctaBackgroundExclusions = [
  "CTA SLIDE — CRITICAL:",
  "- Do NOT render ANY text, headlines, subheadlines, app names, download buttons, CTAs, star ratings, badges, laurels, shields, or UI chrome.",
  "- Do NOT duplicate marketing copy that will be added in post-production.",
  "- Upper 55% must stay clean and uncluttered for large typography overlay.",
].join("\n");

export function buildStoreSlideBackgroundPrompt(
  profile: AppProfile,
  strategy: StrategyBrief,
  slide: StoreSlidePlan,
  options?: { styleAnchorHint?: string; mockupPose?: MockupPose },
) {
  const beatLabel = storeSlideBeatMeta[slide.asoBeat].label;
  const sizeLabel = getAppStoreGenerationSize().replace("x", "×");
  const scene = resolveBackgroundScene(strategy, slide);
  const treatment = scene?.treatment || slide.backgroundTreatment;
  const isCtaSlide = slide.asoBeat === "download_cta";
  const usesScreenshot = slide.screenshotUsage !== "none" && !isCtaSlide;
  const mockupPose = normalizeMockupPose(options?.mockupPose ?? slide.mockupPose, slide.slideNumber);
  const resolvedPlacement = resolveMockupPlacement(mockupPose);
  const visualPlan = getSlideVisualPlan(strategy, slide.slideNumber);

  const rawSceneDescription =
    scene?.sceneDescription ||
    (visualPlan ? backgroundPromptFromVisualPlan(visualPlan, strategy.accentColor, strategy.brandColor) : null) ||
    slide.visualVariant ||
    slide.backgroundRationale ||
    storeSlideBeatMeta[slide.asoBeat].visualVariantHint;

  const sceneDescription = usesScreenshot
    ? appendPlacementToSceneDescription(rawSceneDescription, { ...mockupPose, placement: resolvedPlacement })
    : rawSceneDescription;

  const treatmentLine = placementAwarePersonTreatment(treatmentPrompts[treatment], {
    ...mockupPose,
    placement: resolvedPlacement,
  });

  return [
    `Premium App Store BACKGROUND ONLY. Portrait ${sizeLabel}. ChatGPT Images 2.0 editorial quality.`,
    "",
    backgroundPromptExclusionsBlock(),
    isCtaSlide ? ctaBackgroundExclusions : "",
    "",
    `App: "${profile.appName}" (${profile.category}). Audience: ${profile.targetAudience || "mobile users"}.`,
    strategy.locale ? `Market locale: ${strategy.locale} — visuals should feel native to this market.` : "",
    `Slide ${slide.slideNumber}/5 — ${beatLabel}. Message context: "${slide.headline}".`,
    slide.keywordTheme ? `ASO keyword theme for this slide: "${slide.keywordTheme}" (context only — no text in image).` : "",
    scene ? `Background scene "${scene.label}" (shared by slides ${scene.sharedBySlides.join(", ")}).` : "",
    slide.backgroundRationale ? `Creative rationale: ${slide.backgroundRationale}` : "",
    visualPlan
      ? [
          "VISUAL ART DIRECTION (product-first — mockup is the hero, not decoration):",
          `Background style: ${visualPlan.backgroundStyle.replace(/_/g, " ")}.`,
          visualPlan.productFirst ? "Product-first slide — background stays secondary to phone UI." : "",
          visualPlan.rationale[0] ? `Art director note: ${visualPlan.rationale[0]}` : "",
          slide.backgroundFillColor
            ? `When rendered as solid fill, use ${slide.backgroundFillColor} — brand accent ${strategy.accentColor} as highlight only.`
            : `Brand accent ${strategy.accentColor} as subtle highlight — avoid flat monochrome ${strategy.brandColor} on every slide.`,
          visualPlan.recommendations.find((r) => r.field === "background" && r.avoid)
            ? `Avoid: ${visualPlan.recommendations.find((r) => r.field === "background")?.avoid}`
            : "",
        ].filter(Boolean).join("\n")
      : "",
    options?.styleAnchorHint && slide.slideNumber !== strategy.styleAnchorSlide
      ? `Match visual polish, color grade, and photoshoot mood of style anchor slide ${strategy.styleAnchorSlide}: ${options.styleAnchorHint}. Same brand world — not a different aesthetic.`
      : slide.slideNumber > 1 && slide.slideNumber <= 4
        ? `Maintain set cohesion with style anchor slide ${strategy.styleAnchorSlide || 1} — same color grade and photoshoot family.`
        : "",
    "",
    backgroundPromptBannedAestheticsBlock(),
    "",
    "TREATMENT:",
    treatmentLine,
    "",
    "SCENE DESCRIPTION:",
    sceneDescription,
    "",
    backgroundPromptQualityBlock(strategy.colorProfile),
    "",
    backgroundPromptAestheticsBlock(strategy.accentColor, strategy.brandColor),
    "",
    buildScreenshotColorHarmonyBlock(strategy.colorProfile),
    "",
    "BRAND WORLD (consistent across set):",
    strategy.designSystem,
    strategy.visualTheme,
    `Accent color: ${strategy.accentColor}`,
    strategy.brandColor ? `Secondary / gradient end: ${strategy.brandColor}` : "",
    "",
    backgroundPromptCompositionBlock(usesScreenshot, mockupPose),
    "",
    "Avoid generic stock aesthetics and AI slop. Scene must feel intentional, human-crafted, and premium.",
    "CRITICAL: No flat gray, white, or empty backgrounds. Use rich but controlled color, depth, and environmental detail.",
  ]
    .filter(Boolean)
    .join("\n");
}
