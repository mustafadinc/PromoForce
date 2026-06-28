export type {
  MockupAngleClass,
  PlanVisualSetInput,
  SlideVisualPlan,
  VisualBackgroundStyle,
  VisualCompositionScores,
  VisualRecommendation,
  VisualSetPlan,
} from "@/lib/visualArtDirector/types";
export { analyzeScreenSignals } from "@/lib/visualArtDirector/screenSignals";
export { planSlideMockup } from "@/lib/visualArtDirector/mockupPlanner";
export { planSlideBackground, buildBackgroundSceneDescription } from "@/lib/visualArtDirector/backgroundPlanner";
export {
  scoreSlideComposition,
  scoreSetVariety,
  mergeRecommendations,
  RETAKE_THRESHOLDS,
} from "@/lib/visualArtDirector/compositionScore";
export {
  planVisualSet,
  getSlideVisualPlan,
  backgroundPromptFromVisualPlan,
} from "@/lib/visualArtDirector/planVisualSet";
export { applyVisualPlan } from "@/lib/visualArtDirector/applyVisualPlan";
