import type { StoreSlidePlan } from "@/lib/campaignTypes";
import type { MockupPose } from "@/lib/mockupPose";
import { analyzeScreenSignals } from "@/lib/visualArtDirector/screenSignals";
import type {
  SlideVisualPlan,
  VisualBackgroundStyle,
  VisualCompositionScores,
  VisualRecommendation,
} from "@/lib/visualArtDirector/types";
import { getSlideIntelligence } from "@/lib/visualArtDirector/types";
import type { ScreenshotColorProfile, ScreenshotIntelligence } from "@/lib/campaignTypes";

const RETAKE_THRESHOLDS = {
  mockupReadability: 80,
  textReadability: 85,
  backgroundSupport: 75,
  phoneCropSafety: 85,
  setVariety: 70,
  visualAppeal: 75,
};

function scoreOrientationReadability(orientation: MockupPose["orientation"], scale: MockupPose["scale"]): number {
  let score = 90;
  if (orientation === "tilt_left" || orientation === "tilt_right") score -= 12;
  if (orientation === "showcase_upright") score -= 4;
  if (scale === "hero" && (orientation === "tilt_left" || orientation === "tilt_right")) score -= 10;
  if (scale === "compact") score -= 15;
  return Math.max(40, score);
}

function scoreTextReadability(slide: StoreSlidePlan): number {
  const headlineWords = slide.headline.trim().split(/\s+/).length;
  const subWords = slide.subheadline.trim().split(/\s+/).length;
  let score = 92;
  if (headlineWords > 8) score -= 18;
  else if (headlineWords > 6) score -= 8;
  if (subWords > 14) score -= 12;
  else if (subWords > 10) score -= 6;
  if (slide.headline.length > 42) score -= 10;
  return Math.max(50, score);
}

function scoreBackgroundSupport(
  uiTone: ScreenshotColorProfile["uiTone"] | "unknown",
  style: VisualBackgroundStyle,
): number {
  if (uiTone === "dark") {
    if (style === "soft_light_gradient" || style === "light_mist" || style === "minimal_studio") return 92;
    if (style === "premium_dark_gradient") return 58;
    if (style === "solid_brand_accent") return 65;
    return 78;
  }
  if (uiTone === "light") {
    if (style === "premium_dark_gradient" || style === "soft_light_gradient") return 88;
    return 75;
  }
  return 80;
}

function scoreCropSafety(pose: MockupPose, phoneHeightRatio: number): number {
  let score = 88;
  if (pose.placement !== "center") score -= 4;
  if (phoneHeightRatio > 0.68) score -= 8;
  if (pose.scale === "hero" && (pose.orientation === "tilt_left" || pose.orientation === "tilt_right")) {
    score -= 12;
  }
  return Math.max(50, score);
}

function scoreThumbnail(headlineScore: number, mockupScore: number, productFirst: boolean): number {
  const base = productFirst ? mockupScore * 0.55 + headlineScore * 0.45 : mockupScore * 0.4 + headlineScore * 0.6;
  return Math.round(Math.min(100, base));
}

