import type { AppProfile, BackgroundTreatment, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { buildScreenshotColorHarmonyBlock } from "@/lib/applyScreenshotColorHarmony";
import {
  backgroundPromptCompositionBlock,
  backgroundPromptExclusionsBlock,
  backgroundPromptQualityBlock,
} from "@/lib/buildBackgroundPromptShared";
import { getAppStoreGenerationSize } from "@/lib/appStoreImageSizes";
import { resolveBackgroundScene } from "@/lib/storeCreativeDirector";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

const treatmentPrompts: Record<BackgroundTreatment, string> = {
  lifestyle_with_person:
    "Include ONE person naturally in the scene (side profile, over-shoulder, or soft silhouette). Person supports focus/productivity mood — NOT looking at camera, NOT holding a phone. Cinematic editorial portrait quality.",
  lifestyle_environment:
    "NO people, NO faces, NO hands. Environment-only scene: desk, workspace, nature path, or interior atmosphere. Props and lighting tell the story.",
  abstract_brand:
    "Premium abstract brand world: glowing neon arcs, soft particles, dark cinematic space, subtle depth — inspired by top App Store hero packs. NO people. NO random unrelated objects (zen stones, mountains, water ripples).",
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
  options?: { styleAnchorHint?: string },
) {
  const beatLabel = storeSlideBeatMeta[slide.asoBeat].label;
  const sizeLabel = getAppStoreGenerationSize().replace("x", "×");
  const scene = resolveBackgroundScene(strategy, slide);
  const treatment = scene?.treatment || slide.backgroundTreatment;
  const isCtaSlide = slide.asoBeat === "download_cta";

  const sceneDescription =
    scene?.sceneDescription || slide.visualVariant || slide.backgroundRationale || storeSlideBeatMeta[slide.asoBeat].visualVariantHint;

  return [
    `Premium App Store BACKGROUND ONLY. Portrait ${sizeLabel}. ChatGPT Images 2.0 editorial quality.`,
    "",
    backgroundPromptExclusionsBlock(),
    isCtaSlide ? ctaBackgroundExclusions : "",
    "",
    `App: "${profile.appName}" (${profile.category}). Audience: ${profile.targetAudience || "mobile users"}.`,
    `Slide ${slide.slideNumber}/5 — ${beatLabel}. Message context: "${slide.headline}".`,
    scene ? `Background scene "${scene.label}" (shared by slides ${scene.sharedBySlides.join(", ")}).` : "",
    slide.backgroundRationale ? `Creative rationale: ${slide.backgroundRationale}` : "",
    options?.styleAnchorHint && slide.slideNumber !== strategy.styleAnchorSlide
      ? `Match visual polish and mood of style anchor slide ${strategy.styleAnchorSlide}: ${options.styleAnchorHint}`
      : "",
    "",
    "TREATMENT:",
    treatmentPrompts[treatment],
    "",
    "SCENE DESCRIPTION:",
    sceneDescription,
    "",
    backgroundPromptQualityBlock(strategy.colorProfile),
    "",
    buildScreenshotColorHarmonyBlock(strategy.colorProfile),
    "",
    "BRAND WORLD (consistent across set):",
    strategy.designSystem,
    strategy.visualTheme,
    `Accent color: ${strategy.accentColor}`,
    strategy.brandColor ? `Secondary / gradient end: ${strategy.brandColor}` : "",
    "",
    backgroundPromptCompositionBlock(!isCtaSlide),
    "",
    "Avoid generic stock aesthetics. Scene must feel intentional and premium for this app category.",
    "CRITICAL: No flat gray, white, or empty backgrounds. Use rich color, depth, and environmental detail.",
  ]
    .filter(Boolean)
    .join("\n");
}
