import type { MockupAssetId } from "@/lib/assetMockup";
import type { MockupOrientation, MockupPlacement, MockupPose, MockupScale } from "@/lib/mockupPose";
import type { StoreSlideBeat, StoreSlidePlan, SlideVisualPlan, ScreenshotIntelligence } from "@/lib/campaignTypes";
import type { MockupAngleClass } from "@/lib/visualArtDirector/mockupAngle";
import { analyzeScreenSignals } from "@/lib/visualArtDirector/screenSignals";
import { getSlideIntelligence } from "@/lib/visualArtDirector/types";

const SCENE_ASSETS: MockupAssetId[] = [
  "iphone-16-md942-01",
  "iphone-16-md942-02",
  "iphone-16-md942-03",
  "iphone-16-md942-04",
  "iphone-16-md942-05",
];

/** Target phone height as fraction of canvas (App Store portrait). */
const PHONE_HEIGHT_BY_BEAT: Record<StoreSlideBeat, [number, number]> = {
  hook: [0.58, 0.68],
  problem_outcome: [0.55, 0.64],
  feature_benefit: [0.55, 0.65],
  social_proof: [0.54, 0.62],
  download_cta: [0.5, 0.58],
};

function scaleFromHeightRatio(ratio: number): MockupScale {
  if (ratio >= 0.64) return "hero";
  if (ratio >= 0.56) return "standard";
  return "compact";
}

function orientationForAngle(
  angleClass: MockupAngleClass,
  slideNumber: number,
): MockupOrientation {
  switch (angleClass) {
    case "front_flat":
      return "upright";
    case "slight_3d":
      return "showcase_upright";
    case "medium_3d":
      return slideNumber % 2 === 0 ? "tilt_left" : "tilt_right";
    case "dramatic_3d":
      return slideNumber % 2 === 0 ? "tilt_left" : "tilt_right";
    default:
      return "showcase_upright";
  }
}

function pickAngleClass(
  beat: StoreSlideBeat,
  signals: ReturnType<typeof analyzeScreenSignals>,
): MockupAngleClass {
  if (signals.needsDetailReadability) return "front_flat";
  if (beat === "hook" && signals.isVisualHero) return "slight_3d";
  if (beat === "hook") return "slight_3d";
  if (signals.isVisualHero && beat === "feature_benefit") return "slight_3d";
  if (beat === "social_proof" || beat === "problem_outcome") return "front_flat";
  return "slight_3d";
}

function placementForSlide(
  beat: StoreSlideBeat,
  angleClass: MockupAngleClass,
  slideNumber: number,
): MockupPlacement {
  if (angleClass === "front_flat" || angleClass === "slight_3d") return "center";
  if (beat === "hook") return "center";
  return slideNumber % 2 === 0 ? "left" : "right";
}

function sceneAssetForSlide(
  slideNumber: number,
  beat: StoreSlideBeat,
  signals: ReturnType<typeof analyzeScreenSignals>,
): MockupAssetId {
  if (signals.needsDetailReadability) return "iphone-16-md942-05";
  if (beat === "hook") return signals.isVisualHero ? "iphone-16-md942-02" : "iphone-16-md942-01";
  if (beat === "problem_outcome") return "iphone-16-md942-05";
  if (beat === "feature_benefit") return "iphone-16-md942-03";
  if (beat === "social_proof") return "iphone-16-md942-05";
  return SCENE_ASSETS[Math.min(slideNumber - 1, SCENE_ASSETS.length - 1)];
}

function preferSceneMockup(signals: ReturnType<typeof analyzeScreenSignals>, beat: StoreSlideBeat): boolean {
  if (signals.needsDetailReadability) return true;
  if (beat === "hook" || beat === "feature_benefit") return true;
  return beat !== "download_cta";
}