export function scoreSlideComposition(input: {
  slide: StoreSlidePlan;
  plan: Omit<SlideVisualPlan, "scores" | "retakeRequired" | "retakeReasons">;
  intelligence?: ScreenshotIntelligence[];
  colorProfile?: ScreenshotColorProfile | null;
}): { scores: VisualCompositionScores; retakeRequired: boolean; retakeReasons: string[] } {
  const { slide, plan, intelligence = [], colorProfile } = input;
  const intel = getSlideIntelligence(slide, intelligence);
  const signals = analyzeScreenSignals(intel);
  const uiTone = colorProfile?.uiTone ?? "mixed";

  const mockupReadability = plan.useSceneMockup
    ? scoreOrientationReadability("upright", plan.mockupPose.scale) + 4
    : scoreOrientationReadability(plan.mockupPose.orientation, plan.mockupPose.scale);

  const textReadability = scoreTextReadability(slide);
  const backgroundSupport = scoreBackgroundSupport(uiTone, plan.backgroundStyle);
  const phoneCropSafety = scoreCropSafety(plan.mockupPose, plan.phoneHeightRatio);
  const mockupComposition = Math.round(
    (mockupReadability + phoneCropSafety + (plan.productFirst ? 8 : 0)) / (plan.productFirst ? 1.08 : 1),
  );
  const visualAppeal = Math.round(mockupComposition * 0.45 + backgroundSupport * 0.35 + textReadability * 0.2);
  const brandHarmony = backgroundSupport;
  const thumbnailClarity = scoreThumbnail(textReadability, mockupReadability, plan.productFirst);

  const scores: VisualCompositionScores = {
    mockupReadability,
    mockupComposition,
    visualAppeal,
    textReadability,
    backgroundSupport,
    brandHarmony,
    thumbnailClarity,
    phoneCropSafety,
  };

  const retakeReasons: string[] = [];

  if (signals.isRetake) {
    retakeReasons.push(intel?.retakeGuidance || "Screenshot rated retake — capture a richer, clearer screen.");
  }
  if (mockupReadability < RETAKE_THRESHOLDS.mockupReadability) {
    retakeReasons.push("Phone is too angled; switch to front or slight 3D mockup.");
  }
  if (textReadability < RETAKE_THRESHOLDS.textReadability) {
    retakeReasons.push("Headline too long for readable App Store layout — shorten or split lines.");
  }
  if (backgroundSupport < RETAKE_THRESHOLDS.backgroundSupport) {
    retakeReasons.push(
      uiTone === "dark"
        ? "Background too dark for dark UI — use lighter gradient or minimal studio."
        : "Background contrast too low — adjust palette for separation.",
    );
  }
  if (phoneCropSafety < RETAKE_THRESHOLDS.phoneCropSafety) {
    retakeReasons.push("UI may be cropped — reduce mockup size or use centered front mockup.");
  }
  if (visualAppeal < RETAKE_THRESHOLDS.visualAppeal && !plan.useSceneMockup) {
    retakeReasons.push("Composition feels decorative — increase product-first mockup size and clarity.");
  }
  if (signals.needsDetailReadability && (plan.mockupPose.orientation === "tilt_left" || plan.mockupPose.orientation === "tilt_right")) {
    retakeReasons.push("Small UI text detected — use front-facing mockup for this screen.");
  }

  const retakeRequired = retakeReasons.length > 0 && (signals.isRetake || mockupReadability < 75 || phoneCropSafety < 80);

  return { scores, retakeRequired, retakeReasons };
}

export function scoreSetVariety(plans: SlideVisualPlan[]): {
  setVarietyScore: number;
  issues: string[];
} {
  const withMockup = plans.filter((p) => p.mockupAssetId || p.mockupPose);
  const orientations = new Set(withMockup.map((p) => p.mockupPose.orientation));
  const placements = new Set(withMockup.map((p) => p.mockupPose.placement));
  const backgrounds = new Set(plans.map((p) => p.backgroundStyle));
  const scales = new Set(withMockup.map((p) => p.mockupPose.scale));
  const assets = new Set(withMockup.map((p) => p.mockupAssetId).filter(Boolean));

  let score = 70;
  if (orientations.size >= 2) score += 8;
  if (orientations.size >= 3) score += 4;
  if (placements.size >= 2) score += 6;
  if (backgrounds.size >= 3) score += 10;
  if (backgrounds.size >= 4) score += 5;
  if (scales.size >= 2) score += 5;
  if (assets.size >= 3) score += 8;

  const issues: string[] = [];
  if (orientations.size < 2) issues.push("All slides use similar mockup angle — vary slides 3–4 with front mockups.");
  if (backgrounds.size < 3) issues.push("Background palette too repetitive — alternate light gradients and studio plates.");
  if (scales.size < 2) issues.push("Mockup sizes too uniform — hero on slide 1, medium on feature slides.");
  if (withMockup.every((p) => p.mockupPose.placement === withMockup[0]?.mockupPose.placement)) {
    issues.push("Mockup position never shifts — alternate center vs offset on 3D slides.");
  }

  score = Math.min(100, score - issues.length * 4);

  return { setVarietyScore: score, issues };
}

export function mergeRecommendations(...groups: VisualRecommendation[][]): VisualRecommendation[] {
  const seen = new Set<string>();
  const out: VisualRecommendation[] = [];
  for (const group of groups) {
    for (const rec of group) {
      const key = `${rec.field}:${rec.recommended}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(rec);
    }
  }
  return out;
}

export { RETAKE_THRESHOLDS };
