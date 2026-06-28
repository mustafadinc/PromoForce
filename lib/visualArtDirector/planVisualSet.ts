import type { StrategyBrief } from "@/lib/campaignTypes";
import {
  buildBackgroundSceneDescription,
  planSlideBackground,
  resolveSetModeFromPlans,
} from "@/lib/visualArtDirector/backgroundPlanner";
import {
  mergeRecommendations,
  scoreSetVariety,
  scoreSlideComposition,
  RETAKE_THRESHOLDS,
} from "@/lib/visualArtDirector/compositionScore";
import { planSlideMockup } from "@/lib/visualArtDirector/mockupPlanner";
import type { PlanVisualSetInput, SlideVisualPlan, VisualSetPlan } from "@/lib/visualArtDirector/types";

export function planVisualSet(input: PlanVisualSetInput): VisualSetPlan {
  const { brief, intelligence = brief.screenshotIntelligence ?? [], colorProfile = brief.colorProfile } = input;
  const accentColor = brief.accentColor || brief.brandColor;

  const slidePlans: SlideVisualPlan[] = brief.slides.map((slide) => {
    const mockup = planSlideMockup(slide, intelligence);
    const background = planSlideBackground(
      slide,
      colorProfile,
      intelligence,
      mockup.productFirst,
      accentColor,
    );

    const partial: Omit<SlideVisualPlan, "scores" | "retakeRequired" | "retakeReasons"> = {
      slideNumber: slide.slideNumber,
      asoBeat: slide.asoBeat,
      mockupPose: mockup.mockupPose,
      mockupAssetId: mockup.mockupAssetId,
      angleClass: mockup.angleClass,
      phoneHeightRatio: mockup.phoneHeightRatio,
      productFirst: mockup.productFirst,
      backgroundTreatment: background.backgroundTreatment,
      backgroundStyle: background.backgroundStyle,
      layoutStyle: background.layoutStyle,
      setMode: background.setMode,
      useSceneMockup: mockup.useSceneMockup,
      recommendations: mergeRecommendations(mockup.recommendations, background.recommendations),
      rationale: [background.backgroundRationale],
    };

    const { scores, retakeRequired, retakeReasons } = scoreSlideComposition({
      slide,
      plan: partial,
      intelligence,
      colorProfile,
    });

    return {
      ...partial,
      scores,
      retakeRequired,
      retakeReasons,
    };
  });

  const { setVarietyScore, issues } = scoreSetVariety(slidePlans);
  for (const plan of slidePlans) {
    plan.scores.setVariety = setVarietyScore;
    if (setVarietyScore < RETAKE_THRESHOLDS.setVariety) {
      for (const issue of issues) {
        if (!plan.retakeReasons.includes(issue)) plan.retakeReasons.push(issue);
      }
      plan.retakeRequired = true;
    }
  }

  const brandAccentRole =
    colorProfile?.uiTone === "dark"
      ? ("accent" as const)
      : colorProfile?.uiTone === "light"
        ? ("balanced" as const)
        : ("accent" as const);

  const backgroundPlans = slidePlans.map((p) => ({
    backgroundTreatment: p.backgroundTreatment,
    backgroundStyle: p.backgroundStyle,
    setMode: p.setMode,
    layoutStyle: p.layoutStyle,
    backgroundRationale: p.rationale[0] ?? "",
    recommendations: p.recommendations.filter((r) => r.field === "background") as Array<{
      field: "background";
      recommended: string;
      rationale: string;
      avoid?: string;
    }>,
  }));

  return {
    slides: slidePlans,
    setMode: resolveSetModeFromPlans(backgroundPlans),
    setVarietyScore,
    setVarietyIssues: setVarietyScore < RETAKE_THRESHOLDS.setVariety ? issues : [],
    brandAccentRole,
  };
}

export function getSlideVisualPlan(
  brief: StrategyBrief,
  slideNumber: number,
): SlideVisualPlan | undefined {
  return brief.visualCompositionPlan?.slides.find((s) => s.slideNumber === slideNumber);
}

export function backgroundPromptFromVisualPlan(
  plan: SlideVisualPlan,
  accentColor: string,
  brandColor: string,
): string {
  return buildBackgroundSceneDescription(plan.backgroundStyle, accentColor, brandColor);
}
