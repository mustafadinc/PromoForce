import type { AppProfile, StoreSlidePlan, StrategyBrief } from "@/lib/campaignTypes";
import { formatExportLabel, getAppStoreGenerationSize } from "@/lib/appStoreImageSizes";
import { normalizeMockupPose } from "@/lib/mockupPose";
import { storeSlideBeatMeta } from "@/lib/storeSetAsoFramework";

export function buildStoreSlidePrompt(
  profile: AppProfile,
  strategy: StrategyBrief,
  slide: StoreSlidePlan,
) {
  const beatLabel = storeSlideBeatMeta[slide.asoBeat].label;
  const screenshotLine =
    slide.screenshotUsage === "none"
      ? "No phone mockup — typography and brand visuals only."
      : "Premium iPhone mockup with uploaded screenshot.";

  const pose = normalizeMockupPose(slide.mockupPose, slide.slideNumber);
  const poseLine =
    slide.screenshotUsage === "none"
      ? ""
      : `Mockup: ${pose.scale} scale, ${pose.orientation.replace("_", " ")}, ${pose.placement} placement.`;

  return [
    `App Store slide ${slide.slideNumber}/5 for "${profile.appName}". Portrait ${getAppStoreGenerationSize()}.`,
    `Beat: ${beatLabel}. ${screenshotLine}${poseLine ? ` ${poseLine}` : ""}`,
    `Headline: "${slide.headline}" | Subheadline: "${slide.subheadline}"`,
    `Theme: ${strategy.visualTheme}. Variant: ${slide.visualVariant}.`,
    `Export target: ${formatExportLabel()}. Cohesive set — same palette; unique scene per slide.`,
  ].join(" ");
}
