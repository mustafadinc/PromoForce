import type { AppProfile, BackgroundScene, StrategyBrief } from "@/lib/campaignTypes";
import { buildSolidBackgroundScene } from "@/lib/storeCreativeDirector";
import { backgroundPromptFromVisualPlan, planVisualSet } from "@/lib/visualArtDirector/planVisualSet";
import type { VisualBackgroundStyle } from "@/lib/visualArtDirector/types";

const LIGHT_BACKGROUND_FILLS: Partial<Record<VisualBackgroundStyle, string>> = {
  soft_light_gradient: "#e4eaf2",
  light_mist: "#dfe8f3",
  minimal_studio: "#ebecee",
  neutral_desk: "#e8e4df",
};

export function backgroundFillForStyle(style: VisualBackgroundStyle, brandColor: string): string {
  return LIGHT_BACKGROUND_FILLS[style] ?? brandColor;
}

const STYLE_SCENE_ID: Record<VisualBackgroundStyle, string> = {
  soft_light_gradient: "vad-light-gradient",
  light_mist: "vad-light-mist",
  minimal_studio: "vad-minimal-studio",
  neutral_desk: "vad-neutral-desk",
  premium_dark_gradient: "vad-dark-gradient",
  subtle_lifestyle: "vad-subtle-lifestyle",
  abstract_glass: "vad-abstract-glass",
  solid_brand_accent: "solid-brand-set",
};

function buildVisualBackgroundScenes(brief: StrategyBrief, profile: AppProfile): BackgroundScene[] {
  const visualPlan = brief.visualCompositionPlan;
  if (!visualPlan) return brief.backgroundScenes;

  const brandColor = brief.brandColor || brief.accentColor;
  const sceneMap = new Map<string, BackgroundScene>();

  for (const slidePlan of visualPlan.slides) {
    const id = STYLE_SCENE_ID[slidePlan.backgroundStyle] ?? `vad-slide-${slidePlan.slideNumber}`;
    if (sceneMap.has(id)) {
      const existing = sceneMap.get(id)!;
      if (!existing.sharedBySlides.includes(slidePlan.slideNumber)) {
        existing.sharedBySlides.push(slidePlan.slideNumber);
        existing.sharedBySlides.sort((a, b) => a - b);
      }
      continue;
    }

    const isSolid =
      slidePlan.backgroundStyle === "solid_brand_accent" ||
      slidePlan.backgroundStyle === "soft_light_gradient" ||
      slidePlan.backgroundStyle === "light_mist" ||
      slidePlan.backgroundStyle === "minimal_studio";

    if (isSolid && slidePlan.backgroundStyle === "solid_brand_accent") {
      const solid = buildSolidBackgroundScene(profile, brandColor)[0];
      sceneMap.set(id, { ...solid, sharedBySlides: [slidePlan.slideNumber] });
      continue;
    }

    sceneMap.set(id, {
      id,
      label: slidePlan.backgroundStyle.replace(/_/g, " "),
      treatment: slidePlan.backgroundTreatment,
      sceneDescription: backgroundPromptFromVisualPlan(slidePlan, brief.accentColor, brandColor),
      reuseRationale: slidePlan.rationale[0] ?? "Visual art director — contrast-first background.",
      sharedBySlides: [slidePlan.slideNumber],
    });
  }

  return Array.from(sceneMap.values());
}

export function applyVisualPlan(brief: StrategyBrief, profile: AppProfile): StrategyBrief {
  const visualCompositionPlan = planVisualSet({
    brief,
    intelligence: brief.screenshotIntelligence,
    colorProfile: brief.colorProfile,
  });

  const withPlan: StrategyBrief = {
    ...brief,
    visualCompositionPlan,
    setMode: visualCompositionPlan.setMode,
    designSystem: `${brief.designSystem} Visual art direction: product-first mockups, brand accent as highlight (not flat monochrome), set variety score ${visualCompositionPlan.setVarietyScore}/100.`,
  };

  const backgroundScenes =
    withPlan.setMode === "solid"
      ? buildSolidBackgroundScene(profile, withPlan.brandColor || withPlan.accentColor)
      : buildVisualBackgroundScenes(withPlan, profile);

  const slides = withPlan.slides.map((slide) => {
    const plan = visualCompositionPlan.slides.find((p) => p.slideNumber === slide.slideNumber);
    if (!plan) return slide;

    const sceneId =
      STYLE_SCENE_ID[plan.backgroundStyle] ??
      backgroundScenes.find((s) => s.sharedBySlides.includes(slide.slideNumber))?.id ??
      slide.backgroundSceneId;

    return {
      ...slide,
      mockupPose: slide.screenshotUsage === "none" ? undefined : plan.mockupPose,
      mockupAssetId: slide.screenshotUsage === "none" ? undefined : plan.mockupAssetId,
      backgroundTreatment: plan.backgroundTreatment,
      layoutStyle: plan.layoutStyle,
      backgroundRationale: plan.rationale[0] ?? slide.backgroundRationale,
      backgroundSceneId: sceneId,
      backgroundFillColor: backgroundFillForStyle(plan.backgroundStyle, brief.brandColor || brief.accentColor),
      visualScores: plan.scores,
      visualRetakeRequired: plan.retakeRequired,
      visualRetakeReasons: plan.retakeReasons,
      visualRecommendations: plan.recommendations,
      phoneHeightRatio: plan.phoneHeightRatio,
    };
  });

  return {
    ...withPlan,
    backgroundScenes: backgroundScenes.length ? backgroundScenes : withPlan.backgroundScenes,
    slides,
  };
}
