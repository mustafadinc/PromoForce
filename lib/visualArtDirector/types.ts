import type {
  SetMode,
  ScreenshotColorProfile,
  ScreenshotIntelligence,
  StoreSlidePlan,
  StrategyBrief,
  SlideVisualPlan,
  VisualBackgroundStyle,
  VisualCompositionScores,
  VisualRecommendation,
  VisualSetPlan,
} from "@/lib/campaignTypes";
import type { MockupAngleClass } from "@/lib/visualArtDirector/mockupAngle";

export type {
  VisualBackgroundStyle,
  VisualCompositionScores,
  VisualRecommendation,
  SlideVisualPlan,
  VisualSetPlan,
};

export type { MockupAngleClass };

export type PlanVisualSetInput = {
  brief: StrategyBrief;
  intelligence?: ScreenshotIntelligence[];
  colorProfile?: ScreenshotColorProfile | null;
};

export function getSlideIntelligence(
  slide: StoreSlidePlan,
  intelligence: ScreenshotIntelligence[] = [],
): ScreenshotIntelligence | null {
  if (slide.screenshotIndex === null) return null;
  return intelligence.find((row) => row.index === slide.screenshotIndex) ?? null;
}