export function planSlideMockup(
  slide: StoreSlidePlan,
  intelligence: ScreenshotIntelligence[] = [],
): Pick<
  SlideVisualPlan,
  | "mockupPose"
  | "mockupAssetId"
  | "angleClass"
  | "phoneHeightRatio"
  | "productFirst"
  | "useSceneMockup"
  | "recommendations"
> {
  const intel = getSlideIntelligence(slide, intelligence);
  const signals = analyzeScreenSignals(intel);
  const beat = slide.asoBeat;
  const useScene = slide.screenshotUsage !== "none" && preferSceneMockup(signals, beat);

  const angleClass: MockupAngleClass = useScene ? "scene_preset" : pickAngleClass(beat, signals);
  const effectiveAngle = useScene ? "scene_preset" : angleClass;

  const [minH, maxH] = PHONE_HEIGHT_BY_BEAT[beat];
  let phoneHeightRatio = signals.needsDetailReadability
    ? Math.max(minH, 0.6)
    : beat === "hook"
      ? maxH
      : (minH + maxH) / 2;

  if (signals.needsDetailReadability && effectiveAngle === "dramatic_3d") {
    phoneHeightRatio = Math.min(phoneHeightRatio, 0.6);
  }

  const mockupAssetId = useScene ? sceneAssetForSlide(slide.slideNumber, beat, signals) : undefined;

  let mockupPose: MockupPose;
  if (useScene) {
    mockupPose = { orientation: "upright", scale: scaleFromHeightRatio(phoneHeightRatio), placement: "center" };
  } else {
    mockupPose = {
      orientation: orientationForAngle(effectiveAngle === "scene_preset" ? "slight_3d" : effectiveAngle, slide.slideNumber),
      scale: scaleFromHeightRatio(phoneHeightRatio),
      placement: placementForSlide(beat, effectiveAngle === "scene_preset" ? "slight_3d" : effectiveAngle, slide.slideNumber),
    };
  }

  const recommendations = buildMockupRecommendations(effectiveAngle, mockupPose, signals, useScene, mockupAssetId);

  return {
    mockupPose,
    mockupAssetId,
    angleClass: effectiveAngle,
    phoneHeightRatio,
    productFirst: signals.needsDetailReadability || beat === "feature_benefit" || beat === "social_proof",
    useSceneMockup: useScene,
    recommendations,
  };
}

function buildMockupRecommendations(
  angleClass: MockupAngleClass,
  pose: MockupPose,
  signals: ReturnType<typeof analyzeScreenSignals>,
  useScene: boolean,
  assetId?: MockupAssetId,
): SlideVisualPlan["recommendations"] {
  const recs: SlideVisualPlan["recommendations"] = [];

  if (useScene && assetId) {
    recs.push({
      field: "mockupAsset",
      recommended: assetId,
      rationale: signals.needsDetailReadability
        ? "Front studio mockup keeps small UI text readable at App Store thumbnail size."
        : "Premium baked scene mockup — product-first composition with controlled contrast.",
    });
  } else {
    recs.push({
      field: "angle",
      recommended: pose.orientation,
      rationale:
        angleClass === "front_flat"
          ? "Front mockup because this screen contains dense UI / small text."
          : angleClass === "slight_3d"
            ? "Slight 3D adds premium feel while keeping the screen readable."
            : "Medium tilt for hero energy — only when UI remains legible.",
      avoid: signals.hasSmallText ? "dramatic 3D tilt — screen text becomes unreadable" : undefined,
    });
  }

  recs.push({
    field: "size",
    recommended: pose.scale,
    rationale:
      pose.scale === "hero"
        ? "Large mockup — UI is the hero and must read at thumbnail size."
        : "Medium mockup balances headline space with product clarity.",
  });

  recs.push({
    field: "position",
    recommended: pose.placement,
    rationale:
      pose.placement === "center"
        ? "Centered device — competitor-proven layout for UI readability."
        : "Offset device leaves clean headline zone on the opposite side.",
  });

  return recs;
}
